// Introthread - Admin Revenue (v38, screen 5 of 9). Prefix rv / RVX.
// Moved out of index.html in v52 (code split step 4). Load order matters: see the <script> list at the end of index.html.

/* ================= v38: Admin screen 5 of 9 - Revenue ================= */
Object.assign(SV, {
  dollar:
    '<path d="M12 3v18M16.5 7.5c-.8-1.3-2.4-2-4.5-2-2.6 0-4.2 1.3-4.2 3.1 0 4.4 9 2.4 9 6.8 0 1.9-1.8 3.1-4.6 3.1-2.3 0-4-.8-4.8-2.2"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  card: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
  bar3: '<path d="M5 20V10M12 20V4M19 20v-7"/>'
});
let RVX = {
  months: 12,
  gran: 'month',
  subSt: 'active',
  subPage: 0,
  subPer: 10,
  data: null,
  subs: null,
  pays: null,
  limited: false
};
try {
  const v = +localStorage.getItem('it_rev_m');
  if ([3, 6, 12, 24].includes(v)) RVX.months = v;
} catch (_) {}
const canFin = () => admOk(['owner', 'finance']);
const _alt38 = admLoadTab;
admLoadTab = async function () {
  if (ADM.stage === 'ready' && ADM.tab === 'revenue') return rvLoad();
  return _alt38.apply(this, arguments);
};
const rvMiss = e =>
  /admin_revenue|admin_subs2|admin_payments|could not find|schema cache|does not exist/i.test(
    (e && e.message) || ''
  );
const rvUsd = (n, dp) =>
  isNum(+n)
    ? '$' +
      (+n).toLocaleString('en-US', {
        minimumFractionDigits: dp || 0,
        maximumFractionDigits: dp == null ? (+n % 1 ? 2 : 0) : dp
      })
    : dash;
const rvMoney = (n, c) =>
  !isNum(+n)
    ? dash
    : (String(c || 'usd').toLowerCase() === 'gbp' ? '£' : '$') +
      (+n).toLocaleString('en-US', { minimumFractionDigits: +n % 1 ? 2 : 0, maximumFractionDigits: 2 });
