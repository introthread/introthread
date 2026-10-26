// POST /api/card-tap { handle } -> counts one tap on a member's NFC card (the card link ends in ?src=nfc).
// No sign-in needed (the person tapping is usually a visitor). Rate-limited per IP; the owner's own visits are
// skipped in the browser. Needs Vercel env SUPABASE_SERVICE_ROLE_KEY and migration 022.
const { SB_URL, send, readBody, guard } = require('./_lib/common');
module.exports = async (req, res) => {
  if (!guard(req, res, { max: 20, sameSite: true })) return;
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!svc) return send(res, 503, { error: 'not_configured' });
  const { handle } = await readBody(req);
  const hd = String(handle || '').toLowerCase();
  if (!/^[a-z0-9]{2,20}$/.test(hd)) return send(res, 400, { error: 'handle' });
  const h = { apikey: svc, Authorization: 'Bearer ' + svc, 'Content-Type': 'application/json' };
  const r = await fetch(SB_URL + '/rest/v1/profiles?handle=eq.' + hd + '&select=id', { headers: h });
  const p = r.ok ? ((await r.json()) || [])[0] : null;
  if (!p) return send(res, 404, { error: 'card' });
  const w = await fetch(SB_URL + '/rest/v1/card_taps', { method: 'POST', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify({ profile_id: p.id, src: 'nfc' }) });
  return send(res, w.ok ? 200 : 502, { ok: w.ok });
};
