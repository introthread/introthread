// POST /api/pay-sync -> finds this person's successful Paystack payments and makes sure Pro and the receipts are recorded.
// Safe to repeat: payments and invoices are recorded once per Paystack reference.
const { send, caller, guard } = require('./_lib/common');
const { ps, svc, applyCharge, applyRoomPass, meta } = require('./_lib/pay');
module.exports = async (req, res) => {
  if (!guard(req, res, { max: 10, sameSite: true })) return;
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  if (!process.env.PAYSTACK_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) return send(res, 503, { error: 'not_configured' });
  const c = await caller(req); if (!c) return send(res, 401, { error: 'auth' });
  if (!c.user.email) return send(res, 200, { synced: 0, reason: 'no_email' });
  const email = String(c.user.email).toLowerCase();
  const cust = await ps('/customer/' + encodeURIComponent(email));
  let txs = cust && cust.id ? ((await ps(`/transaction?customer=${cust.id}&status=success&perPage=50`)) || []) : [];
  const isMine = t => t && t.status === 'success' && (meta(t).user_id === c.user.id || (!meta(t).user_id && String((t.customer || {}).email || '').toLowerCase() === email));
  // Fallback: recent successful transactions on the account, matched by our user id or the email.
  if (!txs.some(isMine)) txs = ((await ps('/transaction?status=success&perPage=100')) || []);
  const mine = txs.filter(isMine).sort((a, b) => Date.parse(a.paid_at || a.created_at) - Date.parse(b.paid_at || b.created_at));
  if (!mine.length) return send(res, 200, { synced: 0, reason: cust && cust.id ? 'none' : 'no_customer', found: txs.length });
  const db = svc(); let n = 0;
  let pro = 0, rooms = 0;
  for (const t of mine) {
    if (!t.customer || !t.customer.id) t.customer = Object.assign({}, cust || {}, t.customer || {});
    // Room pass payments add a pass; they must never switch Pro on.
    if (meta(t).kind === 'rooms') { await applyRoomPass(db, c.user.id, t); rooms++; } else { await applyCharge(db, c.user.id, t); pro++; }
    n++;
  }
  return send(res, 200, { synced: n, pro: pro > 0, rooms, found: txs.length });
};
