// Introthread - Admin shell and Dashboard (v34, screen 1 of 9). Prefix adm / ADMR.
// Moved out of index.html in v52 (code split step 4). Load order matters: see the <script> list at the end of index.html.

/* ================= v34: Admin shell + Dashboard redesign (screen 1 of 9) ================= */
Object.assign(SV, {
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  out: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 16l-4-4 4-4M5 12h11"/>',
  bars: '<path d="M6 20v-8M12 20V5M18 20v-5"/>',
  db: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.5l2.1 1.2M17.7 15.3l2.1 1.2M4.2 16.5l2.1-1.2M17.7 8.7l2.1-1.2"/><circle cx="12" cy="12" r="6.8"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  dollar:
    '<circle cx="12" cy="12" r="9"/><path d="M15 9.4c-.5-.9-1.6-1.4-3-1.4-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.4M12 6.5v11"/>',
  msg: '<path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3v-3H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
  okc: '<circle cx="12" cy="12" r="9"/><path d="M8 12.4l2.7 2.6L16 9.6"/>',
  alert: '<path d="M12 3.5l9 16H3z"/><path d="M12 10v4.2M12 17.2v.1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.2M12 7.8v.1"/>',
  dot: '<circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none"/>',
  linkc:
    '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'
});
ADM_TABS.forEach(t => {
  if (t[0] === 'dash') t[2] = 'bars';
  if (t[0] === 'revenue') t[2] = 'db';
  if (t[0] === 'settings') t[2] = 'cog';
});
let ADMR = (() => {
  try {
    const v = +localStorage.getItem('it_adm_range');
    return [7, 30, 90].includes(v) ? v : 30;
  } catch (_) {
    return 30;
  }
})();
let ADMCOL = (() => {
  try {
    return localStorage.getItem('it_adm_col') === '1';
  } catch (_) {
    return false;
  }
})();
let ADM_LIMITED = false,
  ADM_UPD = null,
  ADM_BUSY = false;
