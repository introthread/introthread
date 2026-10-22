// GET /api/cron-nudge  (run daily by Vercel Cron, see vercel.json)
// Emails each person one reminder for Threads that are 48-72 hours old and still need a next step.
// Needs Vercel env: CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.
const { SB_URL, SITE, esc, first, place, send, sendEmail, layout, guard } = require('./_lib/common');
const MARK = 'Reminder emailed';

module.exports = async (req, res) => {
  if (!guard(req, res, { max: 5, sameSite: false })) return;
  const secret = process.env.CRON_SECRET, svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || String(req.headers.authorization || '') !== 'Bearer ' + secret) return send(res, 401, { error: 'auth' });
  if (!svc || !process.env.RESEND_API_KEY) return send(res, 503, { error: 'not_configured' });
  const h = { apikey: svc, Authorization: 'Bearer ' + svc, 'Content-Type': 'application/json' };
  const get = async p => { const r = await fetch(SB_URL + '/rest/v1/' + p, { headers: h }); return r.ok ? r.json() : []; };
  const now = Date.now(), from = new Date(now - 72 * 3600e3).toISOString(), to = new Date(now - 48 * 3600e3).toISOString();
  const threads = await get(`threads?created_at=gte.${from}&created_at=lt.${to}&resolved_at=is.null&select=id,owner_id,other_name,where_met,confirmed,mine,theirs&limit=2000`);
  // Needs a step: not confirmed yet, or I have not answered, or both answered a match and nothing resolved.
  const open = threads.filter(t => !(t.mine === 'notnow' || t.theirs === 'notnow'));
  if (!open.length) return send(res, 200, { owners: 0, sent: 0 });
  const ids = open.map(t => t.id).join(',');
  const done = new Set((await get(`thread_events?thread_id=in.(${ids})&kind=eq.note&text=like.${encodeURIComponent(MARK + '*')}&select=thread_id`)).map(e => e.thread_id));
  const byOwner = {};
  for (const t of open) if (!done.has(t.id)) (byOwner[t.owner_id] = byOwner[t.owner_id] || []).push(t);
  const owners = Object.keys(byOwner);
  if (!owners.length) return send(res, 200, { owners: 0, sent: 0 });
  const profs = await get(`profiles?id=in.(${owners.join(',')})&select=id,name,prefs`);
  const pmap = Object.fromEntries(profs.map(p => [p.id, p]));
  let sent = 0;
  for (const oid of owners) {
    const p = pmap[oid] || {};
    if ((p.prefs || {}).nudge === false) continue;
    const ur = await fetch(SB_URL + '/auth/v1/admin/users/' + oid, { headers: h });
    const u = ur.ok ? await ur.json() : null;
    const email = u && u.email;
    if (!email) continue;
    const list = byOwner[oid].slice(0, 10);
    const line = t => !t.confirmed ? `waiting for ${first(t.other_name)} to confirm` : !t.mine ? `answer "What's next?"` : (t.theirs && t.mine === t.theirs) ? `you matched, send the follow-up` : `follow up while it's fresh`;
    const items = list.map(t => `<li style="margin:0 0 8px"><b>${esc(t.other_name)}</b>, ${esc(place(t.where_met))}: ${esc(line(t))}</li>`).join('');
    const subject = list.length === 1 ? `Your Thread with ${first(list[0].other_name)} is fading` : `${list.length} Threads need a next step`;
    const body = `<p style="font-size:15px;line-height:1.6;margin:0 0 10px">Hi ${esc(first(p.name))}, it's been two days. Threads that get a next step within a week usually turn into something.</p><ul style="font-size:15px;line-height:1.5;padding-left:18px;margin:0">${items}</ul>`;
    const footer = `You get at most one reminder per Thread. Turn these off in Settings, under "Nudge me at 48 hours". <a href="${SITE}/app/settings" style="color:#6b7385">Settings</a>`;
    const text = `Hi ${first(p.name)},\n\n` + list.map(t => `- ${t.other_name}, ${place(t.where_met)}: ${line(t)}`).join('\n') + `\n\nOpen Introthread: ${SITE}/app`;
    const r = await sendEmail({ to: email, subject, html: layout(esc(subject), body, 'Open my Threads', SITE + '/app', footer), text });
    if (!r.ok) continue;
    sent++;
    await fetch(SB_URL + '/rest/v1/thread_events', { method: 'POST', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify(list.map(t => ({ thread_id: t.id, kind: 'note', text: MARK + ' to you' }))) });
  }
  return send(res, 200, { owners: owners.length, sent });
};
