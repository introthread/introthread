// Introthread - Admin area core (v33): /admin routing, staff sign-in gate, platform controls, shared admin helpers.
// Moved out of index.html in v52 (code split step 4). Load order matters: see the <script> list at the end of index.html.

/* ================= v33: Admin area (/admin) + platform controls ================= */
let ADM = { tab: 'dash', me: null, stage: 'load', err: '', q: '', page: 0, cache: {}, rf: 'open', mfa: null },
  APPSET = {};
const ADM_TABS = [
  ['dash', 'Dashboard', 'chart', null],
  ['users', 'Users', 'users', null],
  ['reports', 'Moderation', 'shield', ['owner', 'admin', 'moderator', 'support']],
  ['rooms', 'Rooms', 'cal', null],
  ['revenue', 'Revenue', 'brief', ['owner', 'admin', 'finance']],
  ['plans', 'Plans and pricing', 'grid', ['owner', 'finance']],
  ['settings', 'Settings', 'sync', ['owner', 'admin']],
  ['privacy', 'Privacy requests', 'lock', ['owner', 'admin', 'support']],
  ['staff', 'Staff', 'user', null],
  ['audit', 'Audit log', 'eye', null]
];
const ADM_ROLE_DESC = {
  owner: 'Everything, including staff and billing settings',
  admin: 'Users, moderation, Rooms, settings',
  support: 'View users, export data, privacy requests',
  moderator: 'Reports, suspensions, Rooms',
  finance: 'Revenue, plans and pricing'
};
async function arpc(fn, args) {
  const { data, error } = await SB.rpc(fn, args || {});
  if (error) throw error;
  return data;
}
const admOk = roles => !roles || (ADM.me && roles.includes(ADM.me.role));
const fmtN = n => Number(n || 0).toLocaleString('en-US');
const fmtD = s =>
  s ? new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const fmtDT = s =>
  s
    ? new Date(s).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '-';
