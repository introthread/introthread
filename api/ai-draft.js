// POST /api/ai-draft  { thread_id }
// Writes a short follow-up from one Thread's context. Never sends anything.
// Needs Vercel env: ANTHROPIC_API_KEY or OPENAI_API_KEY (optional AI_MODEL), or GEMINI_API_KEY (free tier from
// Google AI Studio, no card; optional GEMINI_MODEL, default gemini-2.5-flash). If several are set: Anthropic, OpenAI, Gemini.
const { place, send, readBody, isUuid, caller, guard } = require('./_lib/common');
const LABEL = { meet: 'meet again', intro: 'introduce someone', keep: 'stay in touch', notnow: 'stay in touch' };

async function complete(system, prompt) {
  if (process.env.ANTHROPIC_API_KEY) {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: process.env.AI_MODEL || 'claude-3-5-haiku-latest', max_tokens: 500, system, messages: [{ role: 'user', content: prompt }] }) });
    if (!r.ok) return null; const j = await r.json(); return ((j.content || [])[0] || {}).text || null;
  }
  if (process.env.OPENAI_API_KEY) {
    const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.AI_MODEL || 'gpt-4o-mini', max_tokens: 500, temperature: 0.6, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }) });
    if (!r.ok) return null; const j = await r.json(); return (((j.choices || [])[0] || {}).message || {}).content || null;
  }
  if (process.env.GEMINI_API_KEY) {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', { method: 'POST', headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 500, temperature: 0.6, thinkingConfig: { thinkingBudget: 0 } } }) });
    if (!r.ok) return null; const j = await r.json();
    return ((((j.candidates || [])[0] || {}).content || {}).parts || []).map(p => p.text || '').join('').trim() || null;
  }
  return undefined;
}
// Paid providers (and Gemini on a paid plan, GEMINI_PAID=1) do not use prompts for training.
const NOTE_OK = () => !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_PAID === '1');
const AI_ON = () => !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);

module.exports = async (req, res) => {
  if (!guard(req, res, { max: 10, sameSite: true })) return;
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  if (!AI_ON()) return send(res, 503, { error: 'not_configured' });
  const c = await caller(req);
  if (!c) return send(res, 401, { error: 'auth' });
  const { thread_id } = await readBody(req);
  if (!isUuid(thread_id)) return send(res, 400, { error: 'thread' });
  // Own full profile (prefs are private since migration 015); falls back to the older direct read.
  const p = (await c.db.rpc('my_profile')) || ((await c.db.get(`profiles?id=eq.${c.user.id}&select=name,role,company,handle,prefs`)) || [])[0] || {};
  if ((p.prefs || {}).ai === false) return send(res, 403, { error: 'ai_off' });
  const t = ((await c.db.get(`threads?id=eq.${thread_id}&select=owner_id,other_name,other_role,other_company,where_met,note,mine,theirs,created_at`)) || [])[0];
  if (!t || t.owner_id !== c.user.id) return send(res, 404, { error: 'thread' });
  const both = t.mine && t.theirs; const match = both && t.mine === t.theirs && t.mine !== 'notnow';
  const goal = match ? `They both chose to ${LABEL[t.mine]}.` : t.mine ? `The sender chose to ${LABEL[t.mine]}.` : 'No next step chosen yet; keep it warm and light.';
  const system = 'You write short, warm, professional follow-up emails after an in-person meeting. Plain text only. 60 to 120 words. No subject line, no emojis, no placeholders in brackets, no invented facts, dates or promises. Use only the context given. Sign off with the sender\'s first name.';
  const prompt = [
    `Sender: ${p.name || ''}${p.role ? ', ' + p.role : ''}${p.company ? ' at ' + p.company : ''}. Card: introthread.com/${p.handle || ''}`,
    `Recipient: ${t.other_name}${t.other_role ? ', ' + t.other_role : ''}${t.other_company ? ' at ' + t.other_company : ''}`,
    `Where they met: ${place(t.where_met)} on ${String(t.created_at || '').slice(0, 10)}`,
    // The private note is never sent to a free-tier provider that may use prompts to improve its products.
    NOTE_OK() ? `Sender's private note (use for context, do not quote it word for word): ${String(t.note || 'none').slice(0, 500)}` : 'Sender\'s private note: not shared',
    `Goal: ${goal} Never mention that the recipient chose "not now".`,
  ].join('\n');
  const out = await complete(system, prompt);
  if (!out) return send(res, 502, { error: 'provider' });
  return send(res, 200, { draft: String(out).trim().slice(0, 2000) });
};
