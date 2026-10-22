// POST /api/room-invite { room_id, emails: [..] }
// Adds invitations to a Room (only its organiser can, checked in the database by room_invite) and emails each
// invited person the Room link. Returns { added, sent, failed }. Without Resend it returns 503 not_configured
// after the invitations are saved, and the app tells the organiser to share the link themselves.
const { SITE, esc, send, readBody, isUuid, caller, sendEmail, layout, guard } = require('./_lib/common');
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

module.exports = async (req, res) => {
  if (!guard(req, res, { max: 10, sameSite: true })) return;
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  const c = await caller(req);
  if (!c) return send(res, 401, { error: 'auth' });
  const { room_id, emails } = await readBody(req);
  if (!isUuid(room_id)) return send(res, 400, { error: 'room' });
  const list = [...new Set((Array.isArray(emails) ? emails : []).map(e => String(e || '').trim().toLowerCase()).filter(e => e.length <= 200 && EMAIL.test(e)))].slice(0, 50);
  if (!list.length) return send(res, 400, { error: 'emails' });
  // Ownership is enforced inside room_invite (raises unless the caller organises the Room).
  const added = await c.db.rpc('room_invite', { p_room: room_id, p_emails: list });
  if (added === null) return send(res, 403, { error: 'not_organiser' });
  const room = ((await c.db.get(`rooms?id=eq.${room_id}&select=name,code,event_date,owner_id`)) || [])[0];
  if (!room || room.owner_id !== c.user.id) return send(res, 403, { error: 'not_organiser' });
  if (!process.env.RESEND_API_KEY) return send(res, 503, { added, sent: 0, reason: 'not_configured' });
  const p = ((await c.db.get(`profiles?id=eq.${c.user.id}&select=name`)) || [])[0] || {};
  const who = p.name || 'An organiser';
  const link = `${SITE}/r/${encodeURIComponent(room.code)}`;
  const when = room.event_date ? new Date(room.event_date + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const subject = `${who} invited you to ${room.name}`;
  const body = `<p style="font-size:15px;line-height:1.6;margin:0 0 10px"><b>${esc(who)}</b> invited you to the Introthread Room <b>${esc(room.name)}</b>${when ? ' on ' + esc(when) : ''}.</p><p style="font-size:15px;line-height:1.6;margin:0 0 10px">Open the link and sign in with this email address to get in straight away.</p>`;
  const text = `${who} invited you to the Introthread Room "${room.name}"${when ? ' on ' + when : ''}.\n\nOpen ${link} and sign in with this email address to get in straight away.`;
  const footer = `You received this because ${esc(who)} added your email to a private Room. If you were not expecting it, ignore this email.`;
  let sent = 0, failed = 0;
  for (const to of list) { const r = await sendEmail({ to, subject, html: layout(esc(subject), body, 'Open the Room', link, footer), text }); r.ok ? sent++ : failed++; }
  return send(res, 200, { added, sent, failed });
};
