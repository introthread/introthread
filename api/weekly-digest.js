// GET /api/weekly-digest  (run by Vercel Cron every Monday 06:00 UTC, see vercel.json)
// Emails a short recap to everyone who turned on Settings > "Weekly summary" (profiles.prefs.digest = true):
// last week's new Threads, confirmations, matches and resolved Threads, plus up to 8 open Threads that need a step.
// Sent at most once per person per ISO week (prefs.digestWeek). Needs Vercel env: CRON_SECRET,
// SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.
const { SB_URL, SITE, esc, first, place, send, sendEmail, layout, guard } = require('./_lib/common');

function isoWeek(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return t.getUTCFullYear() + '-W' + String(Math.ceil(((t - y0) / 864e5 + 1) / 7)).padStart(2, '0');
}

module.exports = async (req, res) => {
  if (!guard(req, res, { max: 5, sameSite: false })) return;
  const secret = process.env.CRON_SECRET, svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || String(req.headers.authorization || '') !== 'Bearer ' + secret) return send(res, 401, { error: 'auth' });
  if (!svc || !process.env.RESEND_API_KEY) return send(res, 503, { error: 'not_configured' });
  const h = { apikey: svc, Authorization: 'Bearer ' + svc, 'Content-Type': 'application/json' };
  const get = async p => { const r = await fetch(SB_URL + '/rest/v1/' + p, { headers: h }); return r.ok ? r.json() : []; };
  const now = new Date(), week = isoWeek(now), since = new Date(now - 7 * 864e5).toISOString(), recent = new Date(now - 30 * 864e5).toISOString();
  const people = (await get('profiles?prefs->>digest=eq.true&select=id,name,prefs&limit=5000')).filter(p => (p.prefs || {}).digestWeek !== week);
  if (!people.length) return send(res, 200, { people: 0, sent: 0 });
  let sent = 0;
  for (let i = 0; i < people.length; i += 100) {
    const batch = people.slice(i, i + 100), ids = batch.map(p => p.id).join(',');
    const threads = await get(`threads?owner_id=in.(${ids})&created_at=gte.${recent}&select=id,owner_id,other_name,where_met,confirmed,mine,theirs,resolved_at,created_at&limit=20000`);
    for (const p of batch) {
      const T = threads.filter(t => t.owner_id === p.id), W = T.filter(t => t.created_at >= since);
      const stats = { n: W.length, conf: W.filter(t => t.confirmed).length, match: W.filter(t => t.mine && t.mine === t.theirs && t.mine !== 'notnow').length, res: T.filter(t => t.resolved_at && t.resolved_at >= since).length };
      const open = T.filter(t => !t.resolved_at && t.mine !== 'notnow' && t.theirs !== 'notnow').slice(0, 8);
      if (!stats.n && !stats.res && !open.length) continue; // nothing to say this week
      const ur = await fetch(SB_URL + '/auth/v1/admin/users/' + p.id, { headers: h });
      const u = ur.ok ? await ur.json() : null; if (!u || !u.email) continue;
      const line = t => !t.confirmed ? `waiting for ${first(t.other_name)} to confirm` : !t.mine ? `answer "What's next?"` : (t.theirs && t.mine === t.theirs) ? 'you matched, send the follow-up' : 'follow up while it is fresh';
      const box = (k, v) => `<td style="padding:10px 12px;border:1px solid #e3e7ef;border-radius:10px;text-align:center"><div style="font-size:20px;font-weight:700">${v}</div><div style="font-size:12px;color:#6b7385">${k}</div></td>`;
      const body = `<p style="font-size:15px;line-height:1.6;margin:0 0 12px">Hi ${esc(first(p.name))}, here is your week on Introthread.</p>
<table role="presentation" cellspacing="6" style="margin:0 0 14px"><tr>${box('new Threads', stats.n)}${box('confirmed', stats.conf)}${box('matched', stats.match)}${box('resolved', stats.res)}</tr></table>
${open.length ? `<p style="font-size:15px;font-weight:700;margin:0 0 6px">Needs a next step</p><ul style="font-size:15px;line-height:1.5;padding-left:18px;margin:0 0 6px">${open.map(t => `<li style="margin:0 0 6px"><b>${esc(t.other_name)}</b>, ${esc(place(t.where_met))}: ${esc(line(t))}</li>`).join('')}</ul>` : ''}`;
      const subject = open.length ? `Your week: ${open.length} Thread${open.length === 1 ? '' : 's'} need${open.length === 1 ? 's' : ''} a next step` : 'Your week on Introthread';
      const text = `Hi ${first(p.name)},\n\nLast week: ${stats.n} new Threads, ${stats.conf} confirmed, ${stats.match} matched, ${stats.res} resolved.\n` + (open.length ? '\nNeeds a next step:\n' + open.map(t => `- ${t.other_name}, ${place(t.where_met)}: ${line(t)}`).join('\n') + '\n' : '') + `\nOpen Introthread: ${SITE}/app\nTurn this off in Settings > Weekly summary.`;
      const footer = `You get this because "Weekly summary" is on. Turn it off in <a href="${SITE}/app/settings" style="color:#6b7385">Settings</a>.`;
      const r = await sendEmail({ to: u.email, subject, html: layout(esc(subject), body, 'Open my Threads', SITE + '/app', footer), text });
      if (!r.ok) continue;
      sent++;
      const prefs = Object.assign({}, p.prefs || {}, { digestWeek: week });
      await fetch(SB_URL + '/rest/v1/profiles?id=eq.' + p.id, { method: 'PATCH', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify({ prefs }) });
    }
  }
  return send(res, 200, { people: people.length, sent, week });
};