function rvChg(cur, prev, fmt) {
  if (!isNum(cur) || !isNum(prev)) return { t: '—', c: 'm' };
  if (!prev) return cur ? { t: 'New this month', c: 'g' } : { t: '0% from last month', c: 'm' };
  const p = Math.round(((cur - prev) * 100) / prev);
  return { t: `${p > 0 ? '+' : ''}${p}% from last month`, c: p > 0 ? 'g' : p < 0 ? 'r' : 'm' };
}
/* load */
async function rvLoad(keep) {
  const wasLim = RVX.limited;
  if (!keep || !$('#rvwrap')) admBody(rvSkel());
  try {
    let d = null,
      s = null,
      p = null;
    if (!RVX.limited) {
      try {
        [d, s, p] = await Promise.all([
          arpc('admin_revenue', { months: RVX.months, gran: RVX.gran }),
          arpc('admin_subs2', { st: RVX.subSt, q: '', lim: RVX.subPer, off: RVX.subPage * RVX.subPer }),
          arpc('admin_payments', { st: 'all', lim: 6, off: 0 })
        ]);
      } catch (e) {
        if (rvMiss(e)) RVX.limited = true;
        else throw e;
      }
    }
    if (RVX.limited) {
      const [S, P, st] = await Promise.all([
        arpc('admin_subscriptions'),
        SB.from('plans')
          .select('*')
          .order('sort')
          .then(r => {
            if (r.error) throw r.error;
            return r.data;
          }),
        arpc('admin_stats').catch(() => ({}))
      ]);
      [d, s, p] = rvLocal(S || [], P || [], st || {});
    }
    RVX.data = d;
    RVX.subs = s;
    RVX.pays = p;
    if (ADM.tab !== 'revenue') return;
    admBody(rvPage());
    if (keep && wasLim === RVX.limited) {
    }
  } catch (e) {
    admBody(
      rvHead() +
        `<div class="ix-card ix-fail" role="alert">${sv('alert', 22)}<div><b>Revenue could not load</b><p>${esc((e && e.message) || 'Unknown error')}</p></div><button type="button" class="ix-btn" data-on-click="rvLoad()">${sv('refresh', 16)} Try again</button></div>`
    );
  }
}
/* before update 008: estimate from current subscriptions and plan prices */
function rvLocal(S, P, st) {
  const price = s => {
    const p = P.find(x => x.id === s.plan_id) || {};
    return s.interval === 'year' ? (+p.price_usd_year || 0) / 12 : +p.price_usd_month || 0;
  };
  const paid = S.filter(s => s.plan_id !== 'free'),
    act = paid.filter(s => ['active', 'trialing', 'past_due'].includes(s.status));
  const mrr = act.reduce((a, s) => a + price(s), 0);
  const sel =
    RVX.subSt === 'active'
      ? paid.filter(s => ['active', 'trialing'].includes(s.status))
      : RVX.subSt === 'all'
        ? paid
        : paid.filter(s => s.status === (RVX.subSt === 'canceled' ? 'canceled' : RVX.subSt));
  const rows = sel.map(s => {
    const p = P.find(x => x.id === s.plan_id) || {};
    const gbp = String(s.currency || '').toLowerCase() === 'gbp';
    return Object.assign({}, s, {
      plan_name: p.name || s.plan_id,
      price: gbp
        ? s.interval === 'year'
          ? p.price_gbp_year
          : p.price_gbp_month
        : s.interval === 'year'
          ? p.price_usd_year
          : p.price_usd_month,
      mrr_usd: price(s),
      started_at: s.updated_at
    });
  });
  const users = +st.users || null;
  return [
    {
      stripe: {
        connected: paid.some(s => s.stripe_subscription_id),
        prices_linked: P.filter(p => p.id !== 'free' && (p.stripe_price_month || p.stripe_price_year)).length
      },
      kpi: {
        mrr,
        mrr_prev: null,
        paying: act.length,
        paying_prev: null,
        users,
        users_prev: null,
        past_due: paid.filter(s => s.status === 'past_due').length,
        revenue_range: null,
        failed_30d: null
      },
      gran: 'month',
      series: null,
      subs_counts: {
        active: paid.filter(s => ['active', 'trialing'].includes(s.status)).length,
        past_due: paid.filter(s => s.status === 'past_due').length,
        canceled: paid.filter(s => s.status === 'canceled').length,
        all: paid.length
      },
      by_plan: P.filter(p => p.active).map(p => ({
        id: p.id,
        name: p.name,
        revenue: 0,
        mrr: act.filter(s => s.plan_id === p.id).reduce((a, s) => a + price(s), 0),
        people:
          p.id === 'free'
            ? users != null
              ? users - act.length
              : null
            : act.filter(s => s.plan_id === p.id).length
      })),
      plans: P
    },
    { total: rows.length, rows: rows.slice(RVX.subPage * RVX.subPer, (RVX.subPage + 1) * RVX.subPer) },
    null
  ];
}
/* header */
function rvHead() {
  const d = RVX.data || {},
    s = d.stripe || {};
  const con = !!s.connected;
  return `<div class="ix-h"><div><h1>Revenue</h1><p>Subscriptions and income. Card payments run through Stripe once billing is connected.</p></div><div class="ix-hc rv-hc">
 ${RVX.data ? `<button type="button" class="rv-stripe ${con ? 'on' : 'off'}" data-on-click="rvBilling()" title="${con ? 'Stripe is sending payments to Introthread' : 'Stripe is not connected yet'}">${sv(con ? 'check' : 'alert', 16)} ${con ? 'Stripe connected' : 'Stripe not connected'}</button>` : ''}
 ${mdSel(
   'rvm',
   'Range',
   RVX.months,
   [
     ['3', 'Last 3 months'],
     ['6', 'Last 6 months'],
     ['12', 'Last 12 months'],
     ['24', 'Last 24 months']
   ],
   'rvRange(+this.value)',
   'cal'
 ).replace('<span class="md-sl">Range:</span>', '<span class="sr">Range</span>')}
 <button type="button" class="ix-btn" data-on-click="rvBilling()">${sv('gear', 17)} Manage billing</button></div></div>`;
}
function rvRange(m) {
  RVX.months = m;
  try {
    localStorage.setItem('it_rev_m', m);
  } catch (_) {}
  rvLoad(true);
}
/* KPI cards */
function rvKpis() {
  const k = (RVX.data || {}).kpi || {};
  const c1 = rvChg(k.mrr, k.mrr_prev),
    c2 = rvChg(isNum(k.mrr) ? k.mrr * 12 : null, isNum(k.mrr_prev) ? k.mrr_prev * 12 : null),
    pu = k.users ? Math.round((k.paying * 100) / k.users) : 0;
  const conv = k.users ? (k.paying * 100) / k.users : null,
    convPrev = k.users_prev ? ((k.paying_prev || 0) * 100) / k.users_prev : null;
  const card = (ic, tone, l, v, sub, subc, subic) =>
    `<div class="rm-c"><span class="md-wi t-${tone}w" aria-hidden="true">${sv(ic, 24)}</span><span><span class="rm-cl">${l}</span><b>${v}</b><small class="rv-ch ${subc}">${subic ? sv(subic, 13, 'currentColor', 2.2) : ''}${sub}</small></span></div>`;
  return (
    card(
      'dollar',
      'b',
      'Monthly revenue',
      rvUsd(k.mrr, k.mrr % 1 ? 2 : 0),
      c1.t,
      c1.c,
      c1.c === 'g' ? 'up' : c1.c === 'r' ? 'down' : 'bar3'
    ) +
    card(
      'chart',
      'g',
      'Yearly run rate',
      rvUsd(isNum(k.mrr) ? k.mrr * 12 : null),
      c2.t,
      c2.c,
      c2.c === 'g' ? 'up' : c2.c === 'r' ? 'down' : 'bar3'
    ) +
    card(
      'users',
      'o',
      'Paying people',
      isNum(k.paying) ? fmtN(k.paying) : dash,
      k.users ? `${pu}% of total users` : 'Of total users',
      'm',
      'dot'
    ) +
    card(
      'trend',
      'p',
      'Conversion',
      isNum(conv) ? (conv < 10 && conv % 1 ? conv.toFixed(1) : Math.round(conv)) + '%' : dash,
      isNum(conv) && isNum(convPrev) && Math.abs(conv - convPrev) >= 0.05
        ? `Free to Paid · ${conv >= convPrev ? '+' : ''}${(conv - convPrev).toFixed(1)} pts this month`
        : 'Free to Paid',
      'm',
      'arrow'
    )
  );
}
/* charts */
function rvLab(s, g) {
  const d = new Date(s);
  return g === 'week'
    ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : d.toLocaleDateString('en-GB', { month: 'short' }) +
        (d.getMonth() === 0 ? ' ' + String(d.getFullYear()).slice(2) : '');
}
function rvNice(m) {
  if (m <= 0) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(m)));
  const f = m / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}
