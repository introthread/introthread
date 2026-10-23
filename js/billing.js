// Introthread - Billing engine (v19): plans, entitlements, trials, renewals, invoices, Room passes. Prefix b.
// Moved out of index.html in v53 (code split step 5). Load order matters: see the <script> list at the end of index.html.

/* ===== v19 Billing engine: plans, entitlements, trials, renewals and invoices =====
   Billing state lives in profiles.prefs.billing and profiles.plan.
   Card charging needs a payment provider (e.g. Stripe) with a server webhook; until that is
   connected, live accounts can start a free trial or request an invoice, and the demo
   account simulates card payments end to end. */
const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: { month: 0, year: 0 },
    tag: 'Basic access for new users.',
    features: [
      'Your card, link and QR',
      '5 new Threads a month',
      'What&rsquo;s next? and the quiet reveal',
      'Save to contacts',
      'Export your contacts anytime'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: { month: 12, year: 120 },
    tag: 'For professionals and teams.',
    features: [
      'Everything in Free',
      'Unlimited Threads',
      'AI follow-ups in your voice',
      'Calendar booking from a match',
      'NFC card support',
      'Thread search'
    ]
  },
  rooms: {
    id: 'rooms',
    name: 'Rooms',
    price: { event: 199 },
    tag: 'For events and communities',
    features: [
      'Room code, QR and badges',
      'Live Resolution Report',
      'Up to 1,000 attendees',
      'Sponsor-ready export'
    ]
  },
  networks: {
    id: 'networks',
    name: 'Networks',
    tag: 'For VC platforms and networks',
    price: { custom: 'annual' },
    features: ['Warmth dashboard', 'Warmth API', 'SSO and admin controls', 'Dedicated success manager']
  }
};
const FEATURES = {
  ai_drafts: 'AI follow-up drafts',
  nfc: 'NFC card writing',
  export: 'Thread export',
  analytics: 'Advanced analytics',
  booking: 'Calendar booking'
};
const TRIAL_DAYS = 14,
  GRACE_DAYS = 7,
  FREE_ROOMS = 0; /* v71: every Room is paid ($199 per event), matching the published price card */
const TAX = {
  GB: ['VAT', 20],
  IE: ['VAT', 23],
  DE: ['VAT', 19],
  FR: ['VAT', 20],
  NL: ['VAT', 21],
  KE: ['VAT', 16],
  AE: ['VAT', 5],
  ZA: ['VAT', 15]
};
const COUNTRIES = [
  ['US', 'United States'],
  ['GB', 'United Kingdom'],
  ['KE', 'Kenya'],
  ['IE', 'Ireland'],
  ['DE', 'Germany'],
  ['FR', 'France'],
  ['NL', 'Netherlands'],
  ['AE', 'United Arab Emirates'],
  ['ZA', 'South Africa'],
  ['CA', 'Canada'],
  ['AU', 'Australia'],
  ['IN', 'India'],
  ['NG', 'Nigeria']
];
const money = (n, c = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);
const bDate = t =>
  new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const addMonths = (t, n) => {
  const d = new Date(t);
  d.setMonth(d.getMonth() + n);
  return d.getTime();
};
function bGet(u) {
  u = u || me();
  const p = (u && u.prefs) || {};
  const b = Object.assign(
    {
      plan: 'free',
      interval: 'month',
      status: 'active',
      periodEnd: null,
      cancelAt: null,
      trialEnd: null,
      trialUsed: false,
      card: null,
      roomCredits: 0,
      details: {},
      invoices: [],
      seq: 0
    },
    p.billing || {}
  );
  b.invoices = (b.invoices || []).slice();
  b.details = Object.assign({}, b.details);
  return b;
}
/* the plan the user can actually use right now */
function planOf(u) {
  const b = bGet(u);
  if (b.plan === 'pro' && ['active', 'trialing'].includes(b.status)) return 'pro';
  return 'free';
}
function has(f) {
  return planOf() === 'pro' || !FEATURES[f];
}
function bStatusLabel(b) {
  if (b.plan !== 'pro') return 'Free plan';
  if (b.status === 'trialing') return 'Pro trial';
  if (b.status === 'past_due') return 'Payment overdue';
  if (b.cancelAt) return 'Pro, cancels ' + bDate(b.cancelAt);
  return 'Pro plan';
}
async function bSave(b, msg) {
  const u = me();
  const prefs = Object.assign({}, u.prefs || {}, { billing: b });
  const plan = b.plan === 'pro' && ['active', 'trialing'].includes(b.status) ? 'Pro' : 'Free';
  if (!(await upd('profiles', u.id, { prefs, plan }))) return false;
  u.prefs = prefs;
  u.plan = plan;
  save();
  if (msg) toast(msg);
  window._keepScroll = true;
  render();
  return true;
}
function bTax(b, sub) {
  const t = TAX[(b.details || {}).country];
  return t
    ? { label: t[0] + ' ' + t[1] + '%', amount: Math.round(sub * t[1]) / 100 }
    : { label: 'Tax', amount: 0 };
}
function bInvoice(b, desc, amount, o = {}) {
  b.seq = (b.seq || 0) + 1;
  const now = o.date || Date.now();
  const tx = bTax(b, amount);
  const inv = {
    id: uid(),
    number: 'IT-' + new Date(now).getFullYear() + '-' + String(b.seq).padStart(4, '0'),
    date: now,
    due: o.due || now,
    desc,
    period: o.period || null,
    lines: [{ d: desc, amount }],
    subtotal: amount,
    taxLabel: tx.label,
    tax: tx.amount,
    total: Math.round((amount + tx.amount) * 100) / 100,
    currency: 'USD',
    status: o.status || 'open',
    paidAt: o.status === 'paid' ? now : null,
    method: o.method || null,
    kind: o.kind || 'subscription'
  };
  b.invoices.unshift(inv);
  return inv;
}
/* keep subscriptions honest over time: trial ends, renewals, cancellations, overdue invoices */
function bLifecycle() {
  const u = me();
  if (!u || window._bLife === u.id) return;
  window._bLife = u.id;
  const b = bGet(u),
    now = Date.now();
  let changed = false;
  if (!(u.prefs && u.prefs.billing) && u.plan === 'Pro' && MODE === 'demo') {
    const start = addMonths(now, -2);
    b.plan = 'pro';
    b.status = 'active';
    b.interval = 'month';
    b.trialUsed = true;
    b.card = { brand: 'Visa', last4: '4242', exp: '12/28' };
    b.roomCredits = 2;
    b.details = { name: u.name, email: u.email, country: 'GB', company: u.company || '' };
    [start, addMonths(start, 1)].forEach(t =>
      bInvoice(b, 'Introthread Pro, monthly', 12, {
        date: t,
        status: 'paid',
        method: 'Visa 4242',
        period: [t, addMonths(t, 1)]
      })
    );
    b.periodEnd = addMonths(start, 2);
    changed = true;
  }
  if (b.plan === 'pro' && b.status === 'trialing' && b.trialEnd && now >= b.trialEnd) {
    const open = b.invoices.find(i => i.status === 'open' && i.kind === 'subscription');
    if (open) {
      b.status = 'past_due';
    } else {
      b.status = 'active';
    }
    changed = true;
  }
  if (b.plan === 'pro' && b.cancelAt && now >= b.cancelAt) {
    b.plan = 'free';
    b.status = 'active';
    b.cancelAt = null;
    b.periodEnd = null;
    changed = true;
  }
  if (b.plan === 'pro' && b.status === 'active' && b.periodEnd && now >= b.periodEnd && !b.cancelAt) {
    const n = b.interval === 'year' ? 12 : 1;
    if (MODE === 'demo' && b.card) {
      while (b.periodEnd <= now) {
        bInvoice(b, 'Introthread Pro, ' + (n === 12 ? 'yearly' : 'monthly'), PLANS.pro.price[b.interval], {
          date: b.periodEnd,
          status: 'paid',
          method: b.card.brand + ' ' + b.card.last4,
          period: [b.periodEnd, addMonths(b.periodEnd, n)]
        });
        b.periodEnd = addMonths(b.periodEnd, n);
      }
    } else {
      bInvoice(b, 'Introthread Pro, ' + (n === 12 ? 'yearly' : 'monthly'), PLANS.pro.price[b.interval], {
        date: b.periodEnd,
        due: b.periodEnd + GRACE_DAYS * DAY,
        period: [b.periodEnd, addMonths(b.periodEnd, n)]
      });
      b.periodEnd = addMonths(b.periodEnd, n);
      b.status = 'past_due';
    }
    changed = true;
  }
  if (b.status === 'past_due') {
    const od = b.invoices.find(i => i.status === 'open' && i.kind === 'subscription');
    if (!od) {
      b.status = 'active';
      changed = true;
    } else if (now > od.due + GRACE_DAYS * DAY) {
      b.plan = 'free';
      b.status = 'active';
      b.periodEnd = null;
      changed = true;
    }
  }
  if (changed) bSave(b);
}
/* ---------- Plan & billing UI ---------- */
let BINT = 'month',
  BINVF = 'all';
