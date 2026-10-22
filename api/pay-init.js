// POST /api/pay-init { interval: 'month' | 'year' } -> { url } of Paystack's secure checkout page (Pro).
// POST /api/pay-init { kind: 'rooms' } -> { url } for a one-off Room pass (one extra Room).
const { SITE, send, readBody, caller, guard } = require('./_lib/common');
const { PLAN, ROOM_PASS_KES, ps } = require('./_lib/pay');
module.exports = async (req, res) => {
  if (!guard(req, res, { max: 10, sameSite: true })) return;
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  if (!process.env.PAYSTACK_SECRET_KEY) return send(res, 503, { error: 'not_configured' });
  const c = await caller(req); if (!c) return send(res, 401, { error: 'auth' });
  const { interval, kind } = await readBody(req);
  if (!c.user.email) return send(res, 400, { error: 'email' });
  if (kind === 'rooms') {
    const d = await ps('/transaction/initialize', { method: 'POST', body: JSON.stringify({ email: c.user.email, amount: ROOM_PASS_KES * 100, currency: 'KES', channels: ['card'], callback_url: SITE + '/app/rooms?pay=done&kind=rooms', metadata: { user_id: c.user.id, kind: 'rooms', cancel_action: SITE + '/app/rooms?pay=cancel' } }) });
    if (!d || !d.authorization_url) return send(res, 502, { error: 'provider' });
    return send(res, 200, { url: d.authorization_url, amount: ROOM_PASS_KES, currency: 'KES' });
  }
  const code = PLAN[interval === 'year' ? 'year' : 'month'];
  const plan = await ps('/plan/' + code); if (!plan) return send(res, 502, { error: 'plan' });
  const d = await ps('/transaction/initialize', { method: 'POST', body: JSON.stringify({ email: c.user.email, amount: plan.amount, plan: code, currency: plan.currency, channels: ['card'], callback_url: SITE + '/app?pay=done', metadata: { user_id: c.user.id, interval: interval === 'year' ? 'year' : 'month', cancel_action: SITE + '/app?pay=cancel' } }) });
  if (!d || !d.authorization_url) return send(res, 502, { error: 'provider' });
  return send(res, 200, { url: d.authorization_url, amount: plan.amount / 100, currency: plan.currency });
};
