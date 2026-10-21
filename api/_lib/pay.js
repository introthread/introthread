// Paystack billing helpers. Secret key and service-role key come only from Vercel environment variables.
const { SB_URL } = require('./common');
const PS = 'https://api.paystack.co';
const PLAN = { month: process.env.PAYSTACK_PLAN_MONTH || 'PLN_igm7c0i78tlx9jz', year: process.env.PAYSTACK_PLAN_YEAR || 'PLN_scrctkdhtg6us1f' };
const KES_PER_USD = Number(process.env.KES_PER_USD || 130);

async function ps(path, opt = {}) {
  const r = await fetch(PS + path, { ...opt, headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY, 'Content-Type': 'application/json' } });
  let j = {}; try { j = await r.json(); } catch (e) {}
  return r.ok && j.status !== false ? j.data : null;
}
function svc() {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const h = { apikey: k, Authorization: 'Bearer ' + k, 'Content-Type': 'application/json' };
  return {
    async get(p) { const r = await fetch(SB_URL + '/rest/v1/' + p, { headers: h }); return r.ok ? r.json() : []; },
    async upsert(t, row, conflict) { const r = await fetch(SB_URL + '/rest/v1/' + t + (conflict ? '?on_conflict=' + conflict : ''), { method: 'POST', headers: { ...h, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(row) }); return r.ok; },
    async insertIgnore(t, row, conflict) { const r = await fetch(SB_URL + '/rest/v1/' + t + '?on_conflict=' + conflict, { method: 'POST', headers: { ...h, Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(row) }); return r.ok; },
    async patch(p, row) { const r = await fetch(SB_URL + '/rest/v1/' + p, { method: 'PATCH', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify(row) }); return r.ok; },
  };
}
const intervalOf = p => { const i = String((p && p.interval) || '').toLowerCase(); return i === 'annually' ? 'year' : i === 'monthly' ? 'month' : null; };
const planCode = tx => (tx.plan && typeof tx.plan === 'object') ? tx.plan.plan_code : (typeof tx.plan === 'string' && tx.plan.startsWith('PLN_') ? tx.plan : (tx.plan_object && tx.plan_object.plan_code) || null);

// A successful charge: turn Pro on, record the payment once, remember the Paystack customer and subscription.
async function applyCharge(db, userId, tx) {
  const code = planCode(tx);
  const interval = code === PLAN.year ? 'year' : code === PLAN.month ? 'month' : intervalOf(tx.plan_object || tx.plan) || 'month';
  const amount = Number(tx.amount || 0) / 100, cur = String(tx.currency || 'KES').toLowerCase();
  const paid = new Date(tx.paid_at || tx.paidAt || Date.now());
  const end = new Date(paid); if (interval === 'year') end.setFullYear(end.getFullYear() + 1); else end.setMonth(end.getMonth() + 1);
  const cust = tx.customer || {};
  let subCode = null, next = null;
  if (cust.id && code) {
    const subs = await ps(`/subscription?customer=${cust.id}&plan=${encodeURIComponent(code)}`);
    const s = (subs || []).find(x => x.status === 'active') || (subs || [])[0];
    if (s) { subCode = s.subscription_code; next = s.next_payment_date; }
  }
  await db.upsert('subscriptions', { user_id: userId, plan_id: 'pro', status: 'active', interval, currency: cur, amount, stripe_customer_id: cust.customer_code || null, ...(subCode ? { stripe_subscription_id: subCode } : {}), current_period_end: (next ? new Date(next) : end).toISOString(), canceled_at: null, updated_at: new Date().toISOString() }, 'user_id');
  await db.insertIgnore('payments', { user_id: userId, plan_id: 'pro', amount, currency: cur, amount_usd: cur === 'usd' ? amount : Math.round(amount / KES_PER_USD * 100) / 100, status: 'succeeded', stripe_invoice_id: 'ps_' + tx.reference, stripe_payment_intent: String(tx.id || '') }, 'stripe_invoice_id');
  // The app's Billing tab reads profiles.prefs.billing: plan, status, card and invoices.
  const auth = tx.authorization || {};
  await setBilling(db, userId, b => {
    const ref = 'ps_' + tx.reference;
    b.invoices = Array.isArray(b.invoices) ? b.invoices : [];
    if (!b.invoices.some(i => i && (i.id === ref || i.ref === tx.reference))) {
      b.seq = (b.seq || 0) + 1;
      const t = paid.getTime(), desc = 'Introthread Pro (' + (interval === 'year' ? 'yearly' : 'monthly') + ')';
      b.invoices.unshift({ id: ref, ref: tx.reference, number: 'IT-' + paid.getFullYear() + '-' + String(b.seq).padStart(4, '0'), date: t, due: t, desc, period: { from: t, to: end.getTime() }, lines: [{ d: desc, amount }], subtotal: amount, taxLabel: 'Tax', tax: 0, total: amount, currency: cur.toUpperCase(), status: 'paid', paidAt: t, method: auth.last4 ? ((auth.brand || auth.card_type || 'Card').trim() + ' ending ' + auth.last4) : 'Card (Paystack)', kind: 'subscription' });
    }
    Object.assign(b, { plan: 'pro', status: 'active', interval, periodEnd: (next ? new Date(next) : end).getTime(), cancelAt: null, provider: 'paystack' });
    if (auth.last4) b.card = { brand: (auth.brand || auth.card_type || 'Card').trim().replace(/^./, c => c.toUpperCase()), last4: auth.last4, exp: (auth.exp_month ? String(auth.exp_month).padStart(2, '0') + '/' + String(auth.exp_year || '').slice(-2) : '') };
    return b;
  }, 'Pro');
  return { interval, amount, currency: cur };
}
// Read-modify-write of profiles.prefs.billing (and profiles.plan when given).
async function setBilling(db, userId, fn, plan) {
  const p = (await db.get(`profiles?id=eq.${userId}&select=prefs`))[0] || {};
  const prefs = Object.assign({}, p.prefs || {});
  prefs.billing = fn(Object.assign({}, prefs.billing || {}));
  return db.patch(`profiles?id=eq.${userId}`, plan ? { prefs, plan } : { prefs });
}
const meta = tx => { let m = tx && tx.metadata; if (typeof m === 'string') { try { m = JSON.parse(m); } catch (e) { m = {}; } } return m || {}; };
module.exports = { PS, PLAN, ps, svc, applyCharge, planCode, setBilling, meta };
