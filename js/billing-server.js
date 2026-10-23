// Introthread - Billing receipts and Room passes from the server's own records (v80). Prefix bs.
// Before: the Billing screen showed receipts from a copy kept in profiles.prefs.billing, which the browser
// also writes (migration 018 stops it changing server values, but the display still depended on that copy).
// Now, on the live site, receipts come from the payments table and unused Room passes from room_passes.
// Both are written only by the payment server; row-level security lets each person read only their own rows.
// Plan, status and card still come from prefs.billing, whose server keys the browser cannot change (018).
// Invoices the person requested themselves (never paid by the browser) are still shown.

let BSV = null;
async function bsLoad(force) {
  if (!(typeof cloud === 'function' && cloud()) || !DB.session || typeof SB === 'undefined' || !SB)
    return null;
  if (BSV && !force && Date.now() - BSV.at < 60000) return BSV;
  try {
    const [p, r] = await Promise.all([
      SB.from('payments')
        .select('id,plan_id,amount,currency,status,stripe_invoice_id,created_at')
        .eq('user_id', DB.session)
        .order('created_at', { ascending: false })
        .limit(100),
      SB.from('room_passes').select('id,used_at').eq('user_id', DB.session).is('used_at', null)
    ]);
    if (p.error) return null;
    BSV = { pays: p.data || [], passes: r.error ? null : (r.data || []).length, at: Date.now() };
    return BSV;
  } catch (e) {
    return null;
  }
}
const bsStatus = s =>
  s === 'succeeded' ? 'paid' : s === 'refunded' ? 'refunded' : s === 'failed' ? 'failed' : 'open';
function bsInvoices(b) {
  const copy = b.invoices || [];
  const fromServer = BSV.pays.map(p => {
    const ref = p.stripe_invoice_id || '';
    const m = copy.find(i => i && (i.id === ref || 'ps_' + i.ref === ref)) || {};
    const t = Date.parse(p.created_at) || Date.now();
    const pro = p.plan_id === 'pro';
    const desc = m.desc || (pro ? 'Introthread Pro' : 'Room pass, one event');
    const amount = +p.amount || 0;
    return Object.assign(
      {
        kind: pro ? 'subscription' : 'rooms',
        desc,
        lines: [{ d: desc, amount }],
        subtotal: amount,
        tax: 0,
        taxLabel: 'Tax',
        due: t
      },
      m,
      {
        id: m.id || 'pay_' + p.id,
        ref: m.ref || ref.replace(/^ps_/, ''),
        number: m.number || 'Receipt ' + new Date(t).toISOString().slice(0, 10),
        date: t,
        total: amount,
        currency: String(p.currency || 'usd').toUpperCase(),
        status: bsStatus(p.status),
        _srv: true
      }
    );
  });
  const requested = copy.filter(i => i && !/^ps_/.test(i.id || '') && i.status !== 'paid');
  return fromServer.concat(requested).sort((a, c) => (c.date || 0) - (a.date || 0));
}
const _bGet80 = bGet;
bGet = function (u) {
  const b = _bGet80.apply(this, arguments);
  const mine = !u || (typeof me === 'function' && me() && u.id === me().id);
  if (!mine || !BSV || !(typeof cloud === 'function' && cloud())) return b;
  b.invoices = bsInvoices(b);
  if (BSV.passes != null) b.roomCredits = BSV.passes;
  return b;
};
/* Never write the server's receipts back into prefs: keep only the person's own requested invoices. */
const _bSave80 = bSave;
bSave = async function (b) {
  if (b && Array.isArray(b.invoices)) b.invoices = b.invoices.filter(i => !(i && i._srv));
  const r = await _bSave80.apply(this, arguments);
  if (typeof cloud === 'function' && cloud()) {
    await bsLoad(true);
    render();
  }
  return r;
};
/* Load on start and whenever the Billing screen opens. */
async function bsRefresh() {
  const had = !!BSV;
  if ((await bsLoad(false)) && (!had || /billing/.test(location.pathname + location.search))) render();
}
window.addEventListener('itroute', () => {
  if (/billing/.test(location.pathname + location.search)) bsRefresh();
});
if (typeof DOM_READY !== 'undefined' && DOM_READY) setTimeout(bsRefresh, 1500);
else document.addEventListener('DOMContentLoaded', () => setTimeout(bsRefresh, 1500));