const pct = (a, b) => (b ? Math.round((a * 100) / b) + '%' : '-');
function admPath() {
  return RH().replace(/^#/, '');
}
const _render33 = render;
render = function () {
  const p = admPath();
  if (p === '/admin' || p.startsWith('/admin/')) {
    const t = p.split('/')[2];
    if (t && ADM_TABS.some(x => x[0] === t)) ADM.tab = t;
    $('#root').innerHTML = vAdmin();
    if (ADM.stage === 'load') admBoot();
    else admLoadTab();
    return;
  }
  if (p.startsWith('/app') && MYSTATUS && MYSTATUS.status && MYSTATUS.status !== 'active') {
    $('#root').innerHTML = vBlocked();
    return;
  }
  if (p.startsWith('/app') && APPSET.maintenance === true && !(ADM.me && ADM.me.staff)) {
    $('#root').innerHTML = vMaint();
    return;
  }
  const r = _render33.apply(this, arguments);
  if (p.startsWith('/app')) annShow();
  return r;
};
async function admBoot() {
  ADM.stage = 'checking';
  try {
    if (!SB) {
      ADM.stage = 'nosb';
      return admPaint();
    }
    const {
      data: { session }
    } = await SB.auth.getSession();
    if (!session) {
      ADM.stage = 'signin';
      return admPaint();
    }
    ADM.me = await arpc('admin_me');
    if (!ADM.me || !ADM.me.staff) {
      ADM.stage = 'denied';
      return admPaint();
    }
    if (ADM.me.mfa_required && ADM.me.aal !== 'aal2') {
      ADM.stage = 'mfa';
      admPaint();
      return admMfaStart();
    }
    ADM.stage = 'ready';
    admPaint();
    admLoadTab();
  } catch (e) {
    ADM.stage = 'error';
    ADM.err = (e && e.message) || 'Something went wrong';
    admPaint();
  }
}
function admPaint() {
  if (admPath().startsWith('/admin')) $('#root').innerHTML = vAdmin();
}
function admGo(t) {
  ADM.tab = t;
  history.pushState(null, '', '/admin/' + t);
  admPaint();
  admLoadTab();
}
function vAdmin() {
  const s = ADM.stage;
  const gate = (ic, t, b, btn) =>
    `<div class="adm-gate"><div class="adm-gc"><a class="x-logo dk" href="/" onclick="go('/');return false"><span class="x-lm"><i></i><i></i></span><span>intro<b>thread</b></span></a><span class="adm-tag">Admin</span><div class="adm-gi">${sv(ic, 24)}</div><h1>${t}</h1><p>${b}</p>${btn || ''}</div></div>`;
  if (s === 'load' || s === 'checking') return gate('shield', 'Checking access', 'One moment.');
  if (s === 'nosb')
    return gate(
      'lock',
      'Admin needs the live database',
      'Open this page on introthread.com while signed in.'
    );
  if (s === 'signin')
    return gate(
      'lock',
      'Sign in to continue',
      'The admin area is only for Introthread staff. Sign in with your staff account.',
      `<button class="cap-btn" onclick="sessionStorage.setItem('it_after','/admin');go('/login')">Sign in</button>`
    );
  if (s === 'denied')
    return gate(
      'shield',
      'No admin access',
      'This account is not on the staff list. Ask an owner to add you.',
      `<button class="cap-btn2" onclick="go('/app')">Back to the app</button>`
    );
  if (s === 'error')
    return gate(
      'shield',
      'Could not open admin',
      esc(ADM.err) +
        (/function|does not exist|schema cache/i.test(ADM.err)
          ? '<br><br>The admin database update (migration 003) has not been run yet.'
          : ''),
      `<button class="cap-btn" onclick="ADM.stage='load';admPaint();admBoot()">Try again</button>`
    );
  if (s === 'mfa')
    return gate(
      'lock',
      'Two-step verification',
      ADM.mfa && ADM.mfa.enroll
        ? 'Admin access needs a second step. Scan this code with Google Authenticator, Microsoft Authenticator or 1Password, then enter the 6-digit code.'
        : 'Enter the 6-digit code from your authenticator app.',
      `<div id="admmfa">${ADM.mfa && ADM.mfa.enroll ? `<div class="adm-qr"><img src="${ADM.mfa.enroll.qr}" alt="QR code for your authenticator app"><small>Or enter this key: <code>${esc(ADM.mfa.enroll.secret)}</code></small></div>` : ''}<input id="admcode" class="adm-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" oninput="if(this.value.replace(/\\D/g,'').length===6)admMfaVerify()"><button class="cap-btn" onclick="admMfaVerify()">Verify</button><p class="adm-err" id="admmfaerr"></p></div>`
    );
  const tabs = ADM_TABS.filter(t => admOk(t[3]));
  return `<div class="adm"><aside class="adm-side"><div class="adm-brand"><a class="x-logo dk" href="/" onclick="go('/');return false"><span class="x-lm"><i></i><i></i></span><span>intro<b>thread</b></span></a><span class="adm-tag">Admin</span></div>
 <nav class="adm-nav">${tabs.map(([k, l, ic]) => `<button class="${ADM.tab === k ? 'on' : ''}" onclick="admGo('${k}')">${sv(ic, 17)}<span>${l}</span></button>`).join('')}</nav>
 <div class="adm-who"><span class="ct-av sm">${esc(initials((me() || {}).name || 'A'))}</span><div><b>${esc((me() || {}).name || 'Staff')}</b><small>${esc(ADM.me.role)}</small></div><button class="ct-dots" title="Back to app" aria-label="Back to app" onclick="go('/app')">${sv('arrow', 15)}</button></div></aside>
 <main class="adm-main"><div class="adm-mtabs">${tabs.map(([k, l]) => `<button class="${ADM.tab === k ? 'on' : ''}" onclick="admGo('${k}')">${l}</button>`).join('')}</div><div id="admbody">${admLoading()}</div></main></div>`;
}
const admLoading = () => `<div class="adm-load"><i></i><i></i><i></i></div>`;
function admBody(h) {
  const b = $('#admbody');
  if (b) b.innerHTML = h;
}
function admHead(t, sub, act) {
  return `<div class="adm-h"><div><h1>${t}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${act || ''}</div>`;
}
async function admLoadTab() {
  if (ADM.stage !== 'ready') return;
  const t = ADM.tab;
  try {
    admBody(admLoading());
    if (t === 'dash') {
      ADM.cache.dash = await arpc('admin_stats');
      if (ADM.tab === t) admBody(admDash(ADM.cache.dash));
      admNavBadges();
    } else if (t === 'users') {
      const d = await arpc('admin_users', { q: ADM.q, lim: 50, off: ADM.page * 50 });
      if (ADM.tab === t) admBody(admUsers(d));
    } else if (t === 'reports') {
      const d = await arpc('admin_reports', { st: ADM.rf });
      if (ADM.tab === t) admBody(admReports(d));
    } else if (t === 'rooms') {
      const d = await arpc('admin_rooms');
      if (ADM.tab === t) admBody(admRooms(d));
    } else if (t === 'revenue') {
      const [d, s, p] = await Promise.all([
        arpc('admin_stats'),
        arpc('admin_subscriptions'),
        SB.from('plans').select('*').order('sort')
      ]);
      if (ADM.tab === t) admBody(admRevenue(d, s, p.data || []));
    } else if (t === 'plans') {
      const { data, error } = await SB.from('plans').select('*').order('sort');
      if (error) throw error;
      if (ADM.tab === t) admBody(admPlans(data));
    } else if (t === 'settings') {
      await appSetLoad(true);
      if (ADM.tab === t) admBody(admSettings());
    } else if (t === 'privacy') {
      const d = await arpc('admin_privacy');
      if (ADM.tab === t) admBody(admPrivacy(d));
    } else if (t === 'staff') {
      const d = await arpc('admin_staff');
      if (ADM.tab === t) admBody(admStaff(d));
    } else if (t === 'audit') {
      const d = await arpc('admin_audit', { lim: 300 });
      ADM.cache.audit = d;
      if (ADM.tab === t) admBody(admAudit(d));
    }
  } catch (e) {
    admBody(
      `<div class="adm-empty">${sv('shield', 22)}<b>Could not load this page</b><p>${esc((e && e.message) || 'Error')}</p><button class="cap-btn2" onclick="admLoadTab()">Try again</button></div>`
    );
  }
}
function admNavBadges() {
  const n = document.querySelector('.adm-nav');
  if (!n || !ADM.cache.dash) return;
  const d = ADM.cache.dash;
  n.querySelectorAll('button').forEach(b => {
    const on = b.getAttribute('onclick') || '';
    const v = on.includes("'reports'") ? d.reports_open : on.includes("'privacy'") ? d.privacy_open : 0;
    const em = b.querySelector('em');
    if (em) em.remove();
    if (v) b.insertAdjacentHTML('beforeend', `<em>${v}</em>`);
  });
}
/* ---- two-step verification (Supabase TOTP) ---- */
async function admMfaStart() {
  try {
    const { data, error } = await SB.auth.mfa.listFactors();
    if (error) throw error;
    const f = (data.totp || []).find(x => x.status === 'verified');
    if (f) {
      ADM.mfa = { factorId: f.id };
    } else {
      for (const x of (data.all || []).filter(x => x.status !== 'verified')) {
        try {
          await SB.auth.mfa.unenroll({ factorId: x.id });
        } catch (_) {}
      }
      const en = await SB.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Introthread admin' });
      if (en.error) throw en.error;
      ADM.mfa = { factorId: en.data.id, enroll: { qr: en.data.totp.qr_code, secret: en.data.totp.secret } };
    }
    admPaint();
    setTimeout(() => {
      const c = $('#admcode');
      if (c) c.focus();
    }, 50);
  } catch (e) {
    ADM.stage = 'error';
    ADM.err = 'Two-step verification could not start: ' + ((e && e.message) || '');
    admPaint();
  }
}
async function admMfaVerify() {
  const c = (($('#admcode') || {}).value || '').replace(/\D/g, '');
  const er = $('#admmfaerr');
  if (c.length !== 6) {
    if (er) er.textContent = 'Enter the 6-digit code';
    return;
  }
  try {
    const { error } = await SB.auth.mfa.challengeAndVerify({ factorId: ADM.mfa.factorId, code: c });
    if (error) throw error;
    ADM.me = await arpc('admin_me');
    ADM.stage = 'ready';
    ADM.mfa = null;
    admPaint();
    admLoadTab();
  } catch (e) {
    if (er) er.textContent = 'That code did not work. Check the time on your phone and try again.';
    const i = $('#admcode');
    if (i) {
      i.value = '';
      i.focus();
    }
  }
}
/* ---- reason / confirm dialog (every action is recorded) ---- */
function admAsk(o) {
  window._admAskCb = o.run;
  modal(`<div class="cap-m"><div class="row between"><h3>${o.title}</h3><button class="x" aria-label="Close" onclick="closeModal()">&times;</button></div>${o.body ? `<p class="fu-sub">${o.body}</p>` : ''}
 ${o.extra || ''}<label class="x-f"><span>Reason <i>*</i></span><textarea id="admreason" rows="3" maxlength="500" placeholder="Recorded in the audit log"></textarea></label>
 ${o.typed ? `<label class="x-f"><span>Type <b>${o.typed}</b> to confirm</span><input id="admtyped" autocomplete="off"></label>` : ''}<p class="adm-err" id="admaskerr"></p>
 <button class="cap-btn${o.danger ? ' bad' : ''}" id="admaskgo" onclick="admAskGo('${o.typed || ''}')">${o.cta || 'Confirm'}</button></div>`);
}
async function admAskGo(typed) {
  const r = (($('#admreason') || {}).value || '').trim(),
    er = $('#admaskerr');
  if (!r) {
    er.textContent = 'Add a short reason';
    return;
  }
  if (typed && (($('#admtyped') || {}).value || '').trim() !== typed) {
    er.textContent = 'Type ' + typed + ' exactly';
    return;
  }
  const b = $('#admaskgo');
  b.disabled = true;
  try {
    await window._admAskCb(r);
    closeModal();
    toast('Done. Recorded in the audit log.');
    admLoadTab();
  } catch (e) {
    b.disabled = false;
    er.textContent = (e && e.message) || 'Something went wrong';
  }
}
function admDownload(name, data, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type: type || 'application/json' }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
function admCsv(rows, cols) {
  const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  return (
    '\ufeff' +
    [cols.map(c => q(c[1])).join(',')].concat(rows.map(r => cols.map(c => q(r[c[0]])).join(','))).join('\n')
  );
}
/* ---- Dashboard ---- */
function admBars(a, label) {
  const mx = Math.max(1, ...a.map(x => x.n));
  return `<div class="adm-bars" role="img" aria-label="${label}">${a.map(x => `<i style="height:${Math.max(2, Math.round((x.n * 100) / mx))}%" title="${fmtD(x.d)}: ${x.n}"></i>`).join('')}</div><div class="adm-bx"><span>${fmtD(a[0] && a[0].d)}</span><span>Today</span></div>`;
}
function admKpi(l, v, s) {
  return `<div class="adm-k"><span>${l}</span><b>${v}</b>${s ? `<small>${s}</small>` : ''}</div>`;
}
function admDash(d) {
  const sum = a => (a || []).reduce((x, y) => x + y.n, 0);
  return (
    admHead(
      'Dashboard',
      'How Introthread is doing right now.',
      `<button class="cap-btn2 adm-sm" onclick="admLoadTab()">${sv('sync', 15)} Refresh</button>`
    ) +
    `<div class="adm-kg">${admKpi('People', fmtN(d.users), `+${fmtN(d.users_7d)} this week`)}${admKpi('Active (30 days)', fmtN(d.active_30d), `${fmtN(d.active_7d)} this week · ${pct(d.active_30d, d.users)} of people`)}${admKpi('Threads', fmtN(d.threads), `+${fmtN(d.threads_30d)} in 30 days`)}${admKpi('Confirmed', pct(d.confirmed, d.threads), `${fmtN(d.confirmed)} by both sides`)}
 ${admKpi('Both answered', pct(d.both_answered, d.threads), `${fmtN(d.both_answered)} "What's next?" pairs`)}${admKpi('Paying', fmtN(d.paying), `${pct(d.paying, d.users)} of people`)}${admKpi('Monthly revenue', '$' + fmtN(Math.round(d.mrr_usd)), 'Estimated, USD')}${admKpi('Contacts imported', fmtN(d.contacts))}</div>
 <div class="adm-alerts">${d.reports_open ? `<button class="adm-al warn" onclick="admGo('reports')">${sv('shield', 16)}<b>${d.reports_open} open report${d.reports_open > 1 ? 's' : ''}</b><span>Review</span></button>` : ''}${d.privacy_overdue ? `<button class="adm-al bad" onclick="admGo('privacy')">${sv('lock', 16)}<b>${d.privacy_overdue} privacy request${d.privacy_overdue > 1 ? 's' : ''} overdue</b><span>30-day legal limit</span></button>` : d.privacy_open ? `<button class="adm-al warn" onclick="admGo('privacy')">${sv('lock', 16)}<b>${d.privacy_open} privacy request${d.privacy_open > 1 ? 's' : ''} open</b><span>Due within 30 days</span></button>` : ''}${d.suspended ? `<button class="adm-al" onclick="admGo('users')">${sv('user', 16)}<b>${d.suspended} suspended or banned</b></button>` : ''}${!d.reports_open && !d.privacy_open ? `<div class="adm-al ok">${sv('check', 16)}<b>Nothing needs attention</b></div>` : ''}</div>
 <div class="adm-g2"><div class="adm-card"><h3>New people <small>${fmtN(sum(d.signups_by_day))} in 30 days</small></h3>${admBars(d.signups_by_day || [], 'Sign-ups per day')}</div><div class="adm-card"><h3>New Threads <small>${fmtN(sum(d.threads_by_day))} in 30 days</small></h3>${admBars(d.threads_by_day || [], 'Threads per day')}</div></div>
 <div class="adm-g2"><div class="adm-card"><h3>Where people are</h3>${(d.cities || []).map(c => `<div class="adm-row"><span>${esc(c.c)}</span><b>${fmtN(c.n)}</b></div>`).join('') || '<p class="adm-mu">No data yet</p>'}</div><div class="adm-card"><h3>Plans</h3>${admRowsPlans(d)}</div></div>`
  );
}
function admRowsPlans(d) {
  const p = d.plans || {};
  const paid = Object.entries(p)
    .filter(([k]) => k !== 'free')
    .reduce((a, [, n]) => a + n, 0);
  return (
    `<div class="adm-row"><span>Free</span><b>${fmtN(d.users - paid)}</b></div>` +
    Object.entries(p)
      .filter(([k]) => k !== 'free')
      .map(
        ([k, n]) =>
          `<div class="adm-row"><span>${esc(k[0].toUpperCase() + k.slice(1))}</span><b>${fmtN(n)}</b></div>`
      )
      .join('')
  );
}
/* ---- Users ---- */
const admStatus = s =>
  `<span class="adm-pill ${s === 'active' ? 'ok' : s === 'suspended' ? 'warn' : 'bad'}">${s}</span>`;
function admUsers(d) {
  ADM.cache.users = d.rows;
  const pages = Math.max(1, Math.ceil(d.total / 50));
  return (
    admHead(
      'Users',
      `${fmtN(d.total)} ${ADM.q ? 'matching' : 'people'}`,
      `<button class="cap-btn2 adm-sm" onclick="admUsersCsv()">${sv('arrow', 15)} Export CSV</button>`
    ) +
    `<label class="ct-s adm-search">${sv('search', 16)}<input id="admq" placeholder="Search name, handle or email, then press Enter" value="${esc(ADM.q)}" onkeydown="if(event.key==='Enter'){ADM.q=this.value.trim();ADM.page=0;admLoadTab()}" aria-label="Search users"></label>
 <div class="adm-t"><div class="adm-tr adm-th"><span>Person</span><span>Plan</span><span>Status</span><span>Threads</span><span>Joined</span><span>Last sign-in</span></div>
 ${d.rows.map(u => `<button class="adm-tr" onclick="admUser('${u.id}')"><span class="adm-p"><span class="ct-av sm">${esc(initials(u.name))}</span><span><b>${esc(u.name)}${u.staff ? ` <em class="adm-pill">${esc(u.staff)}</em>` : ''}</b><small>${esc(u.email || '')} · @${esc(u.handle)}</small></span></span><span>${esc(u.plan)}</span><span>${admStatus(u.status)}${u.reports ? ` <em class="adm-pill bad">${u.reports} report${u.reports > 1 ? 's' : ''}</em>` : ''}</span><span>${fmtN(u.threads)}</span><span>${fmtD(u.created_at)}</span><span>${fmtD(u.last_sign_in_at)}</span></button>`).join('') || '<p class="adm-mu adm-pad">No one found.</p>'}</div>
 ${pages > 1 ? `<div class="adm-pg"><button class="cap-btn2 adm-sm" ${ADM.page ? '' : 'disabled'} onclick="ADM.page--;admLoadTab()">Previous</button><span>Page ${ADM.page + 1} of ${pages}</span><button class="cap-btn2 adm-sm" ${ADM.page + 1 < pages ? '' : 'disabled'} onclick="ADM.page++;admLoadTab()">Next</button></div>` : ''}`
  );
}
function admUsersCsv() {
  admDownload(
    'introthread-users.csv',
    admCsv(ADM.cache.users || [], [
      ['name', 'Name'],
      ['handle', 'Handle'],
      ['email', 'Email'],
      ['plan', 'Plan'],
      ['status', 'Status'],
      ['threads', 'Threads'],
      ['city', 'City'],
      ['created_at', 'Joined'],
      ['last_sign_in_at', 'Last sign-in']
    ]),
    'text/csv'
  );
}
async function admUser(id) {
  modal(`<div class="cap-m">${admLoading()}</div>`);
  try {
    const u = await arpc('admin_user', { uid: id });
    const p = u.profile || {},
      c = u.counts || {};
    const can = r => admOk(r);
    const J = x => esc(JSON.stringify(x));
    modal(`<div class="cap-m adm-u"><div class="row between"><div class="adm-p"><span class="ct-av">${esc(initials(p.name))}</span><span><h3>${esc(p.name)}</h3><small>${esc(u.email || '')} · @${esc(p.handle)}</small></span></div><button class="x" aria-label="Close" onclick="closeModal()">&times;</button></div>
 <div class="adm-chips">${admStatus(u.status)}<span class="adm-pill">${esc(u.plan)}</span>${u.confirmed_email ? '<span class="adm-pill ok">Email confirmed</span>' : '<span class="adm-pill warn">Email not confirmed</span>'}${(u.providers || []).map(x => `<span class="adm-pill">${esc(x)}</span>`).join('')}</div>
 ${u.status_reason ? `<p class="adm-note">Reason: ${esc(u.status_reason)}</p>` : ''}
 <div class="adm-kg sm">${admKpi('Threads', fmtN(c.threads))}${admKpi('Confirmed', fmtN(c.confirmed))}${admKpi('Contacts', fmtN(c.contacts))}${admKpi('Rooms', fmtN(c.rooms))}</div>
 <div class="adm-dl"><div><span>Role</span><b>${esc([p.role, p.company].filter(Boolean).join(', ') || '-')}</b></div><div><span>City</span><b>${esc(p.city || '-')}</b></div><div><span>Joined</span><b>${fmtD(u.created_at)}</b></div><div><span>Last sign-in</span><b>${fmtDT(u.last_sign_in_at)}</b></div></div>
 <div class="adm-acts"><a class="cap-btn2" href="/${esc(p.handle)}" target="_blank" rel="noopener">${sv('eye', 16)} View public card</a>
 ${can(['owner', 'admin', 'finance']) ? `<button class="cap-btn2" onclick="admPlanAsk(${J(id)},${J(u.plan)})">${sv('brief', 16)} Change plan</button>` : ''}
 ${can(['owner', 'admin', 'moderator']) ? (u.status === 'active' ? `<button class="cap-btn2 warn" onclick="admStatusAsk(${J(id)},'suspended')">${sv('lock', 16)} Suspend</button><button class="cap-btn2 bad" onclick="admStatusAsk(${J(id)},'banned')">${sv('x', 16)} Ban</button>` : `<button class="cap-btn2" onclick="admStatusAsk(${J(id)},'active')">${sv('check', 16)} Reactivate</button>`) : ''}
 ${can(['owner', 'admin', 'support']) ? `<button class="cap-btn2" onclick="admExportAsk(${J(id)},${J(p.handle)})">${sv('arrow', 16)} Export their data</button>` : ''}
 ${can(['owner', 'admin']) ? `<button class="cap-btn2 bad" onclick="admDeleteAsk(${J(id)},${J(p.handle)})">${sv('x', 16)} Delete account</button>` : ''}</div>
 ${(u.reports || []).length ? `<h4 class="adm-h4">Reports about this person</h4>${u.reports.map(r => `<div class="adm-li"><b>${esc(r.reason)}</b><small>${esc(r.status)} · ${fmtD(r.created_at)}</small>${r.details ? `<p>${esc(r.details)}</p>` : ''}</div>`).join('')}` : ''}
 ${(u.audit || []).length ? `<h4 class="adm-h4">Staff actions</h4>${u.audit.map(a => `<div class="adm-li"><b>${esc(a.action)}</b><small>${fmtDT(a.created_at)}</small><p>${esc(a.reason || '')}</p></div>`).join('')}` : ''}</div>`);
  } catch (e) {
    modal(`<div class="cap-m"><p class="adm-err">${esc((e && e.message) || 'Error')}</p></div>`);
  }
}
function admStatusAsk(id, st) {
  const L = {
    suspended: ['Suspend this account', 'They cannot use the app until reactivated.', 'Suspend'],
    banned: ['Ban this account', 'For serious or repeated abuse. They cannot use the app.', 'Ban'],
    active: ['Reactivate this account', 'They can use the app again.', 'Reactivate']
  }[st];
  admAsk({
    title: L[0],
    body: L[1],
    cta: L[2],
    danger: st !== 'active',
    run: r => arpc('admin_set_status', { uid: id, new_status: st, reason: r })
  });
}
function admPlanAsk(id, cur) {
  admAsk({
    title: 'Change plan',
    body: 'For support credits, partners or corrections. Paid subscriptions move to Stripe once billing is live.',
    extra: `<label class="x-f"><span>Plan</span><select id="admplan"><option value="free" ${cur === 'free' ? 'selected' : ''}>Free</option><option value="pro" ${cur === 'pro' ? 'selected' : ''}>Pro</option></select></label>`,
    cta: 'Save plan',
    run: r => arpc('admin_set_plan', { uid: id, new_plan: $('#admplan').value, reason: r })
  });
}
function admExportAsk(id, h) {
  admAsk({
    title: 'Export their data',
    body: 'Downloads everything Introthread holds about this person as a JSON file, for a data access request.',
    cta: 'Download',
    run: async r => {
      const d = await arpc('admin_export_user', { uid: id, reason: r });
      admDownload('introthread-' + h + '-data.json', JSON.stringify(d, null, 2));
    }
  });
}
function admDeleteAsk(id, h) {
  admAsk({
    title: 'Delete this account',
    body: 'Permanently deletes the account, card, Threads, contacts and Rooms. This cannot be undone. Export their data first if they asked for a copy.',
    typed: 'DELETE',
    danger: true,
    cta: 'Delete permanently',
    run: r => arpc('admin_delete_user', { uid: id, reason: r })
  });
}
/* ---- Moderation ---- */
function admReports(L) {
  const f = [
    ['open', 'Open'],
    ['actioned', 'Actioned'],
    ['dismissed', 'Dismissed'],
    ['all', 'All']
  ];
  return (
    admHead('Moderation', 'Reports from people using Introthread. Aim to review within 24 hours.') +
    `<div class="ct-chips adm-f">${f.map(([k, l]) => `<button class="${ADM.rf === k ? 'on' : ''}" onclick="ADM.rf='${k}';admLoadTab()">${l}</button>`).join('')}</div>` +
    (L.length
      ? L.map(r => {
          const t = r.target || {};
          const open = r.status === 'open' || r.status === 'reviewing';
          return `<div class="adm-card adm-rep"><div class="adm-rh"><span class="adm-pill ${r.status === 'open' ? 'warn' : r.status === 'actioned' ? 'bad' : ''}">${esc(r.status)}</span><b>${esc(r.reason)}</b><small>${fmtDT(r.created_at)}</small></div>
 <p>${esc(r.details || 'No details given.')}</p><div class="adm-dl"><div><span>Reported</span><b>${esc(r.target_type)}: ${esc(t.name || '(deleted)')}${t.handle ? ' · @' + esc(t.handle) : ''}</b></div><div><span>By</span><b>${esc((r.reporter || {}).name || 'Unknown')}</b></div></div>
 ${admOk(['owner', 'admin', 'moderator']) && open ? `<div class="adm-acts row">${r.target_type === 'profile' ? `<button class="cap-btn2 adm-sm" onclick="admUser('${esc(r.target_id)}')">${sv('user', 15)} Open person</button>` : ''}${r.status === 'open' ? `<button class="cap-btn2 adm-sm" onclick="admRep('${r.id}','reviewing')">Mark reviewing</button>` : ''}<button class="cap-btn2 adm-sm" onclick="admRep('${r.id}','dismissed')">Dismiss</button><button class="cap-btn adm-sm" onclick="admRep('${r.id}','actioned')">Action taken</button></div>` : ''}</div>`;
        }).join('')
      : `<div class="adm-empty">${sv('check', 22)}<b>No reports here</b><p>Reports appear when someone uses Report on a card or Thread.</p></div>`)
  );
}
function admRep(id, st) {
  admAsk({
    title: {
      reviewing: 'Mark as reviewing',
      dismissed: 'Dismiss this report',
      actioned: 'Mark action taken'
    }[st],
    body: st === 'actioned' ? 'Record what you did, for example "Suspended account for spam".' : '',
    cta: 'Save',
    run: r => arpc('admin_resolve_report', { rid: id, new_status: st, reason: r })
  });
}
/* ---- Rooms ---- */
function admRoomDel(id) {
  admAsk({
    title: 'Delete this Room',
    body: 'Threads stay, but lose their Room link.',
    danger: true,
    cta: 'Delete Room',
    run: r => arpc('admin_delete_room', { room: id, reason: r })
  });
}
function admRooms(L) {
  return (
    admHead('Rooms', `${L.length} event${L.length === 1 ? '' : 's'}`) +
    (L.length
      ? `<div class="adm-t"><div class="adm-tr adm-th c5"><span>Room</span><span>Date</span><span>Organiser</span><span>Threads</span><span></span></div>${L.map(m => `<div class="adm-tr c5"><span><b>${esc(m.name)}</b><small>${esc(m.location || '')} · code ${esc(m.code)}</small></span><span>${fmtD(m.event_date)}</span><span>${esc((m.owner || {}).name || '-')}</span><span>${fmtN(m.threads)} · ${fmtN(m.people)} people</span><span>${admOk(['owner', 'admin', 'moderator']) ? `<button class="cap-btn2 adm-sm bad" onclick="admRoomDel('${m.id}')">Delete</button>` : ''}</span></div>`).join('')}</div>`
      : `<div class="adm-empty">${sv('cal', 22)}<b>No Rooms yet</b></div>`)
  );
}
/* ---- Revenue ---- */
function admRevenue(d, S, P) {
  const paid = (S || []).filter(s => s.plan_id !== 'free');
  return (
    admHead(
      'Revenue',
      'Subscriptions and income. Card payments run through Stripe once billing is connected.'
    ) +
    `<div class="adm-kg">${admKpi('Monthly revenue', '$' + fmtN(Math.round(d.mrr_usd)), 'Estimated, USD')}${admKpi('Yearly run rate', '$' + fmtN(Math.round(d.mrr_usd * 12)))}${admKpi('Paying people', fmtN(d.paying))}${admKpi('Conversion', pct(d.paying, d.users), 'of everyone')}</div>
 <div class="adm-note">${sv('lock', 15)} Stripe is not connected yet. Next step: add Stripe keys in Vercel and turn on checkout. Plans changed by staff show here now.</div>
 <div class="adm-card"><h3>Subscriptions</h3>${paid.length ? paid.map(s => `<div class="adm-row"><span>${esc(s.name || '-')} <small>@${esc(s.handle || '')}</small></span><b>${esc(s.plan_id)} · ${esc(s.status)}${s.current_period_end ? ' · renews ' + fmtD(s.current_period_end) : ''}</b></div>`).join('') : '<p class="adm-mu">No paid subscriptions yet.</p>'}</div>
 <div class="adm-card"><h3>Price list</h3>${P.map(p => `<div class="adm-row"><span>${esc(p.name)}</span><b>$${p.price_usd_month}/mo · $${p.price_usd_year}/yr · £${p.price_gbp_month}/mo · £${p.price_gbp_year}/yr</b></div>`).join('')}</div>`
  );
}
/* ---- Plans ---- */
function admPlans(P) {
  const ed = admOk(['owner', 'finance']);
  const fi = (p, k, l, t) =>
    `<label class="x-f"><span>${l}</span><input id="pl_${p.id}_${k}" ${t || 'type="number" min="0" step="0.01"'} value="${esc(p[k] == null ? '' : p[k])}" ${k === 'threads_per_month' ? 'placeholder="Unlimited"' : ''} ${ed ? '' : 'disabled'}></label>`;
  return (
    admHead(
      'Plans and pricing',
      'Change prices and limits without code. Changes apply straight away and are recorded.'
    ) +
    P.map(
      p => `<div class="adm-card"><h3>${esc(p.name)} <small>${p.active ? 'Active' : 'Hidden'}</small></h3>
 <div class="adm-fg">${fi(p, 'name', 'Name', 'type="text"')}${fi(p, 'price_usd_month', 'US$ a month')}${fi(p, 'price_usd_year', 'US$ a year')}${fi(p, 'price_gbp_month', '£ a month (UK)')}${fi(p, 'price_gbp_year', '£ a year (UK)')}${fi(p, 'threads_per_month', 'New Threads a month', 'type="number" min="0" step="1"')}</div>
 ${ed ? `<button class="cap-btn adm-sm" onclick="admPlanSave('${p.id}')">Save ${esc(p.name)}</button>` : ''}</div>`
    ).join('')
  );
}
function admPlanSave(id) {
  const k = [
    'name',
    'price_usd_month',
    'price_usd_year',
    'price_gbp_month',
    'price_gbp_year',
    'threads_per_month'
  ];
  const patch = {};
  k.forEach(x => {
    const e = $('#pl_' + id + '_' + x);
    if (e) patch[x] = e.value.trim();
  });
  admAsk({
    title: 'Save plan changes',
    body: 'New prices apply to new sign-ups. Existing Stripe subscriptions keep their price until changed in Stripe.',
    cta: 'Save',
    run: r => arpc('admin_update_plan', { pid: id, patch, reason: r })
  });
}
/* ---- Settings ---- */
async function appSetLoad(force) {
  if (!SB || (!force && APPSET._loaded)) return APPSET;
  try {
    const { data, error } = await SB.from('app_settings').select('key,value');
    if (!error && data) {
      APPSET = { _loaded: true };
      data.forEach(r => (APPSET[r.key] = r.value));
    }
  } catch (_) {}
  return APPSET;
}
function admSettings() {
  const a = APPSET.announcement || {},
    f = APPSET.features || {};
  const FL = [
    ['card_scan', 'Business card scan'],
    ['contact_import', 'Contact import'],
    ['linkedin_import', 'LinkedIn import'],
    ['rooms', 'Rooms']
  ];
  return (
    admHead('Settings', 'Switches that change the live app for everyone. Each change asks for a reason.') +
    `<div class="adm-card"><h3>Announcement banner</h3><p class="adm-mu">Shown at the top of the app until each person closes it.</p><label class="x-f"><span>Message</span><input id="anntext" maxlength="160" value="${esc(a.text || '')}" placeholder="e.g. New: import your LinkedIn connections"></label>
 <div class="adm-fg"><label class="x-f"><span>Style</span><select id="anntone"><option value="info" ${a.tone !== 'warn' ? 'selected' : ''}>Information</option><option value="warn" ${a.tone === 'warn' ? 'selected' : ''}>Warning</option></select></label><label class="adm-sw"><input type="checkbox" id="annon" ${a.on ? 'checked' : ''}><span></span>Show banner</label></div>
 <button class="cap-btn adm-sm" onclick="admSet('announcement',{on:$('#annon').checked,text:$('#anntext').value.trim(),tone:$('#anntone').value})">Save announcement</button></div>
 <div class="adm-card"><h3>Maintenance mode</h3><p class="adm-mu">Pauses the app for everyone except staff. Public cards stay visible.</p><label class="adm-sw"><input type="checkbox" ${APPSET.maintenance === true ? 'checked' : ''} onchange="admSet('maintenance',this.checked);this.checked=!this.checked"><span></span>${APPSET.maintenance === true ? 'On' : 'Off'}</label></div>
 <div class="adm-card"><h3>Features</h3>${FL.map(([k, l]) => `<div class="adm-row"><span>${l}</span><label class="adm-sw"><input type="checkbox" ${f[k] !== false ? 'checked' : ''} onchange="admSetFeat('${k}',this.checked);this.checked=!this.checked"><span></span></label></div>`).join('')}</div>
 <div class="adm-card"><h3>Security</h3><div class="adm-row"><span>Require two-step verification for staff</span><label class="adm-sw"><input type="checkbox" ${APPSET.admin_require_mfa !== false ? 'checked' : ''} ${ADM.me.role === 'owner' ? '' : 'disabled'} onchange="admSet('admin_require_mfa',this.checked);this.checked=!this.checked"><span></span></label></div><p class="adm-mu">Recommended on. Only owners can change this.</p></div>`
  );
}
function admSetFeat(k, on) {
  admSet('features', Object.assign({}, APPSET.features || {}, { [k]: on }));
}
function admSet(k, v) {
  admAsk({
    title: 'Change setting',
    body: 'This changes the live app.',
    cta: 'Save',
    run: async r => {
      await arpc('admin_set_setting', { k, v, reason: r });
      await appSetLoad(true);
    }
  });
}
/* ---- Privacy ---- */
function admPrivacy(L) {
  const now = Date.now();
  return (
    admHead('Privacy requests', 'Data copies and deletions. UK GDPR and CCPA give you 30 days to respond.') +
    (L.length
      ? L.map(r => {
          const open = ['open', 'in_progress'].includes(r.status);
          const late = open && Date.parse(r.due_at) < now;
          const left = Math.ceil((Date.parse(r.due_at) - now) / 864e5);
          const J = x => esc(JSON.stringify(x));
          return `<div class="adm-card adm-rep"><div class="adm-rh"><span class="adm-pill ${r.status === 'done' ? 'ok' : late ? 'bad' : 'warn'}">${esc(r.status.replace('_', ' '))}</span><b>${{ export: 'Copy of data', delete: 'Delete account', correct: 'Correct data' }[r.kind] || esc(r.kind)}</b><small>${late ? 'Overdue' : open ? left + ' days left' : 'Closed'}</small></div>
 <div class="adm-dl"><div><span>Person</span><b>${esc(r.name || '-')} · ${esc(r.account_email || r.email || '')}</b></div><div><span>Received</span><b>${fmtD(r.created_at)}</b></div><div><span>Due</span><b>${fmtD(r.due_at)}</b></div></div>
 ${open ? `<div class="adm-acts row">${r.status === 'open' ? `<button class="cap-btn2 adm-sm" onclick="admPriv('${r.id}','in_progress')">Start</button>` : ''}${r.user_id && r.kind === 'export' ? `<button class="cap-btn2 adm-sm" onclick="admExportAsk(${J(r.user_id)},${J(r.handle || 'user')})">${sv('arrow', 15)} Export data</button>` : ''}${r.user_id && r.kind === 'delete' && admOk(['owner', 'admin']) ? `<button class="cap-btn2 adm-sm bad" onclick="admDeleteAsk(${J(r.user_id)},${J(r.handle || 'user')})">Delete account</button>` : ''}<button class="cap-btn adm-sm" onclick="admPriv('${r.id}','done')">Mark done</button><button class="cap-btn2 adm-sm" onclick="admPriv('${r.id}','rejected')">Reject</button></div>` : ''}</div>`;
        }).join('')
      : `<div class="adm-empty">${sv('lock', 22)}<b>No requests</b><p>People can ask for a copy of their data or to delete their account from Settings.</p></div>`)
  );
}
function admPriv(id, st) {
  admAsk({
    title: { in_progress: 'Start this request', done: 'Mark as done', rejected: 'Reject this request' }[st],
    body:
      st === 'done'
        ? 'Note what was sent or deleted, and when you told the person.'
        : st === 'rejected'
          ? 'Only when the request is not valid, for example identity could not be confirmed. Explain why.'
          : '',
    cta: 'Save',
    run: r => arpc('admin_set_privacy', { rid: id, new_status: st, reason: r })
  });
}
/* ---- Staff ---- */
function admStaff(L) {
  const own = ADM.me.role === 'owner';
  return (
    admHead('Staff', 'Who can open the admin area, and what each role can do.') +
    `<div class="adm-card">${L.map(s => `<div class="adm-row"><span><b>${esc(s.name || s.email)}</b> <small>${esc(s.email)}</small></span>${own ? `<select aria-label="Role" onchange="admStaffSet(${esc(JSON.stringify(s.email))},this.value)">${['owner', 'admin', 'support', 'moderator', 'finance', 'none'].map(r => `<option value="${r}" ${s.role === r ? 'selected' : ''}>${r === 'none' ? 'Remove access' : r}</option>`).join('')}</select>` : `<b>${esc(s.role)}</b>`}</div>`).join('')}</div>
 ${
   own
     ? `<div class="adm-card"><h3>Add staff</h3><p class="adm-mu">They need an Introthread account first.</p><div class="adm-fg"><label class="x-f"><span>Email</span><input id="stem" type="email" placeholder="name@example.com"></label><label class="x-f"><span>Role</span><select id="strole">${Object.keys(
         ADM_ROLE_DESC
       )
         .map(r => `<option value="${r}" ${r === 'support' ? 'selected' : ''}>${r}</option>`)
         .join(
           ''
         )}</select></label></div><button class="cap-btn adm-sm" onclick="admStaffSet($('#stem').value.trim(),$('#strole').value)">Add</button></div>`
     : ''
 }
 <div class="adm-card"><h3>Roles</h3>${Object.entries(ADM_ROLE_DESC)
   .map(([k, v]) => `<div class="adm-row"><span><b>${k}</b></span><span class="adm-mu">${v}</span></div>`)
   .join('')}</div>`
  );
}
function admStaffSet(em, role) {
  if (!em) return toast('Add an email');
  admAsk({
    title: role === 'none' ? 'Remove staff access' : 'Set staff role',
    body: `${esc(em)} will ${role === 'none' ? 'lose admin access' : 'become ' + role}.`,
    cta: 'Save',
    run: r => arpc('admin_set_staff', { em, new_role: role, reason: r })
  });
}
/* ---- Audit ---- */
function admAudit(L) {
  return (
    admHead(
      'Audit log',
      'Every staff action, newest first. Entries cannot be edited or deleted.',
      `<button class="cap-btn2 adm-sm" onclick="admAuditCsv()">${sv('arrow', 15)} Export CSV</button>`
    ) +
    `<label class="ct-s adm-search">${sv('search', 16)}<input placeholder="Filter by action, person or reason" oninput="admAuditFilter(this.value)" aria-label="Filter audit log"></label><div class="adm-t" id="admaud">${admAuditRows(L)}</div>`
  );
}
function admAuditRows(L) {
  return L.length
    ? L.map(
        a =>
          `<div class="adm-tr c4"><span><b>${esc(a.action)}</b><small>${esc(a.target_type || '')} ${esc(String(a.target_id || '').slice(0, 8))}</small></span><span>${esc(a.actor || '-')}</span><span class="adm-mu">${esc(a.reason || '')}</span><span>${fmtDT(a.created_at)}</span></div>`
      ).join('')
    : '<p class="adm-mu adm-pad">Nothing recorded yet.</p>';
}
function admAuditFilter(q) {
  q = q.toLowerCase();
  const L = (ADM.cache.audit || []).filter(a =>
    [a.action, a.actor, a.reason, a.target_type].join(' ').toLowerCase().includes(q)
  );
  const el = $('#admaud');
  if (el) el.innerHTML = admAuditRows(L);
}
function admAuditCsv() {
  admDownload(
    'introthread-audit-log.csv',
    admCsv(ADM.cache.audit || [], [
      ['created_at', 'When'],
      ['actor', 'Staff'],
      ['action', 'Action'],
      ['target_type', 'Type'],
      ['target_id', 'Target'],
      ['reason', 'Reason']
    ]),
    'text/csv'
  );
}
window.addEventListener('popstate', () => {
  if (admPath().startsWith('/admin')) render();
});
/* ================= user side: reports, status, maintenance, announcement, privacy ================= */
let MYSTATUS = null;
async function myStatusLoad() {
  if (!cloud() || !DB.session) return;
  try {
    const { data } = await SB.from('account_status')
      .select('status,reason')
      .eq('user_id', DB.session)
      .maybeSingle();
    MYSTATUS = data || null;
    if (MYSTATUS && MYSTATUS.status !== 'active') render();
  } catch (_) {}
}
function vBlocked() {
  const b = MYSTATUS.status === 'banned';
  return `<div class="adm-gate"><div class="adm-gc"><div class="adm-gi">${sv('lock', 24)}</div><h1>${b ? 'This account has been closed' : 'This account is paused'}</h1><p>${b ? 'It broke the Introthread community rules.' : 'Our team is reviewing activity on this account.'} If you think this is a mistake, email <a href="mailto:hello@introthread.com">hello@introthread.com</a>.</p><button class="cap-btn2" onclick="logout()">Sign out</button></div></div>`;
}
function vMaint() {
  return `<div class="adm-gate"><div class="adm-gc"><div class="adm-gi">${sv('sync', 24)}</div><h1>Back shortly</h1><p>We are making Introthread better. Your Threads and card are safe. Please try again in a few minutes.</p><button class="cap-btn2" onclick="location.reload()">Try again</button></div></div>`;
}
function annShow() {
  const a = APPSET.announcement;
  if (!a || !a.on || !a.text) return;
  const key = 'it_ann_' + a.text.length + '_' + a.text.slice(0, 20).replace(/\W/g, '');
  try {
    if (localStorage.getItem(key)) return;
  } catch (_) {}
  if ($('#annbar')) return;
  const el = document.createElement('div');
  el.id = 'annbar';
  el.className = 'ann' + (a.tone === 'warn' ? ' warn' : '');
  el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(a.text)}</span><button aria-label="Close" onclick="localStorage.setItem('${key}','1');this.parentNode.remove()">&times;</button>`;
  document.body.appendChild(el);
}
const freeLim = () => {
  const v = APPSET.free_threads_per_month;
  return typeof v === 'number' && v >= 0 ? v : 5;
};
freeLeft = function () {
  return Math.max(0, freeLim() - threadsThisMonth());
};
isPro = function () {
  const u = me();
  return !!(u && String(u.plan || '').toLowerCase() === 'pro');
};
limitSheet = function () {
  const n = freeLim();
  modal(`<div class="cap-m"><div class="row between"><h3>You have used your ${n} free Threads this month</h3><button class="x" aria-label="Close" onclick="closeModal()">&times;</button></div>
 <p class="fu-sub">Upgrade to Pro for unlimited Threads, or save this person as a contact now and invite them next month.</p>
 <button type="button" class="cap-btn" onclick="closeModal();go('/pricing')">${sv('spark', 16)} See Pro</button><button type="button" class="cap-btn2" onclick="ctSaveFromTap()">${sv('users', 16)} Save as a contact</button></div>`);
};
const _vTap33 = vTap;
vTap = function () {
  return _vTap33().replace(/(\d+) of 5 free Threads left/, '$1 of ' + freeLim() + ' free Threads left');
};
/* Report */
const REP_REASONS = [
  'Spam or scam',
  'Fake or impersonating someone',
  'Harassment or hate',
  'Inappropriate content',
  'Something else'
];
function reportOpen(type, id, name) {
  if (!cloud() || !DB.session) {
    toast('Sign in to report');
    return go('/login');
  }
  modal(`<div class="cap-m"><div class="row between"><h3>Report ${esc(name || 'this')}</h3><button class="x" aria-label="Close" onclick="closeModal()">&times;</button></div><p class="fu-sub">Reports are private. Our team reviews them, usually within 24 hours.</p>
 <div class="rep-o">${REP_REASONS.map((r, i) => `<label><input type="radio" name="repr" value="${esc(r)}" ${i === 0 ? 'checked' : ''}><span>${r}</span></label>`).join('')}</div>
 <label class="x-f"><span>Anything else we should know? (optional)</span><textarea id="repd" rows="3" maxlength="1000"></textarea></label><button class="cap-btn" onclick="reportSend('${type}','${esc(id)}')">Send report</button></div>`);
}
async function reportSend(type, id) {
  const reason = (document.querySelector('input[name=repr]:checked') || {}).value || 'Something else';
  const details = (($('#repd') || {}).value || '').trim();
  const { error } = await SB.from('reports').insert({
    reporter_id: DB.session,
    target_type: type,
    target_id: id,
    reason,
    details: details || null
  });
  if (error) return fail(error);
  closeModal();
  toast('Thanks. Our team will review this.');
}
const _vPub33 = vPublic;
vPublic = function (h) {
  const out = _vPub33(h);
  const u = DB.users.find(x => x.handle === h);
  if (!u || !out || (me() && me().id === u.id)) return out;
  return (
    out +
    `<div class="rep-l"><button type="button" onclick="reportOpen('profile',${esc(JSON.stringify(u.id))},${esc(JSON.stringify(u.name || ''))})">${sv('shield', 14)} Report this profile</button></div>`
  );
};
const _vThread33 = vThread;
vThread = function (id) {
  const h = _vThread33(id);
  const t = findThread(id);
  if (!t || !t._c) return h;
  return (
    h +
    `<div class="rep-l"><button type="button" onclick="reportOpen('thread',${esc(JSON.stringify(t.id))},${esc(JSON.stringify((t.other || {}).name || ''))})">${sv('shield', 14)} Report a problem with this Thread</button></div>`
  );
};
/* Privacy requests from Settings */
function privReq(kind) {
  if (!cloud()) {
    toast('Sign in to your account first');
    return;
  }
  const L = {
    export: [
      'Get a copy of your data',
      'We will email a copy of your card, Threads, contacts and Rooms within 30 days. You can also export contacts yourself any time from Threads.',
      'Request my data'
    ],
    delete: [
      'Delete your account',
      'We will permanently delete your account, card, Threads, contacts and Rooms within 30 days. This cannot be undone.',
      'Request deletion'
    ]
  }[kind];
  modal(
    `<div class="cap-m"><div class="row between"><h3>${L[0]}</h3><button class="x" aria-label="Close" onclick="closeModal()">&times;</button></div><p class="fu-sub">${L[1]}</p><button class="cap-btn${kind === 'delete' ? ' bad' : ''}" onclick="privSend('${kind}')">${L[2]}</button></div>`
  );
}
async function privSend(kind) {
  const u = me();
  const { error } = await SB.from('privacy_requests').insert({
    user_id: DB.session,
    email: (u && u.email) || null,
    kind
  });
  if (error) return fail(error);
  closeModal();
  toast('Request received. We will reply by email within 30 days.');
}
const _vSet33 = vSettings;
vSettings = function () {
  const h = _vSet33.apply(this, arguments);
  const card = `<div class="adm-card priv-c"><h3>${sv('lock', 16)} Your data and privacy</h3><p class="adm-mu">Wherever you live, you can ask for a copy of your data or ask us to delete it. We reply by email within 30 days.</p><div class="adm-acts row"><button class="cap-btn2 adm-sm" onclick="privReq('export')">Request a copy</button><button class="cap-btn2 adm-sm bad" onclick="privReq('delete')">Delete my account</button></div></div>`;
  try {
    const t = document.createElement('div');
    t.innerHTML = h;
    const side = t.querySelector('.st12-side') || t.querySelector('.content');
    if (side) {
      const box =
        typeof stCard === 'function'
          ? stCard(
              sv('lock', 22),
              'Your data and privacy',
              'Wherever you live, you can ask for a copy of your data or ask us to delete it. We reply by email within 30 days.',
              `<div class="priv-acts"><button type="button" class="t-start st-btn priv-b" onclick="privReq('export')">${sv('sgimport', 17)} Request a copy</button><button type="button" class="t-start st-btn priv-b bad" onclick="privReq('delete')">${sv('close', 17)} Request deletion</button></div>`,
              '',
              'priv-c'
            )
          : card;
      side.insertAdjacentHTML('beforeend', box);
      return t.innerHTML;
    }
  } catch (_) {}
  return h + card;
};
/* boot: settings, own status, return to admin after sign-in */
(async () => {
  for (let i = 0; i < 40 && !SB; i++) await new Promise(r => setTimeout(r, 150));
  await appSetLoad();
  if (admPath().startsWith('/app')) annShow();
  for (let i = 0; i < 40 && !cloud(); i++) await new Promise(r => setTimeout(r, 250));
  myStatusLoad();
  let a = null;
  try {
    a = sessionStorage.getItem('it_after');
  } catch (_) {}
  if (a && cloud()) {
    sessionStorage.removeItem('it_after');
    go(a);
  }
})();