function bUsage(u) {
  const R = myRooms().length,
    b = bGet(u);
  return {
    rooms: R,
    roomAllow: FREE_ROOMS + (b.roomCredits || 0) + R - Math.max(0, R - FREE_ROOMS) - 0,
    threads: myThreads().length,
    credits: b.roomCredits || 0
  };
}
function bStatusChip(b) {
  const c =
    b.plan !== 'pro'
      ? 'n'
      : b.status === 'trialing'
        ? 'b'
        : b.status === 'past_due'
          ? 'r'
          : b.cancelAt
            ? 'o'
            : 'g';
  return `<span class="bl-chip ${c}">${b.plan !== 'pro' ? 'Free' : b.status === 'trialing' ? 'Trial' : b.status === 'past_due' ? 'Overdue' : b.cancelAt ? 'Cancelling' : 'Active'}</span>`;
}
function bInvStatus(i) {
  return `<span class="bl-chip ${i.status === 'paid' ? 'g' : i.status === 'open' ? (Date.now() > i.due ? 'r' : 'o') : 'n'}">${i.status === 'paid' ? 'Paid' : i.status === 'open' ? (Date.now() > i.due ? 'Overdue' : 'Pending') : 'Void'}</span>`;
}
function bPlanCard(b) {
  const pro = b.plan === 'pro';
  const P = PLANS.pro;
  const price = pro ? P.price[b.interval] : 0;
  const open = b.invoices.find(i => i.status === 'open');
  let line = 'You&rsquo;re on the Free plan. Upgrade when you need more.';
  if (pro && b.status === 'trialing')
    line = `Free trial ends <b>${bDate(b.trialEnd)}</b>. ${open ? 'Your first invoice is ready for when the trial ends.' : ''}`;
  else if (pro && b.status === 'past_due')
    line = `Payment is overdue. Pay invoice <b>${open ? open.number : ''}</b> to keep Pro features.`;
  else if (pro && b.cancelAt)
    line = `Pro stays active until <b>${bDate(b.cancelAt)}</b>, then you move to Free.`;
  else if (pro) line = `Renews on <b>${bDate(b.periodEnd)}</b> for ${money(price)} per ${b.interval}.`;
  return `<section class="d-box bl-cur"><div class="bl-curh"><div><small>Current plan</small><b>${pro ? 'Pro' : 'Free'} ${bStatusChip(b)}</b><p>${line}</p></div><div class="bl-price">${money(price)}<small>/${pro ? b.interval : 'month'}</small></div></div>
 <div class="bl-curb">${pro ? `${b.status === 'past_due' && open ? `<button type="button" class="x-btn" data-on-click="bPayModal('${open.id}')">Pay ${money(open.total, open.currency || 'USD')} now</button>` : ''}${b.cancelAt ? `<button type="button" class="x-btn" data-on-click="bResume()">Resume Pro</button>` : `<button type="button" class="t-how" data-on-click="bSwitchInterval()">Switch to ${b.interval === 'month' ? 'yearly (save 17%)' : 'monthly'}</button><button type="button" class="t-how bl-danger" data-on-click="bCancel()">Cancel subscription</button>`}` : `<button type="button" class="x-btn" data-on-click="bUpgrade()">${sv('spark', 16)} Upgrade to Pro</button>`}</div></section>`;
}
function bCompare(b) {
  const pro = b.plan === 'pro' && ['active', 'trialing', 'past_due'].includes(b.status);
  const P = PLANS;
  const col = (p, price, per, btn) =>
    `<div class="bl-plan ${p.id === (pro ? 'pro' : 'free') ? 'on' : ''} ${p.id === 'pro' ? 'hot' : ''}">${p.id === 'pro' ? '<span class="bl-tag">Most popular</span>' : ''}<b>${esc(p.name)}</b><small>${esc(p.tag)}</small><div class="bl-pa">${price}<small>${per}</small></div>${btn}<ul>${p.features.map(f => `<li>${sv('check', 14, 'currentColor', 2.6)}${f}</li>`).join('')}</ul></div>`;
  return `<section class="d-box"><div class="cd-bh"><span class="cd-bi">${sv('grid', 20)}</span><div><b>Plans</b><small>What each plan includes. Prices in USD and exclude tax.</small></div></div>
 <div class="bl-plans">${col(P.free, '$0', '/forever', pro ? `<button type="button" class="t-how block" data-on-click="bCancel()">${b.cancelAt ? 'Moving to Free' : 'Downgrade'}</button>` : '<button type="button" class="t-how block" disabled>Current plan</button>')}
 ${col(P.pro, money(BINT === 'month' ? proM() : Math.round((proY() / 12) * 100) / 100), BINT === 'month' ? '/month' : '/month, billed ' + money(proY()) + ' yearly', pro ? `<button type="button" class="t-how block" disabled>Current plan</button>` : `<button type="button" class="x-btn block" data-on-click="bUpgrade('${BINT}')">${b.trialUsed ? 'Upgrade to Pro' : 'Start ' + TRIAL_DAYS + '-day free trial'}</button>`)}
 ${col(P.rooms, '$199', '/event', `<button type="button" class="t-how block" data-on-click="bRoomPass()">Buy a Room pass</button>`)}
 ${col(P.networks, 'Custom', '/annual', `<a class="t-how block" href="mailto:hello@introthread.com?subject=Introthread%20Networks">Talk to sales</a>`)}</div></section>`;
}
function bUsageBox(u, b) {
  const R = myRooms().length,
    allow = FREE_ROOMS + (b.roomCredits || 0) + Math.max(0, R - FREE_ROOMS);
  const pro = planOf(u) === 'pro';
  const bar = (l, v, max, txt) =>
    `<div class="bl-us"><div><span>${l}</span><b>${txt}</b></div><i><s style="width:${max ? Math.min(100, (v / max) * 100) : 100}%"></s></i></div>`;
  return `<section class="d-box"><div class="cd-bh"><span class="cd-bi">${sv('chart', 20)}</span><div><b>Usage and access</b><small>What you can use on your current plan.</small></div></div>
 ${bar('Threads', myThreads().length, 0, myThreads().length + ' &middot; unlimited')}${bar('Rooms', R, allow, R + ' of ' + allow + ' available')}<p class="bl-fine">Each Room needs a Room pass ($199 per event). Unused passes: <b>${b.roomCredits || 0}</b>.</p>
 <ul class="bl-feat">${Object.entries(FEATURES)
   .map(
     ([k, l]) =>
       `<li class="${pro ? 'ok' : ''}">${pro ? sv('check', 13, '#fff', 3) : sv('lock', 12)}<span>${l}</span>${pro ? '' : `<button type="button" data-on-click="bUpgrade()">Unlock</button>`}</li>`
   )
   .join('')}</ul></section>`;
}
function bInvoicesBox(b) {
  const L = b.invoices.filter(
    i =>
      BINVF === 'all' ||
      (BINVF === 'paid' && i.status === 'paid') ||
      (BINVF === 'open' && i.status === 'open')
  );
  const cnt = s => b.invoices.filter(i => s === 'all' || i.status === s).length;
  return `<section class="d-box bl-inv"><div class="cd-bh"><span class="cd-bi">${sv('brief', 20)}</span><div><b>Invoices</b><small>Every paid and pending invoice on your account.</small></div></div>
 <nav class="bl-ftabs">${[
   ['all', 'All'],
   ['paid', 'Paid'],
   ['open', 'Pending']
 ]
   .map(
     ([k, l]) =>
       `<button type="button" class="${BINVF === k ? 'on' : ''}" data-on-click="bInvF('${k}')">${l} (${cnt(k)})</button>`
   )
   .join('')}</nav>
 ${L.length ? `<div class="bl-table" role="table"><div class="bl-tr bl-th" role="row"><span>Invoice</span><span>Date</span><span>Description</span><span>Amount</span><span>Status</span><span></span></div>${L.map(i => `<div class="bl-tr" role="row"><span><b>${i.number}</b></span><span>${bDate(i.date)}</span><span>${esc(i.desc)}</span><span>${money(i.total, i.currency || 'USD')}</span><span>${bInvStatus(i)}</span><span class="bl-ta"><button type="button" data-on-click="bInvView('${i.id}')">View</button>${i.status === 'open' ? `<button type="button" class="pay" data-on-click="bPayModal('${i.id}')">Pay</button>` : ''}<button type="button" aria-label="Download ${i.number}" data-on-click="bInvPrint('${i.id}')">${sv('arrow', 14).replace('M5 12h14M13 6l6 6-6 6', 'M12 5v14M6 13l6 6 6-6')}</button></span></div>`).join('')}</div>` : `<div class="d-empty">${sv('brief', 22)}<div><b>No invoices ${BINVF === 'all' ? 'yet' : 'here'}</b><small>Invoices appear here when you upgrade or buy a Room pass.</small></div></div>`}</section>`;
}
function bMethodBox(b) {
  return `<section class="d-box"><div class="cd-bh"><span class="cd-bi">${sv('wallet', 20)}</span><div><b>Payment method</b><small>${cloud() ? 'Card payments open soon. Invoices can be paid by bank transfer meanwhile.' : 'Demo account: cards are simulated, nothing is charged.'}</small></div></div>
 ${b.card ? `<div class="bl-card"><span class="bl-brand">${esc(b.card.brand)}</span><div><b>&bull;&bull;&bull;&bull; ${esc(b.card.last4)}</b><small>Expires ${esc(b.card.exp)}</small></div>${cloud() ? '' : `<button type="button" class="t-how sm" data-on-click="bCardModal()">Update</button><button type="button" class="t-how sm bl-danger" data-on-click="bCardRemove()">Remove</button>`}</div>` : `<p class="bl-fine" style="margin:0 0 10px">No card on file.</p>${cloud() ? '' : `<button type="button" class="t-how sm" data-on-click="bCardModal()">${sv('wallet', 15)} Add card</button>`}`}</section>`;
}
function bDetailsBox(b) {
  const d = b.details || {},
    u = me();
  const f = (id, l, v, o = '') =>
    `<label class="x-f"><span>${l}</span><input id="${id}" value="${esc(v || '')}" ${o}></label>`;
  return `<section class="d-box"><div class="cd-bh"><span class="cd-bi">${sv('building', 20)}</span><div><b>Billing details</b><small>Shown on your invoices. Tax is added based on your country.</small></div></div>
 <form class="bl-df" data-on-submit="return bDetailsSave(event)"><div class="t-g2">${f('bdn', 'Name or company', d.name || u.name, 'required maxlength="80"')}${f('bde', 'Billing email', d.email || u.email, 'type="email" required maxlength="120"')}${f('bdc', 'Company (optional)', d.company, 'maxlength="80"')}${f('bdv', 'VAT or tax ID (optional)', d.vat, 'maxlength="30"')}${f('bda', 'Address (optional)', d.address, 'maxlength="160"')}<label class="x-f"><span>Country</span><select id="bdk" class="th-sort" style="width:100%">${COUNTRIES.map(([c, n]) => `<option value="${c}" ${(d.country || 'US') === c ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div><div class="fu-b" style="margin-top:12px"><button class="x-btn">Save billing details</button></div></form></section>`;
}
async function bDetailsSave(e) {
  e.preventDefault();
  const b = bGet();
  const v = i => ($('#' + i).value || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('bde'))) {
    toast('Enter a valid billing email');
    return false;
  }
  b.details = {
    name: v('bdn'),
    email: v('bde'),
    company: v('bdc'),
    vat: v('bdv'),
    address: v('bda'),
    country: v('bdk')
  };
  await bSave(b, 'Billing details saved');
  return false;
}
function bBilling(u) {
  bLifecycle();
  const b = bGet(u);
  return `<div class="bl-wide">${b.status === 'past_due' ? `<div class="bl-alert">${sv('bell', 18)}<span>Your Pro payment is overdue. Pay the pending invoice to keep Pro features. Access ends ${GRACE_DAYS} days after the due date.</span></div>` : ''}
 <div class="bl-grid"><div class="bl-col">${bPlanCard(b)}${bCompare(b)}${bInvoicesBox(b)}</div><div class="bl-col">${bUsageBox(u, b)}${bMethodBox(b)}${bDetailsBox(b)}</div></div></div>`;
}
/* checkout */
function bCheckoutBody(kind, interval) {
  const b = bGet();
  const amount = kind === 'rooms' ? 199 : PLANS.pro.price[interval];
  const tx = bTax(b, amount);
  const trial = kind === 'pro' && !b.trialUsed;
  return `<div class="bl-sum"><div><span>${kind === 'rooms' ? 'Room pass, one event' : 'Introthread Pro, ' + (interval === 'year' ? 'yearly' : 'monthly')}</span><b>${money(amount)}</b></div>${tx.amount ? `<div><span>${tx.label}</span><b>${money(tx.amount)}</b></div>` : ''}<div class="tot"><span>${trial ? 'Due today' : 'Total'}</span><b>${trial ? money(0) : money(amount + tx.amount)}</b></div>${trial ? `<p>Then ${money(amount + tx.amount)} on ${bDate(Date.now() + TRIAL_DAYS * DAY)}. Cancel any time before and you won&rsquo;t be charged.</p>` : ''}</div>`;
}
function bUpgrade(interval) {
  interval = interval || BINT;
  const b = bGet();
  if (planOf() === 'pro' && b.status !== 'past_due') return toast('You already have Pro');
  const trial = !b.trialUsed;
  modal(`<div class="bl-co"><div class="row between"><h3>Upgrade to Pro</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div>
 ${bCheckoutBody('pro', interval)}<ul class="bl-incl">${PLANS.pro.features
   .slice(1)
   .map(f => `<li>${sv('check', 13, 'currentColor', 2.6)}${f}</li>`)
   .join('')}</ul>
 ${trial ? `<button type="button" class="x-btn lg block" data-on-click="bStartTrial('${interval}')">Start ${TRIAL_DAYS}-day free trial</button><p class="bl-fine c">No card needed to start. Your first invoice appears in Billing.</p>` : bPayForm(`bBuyPro('${interval}')`, 'Pay and upgrade')}</div>`);
}
function bPayForm(action, label) {
  if (cloud())
    return `<button type="button" class="x-btn lg block" data-on-click="${action.replace(/\)$/, ",'invoice')")}">Request invoice</button><p class="bl-fine c">Card payments open soon. We&rsquo;ll create a pending invoice you can pay by bank transfer; Pro starts once it is paid.</p>`;
  return `<form class="bl-pay" data-on-submit="bCardSubmit(event,this)" data-act="${action}"><label class="x-f"><span>Card number</span><input id="bcn" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242" maxlength="23" data-on-input="bFmtCard(this)" required></label><div class="t-g2"><label class="x-f"><span>Expiry</span><input id="bce" placeholder="MM/YY" autocomplete="cc-exp" maxlength="5" data-on-input="bFmtExp(this)" required></label><label class="x-f"><span>CVC</span><input id="bcc" inputmode="numeric" autocomplete="cc-csc" maxlength="4" placeholder="123" required></label></div><div class="otp-note err" id="bcerr" hidden></div><button class="x-btn lg block">${label}</button><p class="bl-fine c">${sv('lock', 12)} Demo account: this card is simulated and nothing is charged.</p></form>`;
}
function luhn(n) {
  let s = 0,
    a = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = +n[i];
    if (a) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    s += d;
    a = !a;
  }
  return s % 10 === 0;
}
function bCardValid() {
  const n = $('#bcn').value.replace(/\s/g, ''),
    e = $('#bce').value,
    c = $('#bcc').value,
    er = $('#bcerr');
  const m = e.match(/^(\d{2})\/(\d{2})$/);
  let msg = '';
  if (!/^\d{13,19}$/.test(n) || !luhn(n)) msg = 'Check your card number.';
  else if (!m || +m[1] < 1 || +m[1] > 12 || new Date(2000 + +m[2], +m[1], 1) <= new Date())
    msg = 'Check the expiry date.';
  else if (!/^\d{3,4}$/.test(c)) msg = 'Check the CVC.';
  if (msg) {
    er.textContent = msg;
    er.hidden = false;
    return false;
  }
  window._card = {
    brand: /^4/.test(n)
      ? 'Visa'
      : /^5[1-5]|^2[2-7]/.test(n)
        ? 'Mastercard'
        : /^3[47]/.test(n)
          ? 'Amex'
          : 'Card',
    last4: n.slice(-4),
    exp: e
  };
  return true;
}
async function bStartTrial(interval) {
  const b = bGet();
  if (b.trialUsed) return;
  const now = Date.now(),
    end = now + TRIAL_DAYS * DAY;
  Object.assign(b, {
    plan: 'pro',
    status: 'trialing',
    interval,
    trialUsed: true,
    trialEnd: end,
    periodEnd: addMonths(end, interval === 'year' ? 12 : 1),
    cancelAt: null
  });
  bInvoice(b, 'Introthread Pro, ' + (interval === 'year' ? 'yearly' : 'monthly'), PLANS.pro.price[interval], {
    date: now,
    due: end,
    period: [end, addMonths(end, interval === 'year' ? 12 : 1)]
  });
  closeModal();
  await bSave(b, 'Your Pro trial has started. Enjoy!');
}
async function bBuyPro(interval, mode) {
  const b = bGet(),
    now = Date.now(),
    n = interval === 'year' ? 12 : 1;
  if (mode === 'invoice') {
    bInvoice(b, 'Introthread Pro, ' + (n === 12 ? 'yearly' : 'monthly'), PLANS.pro.price[interval], {
      date: now,
      due: now + GRACE_DAYS * DAY
    });
    b.interval = interval;
    closeModal();
    await bSave(b, 'Invoice created. Find it under Invoices.');
    return;
  }
  b.card = window._card || b.card;
  const old = b.invoices.find(i => i.status === 'open' && i.kind === 'subscription');
  if (old) old.status = 'void';
  Object.assign(b, {
    plan: 'pro',
    status: 'active',
    interval,
    periodEnd: addMonths(now, n),
    cancelAt: null,
    trialEnd: null,
    trialUsed: true
  });
  bInvoice(b, 'Introthread Pro, ' + (n === 12 ? 'yearly' : 'monthly'), PLANS.pro.price[interval], {
    date: now,
    status: 'paid',
    method: b.card.brand + ' ' + b.card.last4,
    period: [now, addMonths(now, n)]
  });
  closeModal();
  await bSave(b, 'Payment successful. Welcome to Pro!');
}
function bRoomPass() {
  modal(
    `<div class="bl-co"><div class="row between"><h3>Buy a Room pass</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div><p class="fu-sub">One Room for an event or community, with QR badges and a live Resolution Report.</p>${bCheckoutBody('rooms')}${bPayForm('bBuyRoom()', 'Pay ' + money(199 + bTax(bGet(), 199).amount))}</div>`
  );
}
async function bBuyRoom(mode) {
  const b = bGet();
  if (mode === 'invoice') {
    bInvoice(b, 'Room pass, one event', 199, {
      date: Date.now(),
      due: Date.now() + GRACE_DAYS * DAY,
      kind: 'rooms'
    });
    closeModal();
    await bSave(b, 'Invoice created. Your Room pass unlocks when it is paid.');
    return;
  }
  b.card = window._card || b.card;
  b.roomCredits = (b.roomCredits || 0) + 1;
  bInvoice(b, 'Room pass, one event', 199, {
    date: Date.now(),
    status: 'paid',
    method: b.card.brand + ' ' + b.card.last4,
    kind: 'rooms'
  });
  closeModal();
  await bSave(b, 'Room pass added. You can create another Room.');
}
function bPayModal(id) {
  const b = bGet(),
    i = b.invoices.find(x => x.id === id);
  if (!i) return;
  if (cloud()) {
    modal(
      `<div class="bl-co"><div class="row between"><h3>Pay invoice ${i.number}</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div><div class="bl-sum"><div class="tot"><span>Amount due</span><b>${money(i.total, i.currency || 'USD')}</b></div></div><p class="fu-sub">Online card payment is being set up. To pay now, email <a href="mailto:billing@introthread.com?subject=${encodeURIComponent('Invoice ' + i.number)}">billing@introthread.com</a> with your invoice number and we will send bank transfer details. Your plan updates as soon as payment is received.</p><div class="fu-b"><button type="button" class="t-how" data-on-click="bInvPrint('${i.id}')">Download invoice</button><button type="button" class="x-btn" data-on-click="closeModal()">Done</button></div></div>`
    );
    return;
  }
  modal(
    `<div class="bl-co"><div class="row between"><h3>Pay invoice ${i.number}</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div><div class="bl-sum"><div><span>${esc(i.desc)}</span><b>${money(i.subtotal, i.currency || 'USD')}</b></div>${i.tax ? `<div><span>${i.taxLabel}</span><b>${money(i.tax, i.currency || 'USD')}</b></div>` : ''}<div class="tot"><span>Amount due</span><b>${money(i.total, i.currency || 'USD')}</b></div></div>${b.card ? `<button type="button" class="x-btn lg block" data-on-click="bPayInvNew('${i.id}')">Pay with ${esc(b.card.brand)} &bull;&bull;&bull;&bull; ${esc(b.card.last4)}</button><p class="bl-fine c">or use a different card below</p>` : ''}${bPayForm(`bPayInv('${i.id}')`, 'Pay ' + money(i.total, i.currency || 'USD'))}</div>`
  );
}
async function bPayInv(id) {
  const b = bGet(),
    i = b.invoices.find(x => x.id === id);
  if (!i || i.status !== 'open') return;
  b.card = window._card || b.card;
  if (!b.card) return toast('Add a card first');
  i.status = 'paid';
  i.paidAt = Date.now();
  i.method = b.card.brand + ' ' + b.card.last4;
  if (i.kind === 'rooms') b.roomCredits = (b.roomCredits || 0) + 1;
  if (i.kind === 'subscription') {
    if (b.status === 'trialing') {
      b.status = 'trialing';
    } else {
      b.plan = 'pro';
      b.status = 'active';
      if (!b.periodEnd || b.periodEnd < Date.now())
        b.periodEnd = addMonths(Date.now(), b.interval === 'year' ? 12 : 1);
    }
  }
  closeModal();
  await bSave(b, 'Invoice ' + i.number + ' paid');
}
async function bCancel() {
  const b = bGet();
  if (b.plan !== 'pro') return;
  const end = b.status === 'trialing' ? b.trialEnd : b.periodEnd;
  if (
    !confirm(
      b.status === 'trialing'
        ? 'Cancel your trial? Pro ends on ' + bDate(end) + ' and you will not be charged.'
        : 'Cancel Pro? You keep Pro until ' +
            bDate(end) +
            ', then move to Free. You can resume any time before then.'
    )
  )
    return;
  b.cancelAt = end;
  b.invoices.forEach(i => {
    if (i.status === 'open' && i.kind === 'subscription' && b.status === 'trialing') i.status = 'void';
  });
  await bSave(b, 'Subscription cancelled. Pro stays active until ' + bDate(end) + '.');
}
async function bResume() {
  const b = bGet();
  b.cancelAt = null;
  if (b.status === 'trialing' && !b.invoices.some(i => i.status === 'open' && i.kind === 'subscription'))
    bInvoice(
      b,
      'Introthread Pro, ' + (b.interval === 'year' ? 'yearly' : 'monthly'),
      PLANS.pro.price[b.interval],
      { date: Date.now(), due: b.trialEnd }
    );
  await bSave(b, 'Pro resumed');
}
async function bSwitchInterval() {
  const b = bGet();
  const to = b.interval === 'month' ? 'year' : 'month';
  if (
    !confirm(
      `Switch to ${to === 'year' ? 'yearly (' + money(proY()) + ' per year)' : 'monthly (' + money(proM()) + ' per month)'} billing? The change applies from your next billing date, ${bDate(b.status === 'trialing' ? b.trialEnd : b.periodEnd)}.`
    )
  )
    return;
  b.interval = to;
  const o = b.invoices.find(i => i.status === 'open' && i.kind === 'subscription');
  if (o) {
    o.desc = 'Introthread Pro, ' + (to === 'year' ? 'yearly' : 'monthly');
    o.lines = [{ d: o.desc, amount: PLANS.pro.price[to] }];
    o.subtotal = PLANS.pro.price[to];
    const tx = bTax(b, o.subtotal);
    o.tax = tx.amount;
    o.taxLabel = tx.label;
    o.total = Math.round((o.subtotal + o.tax) * 100) / 100;
  }
  await bSave(b, 'Billing switched to ' + (to === 'year' ? 'yearly' : 'monthly'));
}
function bCardModal() {
  modal(
    `<div class="bl-co"><div class="row between"><h3>${bGet().card ? 'Update card' : 'Add card'}</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div>${bPayForm('bCardSave()', 'Save card')}</div>`
  );
}
async function bCardSave() {
  const b = bGet();
  b.card = window._card;
  closeModal();
  await bSave(b, 'Card saved');
}
async function bCardRemove() {
  if (!confirm('Remove this card? Renewals will create pending invoices instead.')) return;
  const b = bGet();
  b.card = null;
  await bSave(b, 'Card removed');
}
function bInvHTML(i) {
  const b = bGet(),
    d = b.details || {},
    u = me();
  return `<div class="bl-doc"><div class="bl-dh"><div><span class="x-logo"><span class="x-lm"><i></i><i></i></span><span>intro<b>thread</b></span></span><p>Introthread Ltd<br>London &middot; New York<br>billing@introthread.com</p></div><div class="bl-dn"><b>Invoice</b><span>${i.number}</span>${bInvStatus(i)}</div></div>
 <div class="bl-dm"><div><small>Billed to</small><b>${esc(d.name || u.name)}</b>${d.company ? `<span>${esc(d.company)}</span>` : ''}<span>${esc(d.email || u.email || '')}</span>${d.address ? `<span>${esc(d.address)}</span>` : ''}${d.vat ? `<span>Tax ID ${esc(d.vat)}</span>` : ''}</div><div><small>Issued</small><b>${bDate(i.date)}</b><small>${i.status === 'paid' ? 'Paid' : 'Due'}</small><b>${bDate(i.status === 'paid' ? i.paidAt : i.due)}</b>${i.period ? `<small>Service period</small><b>${bDate(i.period[0])} &ndash; ${bDate(i.period[1])}</b>` : ''}</div></div>
 <div class="bl-dl"><div class="h"><span>Description</span><span>Amount</span></div>${i.lines.map(l => `<div><span>${esc(l.d)}</span><span>${money(l.amount, i.currency || 'USD')}</span></div>`).join('')}<div class="s"><span>Subtotal</span><span>${money(i.subtotal, i.currency || 'USD')}</span></div><div class="s"><span>${i.taxLabel}</span><span>${money(i.tax, i.currency || 'USD')}</span></div><div class="t"><span>Total (USD)</span><span>${money(i.total, i.currency || 'USD')}</span></div></div>
 ${i.method ? `<p class="bl-fine">Paid with ${esc(i.method)}${MODE === 'demo' ? ' (demo, simulated)' : ''}.</p>` : ''}</div>`;
}
function bInvView(id) {
  const i = bGet().invoices.find(x => x.id === id);
  if (!i) return;
  modal(
    `<div>${bInvHTML(i)}<div class="fu-b">${i.status === 'open' ? `<button type="button" class="x-btn" data-on-click="bPayModal('${i.id}')">Pay ${money(i.total, i.currency || 'USD')}</button>` : ''}<button type="button" class="t-how" data-on-click="bInvPrint('${i.id}')">Download PDF</button><button type="button" class="t-how" data-on-click="closeModal()">Close</button></div></div>`
  );
}
function bInvPrint(id) {
  const i = bGet().invoices.find(x => x.id === id);
  if (!i) return;
  const w = window.open('', '_blank');
  if (!w) return toast('Allow pop-ups to download the invoice.');
  const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
  w.document.write(
    `<!doctype html><title>${i.number} - Introthread invoice</title><style>${css}body{background:#fff;padding:32px;font-family:sans-serif}.bl-doc{max-width:720px;margin:auto}</style>${bInvHTML(i)}<scr` +
      `ipt>setTimeout(()=>print(),400)</scr` +
      `ipt>`
  );
  w.document.close();
}
/* ---------- Pro feature gates ---------- */
function bLocked(f) {
  modal(
    `<div class="bl-co"><span class="otp-ic">${sv('lock', 24)}</span><h3>${FEATURES[f] || 'This feature'} is a Pro feature</h3><p class="fu-sub">Upgrade to Pro to unlock ${(FEATURES[f] || 'it').toLowerCase()}, plus AI follow-up drafts, NFC writing, Thread export and advanced analytics.</p><div class="fu-b"><button type="button" class="t-how" data-on-click="closeModal()">Not now</button><button type="button" class="x-btn" data-on-click="closeModal();bUpgrade()">${sv('spark', 15)} ${bGet().trialUsed ? 'Upgrade to Pro' : 'Start free trial'}</button></div></div>`
  );
}
const bLockCard = (f, txt) =>
  `<div class="bl-lockcard"><span>${sv('lock', 18)}</span><div><b>${FEATURES[f]} is part of Pro</b><small>${txt}</small></div><button type="button" class="x-btn sm" data-on-click="bUpgrade()">Unlock</button></div>`;
