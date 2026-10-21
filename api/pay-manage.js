// POST /api/pay-manage -> { url } Paystack page where the person updates their card or cancels.
const { send, caller } = require('./_lib/common');
const { ps } = require('./_lib/pay');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  if (!process.env.PAYSTACK_SECRET_KEY) return send(res, 503, { error: 'not_configured' });
  const c = await caller(req); if (!c) return send(res, 401, { error: 'auth' });
  const s = ((await c.db.get(`subscriptions?user_id=eq.${c.user.id}&select=stripe_subscription_id`)) || [])[0];
  const code = s && s.stripe_subscription_id;
  if (!code || !String(code).startsWith('SUB_')) return send(res, 404, { error: 'no_subscription' });
  const d = await ps(`/subscription/${code}/manage/link`);
  if (!d || !d.link) return send(res, 502, { error: 'provider' });
  return send(res, 200, { url: d.link });
};
