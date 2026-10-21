// POST /api/paystack-webhook  (set this URL in Paystack > Settings > API Keys & Webhooks)
// Verifies Paystack's signature, then keeps subscriptions, payments and the Pro plan in step.
const crypto = require('crypto');
const { send } = require('./_lib/common');
const { svc, applyCharge } = require('./_lib/pay');
const raw = req => new Promise(r => { let d = ''; req.on('data', c => d += c); req.on('end', () => r(d)); req.on('error', () => r('')); });

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || !process.env.SUPABASE_SERVICE_ROLE_KEY) return send(res, 503, { error: 'not_configured' });
  let body = await raw(req);
  if (!body && req.body) body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const sig = String(req.headers['x-paystack-signature'] || '');
  const want = crypto.createHmac('sha512', key).update(body).digest('hex');
  if (!sig || sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return send(res, 401, { error: 'signature' });
  let ev; try { ev = JSON.parse(body); } catch (e) { return send(res, 400, { error: 'json' }); }
  const d = ev.data || {}, db = svc();
  const cust = (d.customer || {}).customer_code;
  const userFor = async () => {
    const m = (d.metadata || {}).user_id;
    if (m && /^[0-9a-f-]{36}$/i.test(m)) return m;
    if (!cust) return null;
    const s = await db.get(`subscriptions?stripe_customer_id=eq.${encodeURIComponent(cust)}&select=user_id`);
    return s[0] ? s[0].user_id : null;
  };
  const now = new Date().toISOString();
  if (ev.event === 'charge.success') {
    const uid = await userFor(); if (uid && (d.plan && (d.plan.plan_code || typeof d.plan === 'string'))) await applyCharge(db, uid, d);
  } else if (ev.event === 'subscription.create') {
    if (cust) await db.patch(`subscriptions?stripe_customer_id=eq.${encodeURIComponent(cust)}`, { stripe_subscription_id: d.subscription_code, ...(d.next_payment_date ? { current_period_end: d.next_payment_date } : {}), updated_at: now });
  } else if (ev.event === 'subscription.not_renew') {
    if (d.subscription_code) await db.patch(`subscriptions?stripe_subscription_id=eq.${encodeURIComponent(d.subscription_code)}`, { status: 'canceling', canceled_at: now, updated_at: now });
  } else if (ev.event === 'subscription.disable') {
    const s = d.subscription_code ? await db.get(`subscriptions?stripe_subscription_id=eq.${encodeURIComponent(d.subscription_code)}&select=user_id`) : [];
    if (s[0]) { await db.patch(`subscriptions?user_id=eq.${s[0].user_id}`, { status: 'canceled', canceled_at: now, updated_at: now }); await db.patch(`profiles?id=eq.${s[0].user_id}`, { plan: 'Free' }); }
  } else if (ev.event === 'invoice.payment_failed') {
    const uid = await userFor();
    if (uid) {
      await db.patch(`subscriptions?user_id=eq.${uid}`, { status: 'past_due', updated_at: now });
      const tx = d.transaction || {};
      await db.insertIgnore('payments', { user_id: uid, plan_id: 'pro', amount: Number(d.amount || tx.amount || 0) / 100, currency: String(tx.currency || 'kes').toLowerCase(), status: 'failed', stripe_invoice_id: 'ps_' + (tx.reference || d.invoice_code || now), failure_reason: String(d.description || 'Card payment failed').slice(0, 200) }, 'stripe_invoice_id');
    }
  }
  return send(res, 200, { received: true });
};