/* ---- shell ---- */
const _vAdmin34 = vAdmin;
vAdmin = function () {
  if (ADM.stage !== 'ready') return _vAdmin34();
  const tabs = ADM_TABS.filter(t => admOk(t[3]));
  const u = me() || {};
  const cur = (ADM_TABS.find(t => t[0] === ADM.tab) || [])[1] || 'Admin';
  return `<div class="adm2${ADMCOL ? ' col' : ''}" id="adm2">
 <a class="adm2-skip" href="#admbody" data-on-click="admSkip(event)">Skip to content</a>
 <aside class="adm2-side" id="admside" aria-label="Admin navigation">
  <div class="adm2-brand"><a href="/" data-on-click="go('/');return false" class="adm2-logo" aria-label="Introthread home"><span class="x-lm"><i></i><i></i></span><span class="adm2-wm">intro<b>thread</b></span></a><span class="adm-tag">Admin</span>
   <button type="button" class="adm2-colb" id="admcolb" data-on-click="admCol()" aria-label="${ADMCOL ? 'Expand' : 'Collapse'} sidebar" title="${ADMCOL ? 'Expand' : 'Collapse'} sidebar">${sv('chev', 16)}</button></div>
  <nav class="adm2-nav">${tabs.map(([k, l, ic]) => `<button type="button" class="${ADM.tab === k ? 'on' : ''}" ${ADM.tab === k ? 'aria-current="page"' : ''} data-tab="${k}" data-on-click="admDrawer(false);admGo('${k}')" title="${l}">${sv(ic, 19)}<span>${l}</span></button>`).join('')}</nav>
  <div class="adm2-who"><span class="adm2-av" aria-hidden="true">${esc(initials(u.name || 'A'))}</span><div class="adm2-wt"><b>${esc(u.name || 'Staff')}</b><small>${esc(ADM.me.role)}</small></div>
   <button type="button" class="adm2-ib" data-on-click="go('/app')" title="Back to the app" aria-label="Back to the app">${sv('arrow', 17)}</button><button type="button" class="adm2-ib" data-on-click="admSignOut()" title="Sign out" aria-label="Sign out">${sv('out', 17)}</button></div>
 </aside><div class="adm2-scrim" data-on-click="admDrawer(false)" aria-hidden="true"></div>
 <div class="adm2-main"><header class="adm2-top"><button type="button" class="adm2-ib dk" id="admmenu" data-on-click="admDrawer(true)" aria-label="Open menu" aria-controls="admside" aria-expanded="false">${sv('menu', 20)}</button><span class="adm2-tt">${esc(cur)}</span><span class="adm-tag">Admin</span></header>
 <main id="admbody" class="adm2-body" tabindex="-1">${admLoading()}</main></div></div>`;
};
function admCol() {
  ADMCOL = !ADMCOL;
  try {
    localStorage.setItem('it_adm_col', ADMCOL ? '1' : '0');
  } catch (_) {}
  const a = $('#adm2');
  if (a) a.classList.toggle('col', ADMCOL);
  const b = $('#admcolb');
  if (b) {
    const t = (ADMCOL ? 'Expand' : 'Collapse') + ' sidebar';
    b.setAttribute('aria-label', t);
    b.title = t;
  }
}
function admDrawer(open) {
  const a = $('#adm2');
  if (!a) return;
  a.classList.toggle('open', !!open);
  const m = $('#admmenu');
  if (m) m.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) {
    const f = a.querySelector('.adm2-nav button.on') || a.querySelector('.adm2-nav button');
    if (f) f.focus();
  } else if (m && a.contains(document.activeElement) && document.activeElement.closest('.adm2-side'))
    m.focus();
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const a = $('#adm2');
    if (a && a.classList.contains('open')) admDrawer(false);
  }
});
async function admSignOut() {
  try {
    if (SB) await SB.auth.signOut();
  } catch (_) {}
  ADM = { tab: 'dash', me: null, stage: 'load', err: '', q: '', page: 0, cache: {}, rf: 'open', mfa: null };
  logout();
}
admNavBadges = function () {
  const d = ADM.cache.dash;
  if (!d) return;
  document.querySelectorAll('.adm2-nav button,.adm-nav button').forEach(b => {
    const k =
      b.dataset.tab ||
      ((b.getAttribute('data-on-click') || b.getAttribute('onclick') || '').match(/admGo\('(\w+)'\)/) ||
        [])[1];
    const v = k === 'reports' ? d.reports_open : k === 'privacy' ? d.privacy_open : 0;
    const em = b.querySelector('em');
    if (em) em.remove();
    if (v) b.insertAdjacentHTML('beforeend', `<em aria-label="${v} waiting">${v}</em>`);
  });
};
/* ---- data ---- */
const _alt34 = admLoadTab;
admLoadTab = async function () {
  if (ADM.stage === 'ready' && ADM.tab === 'dash') return admDashLoad();
  return _alt34.apply(this, arguments);
};
function admFromOld(o) {
  return Object.assign({}, o, {
    days: 30,
    limited: true,
    users_period: o.users_30d,
    users_prev: null,
    active_period: o.active_30d,
    active_prev: null,
    threads_period: o.threads_30d,
    threads_prev: null,
    confirmed_period: null,
    confirmed_prev: null,
    both_period: null,
    both_prev: null,
    answered_period: null,
    contacts_period: null,
    contacts_prev: null,
    billing_configured: null,
    mfa_required: APPSET.admin_require_mfa !== false,
    maintenance: APPSET.maintenance === true,
    staff_without_mfa: null
  });
}
async function admDashLoad() {
  if (ADM_BUSY) return;
  ADM_BUSY = true;
  const had = ADM.cache.dash && $('#addash');
  if (had) {
    const r = $('#admref');
    if (r) {
      r.classList.add('spin');
      r.setAttribute('aria-busy', 'true');
    }
  } else admBody(admDashSkel());
  try {
    let d = null;
    if (!ADM_LIMITED) {
      try {
        d = await arpc('admin_stats_range', { days: ADMR });
      } catch (e) {
        if (/admin_stats_range|could not find|schema cache|does not exist/i.test((e && e.message) || ''))
          ADM_LIMITED = true;
        else throw e;
      }
    }
    if (ADM_LIMITED) {
      ADMR = 30;
      d = admFromOld(await arpc('admin_stats'));
    }
    ADM.cache.dash = d;
    ADM_UPD = new Date();
    if (ADM.tab === 'dash') admBody(admDash2(d));
    admNavBadges();
  } catch (e) {
    if (ADM.tab === 'dash')
      admBody(
        admDashHead(null) +
          `<div class="ix-card ix-fail" role="alert">${sv('alert', 22)}<div><b>The dashboard could not load</b><p>${esc((e && e.message) || 'Unknown error')}. Your data is safe. Check your connection and try again.</p></div><button type="button" class="ix-btn" data-on-click="admDashLoad()">${sv('refresh', 16)} Try again</button></div>`
      );
  } finally {
    ADM_BUSY = false;
  }
}
/* ---- helpers ---- */
const RNG = { 7: '7 days', 30: '30 days', 90: '90 days' };
const isNum = v => typeof v === 'number' && isFinite(v);
const dash = '\u2014';
function rate(a, b) {
  return isNum(a) && isNum(b) && b > 0 ? Math.round((a * 100) / b) : null;
}
function trendChip(cur, prev, o) {
  o = o || {};
  if (!isNum(cur) || !isNum(prev)) return o.none ? `<span class="ix-tr nt">${o.none}</span>` : '';
  const diff = cur - prev;
  const lab = `vs previous ${RNG[ADMR] || ADMR + ' days'}`;
  if (diff === 0) return `<span class="ix-tr nt" title="${lab}">No change ${lab}</span>`;
  const up = diff > 0;
  const good = o.inverse ? !up : up;
  return `<span class="ix-tr ${good ? 'up' : 'dn'}" title="${lab}">${sv(up ? 'up' : 'down', 13, 'currentColor', 2.4)}${up ? '+' : ''}${fmtN(diff)}${o.unit || ''} <span class="ix-trl">${lab}</span></span>`;
}
function admDashHead(d) {
  const lim = ADM_LIMITED;
  return `<div class="ix-h"><div><h1>Dashboard</h1><p>How Introthread is doing, and what needs your attention.</p></div>
 <div class="ix-hc"><label class="ix-sel" title="${lim ? 'Run database update 004 to enable 7 and 90 days' : 'Date range'}">${sv('cal', 17)}<span class="sr">Date range</span><select id="admrange" data-on-change="admRange(this.value)" aria-label="Date range">${[7, 30, 90].map(v => `<option value="${v}" ${ADMR === v ? 'selected' : ''} ${lim && v !== 30 ? 'disabled' : ''}>Last ${v} days</option>`).join('')}</select></label>
 <button type="button" class="ix-btn" id="admref" data-on-click="admDashLoad()" aria-label="Refresh dashboard">${sv('refresh', 17)}<span>Refresh</span></button></div></div>
 ${d ? `<p class="ix-upd">Updated ${ADM_UPD ? ADM_UPD.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}${lim ? ' · Showing 30 days. 7 and 90 days need database update 004.' : ''}</p>` : ''}`;
}
function admDashSkel() {
  return (
    admDashHead(null) +
    `<div class="ix-kg">${'<div class="ix-k sk"><i></i><b></b><s></s></div>'.repeat(8)}</div><div class="ix-card sk h1"></div><div class="ix-g2"><div class="ix-card sk h2"></div><div class="ix-card sk h2"></div></div>`
  );
}
/* ---- KPI cards ---- */
function admK(o) {
  const inner = `<span class="ix-ki t-${o.tone}" aria-hidden="true">${sv(o.icon, 20)}</span><span class="ix-kb"><span class="ix-kl">${o.label}</span><span class="ix-kv${o.value === dash ? ' na' : ''}">${o.value}</span><span class="ix-ks">${o.sub || ''}</span>${o.trend || ''}</span>${o.link ? `<span class="ix-kgo" aria-hidden="true">${sv('chev', 16)}</span>` : ''}`;
  return o.link
    ? `<button type="button" class="ix-k link" data-on-click="admGo('${o.link}')" aria-label="${esc(o.label)}: ${esc(String(o.value))}. Open ${esc(o.linkName)}">${inner}</button>`
    : `<div class="ix-k">${inner}</div>`;
}
function admKpis(d) {
  const R = RNG[d.days] || d.days + ' days',
    L = d.limited;
  const cr = L ? rate(d.confirmed, d.threads) : rate(d.confirmed_period, d.threads_period),
    crp = L ? null : rate(d.confirmed_prev, d.threads_prev);
  const br = L ? rate(d.both_answered, d.threads) : rate(d.both_period, d.threads_period),
    brp = L ? null : rate(d.both_prev, d.threads_prev);
  const ar = rate(d.active_period, d.users);
  return [
    {
      label: 'People',
      icon: 'users',
      tone: 'b',
      value: fmtN(d.users),
      sub: `${fmtN(d.users_period)} joined in the last ${R}`,
      trend: trendChip(d.users_period, d.users_prev),
      link: 'users',
      linkName: 'Users'
    },
    {
      label: `Active (${R})`,
      icon: 'dot',
      tone: 'g',
      value: fmtN(d.active_period),
      sub: ar == null ? 'No people yet' : `${ar}% of people created a Thread`,
      trend: trendChip(d.active_period, d.active_prev),
      link: 'users',
      linkName: 'Users'
    },
    {
      label: 'Threads',
      icon: 'linkc',
      tone: 'b',
      value: fmtN(d.threads),
      sub: `${fmtN(d.threads_period)} created in the last ${R}`,
      trend: trendChip(d.threads_period, d.threads_prev)
    },
    {
      label: 'Confirmed',
      icon: 'okc',
      tone: 'o',
      value: cr == null ? dash : cr + '%',
      sub:
        cr == null
          ? L
            ? 'No Threads yet'
            : `No new Threads in the last ${R}`
          : L
            ? `${fmtN(d.confirmed)} of ${fmtN(d.threads)} Threads, all time`
            : `${fmtN(d.confirmed_period)} of ${fmtN(d.threads_period)} new Threads`,
      trend: cr != null && crp != null ? trendChip(cr, crp, { unit: ' pts' }) : ''
    },
    {
      label: 'Both answered',
      icon: 'msg',
      tone: 'p',
      value: br == null ? dash : br + '%',
      sub:
        br == null
          ? 'Needs Threads to measure'
          : L
            ? `${fmtN(d.both_answered)} "What's next?" pairs, all time`
            : `${fmtN(d.both_period)} "What's next?" pairs`,
      trend: br != null && brp != null ? trendChip(br, brp, { unit: ' pts' }) : ''
    },
    {
      label: 'Paying',
      icon: 'dollar',
      tone: 'g',
      value: fmtN(d.paying),
      sub: d.users ? `${rate(d.paying, d.users)}% of people` : 'No people yet',
      trend: '<span class="ix-tr nt">Current total</span>',
      link: 'revenue',
      linkName: 'Revenue'
    },
    {
      label: 'Monthly revenue',
      icon: 'bars',
      tone: 'o',
      value: '$' + fmtN(Math.round(d.mrr_usd || 0)),
      sub: d.billing_configured === false ? 'Estimated · USD · billing not connected' : 'Estimated · USD',
      trend: '<span class="ix-tr nt">Current total</span>',
      link: 'revenue',
      linkName: 'Revenue'
    },
    {
      label: 'Contacts imported',
      icon: 'contact',
      tone: 'b',
      value: fmtN(d.contacts),
      sub: isNum(d.contacts_period) ? `${fmtN(d.contacts_period)} in the last ${R}` : 'All time',
      trend: trendChip(d.contacts_period, d.contacts_prev)
    }
  ]
    .map(admK)
    .join('');
}
/* ---- operations / health ---- */
function admHealth(d) {
  const it = [];
  const ago = s => {
    const h = (Date.now() - Date.parse(s)) / 36e5;
    return h < 1 ? 'under an hour' : h < 48 ? Math.round(h) + ' hours' : Math.round(h / 24) + ' days';
  };
  if (d.reports_open) {
    const old = d.reports_oldest && Date.now() - Date.parse(d.reports_oldest) > 864e5;
    it.push({
      lv: old ? 'crit' : 'warn',
      ic: 'shield',
      t: `${d.reports_open} report${d.reports_open > 1 ? 's' : ''} waiting for review`,
      s: d.reports_oldest
        ? `Oldest has waited ${ago(d.reports_oldest)}. Target: within 24 hours.`
        : 'Target: review within 24 hours.',
      a: 'Review reports',
      k: 'reports'
    });
  }
  if (d.privacy_overdue)
    it.push({
      lv: 'crit',
      ic: 'lock',
      t: `${d.privacy_overdue} privacy request${d.privacy_overdue > 1 ? 's' : ''} overdue`,
      s: 'UK GDPR and CCPA require a reply within 30 days.',
      a: 'Open requests',
      k: 'privacy'
    });
  else if (d.privacy_open) {
    const dd = d.privacy_next_due ? Math.ceil((Date.parse(d.privacy_next_due) - Date.now()) / 864e5) : null;
    it.push({
      lv: dd != null && dd <= 7 ? 'warn' : 'info',
      ic: 'lock',
      t: `${d.privacy_open} privacy request${d.privacy_open > 1 ? 's' : ''} open`,
      s: dd != null ? `Next one due in ${dd} day${dd === 1 ? '' : 's'}.` : 'Due within 30 days of receipt.',
      a: 'Open requests',
      k: 'privacy'
    });
  }
  if (d.mfa_required === false)
    it.push({
      lv: 'crit',
      ic: 'alert',
      t: 'Two-step verification is off for staff',
      s: 'Anyone with a staff password can open admin. Turn it back on in Settings.',
      a: 'Open Settings',
      k: 'settings'
    });
  if (isNum(d.staff_without_mfa) && d.staff_without_mfa > 0)
    it.push({
      lv: 'warn',
      ic: 'user',
      t: `${d.staff_without_mfa} staff member${d.staff_without_mfa > 1 ? 's have' : ' has'} not set up two-step verification`,
      s: 'They will be asked to set it up the next time they open admin.',
      a: 'View staff',
      k: 'staff'
    });
  if (d.maintenance)
    it.push({
      lv: 'warn',
      ic: 'cog',
      t: 'Maintenance mode is on',
      s: 'The app is paused for everyone except staff.',
      a: 'Open Settings',
      k: 'settings'
    });
  if (d.billing_configured === false)
    it.push({
      lv: 'info',
      ic: 'dollar',
      t: 'Billing is not connected',
      s: 'Paid plans cannot be bought yet. Stripe setup is the next phase.',
      a: 'Open Revenue',
      k: 'revenue'
    });
  if (d.suspended)
    it.push({
      lv: 'info',
      ic: 'user',
      t: `${d.suspended} account${d.suspended > 1 ? 's' : ''} suspended or banned`,
      s: 'Review them from Users when needed.',
      a: 'Open Users',
      k: 'users'
    });
  const crit = it.filter(x => x.lv === 'crit').length,
    warn = it.filter(x => x.lv === 'warn').length,
    act = crit + warn;
  const head = crit
    ? [
        'crit',
        'alert',
        `${act} item${act > 1 ? 's' : ''} need${act > 1 ? '' : 's'} attention`,
        'Start with the items marked urgent.'
      ]
    : warn
      ? [
          'warn',
          'info',
          `${act} item${act > 1 ? 's' : ''} to review`,
          'Nothing urgent, but worth a look today.'
        ]
      : ['ok', 'okc', 'All clear', 'No waiting reports, privacy deadlines or security issues.'];
  return `<section class="ix-card ix-ops ${head[0]}" aria-labelledby="adopsh"><div class="ix-opsh"><span class="ix-opi" aria-hidden="true">${sv(head[1], 22)}</span><div><h2 id="adopsh">${head[2]}</h2><p>${head[3]}</p></div></div>
 ${it.length ? `<ul class="ix-opl">${it.map(x => `<li class="${x.lv}"><span class="ix-opd" aria-hidden="true">${sv(x.ic, 17)}</span><div><b>${x.lv === 'crit' ? '<span class="ix-urg">Urgent</span> ' : ''}${x.t}</b><small>${x.s}</small></div><button type="button" class="ix-btn sm" data-on-click="admGo('${x.k}')">${x.a}</button></li>`).join('')}</ul>` : ''}</section>`;
}
/* ---- charts (real data only) ---- */
function admNice(m) {
  if (m <= 4) return Math.max(1, m);
  const p = Math.pow(10, Math.floor(Math.log10(m))),
    f = m / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}
