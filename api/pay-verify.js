// POST /api/pay-verify { reference } -> confirms a checkout right after Paystack sends the person back (the webhook also does this).
const { send, readBody, caller } = require('./_lib/common');
const { ps, svc, applyCharge, applyRoomPass, meta } = require('./_lib/pay');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  if (!process.env.PAYSTACK_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) return send(res, 503, { error: 'not_configured' });
  const c = await caller(req); if (!c) return send(res, 401, { error: 'auth' });
  const { reference } = await readBody(req);
  if (!/^[\w.-]{6,100}$/.test(String(reference || ''))) return send(res, 400, { error: 'reference' });
  const tx = await ps('/transaction/verify/' + encodeURIComponent(reference));
  if (!tx) return send(res, 502, { error: 'provider' });
  if (tx.status !== 'success') return send(res, 200, { ok: false, status: tx.status });
  if (meta(tx).user_id !== c.user.id) return send(res, 403, { error: 'owner' });
  if (meta(tx).kind === 'rooms') { const r = await applyRoomPass(svc(), c.user.id, tx); return send(res, 200, { ok: true, ...r }); }
  const r = await applyCharge(svc(), c.user.id, tx);
  return send(res, 200, { ok: true, plan: 'Pro', ...r });
};