function rvChart(id, S, lines, fmtY, g) {
  if (!S || !S.length)
    return `<div class="rv-cempty">${sv('chart', 22)}<p>Run database update 008 to see revenue over time.</p></div>`;
  const W = 560,
    H = 200,
    L = 44,
    R = 10,
    T = 12,
    B = 28,
    n = S.length,
    max = rvNice(Math.max(0, ...S.flatMap(p => lines.map(l => +p[l.k] || 0)))),
    x = i => L + (n < 2 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1)),
    y = v => T + (H - T - B) * (1 - (+v || 0) / max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => max * f);
  const step = Math.max(1, Math.ceil(n / 12));
  const allZero = S.every(p => lines.every(l => !+p[l.k]));
  return `<div class="rv-cw" id="${id}"><svg viewBox="0 0 ${W} ${H}" class="rv-svg" role="img" aria-label="${esc(lines.map(l => l.l).join(' and '))} chart">
 ${ticks.map(t => `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" class="rv-gl"/><text x="${L - 8}" y="${y(t) + 4}" class="rv-yl" text-anchor="end">${fmtY(t)}</text>`).join('')}
 ${S.map((p, i) => `<line x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${H - B}" class="rv-gv"/>${i % step === 0 || i === n - 1 ? `<text x="${x(i)}" y="${H - 8}" class="rv-xl" text-anchor="middle">${rvLab(p.start, g)}</text>` : ''}`).join('')}
 ${lines.map(l => `<path d="${S.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p[l.k]).toFixed(1)).join(' ')}" class="rv-ln" style="stroke:${l.c}${l.dash ? ';stroke-dasharray:4 4' : ''}"/>${S.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p[l.k]).toFixed(1)}" r="3.5" class="rv-pt" style="stroke:${l.c}"/>`).join('')}`).join('')}
 ${S.map((p, i) => `<rect x="${(x(i) - (W - L - R) / (2 * Math.max(1, n - 1))).toFixed(1)}" y="${T}" width="${((W - L - R) / Math.max(1, n - 1)).toFixed(1)}" height="${H - T - B}" class="rv-hit" tabindex="0" data-on-mouseenter="rvTip('${id}',${i})" data-on-focus="rvTip('${id}',${i})" data-on-mouseleave="rvTipOff('${id}')" data-on-blur="rvTipOff('${id}')"><title>${esc(rvLab(p.start, g))}: ${lines.map(l => l.l + ' ' + l.f(p[l.k])).join(', ')}</title></rect>`).join('')}
 </svg><div class="rv-tip" hidden></div>${allZero ? `<p class="rv-zero">No ${esc(lines[0].l.toLowerCase())} in this period yet.</p>` : ''}</div>
 <div class="rv-lg">${lines.map(l => `<span><i style="background:${l.c}"></i>${l.l}</span>`).join('')}</div>`;
}
const RV_LINES = {
  rev: [
    { k: 'revenue', l: 'Revenue received (USD)', c: '#1f5eff', f: v => rvUsd(v, 2) },
    { k: 'mrr', l: 'Monthly revenue (USD)', c: '#9db7ff', f: v => rvUsd(v, 2), dash: 1 }
  ],
  users: [
    { k: 'new_paying', l: 'New paying users', c: '#1f5eff', f: v => fmtN(v) },
    { k: 'paying', l: 'Cumulative paying users', c: '#9db7ff', f: v => fmtN(v) }
  ]
};
function rvTip(id, i) {
  const w = $('#' + id);
  if (!w) return;
  const t = w.querySelector('.rv-tip'),
    S = RVX.data.series,
    p = S[i],
    L = id === 'rvc1' ? RV_LINES.rev : RV_LINES.users;
  t.innerHTML = `<b>${esc(rvLab(p.start, RVX.data.gran))}</b>${L.map(l => `<span><i style="background:${l.c}"></i>${l.l}: <b>${l.f(p[l.k])}</b></span>`).join('')}`;
  t.hidden = false;
  const n = S.length;
  const pct = n < 2 ? 50 : (i * 100) / (n - 1);
  t.style.left = `clamp(8px, calc(${pct}% - 90px), calc(100% - 190px))`;
}
function rvTipOff(id) {
  const w = $('#' + id);
  if (w) {
    const t = w.querySelector('.rv-tip');
    if (t) t.hidden = true;
  }
}
function rvGranSel() {
  return mdSel(
    'rvg',
    'View',
    RVX.gran,
    [
      ['month', 'Monthly'],
      ['week', 'Weekly']
    ],
    'RVX.gran=this.value;rvLoad(true)',
    'bar3'
  ).replace('<span class="md-sl">View:</span>', '<span class="sr">View</span>');
}
/* subscriptions */
const rvSt = s =>
  `<span class="rv-st ${s}">${{ active: 'Active', trialing: 'Trial', past_due: 'Past due', canceled: 'Cancelled', incomplete: 'Incomplete' }[s] || esc(s)}</span>`;