const dLab = d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const dLong = d =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
function admChart(id, S, one, many, empty) {
  S = S || [];
  const n = S.length;
  if (!n) return `<div class="ach-none">No data available.</div>`;
  const sum = S.reduce((a, x) => a + (+x.n || 0), 0),
    mx = Math.max(0, ...S.map(x => +x.n || 0)),
    max = admNice(mx);
  const ticks = max <= 4 ? [...Array(max + 1).keys()] : [0, max / 2, max];
  const step = Math.max(1, Math.ceil((n - 1) / 5));
  const xs = [];
  for (let i = 0; i < n - 1; i += step) if (n - 1 - i >= step * 0.6) xs.push(i);
  xs.push(n - 1);
  window._ach = window._ach || {};
  window._ach[id] = { S, one, many };
  return `<div class="ach" id="${id}" tabindex="0" role="img" aria-label="${esc(many)} per day: ${fmtN(sum)} in total over ${n} days, highest ${fmtN(mx)} in a day. Use the left and right arrow keys to read each day." data-on-keydown="achKey(event,this)" data-on-mousemove="achMove(event,this)" data-on-mouseleave="achHide(this)" data-on-focus="achShow(this,${n - 1})" data-on-blur="achHide(this)">
 <div class="ach-y" aria-hidden="true">${ticks.map(t => `<span style="bottom:${(t / max) * 100}%">${fmtN(t)}</span>`).join('')}</div>
 <div class="ach-p"><div class="ach-g" aria-hidden="true">${ticks.map(t => `<i style="bottom:${(t / max) * 100}%"></i>`).join('')}</div>
 <div class="ach-b" aria-hidden="true">${S.map((x, i) => `<i data-i="${i}" style="height:${x.n ? Math.max(1.5, (x.n / max) * 100) : 0}%"></i>`).join('')}</div>
 ${sum ? '' : `<div class="ach-e">${sv('info', 16)}<span>${empty}</span></div>`}<div class="ach-tip" role="status" aria-live="polite" hidden></div></div>
 <div class="ach-x" aria-hidden="true">${xs.map(i => `<span style="left:${((i + 0.5) / n) * 100}%">${i === n - 1 ? 'Today' : dLab(S[i].d)}</span>`).join('')}</div></div>`;
}
function achShow(el, i) {
  const c = (window._ach || {})[el.id];
  if (!c) return;
  const n = c.S.length;
  i = Math.max(0, Math.min(n - 1, i));
  el._i = i;
  const x = c.S[i];
  el.querySelectorAll('.ach-b i.on').forEach(b => b.classList.remove('on'));
  const bar = el.querySelector(`.ach-b i[data-i="${i}"]`);
  if (bar) bar.classList.add('on');
  const t = el.querySelector('.ach-tip');
  t.hidden = false;
  t.innerHTML = `<b>${dLong(x.d)}</b><span>${fmtN(x.n)} ${x.n === 1 ? c.one : c.many}</span>`;
  const pct = ((i + 0.5) / n) * 100;
  t.style.left = pct + '%';
  t.classList.toggle('r', pct > 70);
  t.classList.toggle('l', pct < 30);
}
function achHide(el) {
  const t = el.querySelector('.ach-tip');
  if (t) t.hidden = true;
  el.querySelectorAll('.ach-b i.on').forEach(b => b.classList.remove('on'));
}
function achMove(e, el) {
  const b = el.querySelector('.ach-b');
  const r = b.getBoundingClientRect();
  if (!r.width) return;
  const c = (window._ach || {})[el.id];
  if (!c) return;
  achShow(el, Math.floor(((e.clientX - r.left) / r.width) * c.S.length));
}
function achKey(e, el) {
  const c = (window._ach || {})[el.id];
  if (!c) return;
  const n = c.S.length;
  let i = el._i == null ? n - 1 : el._i;
  if (e.key === 'ArrowLeft') i--;
  else if (e.key === 'ArrowRight') i++;
  else if (e.key === 'Home') i = 0;
  else if (e.key === 'End') i = n - 1;
  else return;
  e.preventDefault();
  achShow(el, i);
}
/* ---- lower panels ---- */
function admFunnel(d) {
  if (d.limited || !isNum(d.threads_period)) return `<p class="ix-mu">Needs database update 004.</p>`;
  const T = d.threads_period;
  if (!T)
    return `<div class="ix-empty">${sv('linkc', 20)}<span>No Threads in the last ${RNG[d.days]}. The funnel fills in as people Tap.</span></div>`;
  const rows = [
    ['Threads created', T],
    ['Confirmed by both people', d.confirmed_period],
    ['You answered "What\'s next?"', d.answered_period],
    ['Both answered', d.both_period]
  ];
  return `<ol class="ix-fun">${rows.map(([l, v], i) => `<li><div class="ix-funl"><span>${l}</span><b>${fmtN(v)}<small>${i ? ` · ${rate(v, T)}%` : ''}</small></b></div><div class="ix-bar" role="presentation"><i style="width:${Math.max(v ? 2 : 0, rate(v, T) || 0)}%"></i></div></li>`).join('')}</ol>`;
}
function admPlaces(d) {
  const C = d.cities || [];
  const tot = C.reduce((a, x) => a + x.n, 0);
  if (!tot) return `<div class="ix-empty">${sv('pin', 20)}<span>No locations yet.</span></div>`;
  return `<ul class="ix-list">${C.map(c => `<li><div class="ix-funl"><span>${esc(c.c)}</span><b>${fmtN(c.n)}<small> · ${rate(c.n, d.users) || 0}%</small></b></div><div class="ix-bar o" role="presentation"><i style="width:${Math.max(2, (c.n / tot) * 100)}%"></i></div></li>`).join('')}</ul>`;
}
function admPlanMix(d) {
  const p = d.plans || {};
  const paidE = Object.entries(p).filter(([k]) => k !== 'free');
  const paid = paidE.reduce((a, [, n]) => a + n, 0);
  const rows = [['Free', Math.max(0, d.users - paid)]].concat(
    paidE.map(([k, n]) => [k[0].toUpperCase() + k.slice(1), n])
  );
  if (!d.users) return `<div class="ix-empty">${sv('db', 20)}<span>No people yet.</span></div>`;
  return `<ul class="ix-list">${rows.map(([l, n], i) => `<li><div class="ix-funl"><span>${esc(l)}</span><b>${fmtN(n)}<small> · ${rate(n, d.users) || 0}%</small></b></div><div class="ix-bar${i ? ' g' : ' n'}" role="presentation"><i style="width:${Math.max(n ? 2 : 0, (n / d.users) * 100)}%"></i></div></li>`).join('')}</ul>${d.billing_configured === false ? `<p class="ix-foot">${sv('info', 14)} Paid plans open once billing is connected.</p>` : ''}`;
}
function admPanel(title, ic, meta, body, link) {
  return `<section class="ix-card ix-pn"><div class="ix-pnh"><span class="ix-pni" aria-hidden="true">${sv(ic, 18)}</span><h2>${title}</h2>${meta ? `<span class="ix-pnm">${meta}</span>` : ''}${link ? `<button type="button" class="ix-lnk" data-on-click="admGo('${link[0]}')">${link[1]} ${sv('chev', 14)}</button>` : ''}</div>${body}</section>`;
}
/* ---- page ---- */
function admDash2(d) {
  const R = RNG[d.days] || d.days + ' days';
  const su = (d.signups_by_day || []).reduce((a, x) => a + x.n, 0),
    th = (d.threads_by_day || []).reduce((a, x) => a + x.n, 0);
  return `<div id="addash">${admDashHead(d)}<h2 class="sr">Key numbers</h2><div class="ix-kg">${admKpis(d)}</div>${admHealth(d)}
 <div class="ix-g2">${admPanel('New people', 'user', `${fmtN(su)} in ${R}`, admChart('achp', d.signups_by_day, 'new person', 'new people', `No one joined in the last ${R}.`), ['users', 'Users'])}${admPanel('New Threads', 'linkc', `${fmtN(th)} in ${R}`, admChart('acht', d.threads_by_day, 'new Thread', 'new Threads', `No Threads were created in the last ${R}.`))}</div>
 <div class="ix-g3">${admPanel('From Tap to follow-up', 'msg', d.limited ? '' : `Last ${R}`, admFunnel(d))}${admPanel('Where people are', 'pin', 'All time', admPlaces(d))}${admPanel('Plans', 'db', 'Current', admPlanMix(d), ['plans', 'Pricing'])}</div></div>`;
}

/* v59: named handlers for the dashboard (no inline JavaScript). */
function admSkip(e) {
  e.preventDefault();
  const b = $('#admbody');
  if (b) b.focus();
}
function admRange(v) {
  ADMR = +v;
  try {
    localStorage.setItem('it_adm_range', ADMR);
  } catch (_) {}
  admDashLoad();
}
