// POST /api/pay-sync -> finds this person's successful Paystack payments and makes sure Pro and the receipts are recorded.
// Safe to repeat: payments and invoices are recorded once per Paystack reference.
const { send, caller } = require('./_lib/common');
const { ps, svc, applyCharge, meta } = require('./_lib/pay');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  if (!process.env.PAYSTACK_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) return send(res, 503, { error: 'not_configured' });
  const c = await caller(req); if (!c) return send(res, 401, { error: 'auth' });
  if (!c.user.email) return send(res, 200, { synced: 0 });
  const cust = await ps('/customer/' + encodeURIComponent(c.user.email));
  if (!cust || !cust.id) return send(res, 200, { synced: 0 });
  const txs = (await ps(`/transaction?customer=${cust.id}&status=success&perPage=50`)) || [];
  const mine = txs.filter(t => t.status === 'success' && meta(t).user_id === c.user.id && t.plan && (t.plan.plan_code || Object.keys(t.plan).length)).sort((a, b) => Date.parse(a.paid_at || a.created_at) - Date.parse(b.paid_at || b.created_at));
  const db = svc(); let n = 0;
  for (const t of mine) { if (!t.customer) t.customer = cust; await applyCharge(db, c.user.id, t); n++; }
  return send(res, 200, { synced: n, pro: n > 0 });
};
