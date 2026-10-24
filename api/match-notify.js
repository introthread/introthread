// POST /api/match-notify  { thread_id } (the owner, signed in) or { token } (the guest link /t/<token>)
// Emails both people once when their "What's next?" answers match (same answer, not "Not now").
// Sent at most once per Thread (marker event `note` "Match emailed"). The owner can turn it off in
// Settings > Notifications ("Email me when we match", profiles.prefs.emailMatch).
// Needs Vercel env: SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY (NOTIFY_FROM optional).
const { SB_URL, SITE, esc, first, place, send, readBody, isUuid, caller, sendEmail, layout, guard } = require('./_lib/common');
const MARK = 'Match emailed';
const LABEL = { meet: 'Meet again', intro: 'Introduce someone', keep: 'Stay in touch' };
const STEP = {
  meet: 'Suggest a time while it is fresh.',
  intro: 'Say who you have in mind and make the introduction.',
  keep: 'Send a short note so the Thread stays warm.'
};
const okEmail = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || '').trim());

module.exports = async (req, res) => {
  if (!guard(req, res, { max: 20, sameSite: true })) return;
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!svc || !process.env.RESEND_API_KEY) return send(res, 503, { sent: false, reason: 'not_configured' });
  const h = { apikey: svc, Authorization: 'Bearer ' + svc, 'Content-Type': 'application/json' };
  const get = async p => {
    const r = await fetch(SB_URL + '/rest/v1/' + p, { headers: h });
    return r.ok ? r.json() : [];
  };
  const { thread_id, token } = await readBody(req);
  let filter, ownerId = null;
  if (isUuid(token)) filter = `guest_token=eq.${token}`;
  else if (isUuid(thread_id)) {
    const c = await caller(req);
    if (!c) return send(res, 401, { error: 'auth' });
    ownerId = c.user.id;
    filter = `id=eq.${thread_id}`;
  } else return send(res, 400, { error: 'thread' });

  const t = (await get(`threads?${filter}&select=id,owner_id,guest_token,other_name,other_email,where_met,confirmed,mine,theirs`))[0];
  if (!t || (ownerId && t.owner_id !== ownerId)) return send(res, 404, { error: 'thread' });
  if (!t.confirmed || !t.mine || t.mine !== t.theirs || !LABEL[t.mine]) return send(res, 200, { sent: false, reason: 'no_match' });

  const marks = `thread_events?thread_id=eq.${t.id}&kind=eq.note&text=like.${encodeURIComponent(MARK + '*')}&select=id&order=id.asc`;
  if ((await get(marks + '&limit=1')).length) return send(res, 200, { sent: false, reason: 'already_sent' });
  // Claim the Thread first, then check this request holds the earliest marker, so two answers arriving
  // at the same moment still send only one pair of emails.
  const cr = await fetch(SB_URL + '/rest/v1/thread_events', {
    method: 'POST',
    headers: { ...h, Prefer: 'return=representation' },
    body: JSON.stringify({ thread_id: t.id, kind: 'note', text: MARK + ' to you both' })
  });
  const mine = cr.ok ? ((await cr.json()) || [])[0] : null;
  if (!mine) return send(res, 502, { sent: false, reason: 'claim' });
  const firstMark = (await get(marks + '&limit=1'))[0];
  if (!firstMark || firstMark.id !== mine.id) {
    await fetch(SB_URL + '/rest/v1/thread_events?id=eq.' + mine.id, { method: 'DELETE', headers: h });
    return send(res, 200, { sent: false, reason: 'already_sent' });
  }

  const p = (await get(`profiles?id=eq.${t.owner_id}&select=name,prefs`))[0] || {};
  const ur = await fetch(SB_URL + '/auth/v1/admin/users/' + t.owner_id, { headers: h });
  const ou = ur.ok ? await ur.json() : null;
  const ownerName = p.name || 'Your contact';
  const label = LABEL[t.mine], step = STEP[t.mine], where = place(t.where_met);
  const out = [];
  const mail = async (to, name, other, cta, url, footer) => {
    const subject = `You and ${first(other)} matched: ${label}`;
    const body = `<p style="font-size:15px;line-height:1.6;margin:0 0 10px">Hi ${esc(first(name))},</p><p style="font-size:15px;line-height:1.6;margin:0 0 10px">You and <b>${esc(other)}</b> (met at ${esc(where)}) both chose <b>${esc(label)}</b> in &ldquo;What&rsquo;s next?&rdquo;. Neither of you saw the other&rsquo;s answer until now.</p><p style="font-size:15px;line-height:1.6;margin:0 0 10px">${esc(step)}</p>`;
    const text = `Hi ${first(name)},\n\nYou and ${other} (met at ${where}) both chose "${label}" in "What's next?".\n${step}\n\n${cta}: ${url}`;
    const r = await sendEmail({ to, subject, html: layout(esc(subject), body, cta, url, footer), text });
    out.push(r.ok);
  };
  if (ou && okEmail(ou.email) && (p.prefs || {}).emailMatch !== false)
    await mail(ou.email, ownerName, t.other_name, 'Open the Thread', `${SITE}/app/thread/${t.id}`,
      `You get this once per Thread. Turn it off in Settings, under "Email me when we match". <a href="${SITE}/app/settings" style="color:#6b7385">Settings</a>`);
  if (okEmail(t.other_email))
    await mail(String(t.other_email).trim(), t.other_name, ownerName, 'Open the Thread', `${SITE}/t/${t.guest_token}`,
      `You get this once because you confirmed a Thread with ${esc(ownerName)} on Introthread. <a href="${SITE}/privacy" style="color:#6b7385">Privacy</a>`);
  if (out.length && !out.some(Boolean)) {
    // Nothing went out: release the claim so a later answer can try again.
    await fetch(SB_URL + '/rest/v1/thread_events?id=eq.' + mine.id, { method: 'DELETE', headers: h });
    return send(res, 502, { sent: 0, reason: 'provider' });
  }
  return send(res, 200, { sent: out.filter(Boolean).length });
};
