// POST /api/notify  { thread_id }
// Emails the person you met a link to confirm the Thread. Sent once per Thread, only by its owner.
const { SITE, esc, first, place, send, readBody, isUuid, caller, sendEmail, layout } = require('./_lib/common');
const MARK = 'Confirm link emailed';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  const c = await caller(req);
  if (!c) return send(res, 401, { error: 'auth' });
  const { thread_id } = await readBody(req);
  if (!isUuid(thread_id)) return send(res, 400, { error: 'thread' });
  const rows = await c.db.get(`threads?id=eq.${thread_id}&select=id,owner_id,guest_token,other_name,other_email,where_met,confirmed`);
  const t = rows && rows[0];
  if (!t || t.owner_id !== c.user.id) return send(res, 404, { error: 'thread' });
  if (t.confirmed) return send(res, 200, { sent: false, reason: 'already_confirmed' });
  const email = String(t.other_email || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return send(res, 200, { sent: false, reason: 'no_email' });
  const ev = await c.db.get(`thread_events?thread_id=eq.${t.id}&kind=eq.note&text=like.${encodeURIComponent(MARK + '*')}&select=id&limit=1`);
  if (ev && ev.length) return send(res, 200, { sent: false, reason: 'already_sent' });
  const p = ((await c.db.get(`profiles?id=eq.${c.user.id}&select=name,role,company,handle`)) || [])[0] || {};
  const who = p.name || 'Someone you met';
  const what = [p.role, p.company].filter(Boolean).join(', ');
  const where = place(t.where_met);
  const link = `${SITE}/t/${t.guest_token}`;
  const subject = `${who} started a Thread with you`;
  const body = `<p style="font-size:15px;line-height:1.6;margin:0 0 10px">Hi ${esc(first(t.other_name))},</p><p style="font-size:15px;line-height:1.6;margin:0 0 10px"><b>${esc(who)}</b>${what ? ` (${esc(what)})` : ''} saved your meeting at <b>${esc(where)}</b> as a Thread on Introthread.</p><p style="font-size:15px;line-height:1.6;margin:0">Confirm you met, then answer one private question: what's next? Your answer stays hidden until you both reply. No app or account needed.</p>`;
  const footer = `You received this because ${esc(who)} entered your email after meeting you. This is the only email we send unless you confirm. If you don't know this person, ignore it. <a href="${SITE}/privacy" style="color:#6b7385">Privacy</a>`;
  const text = `Hi ${first(t.other_name)},\n\n${who}${what ? ' (' + what + ')' : ''} saved your meeting at ${where} as a Thread on Introthread.\n\nConfirm you met and answer one private question: ${link}\n\nIf you don't know this person, ignore this email.`;
  const r = await sendEmail({ to: email, subject, html: layout(esc(subject), body, 'Confirm the Thread', link, footer), text });
  if (!r.ok) return send(res, r.reason === 'not_configured' ? 503 : 502, { sent: false, reason: r.reason || 'provider' });
  await c.db.post('thread_events', { thread_id: t.id, kind: 'note', text: `${MARK} to ${first(t.other_name)}` });
  return send(res, 200, { sent: true });
};