const _tapNFC19 = tapNFC;
tapNFC = function () {
  if (!has('nfc')) return bLocked('nfc');
  return _tapNFC19.apply(this, arguments);
};
const _tapIns19 = tapInsights;
tapInsights = function () {
  const h = _tapIns19();
  if (has('analytics')) return h;
  let n = 0;
  return h.replace(/<section class="t-panel">/g, m =>
    ++n === 2
      ? `<section class="t-panel bl-locked"><div class="bl-ov"><span>${sv('lock', 18)}</span><b>Sharing analytics is part of Pro</b><button type="button" class="x-btn sm" data-on-click="bUpgrade()">Unlock</button></div>`
      : m
  );
};
const _vThread19 = vThread;
vThread = function (id) {
  const h = _vThread19(id);
  if (has('ai_drafts')) return h;
  return h.replace(
    /<div class="td-draft">[\s\S]*?<\/textarea><div class="fu-b"[\s\S]*?<\/div><\/div>/,
    bLockCard('ai_drafts', 'Get a follow-up drafted from this Thread in your voice, ready to edit and send.')
  );
};
function bExportThreads() {
  if (!has('export')) return bLocked('export');
  const T = myThreads();
  const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const rows = [
    [
      'Name',
      'Role',
      'Company',
      'Email',
      'Where',
      'Started',
      'Status',
      'Verified',
      'Your answer',
      'Their answer',
      'Topics',
      'Note'
    ]
  ].concat(
    T.map(t => [
      t.other.name,
      t.other.role,
      t.other.company,
      t.other.email,
      t.where,
      new Date(t.createdAt).toISOString().slice(0, 10),
      threadState(t),
      t.confirmed ? 'yes' : 'no',
      t.mine || '',
      t.theirs === 'notnow' ? 'keep' : t.theirs || '',
      tagsOf(t).join('; '),
      t.note
    ])
  );
  const a = document.createElement('a');
  a.href = URL.createObjectURL(
    new Blob(['\ufeff' + rows.map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv' })
  );
  a.download = 'introthread-threads-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast(T.length + ' Threads exported');
}
const _vThreads19 = vThreads;
vThreads = function () {
  return _vThreads19().replace(
    '<button type="button" class="th-filter',
    `<button type="button" class="th-filter" data-on-click="bExportThreads()" title="Export Threads to CSV">${has('export') ? sv('arrow', 16).replace('M5 12h14M13 6l6 6-6 6', 'M12 5v14M6 13l6 6 6-6') : sv('lock', 15)} Export</button><button type="button" class="th-filter`
  );
};
/* Rooms: each Room uses a Room pass (FREE_ROOMS included, 0 since v71) */
function bRoomAllowed() {
  return myRooms().length < FREE_ROOMS || (bGet().roomCredits || 0) > 0;
}
const _newRoomModal19 = newRoomModal;
newRoomModal = function () {
  if (!bRoomAllowed()) {
    return modal(
      `<div class="bl-co"><span class="otp-ic">${sv('cal', 24)}</span><h3>Create a Room with a Room pass</h3><p class="fu-sub">Each Room is $199 per event: Room code, QR and badges, a live Resolution Report and up to 1,000 attendees.</p><div class="fu-b"><button type="button" class="t-how" data-on-click="closeModal()">Not now</button><button type="button" class="x-btn" data-on-click="closeModal();bRoomPass()">Buy a Room pass, $199</button></div></div>`
    );
  }
  return _newRoomModal19.apply(this, arguments);
};
const _newRoom19 = newRoom9;
newRoom9 = function (e) {
  const needPass = myRooms().length >= FREE_ROOMS;
  if (needPass && !bRoomAllowed()) {
    e && e.preventDefault && e.preventDefault();
    closeModal();
    bRoomPass();
    return false;
  }
  const before = DB.rooms.length;
  const r = _newRoom19.call(this, e);
  if (needPass) {
    let n = 0;
    const iv = setInterval(() => {
      if (DB.rooms.length > before) {
        clearInterval(iv);
        const b = bGet();
        b.roomCredits = Math.max(0, (b.roomCredits || 0) - 1);
        bSave(b, 'Room pass used');
      } else if (++n > 40) clearInterval(iv);
    }, 250);
  }
  return r;
};
/* ---------- Privacy & visibility ---------- */
async function lSet(k, v, msg) {
  const u = me();
  const links = Object.assign({}, u.links || {}, { [k]: v });
  if (await upd('profiles', u.id, { links })) {
    u.links = links;
    save();
    PP = null;
    CD = null;
    toast(msg || 'Saved');
    window._keepScroll = true;
    render();
  }
}
const bTog = (on, l, d, fn) =>
  `<label class="t-tog bl-row"><input type="checkbox" ${on ? 'checked' : ''} data-on-change="${fn}"><span class="t-sw"></span><span><b>${l}</b><small>${d}</small></span></label>`;
const bSec = (ic, t, s, body) =>
  `<section class="d-box bl-sec"><div class="cd-bh"><span class="cd-bi">${sv(ic, 20)}</span><div><b>${t}</b><small>${s}</small></div></div>${body}</section>`;
function bPrivacy(u) {
  const L = u.links || {},
    P = u.prefs || {};
  return `<div class="bl-stack">${bSec(
    'eye',
    'Profile visibility',
    'Control who can see your card and profile.',
    bTog(
      !L.hidden,
      'Public profile',
      'Anyone with your link or QR code can view your card. Turn off to hide it from everyone except you.',
      'cdVis(this.checked)'
    ) +
      bTog(
        !L.noindex,
        'Show my profile in search engines',
        'Allow Google and Bing to list your public profile.',
        "lSet('noindex',!this.checked,this.checked?'Search engines can list your profile':'Search engines asked not to list your profile')"
      ) +
      `<a class="bl-link" href="/app/profile" data-on-click="setPTab('look')">${sv('palette', 16)} Choose which details visitors see ${sv('chev', 14)}</a>`
  )}
 ${bSec(
   'link',
   'Connections',
   'Decide how people can connect with you.',
   bTog(
     L.allowThreads !== false,
     'Let people start a Thread from my card',
     'Visitors can send you their details and start a Thread. Turn off to show your card only.',
     "lSet('allowThreads',this.checked,this.checked?'Visitors can start Threads from your card':'Start a Thread is hidden on your card')"
   ) +
     bTog(
       L.vcfEmail !== false,
       'Include my email in Save contact',
       'Adds your contact email to the file visitors save.',
       "lSet('vcfEmail',this.checked)"
     ) +
     bTog(
       L.vcfPhone !== false,
       'Include my phone in Save contact',
       'Adds your phone number to the file visitors save.',
       "lSet('vcfPhone',this.checked)"
     ) +
     bTog(
       P.net !== false,
       'Count my verified Threads in network Warmth',
       'Only Threads where both people confirmed are counted.',
       "setPref('net',this.checked)"
     )
 )}
 ${bSec('shield', 'Your data', 'Download or delete what Introthread holds about you.', `<div class="bl-data"><div><b>Export everything</b><small>Your profile, Threads and Rooms as a JSON file.</small></div><button type="button" class="t-how sm" data-on-click="exportMine()">Download JSON</button></div><div class="bl-data"><div><b>Export Threads as CSV</b><small>Open in Excel or Google Sheets.${has('export') ? '' : ' Pro feature.'}</small></div><button type="button" class="t-how sm" data-on-click="bExportThreads()">${has('export') ? 'Download CSV' : sv('lock', 13) + ' Unlock'}</button></div><div class="bl-data"><div><b>Delete your account</b><small>Permanently remove your account and data.</small></div><button type="button" class="t-how sm bl-danger" data-on-click="stConfirm('delete')">Delete account</button></div>`)}</div>`;
}
const _pcVcf19 = pcVcf;
pcVcf = function (id) {
  const u = DB.users.find(x => x.id === id);
  if (!u) return;
  const L = u.links || {};
  const keep = { email: L.email, phone: L.phone };
  if (L.vcfEmail === false) L.email = '';
  if (L.vcfPhone === false) L.phone = '';
  try {
    _pcVcf19(id);
  } finally {
    L.email = keep.email;
    L.phone = keep.phone;
  }
};
const _vPub19 = vPublic;
vPublic = function (hd) {
  const h = _vPub19(hd);
  const u = DB.users.find(x => x.handle === String(hd).toLowerCase());
  if (!u || (u.links || {}).allowThreads !== false) return h;
  const f = esc((u.name || '').split(' ')[0]);
  return h.replace(
    /<section class="pc-box pc-start"[\s\S]*?<\/form><\/section>/,
    `<section class="pc-box pc-start off"><div class="pc-bh"><span class="pc-bi">${sv('lock', 20)}</span><div><b>${f} isn&rsquo;t taking new Threads from this card</b><small>You can still save ${f}&rsquo;s contact details or use the links above.</small></div></div></section>`
  );
};
const _guest19 = guestThread;
guestThread = function (e, oid) {
  const o = DB.users.find(u => u.id === oid);
  if (o && (o.links || {}).allowThreads === false) {
    e.preventDefault();
    toast('This card is not accepting new Threads.');
    return false;
  }
  return _guest19(e, oid);
};
/* ---------- Notifications ---------- */
function bNotifs(u) {
  const P = u.prefs || {};
  const t = (k, l, d, def = true) =>
    bTog(def ? P[k] !== false : P[k] === true, l, d, `setPref('${k}',this.checked)`);
  return `<div class="bl-stack"><div class="bl-info">${sv('mail', 16)}<span>Email notifications are saved now and start sending once your email service is connected. In-app notifications work today.</span></div>
 ${bSec('mail', 'Email', 'What we email you about.', t('emailConfirm', 'When someone confirms a Thread', 'So you know the relationship is verified.') + t('emailMatch', 'When you match on &ldquo;What&rsquo;s next?&rdquo;', 'Both of you chose the same next step.') + t('nudge', '48-hour reminder', 'A gentle nudge before a Thread fades.') + t('digest', 'Weekly summary', 'A short Monday recap of open Threads.', false) + t('product', 'Product news', 'New features, at most once a month.', false))}
 ${bSec('bell', 'In the app', 'The bell in the top bar.', t('inappNudge', 'Show nudges in the bell', 'Threads that need your answer or follow-up.') + `<div class="bl-data"><div><b>Preview</b><small>See what is waiting for you right now.</small></div><button type="button" class="t-how sm" data-on-click="showNudges()">Open notifications</button></div>`)}</div>`;
}
const _nudges19 = nudges;
nudges = function () {
  const u = me();
  if (u && (u.prefs || {}).inappNudge === false) return [];
  return _nudges19();
};
/* ---------- Help & support ---------- */
let HQ = '';
const HELP = [
  [
    'Getting started',
    'How do I share my card?',
    'Open Tap to Thread. People can scan your QR code, tap an NFC card, or open your link introthread.com/yourname. They do not need the app.'
  ],
  [
    'Getting started',
    'How do I change what my card shows?',
    'Go to My card to edit your name, title, photo, links and style. Changes appear instantly, even on printed QR codes.'
  ],
  [
    'Threads',
    'What is a Thread?',
    'A shared record of a meeting that both people confirm. Each of you then answers one private question: what&rsquo;s next?'
  ],
  [
    'Threads',
    'When does the other person see my answer?',
    'Never before they answer too. Answers stay private until both people reply. A &ldquo;Not now&rdquo; is shown to them as &ldquo;Stay in touch&rdquo;.'
  ],
  [
    'Threads',
    'How do I record a follow-up?',
    'Click Follow up on any Thread, choose what happened (message, call, meeting, opportunity) and add a note.'
  ],
  [
    'Rooms',
    'What is a Room?',
    'A space for an event or community. Every tap inside a Room becomes a Thread, and you get a live Resolution Report.'
  ],
  [
    'Rooms',
    'How many Rooms can I create?',
    'Each Room needs a Room pass ($199 per event). Rooms you already created stay yours.'
  ],
  [
    'Account',
    'Why do I need a code to log in?',
    'For your security, after your password we email a one-time code. You are also signed out after 20 minutes without activity.'
  ],
  [
    'Account',
    'How do I make my profile private?',
    'Settings, Privacy &amp; visibility, then turn off Public profile. Visitors will see a private-profile page.'
  ],
  [
    'Billing',
    'What does Pro include?',
    'AI follow-up drafts, calendar booking, NFC card writing, Thread export and advanced analytics. Current prices are on the Pricing page and in Settings, Billing.'
  ],
  [
    'Billing',
    'Where are my invoices?',
    'Settings, Plan &amp; billing, Invoices. You can view, download and pay pending invoices there.'
  ],
  [
    'Billing',
    'How do I cancel?',
    'Settings, Plan &amp; billing, Cancel subscription. You keep Pro until the end of the period you paid for.'
  ],
  [
    'Privacy',
    'Can I download or delete my data?',
    'Yes. Settings, Privacy &amp; visibility, Your data. Export everything as a file, or delete your account permanently.'
  ]
];
function bHelpList() {
  const q = HQ.toLowerCase().trim();
  const L = HELP.filter(([c, qq, a]) => !q || (c + ' ' + qq + ' ' + a).toLowerCase().includes(q));
  return L.length
    ? L.map(
        ([c, qq, a]) =>
          `<details class="bl-faq"><summary><span>${qq}</span><em>${c}</em></summary><p>${a}</p></details>`
      ).join('')
    : `<p class="d-muted">No answers match &ldquo;${esc(HQ)}&rdquo;. Send us a message below and we&rsquo;ll help.</p>`;
}
function bHelp(u) {
  const R = ((u.prefs || {}).support || []).slice(0, 5);
  return `<div class="bl-stack">${bSec('search', 'Help center', 'Answers to common questions.', `<label class="ro-s bl-hs">${sv('search', 16)}<input placeholder="Search help, e.g. invoices, Rooms, privacy" value="${esc(HQ)}" data-on-input="bHelpSearch(this.value)" aria-label="Search help"></label><div id="bhl" class="bl-faqs">${bHelpList()}</div>`)}
 ${bSec('mail', 'Contact support', 'We reply within one business day.', `<form class="bl-df" data-on-submit="return bSupport(event)"><div class="t-g2"><label class="x-f"><span>Topic</span><select id="bst" class="th-sort" style="width:100%">${['Account and login', 'Billing and invoices', 'Threads', 'Rooms', 'Privacy', 'Report a problem', 'Something else'].map(x => `<option>${x}</option>`).join('')}</select></label><label class="x-f"><span>Subject</span><input id="bss" required maxlength="100" placeholder="Short summary"></label></div><label class="x-f"><span>Message</span><textarea id="bsm" rows="4" required maxlength="2000" placeholder="Tell us what happened and what you expected"></textarea></label><label class="t-tog"><input type="checkbox" id="bsd" checked><span class="t-sw"></span><span><b>Include technical details</b><small>Browser and page, to help us fix problems faster.</small></span></label><div class="fu-b"><button class="x-btn">Send to support</button></div></form>`)}
 ${R.length ? bSec('brief', 'Your requests', 'Messages you have sent to support.', R.map(r => `<div class="bl-data"><div><b>${esc(r.subject)}</b><small>${r.id} &middot; ${esc(r.topic)} &middot; ${bDate(r.at)}</small></div><span class="bl-chip o">Open</span></div>`).join('')) : ''}
 ${bSec('globe', 'More resources', '', `<div class="bl-res"><a href="/how">${sv('play', 15)} How Introthread works</a><a href="/privacy">${sv('shield', 15)} Privacy &amp; consent</a><a href="/terms">${sv('brief', 15)} Terms of Service</a><a href="mailto:hello@introthread.com">${sv('mail', 15)} hello@introthread.com</a></div>`)}</div>`;
}
async function bSupport(e) {
  e.preventDefault();
  const u = me();
  const v = i => ($('#' + i).value || '').trim();
  if (!v('bss') || !v('bsm')) return false;
  const r = {
    id: 'REQ-' + Date.now().toString(36).toUpperCase().slice(-6),
    topic: v('bst'),
    subject: v('bss'),
    at: Date.now()
  };
  const diag = $('#bsd').checked
    ? `\n\n---\nAccount: ${u.email || u.handle}\nPlan: ${bStatusLabel(bGet())}\nPage: ${location.pathname}\nBrowser: ${navigator.userAgent}`
    : '';
  const prefs = Object.assign({}, u.prefs || {}, {
    support: [r].concat((u.prefs || {}).support || []).slice(0, 20)
  });
  if (await upd('profiles', u.id, { prefs })) {
    u.prefs = prefs;
    save();
  }
  location.href =
    'mailto:support@introthread.com?subject=' +
    encodeURIComponent(`[${r.id}] ${r.subject}`) +
    '&body=' +
    encodeURIComponent(v('bsm') + diag);
  toast('Request ' + r.id + ' saved. Your email app opens to send it.');
  window._keepScroll = true;
  render();
  return false;
}
/* ---------- wire into Settings, the account card, the account menu and routing ---------- */
if (!ST_TABS.some(t => t[0] === 'help')) ST_TABS.push(['help', 'Help &amp; support', 'mail']);
const _stOther19 = stOther;
stOther = function (u, t) {
  if (t === 'billing') return bBilling(u);
  if (t === 'privacy') return bPrivacy(u);
  if (t === 'notifications') return bNotifs(u);
  if (t === 'help') return bHelp(u);
  return _stOther19(u, t);
};
stPlan = function (u) {
  bLifecycle();
  const b = bGet(u),
    pro = planOf(u) === 'pro';
  const price = b.plan === 'pro' ? PLANS.pro.price[b.interval] : 0;
  return `<section class="d-box st12-box"><div class="cd-bh"><span class="cd-bi o">${sv('spark', 20)}</span><div><b>Subscription plan</b><small>${bStatusLabel(b)}</small></div>${bStatusChip(b)}</div>
 <div class="st12-plan"><div><b>${b.plan === 'pro' ? 'Pro plan' : 'Free plan'}</b><div class="st12-price">${money(price)}<small>/${b.plan === 'pro' ? b.interval : 'month'}</small></div></div><ul>${(b.plan ===
 'pro'
   ? PLANS.pro
   : PLANS.free
 ).features
   .slice(b.plan === 'pro' ? 1 : 0, b.plan === 'pro' ? 6 : 5)
   .map(x => `<li><i>${sv('check', 10, '#fff', 3.2)}</i>${x}</li>`)
   .join('')}</ul></div>
 <div class="st12-bill"><span>${b.plan !== 'pro' ? 'Upgrade for AI drafts, NFC and analytics.' : b.status === 'trialing' ? 'Trial ends ' + bDate(b.trialEnd) : b.cancelAt ? 'Ends ' + bDate(b.cancelAt) : b.status === 'past_due' ? 'Payment overdue' : 'Next billing date: ' + bDate(b.periodEnd)}</span><button type="button" class="x-btn" data-on-click="stTab('billing')">${pro ? 'Manage subscription' : 'Upgrade to Pro'} ${sv('arrow', 16)}</button></div></section>`;
};
setPlan = function () {
  bUpgrade();
};
const _acct19 = acctMenu;
acctMenu = function (btn, dir) {
  _acct19(btn, dir);
  const m = document.getElementById('acm');
  if (!m) return;
  [...m.querySelectorAll('.am-it')].forEach(b => {
    if (/Help/.test(b.textContent)) b.setAttribute('data-on-click', "amGo('/app/settings','help')");
  });
};
const _render19 = render;
render = function () {
  if (me() && (location.pathname || '').startsWith('/app')) {
    bLifecycle();
    if (DRANGE > 7 && !has('analytics')) {
      DRANGE = 7;
      setTimeout(() => bLocked('analytics'), 0);
    }
  }
  return _render19();
};

/* v61: named handlers for billing (no inline JavaScript). */
function bInt(k) {
  BINT = k;
  window._keepScroll = true;
  render();
}
function bInvF(k) {
  BINVF = k;
  window._keepScroll = true;
  render();
}
/* The card form keeps its action (e.g. "bUpgrade('m')") in data-act and runs it
   through actions.js once the card details are valid. */
function bCardSubmit(e, form) {
  e.preventDefault();
  if (bCardValid()) ACT.run(form.dataset.act, form, e);
}
function bFmtCard(el) {
  el.value = el.value.replace(/[^\d]/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
}
function bFmtExp(el) {
  el.value = el.value.replace(/[^\d]/g, '').replace(/^(\d{2})(\d)/, '$1/$2');
}
function bPayInvNew(id) {
  window._card = null;
  bPayInv(id);
}
function setPTab(k) {
  PTAB = k;
}
function bHelpSearch(v) {
  HQ = v;
  $('#bhl').innerHTML = bHelpList();
}