function rvSubs() {
  const c = (RVX.data || {}).subs_counts || {},
    S = RVX.subs || { rows: [], total: 0 },
    R = S.rows || [];
  const tab = (k, l) =>
    `<button type="button" role="tab" aria-selected="${RVX.subSt === k}" class="${RVX.subSt === k ? 'on' : ''}" data-on-click="rvSubSt('${k}')">${l} <em>${isNum(c[k]) ? fmtN(c[k]) : 0}</em></button>`;
  const pages = Math.max(1, Math.ceil((S.total || 0) / RVX.subPer));
  return `<section class="ix-card rv-sec rv-subs"><div class="rv-sh"><div><h2>Subscriptions</h2><p>Active and past subscriptions.</p></div><div class="rv-tabs" role="tablist" aria-label="Subscription status">${tab('active', 'Active')}${tab('past_due', 'Past due')}${tab('canceled', 'Cancelled')}${tab('all', 'All')}</div></div>
 <div class="rv-tw"><table class="au-t rv-t"><thead><tr><th scope="col">User</th><th scope="col">Plan</th><th scope="col">Status</th><th scope="col">Price</th><th scope="col">Started</th><th scope="col">${RVX.subSt === 'canceled' ? 'Ended' : 'Renews'}</th></tr></thead>
 <tbody>${
   R.length
     ? R.map(
         s =>
           `<tr><td><button type="button" class="au-u" data-on-click="mdToUser('${s.user_id}')"><span class="adm2-av sm" aria-hidden="true">${esc(initials(s.name || '?'))}</span><span class="au-ut"><b>${esc(s.name || 'Deleted account')}</b><small>${s.handle ? '@' + esc(s.handle) : esc(s.email || '')}</small></span></button></td><td>${esc(s.plan_name || s.plan_id)}</td><td>${rvSt(s.status)}</td><td>${rvMoney(s.price, s.currency)}<small>/ ${s.interval === 'year' ? 'yr' : 'mo'}</small></td><td>${fmtD(s.started_at || s.updated_at)}</td><td>${s.status === 'canceled' ? fmtD(s.canceled_at || s.updated_at) : s.current_period_end ? fmtD(s.current_period_end) : '<span class="ix-mu">Not set</span>'}</td></tr>`
       ).join('')
     : `<tr><td colspan="6"><div class="rv-empty"><span class="md-eic sm" aria-hidden="true">${sv('card', 22)}</span><b>${RVX.subSt === 'active' ? 'No paid subscriptions yet' : RVX.subSt === 'past_due' ? 'No payments are overdue' : RVX.subSt === 'canceled' ? 'No cancelled subscriptions' : 'No paid subscriptions yet'}</b><p>When users subscribe, they will appear here.</p></div></td></tr>`
 }</tbody></table></div>
 ${S.total > RVX.subPer ? `<div class="au-ft"><span>${fmtN(RVX.subPage * RVX.subPer + 1)}–${fmtN(Math.min(S.total, (RVX.subPage + 1) * RVX.subPer))} of ${fmtN(S.total)}</span><nav class="au-pn" aria-label="Subscription pages"><button type="button" aria-label="Previous page" ${RVX.subPage ? '' : 'disabled'} data-on-click="rvSubPg('prev')">${sv('chev', 16)}</button><button type="button" aria-label="Next page" ${RVX.subPage + 1 < pages ? '' : 'disabled'} data-on-click="rvSubPg('next')">${sv('chev', 16)}</button></nav></div>` : ''}
 ${canFin() && S.total ? `<div class="rv-sf"><button type="button" class="au-inl" data-on-click="rvExport()">Export subscriptions CSV</button></div>` : ''}</section>`;
}
/* revenue by plan */
function rvDonut() {
  const d = RVX.data || {},
    B = d.by_plan || [];
  const useRev = B.some(b => +b.revenue > 0);
  const val = b => +(useRev ? b.revenue : b.mrr) || 0;
  const tot = B.reduce((a, b) => a + val(b), 0);
  const cols = ['#1f5eff', '#f97316', '#7a5af8', '#12b76a', '#eab308'];
  const r = 62,
    C = 2 * Math.PI * r;
  let off = 0;
  const segs = tot
    ? B.map((b, i) => {
        const len = (val(b) / tot) * C;
        const s = `<circle r="${r}" cx="80" cy="80" fill="none" stroke="${cols[i % 5]}" stroke-width="22" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 80 80)"><title>${esc(b.name)}: ${rvUsd(val(b), 2)}</title></circle>`;
        off += len;
        return s;
      }).join('')
    : '';
  return `<section class="ix-card rv-sec rv-plan"><div class="rv-sh"><div><h2>Revenue by plan</h2><p>${useRev ? 'Share of revenue received' : 'Share of monthly revenue'} · ${RVX.months === 12 ? 'last 12 months' : 'last ' + RVX.months + ' months'}.</p></div></div>
 <div class="rv-dn"><div class="rv-dc"><svg viewBox="0 0 160 160" role="img" aria-label="Revenue by plan"><circle r="${r}" cx="80" cy="80" fill="none" stroke="#e4e7ef" stroke-width="22"/>${segs}</svg><div class="rv-dt"><b>${rvUsd(tot, tot % 1 ? 2 : 0)}</b><small>${useRev ? 'Total revenue' : 'Per month'}</small></div></div>
 <ul class="rv-dl">${B.map((b, i) => `<li><i style="background:${cols[i % 5]}"></i><span>${esc(b.name)}<small>${isNum(b.people) ? fmtN(b.people) + ' ' + (b.people === 1 ? 'person' : 'people') : ''}</small></span><b>${rvUsd(val(b), val(b) % 1 ? 2 : 0)}</b><em>${tot ? Math.round((val(b) * 100) / tot) : 0}%</em></li>`).join('')}</ul></div></section>`;
}
/* price list */
function rvPrices() {
  const P = (RVX.data || {}).plans || [];
  return `<section class="ix-card rv-sec"><div class="rv-sh"><div><h2>Price list</h2><p>Current plan prices and limits.</p></div>${admOk(['owner', 'finance']) ? `<button type="button" class="ix-btn" data-on-click="admGo('plans')">${sv('edit', 16)} Edit prices</button>` : ''}</div>
 <div class="rv-tw"><table class="au-t rv-t"><thead><tr><th scope="col">Plan</th><th scope="col">Price (USD)</th><th scope="col">Price (GBP)</th><th scope="col">New Threads</th><th scope="col">Stripe</th><th scope="col">Status</th></tr></thead><tbody>
 ${P.map(p => `<tr><td><b>${esc(p.name)}</b></td><td>${rvUsd(p.price_usd_month)} / mo${+p.price_usd_year ? `<small>${rvUsd(p.price_usd_year)} / yr</small>` : ''}</td><td>£${fmtN(+p.price_gbp_month || 0)} / mo${+p.price_gbp_year ? `<small>£${fmtN(+p.price_gbp_year)} / yr</small>` : ''}</td><td>${p.threads_per_month == null ? 'Unlimited' : fmtN(p.threads_per_month) + ' a month'}</td><td>${p.id === 'free' ? '<span class="ix-mu">Not needed</span>' : p.stripe_price_month || p.stripe_price_year ? '<span class="rv-st active">Linked</span>' : '<span class="rv-st past_due">Not linked</span>'}</td><td>${p.active ? '<span class="rv-st active">Active</span>' : '<span class="rv-st canceled">Hidden</span>'}</td></tr>`).join('')}</tbody></table></div></section>`;
}
/* payments */
function rvPayRows(R) {
  return R.map(
    p =>
      `<tr><td>${fmtD(p.created_at)}<small>${fmtT(p.created_at)}</small></td><td>${p.user_id && p.name ? `<button type="button" class="au-inl" data-on-click="rvToUser('${p.user_id}')">${esc(p.name)}</button>` : esc(p.name || 'Deleted account')}</td><td>${esc(p.plan_name || p.plan_id || '')}</td><td class="num">${rvMoney(p.amount, p.currency)}</td><td>${{ succeeded: '<span class="rv-st active">Paid</span>', failed: '<span class="rv-st canceled bad">Failed</span>', refunded: '<span class="rv-st trialing">Refunded</span>', pending: '<span class="rv-st past_due">Pending</span>' }[p.status] || esc(p.status)}${p.failure_reason ? `<small>${esc(p.failure_reason)}</small>` : ''}</td></tr>`
  ).join('');
}
function rvPays() {
  const P = RVX.pays,
    R = (P && P.rows) || [];
  return `<section class="ix-card rv-sec"><div class="rv-sh"><div><h2>Recent payments</h2><p>Latest successful and failed payments.</p></div>${P && P.total > R.length ? `<button type="button" class="ix-btn" data-on-click="rvAllPays()">View all ${sv('arrow', 15)}</button>` : ''}</div>
 <div class="rv-tw"><table class="au-t rv-t"><thead><tr><th scope="col">Date</th><th scope="col">User</th><th scope="col">Plan</th><th scope="col">Amount</th><th scope="col">Status</th></tr></thead><tbody>
 ${R.length ? rvPayRows(R) : `<tr><td colspan="5"><div class="rv-empty"><span class="md-eic sm" aria-hidden="true">${sv('doc', 22)}</span><b>No payments yet</b><p>${P ? 'Payments will appear here once someone subscribes.' : 'Run database update 008 to record payments.'}</p></div></td></tr>`}</tbody></table></div></section>`;
}
async function rvAllPays(st) {
  st = st || 'all';
  modal(
    `<div class="cap-m rv-allm"><div class="row between"><h3>All payments</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div><div id="rvap">${admLoading()}</div></div>`
  );
  try {
    const d = await arpc('admin_payments', { st, lim: 200, off: 0 });
    const e = $('#rvap');
    if (!e) return;
    e.innerHTML = `<div class="rv-tabs sm" role="tablist">${[
      ['all', 'All'],
      ['succeeded', 'Paid'],
      ['failed', 'Failed'],
      ['refunded', 'Refunded']
    ]
      .map(
        ([k, l]) =>
          `<button type="button" role="tab" aria-selected="${st === k}" class="${st === k ? 'on' : ''}" data-on-click="rvAllPays('${k}')">${l}</button>`
      )
      .join(
        ''
      )}</div><div class="rv-tw"><table class="au-t rv-t"><thead><tr><th>Date</th><th>User</th><th>Plan</th><th>Amount</th><th>Status</th></tr></thead><tbody>${d.rows.length ? rvPayRows(d.rows) : '<tr><td colspan="5" class="ix-mu">No payments here.</td></tr>'}</tbody></table></div>${d.total > d.rows.length ? `<p class="au-fine">Showing the newest 200 of ${fmtN(d.total)}.</p>` : ''}`;
  } catch (e) {
    const x = $('#rvap');
    if (x) x.innerHTML = `<p class="adm-err">${esc(e.message || 'Could not load')}</p>`;
  }
}
/* billing */
function rvBilling() {
  const s = (RVX.data || {}).stripe || {};
  const con = !!s.connected;
  modal(`<div class="cap-m md-guide"><div class="row between"><h3>${con ? 'Manage billing' : 'Connect Stripe'}</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div>
 ${
   con
     ? `<p class="fu-sub">Stripe holds card details, invoices, refunds and payouts. Open the Stripe dashboard to manage them.</p><a class="cap-btn" href="https://dashboard.stripe.com/" target="_blank" rel="noopener">${sv('ext', 16)} Open Stripe dashboard</a>`
     : `<p class="fu-sub">Card payments are not switched on yet, so no one can be charged. Prices, plans and limits already work, and staff can change someone's plan by hand.</p>
 <h4>What is needed</h4><ul><li>A Stripe account for Introthread, with the business details filled in.</li><li>A Product for Pro, with a monthly and a yearly Price in USD and GBP. Their Price IDs go into Plans and pricing.</li><li>The Stripe secret key and webhook secret added in Vercel. These are never put in the code.</li><li>A webhook so Stripe updates subscriptions and payments here automatically.</li></ul>
 <p>${fmtN(s.prices_linked || 0)} paid plan${s.prices_linked === 1 ? ' is' : 's are'} linked to Stripe so far. Stripe is next in the build order after the admin area.</p><a class="cap-btn" href="https://dashboard.stripe.com/register" target="_blank" rel="noopener">${sv('ext', 16)} Open Stripe</a>`
 }</div>`);
}
async function rvExport() {
  if (!canFin()) return toast('Only owners and finance staff can export');
  admAsk({
    title: 'Export subscriptions',
    body: 'Downloads a CSV of paid subscriptions. Store it securely. The export is recorded.',
    cta: 'Download CSV',
    run: async r => {
      const d = RVX.limited ? RVX.subs : await arpc('admin_subs2', { st: 'all', q: '', lim: 500, off: 0 });
      await arpc('admin_log', {
        act: 'subscriptions.export',
        uid: null,
        reason: r,
        details: { count: d.rows.length }
      }).catch(() => {});
      admDownload(
        'introthread-subscriptions-' + new Date().toISOString().slice(0, 10) + '.csv',
        admCsv(d.rows, [
          ['name', 'Name'],
          ['handle', 'Handle'],
          ['plan_name', 'Plan'],
          ['status', 'Status'],
          ['price', 'Price'],
          ['currency', 'Currency'],
          ['interval', 'Interval'],
          ['mrr_usd', 'Monthly value USD'],
          ['started_at', 'Started'],
          ['current_period_end', 'Renews'],
          ['canceled_at', 'Ended']
        ]),
        'text/csv'
      );
    }
  });
}
/* page */
function rvSkel() {
  return (
    rvHead() +
    `<div class="md-cs">${'<div class="md-c sk"><i></i><b></b></div>'.repeat(4)}</div><div class="rv-g2"><div class="ix-card sk" style="height:300px"></div><div class="ix-card sk" style="height:300px"></div></div>`
  );
}
function rvPage() {
  const d = RVX.data,
    k = d.kpi || {};
  const alerts = [];
  if (k.past_due)
    alerts.push(`${fmtN(k.past_due)} subscription${k.past_due > 1 ? 's are' : ' is'} past due.`);
  if (k.failed_30d)
    alerts.push(`${fmtN(k.failed_30d)} payment${k.failed_30d > 1 ? 's' : ''} failed in the last 30 days.`);
  return `<div id="rvwrap" class="rv">${rvHead()}${RVX.limited ? `<p class="ix-upd">Run database update 008 for charts, month-on-month change, payments and subscription start dates. Figures below are estimates from current plans.</p>` : ''}
 ${alerts.length ? `<div class="rv-alert" role="status">${sv('alert', 17)}<span>${alerts.join(' ')}</span><button type="button" class="au-inl" data-on-click="rvPastDue()">Review</button></div>` : ''}
 <div class="md-cs">${rvKpis()}</div>
 <div class="rv-g2"><section class="ix-card rv-sec"><div class="rv-sh"><h2>Revenue (USD)</h2>${d.series ? rvGranSel() : ''}</div>${rvChart('rvc1', d.series, RV_LINES.rev, v => '$' + (v >= 1000 ? Math.round(v / 100) / 10 + 'k' : Math.round(v)), d.gran)}</section>
 <section class="ix-card rv-sec"><div class="rv-sh"><h2>New paying users</h2>${d.series ? rvGranSel().replace('id="rvg"', 'id="rvg2"') : ''}</div>${rvChart('rvc2', d.series, RV_LINES.users, v => String(Math.round(v)), d.gran)}</section></div>
 <div class="rv-g2 wide">${rvSubs()}${rvDonut()}</div><div class="rv-g2">${rvPrices()}${rvPays()}</div></div>`;
}

/* v59: named handlers for the Revenue screen (no inline JavaScript). */
function rvSubSt(k) {
  RVX.subSt = k;
  RVX.subPage = 0;
  rvLoad(true);
}
function rvSubPg(d) {
  if (d === 'prev') RVX.subPage--;
  else RVX.subPage++;
  rvLoad(true);
}
function rvToUser(id) {
  if (typeof closeModal === 'function') closeModal();
  mdToUser(id);
}
function rvPastDue() {
  RVX.subSt = 'past_due';
  rvLoad(true);
}
