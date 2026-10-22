// Introthread - Admin Users (v35, screen 2 of 9). Prefix au / ADMU.
// Moved out of index.html in v52 (code split step 4). Load order matters: see the <script> list at the end of index.html.

/* ================= v35: Admin screen 2 of 9 - Users ================= */
Object.assign(SV, {
  pause:
    '<rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/>',
  userplus:
    '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 19c.8-3.2 3.3-5 6.5-5s5.7 1.8 6.5 5M19 8v6M16 11h6"/>',
  more: '<circle cx="5.5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l3 3M14 9l2 2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  note: '<path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4M8 12h8M8 16h5"/>',
  sort: '<path d="M7 4v16M4 17l3 3 3-3M17 20V4M14 7l3-3 3 3"/>',
  x2: '<path d="M6 6l12 12M18 6L6 18"/>'
});
let ADMU = {
  q: '',
  plan: 'all',
  st: 'all',
  sort: 'joined',
  dir: 'desc',
  per: 10,
  page: 0,
  sel: new Set(),
  open: null,
  tab: 'overview',
  data: null,
  limited: false,
  more: {},
  busy: false
};
try {
  const v = +localStorage.getItem('it_adm_per');
  if ([10, 25, 50].includes(v)) ADMU.per = v;
} catch (_) {}
const canU = r => admOk(r);
/* load */
const _alt35 = admLoadTab;
admLoadTab = async function () {
  if (ADM.stage === 'ready' && ADM.tab === 'users') return auLoad();
  return _alt35.apply(this, arguments);
};
async function auLoad(keep) {
  if (!keep || !$('#auwrap')) admBody(auSkel());
  else {
    const t = $('#autbody');
    if (t) t.classList.add('busy');
  }
  try {
    let d;
    if (!ADMU.limited) {
      try {
        d = await arpc('admin_users2', {
          q: ADMU.q,
          plan: ADMU.plan,
          st: ADMU.st,
          sort: ADMU.sort,
          dir: ADMU.dir,
          lim: ADMU.per,
          off: ADMU.page * ADMU.per
        });
      } catch (e) {
        if (/admin_users2|could not find|schema cache|does not exist/i.test((e && e.message) || ''))
          ADMU.limited = true;
        else throw e;
      }
    }
    if (ADMU.limited) {
      const o = await arpc('admin_users', { q: ADMU.q, lim: ADMU.per, off: ADMU.page * ADMU.per });
      d = {
        total: o.total,
        counts: null,
        rows: o.rows.filter(
          r => (ADMU.plan === 'all' || r.plan === ADMU.plan) && (ADMU.st === 'all' || r.status === ADMU.st)
        )
      };
    }
    ADMU.data = d;
    if (ADM.tab !== 'users') return;
    if (keep && $('#auwrap')) {
      auPaintTable();
      auPaintCounts();
    } else admBody(auPage());
  } catch (e) {
    admBody(
      auHead() +
        `<div class="ix-card ix-fail" role="alert">${sv('alert', 22)}<div><b>Users could not load</b><p>${esc((e && e.message) || 'Unknown error')}</p></div><button type="button" class="ix-btn" onclick="auLoad()">${sv('refresh', 16)} Try again</button></div>`
    );
  }
}
/* header + counts */
function auHead() {
  return `<div class="ix-h"><div><h1>Users</h1><p>Manage people, their accounts, plans and activity.</p></div><div class="ix-hc">${canU(['owner', 'admin']) ? `<button type="button" class="ix-btn" onclick="auExport()">${sv('arrow', 16)}<span>Export CSV</span></button>` : ''}${canU(['owner', 'admin', 'support']) ? `<button type="button" class="ix-btn pri" onclick="auInvite()">${sv('userplus', 17)}<span>Invite user</span></button>` : ''}</div></div>`;
}
function auCounts() {
  const c = ADMU.data && ADMU.data.counts;
  const v = k => (c && isNum(c[k]) ? fmtN(c[k]) : dash);
  const p = k => (c && c.total ? Math.round((c[k] * 100) / c.total) + '%' : dash);
  const card = (k, st, l, ic, tone, sub) =>
    `<button type="button" class="au-c${ADMU.st === st ? ' on' : ''}" onclick="auFilter('st','${ADMU.st === st ? 'all' : st}')" aria-pressed="${ADMU.st === st}"><span class="ix-ki t-${tone}" aria-hidden="true">${sv(ic, 20)}</span><span><b>${v(k)}</b><span class="au-cl">${l}</span><small>${sub}</small></span></button>`;
  return (
    card(
      'total',
      'all',
      'Total users',
      'users',
      'b',
      c
        ? `${sv('up', 12, 'currentColor', 2.4)} ${fmtN(c.new_month)} joined this month`
        : 'Needs database update 005'
    ) +
    card(
      'active_30d',
      'active',
      'Active users',
      'dot',
      'g',
      c ? `${p('active_30d')} signed in within 30 days` : ''
    ) +
    card(
      'suspended',
      'suspended',
      'Suspended or banned',
      'pause',
      'r',
      c ? `${p('suspended')} of users` : ''
    ) +
    card(
      'pending',
      'pending',
      'Pending',
      'userplus',
      'p',
      c ? `${p('pending')} · email or profile not finished` : ''
    )
  );
}
function auPaintCounts() {
  const e = $('#aucounts');
  if (e) e.innerHTML = auCounts();
}
/* toolbar */
function auSel(id, lab, val, opts, fn) {
  return `<label class="ix-sel au-sl"><span class="sr">${lab}</span><select id="${id}" aria-label="${lab}" onchange="${fn}">${opts.map(([v, l]) => `<option value="${v}" ${val === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
}
function auToolbar() {
  const sorts = [
    ['joined:desc', 'Newest first'],
    ['joined:asc', 'Oldest first'],
    ['last:desc', 'Recently signed in'],
    ['name:asc', 'Name A to Z'],
    ['threads:desc', 'Most Threads']
  ];
  const chips = [];
  if (ADMU.q) chips.push(['q', `Search: "${esc(ADMU.q)}"`]);
  if (ADMU.plan !== 'all') chips.push(['plan', 'Plan: ' + ADMU.plan]);
  if (ADMU.st !== 'all') chips.push(['st', 'Status: ' + ADMU.st]);
  return `<div class="au-tb"><label class="au-search">${sv('search', 17)}<input id="auq" type="search" placeholder="Search name, handle, email or company" value="${esc(ADMU.q)}" oninput="auSearch(this.value)" aria-label="Search users"></label>
 ${auSel(
   'auplan',
   'Plan',
   ADMU.plan,
   [
     ['all', 'All plans'],
     ['free', 'Free'],
     ['pro', 'Pro']
   ],
   "auFilter('plan',this.value)"
 )}
 ${auSel(
   'aust',
   'Status',
   ADMU.st,
   [
     ['all', 'All statuses'],
     ['active', 'Active'],
     ['pending', 'Pending'],
     ['suspended', 'Suspended'],
     ['banned', 'Banned']
   ],
   "auFilter('st',this.value)"
 )}
 <label class="ix-sel au-sl au-sort">${sv('sort', 16)}<span class="sr">Sort</span><select aria-label="Sort" onchange="const [s,d]=this.value.split(':');ADMU.sort=s;ADMU.dir=d;ADMU.page=0;auLoad(true)">${sorts.map(([v, l]) => `<option value="${v}" ${ADMU.sort + ':' + ADMU.dir === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
 ${chips.length ? `<div class="au-chips">${chips.map(([k, l]) => `<button type="button" onclick="auFilter('${k}','')" aria-label="Remove filter ${l}">${l} ${sv('x2', 13)}</button>`).join('')}<button type="button" class="au-clr" onclick="ADMU.q='';ADMU.plan='all';ADMU.st='all';ADMU.page=0;admBody(auPage());auLoad(true)">Clear all</button></div>` : ''}`;
}
let _auT = null;
function auSearch(v) {
  clearTimeout(_auT);
  _auT = setTimeout(() => {
    ADMU.q = v.trim();
    ADMU.page = 0;
    auLoad(true);
    const c = $('#auchipsw');
    if (c) c.innerHTML = auToolbarChips();
  }, 300);
}
function auToolbarChips() {
  const h = auToolbar();
  const i = h.indexOf('<div class="au-chips">');
  return i < 0 ? '' : h.slice(i);
}
function auFilter(k, v) {
  if (k === 'q') {
    ADMU.q = '';
    const i = $('#auq');
    if (i) i.value = '';
  } else ADMU[k] = v || 'all';
  ADMU.page = 0;
  const tb = $('#autb');
  if (tb) tb.innerHTML = auToolbar();
  auLoad(true);
}
/* table */
const auSt = s =>
  `<span class="au-st ${s}">${s === 'active' ? 'Active' : s === 'pending' ? 'Pending' : s === 'suspended' ? 'Suspended' : s === 'banned' ? 'Banned' : esc(s)}</span>`;
const auPl = p => `<span class="au-pl ${p}">${esc(p[0].toUpperCase() + p.slice(1))}</span>`;
const fmtT = s =>
  s
    ? new Date(s)
        .toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })
        .toLowerCase()
    : '';
function auRow(u) {
  const sel = ADMU.sel.has(u.id);
  return `<tr class="${ADMU.open === u.id ? 'on' : ''}" data-id="${u.id}"><td class="au-ck"><input type="checkbox" aria-label="Select ${esc(u.name)}" ${sel ? 'checked' : ''} onchange="auPick('${u.id}',this.checked)"></td>
 <td><button type="button" class="au-u" onclick="auOpen('${u.id}')"><span class="adm2-av sm" aria-hidden="true">${esc(initials(u.name))}</span><span class="au-ut"><b>${esc(u.name)}${u.staff ? ` <em class="au-role">${esc(u.staff)}</em>` : ''}${u.reports ? ` <em class="au-rep" title="Open reports">${u.reports} report${u.reports > 1 ? 's' : ''}</em>` : ''}</b><small>${esc(u.email || '')}</small><small>${u.handle ? '@' + esc(u.handle) : 'Profile not finished'}</small></span></button></td>
 <td>${auPl(u.plan)}</td><td>${auSt(u.status)}</td><td class="num">${fmtN(u.threads)}</td><td>${fmtD(u.created_at)}</td><td>${u.last_sign_in_at ? `${fmtD(u.last_sign_in_at)}<small>${fmtT(u.last_sign_in_at)}</small>` : '<span class="ix-mu">Never</span>'}</td>
 <td class="au-act"><button type="button" class="au-more" aria-label="Actions for ${esc(u.name)}" aria-haspopup="menu" onclick="auMenu(event,'${u.id}')">${sv('more', 18)}</button></td></tr>`;
}
function auTable() {
  const d = ADMU.data,
    R = d.rows || [];
  const th = (k, l) => {
    const on = ADMU.sort === k;
    return `<th scope="col" aria-sort="${on ? (ADMU.dir === 'asc' ? 'ascending' : 'descending') : 'none'}"><button type="button" class="au-th${on ? ' on' : ''}" onclick="auSort('${k}')">${l}${on ? sv(ADMU.dir === 'asc' ? 'up' : 'down', 12, 'currentColor', 2.4) : ''}</button></th>`;
  };
  const allOn = R.length && R.every(r => ADMU.sel.has(r.id));
  if (!R.length)
    return `<div class="au-empty">${sv('users', 24)}<b>${ADMU.q || ADMU.plan !== 'all' || ADMU.st !== 'all' ? 'No users match these filters' : 'No users yet'}</b><p>${ADMU.q || ADMU.plan !== 'all' || ADMU.st !== 'all' ? 'Try a different search, or clear the filters.' : 'People appear here as soon as they sign up.'}</p></div>`;
  return `<div class="au-scroll"><table class="au-t"><caption class="sr">Users, ${fmtN(d.total)} in total</caption><thead><tr><th class="au-ck" scope="col"><input type="checkbox" aria-label="Select all on this page" ${allOn ? 'checked' : ''} onchange="auPickAll(this.checked)"></th>${th('name', 'User')}<th scope="col">Plan</th><th scope="col">Status</th>${th('threads', 'Threads')}${th('joined', 'Joined')}${th('last', 'Last sign-in')}<th scope="col" class="au-act"><span class="sr">Actions</span></th></tr></thead><tbody>${R.map(auRow).join('')}</tbody></table></div>`;
}
function auFoot() {
  const d = ADMU.data,
    t = d.total || 0,
    pages = Math.max(1, Math.ceil(t / ADMU.per)),
    p = ADMU.page;
  const a = t ? p * ADMU.per + 1 : 0,
    b = Math.min(t, (p + 1) * ADMU.per);
  const nums = [];
  for (let i = 0; i < pages; i++)
    if (i === 0 || i === pages - 1 || Math.abs(i - p) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  return `<div class="au-ft"><span>Showing ${fmtN(a)}${b > a ? '–' + fmtN(b) : ''} of ${fmtN(t)} user${t === 1 ? '' : 's'}</span><div class="au-pg">${auSel(
    'auper',
    'Rows per page',
    String(ADMU.per),
    [
      ['10', '10 per page'],
      ['25', '25 per page'],
      ['50', '50 per page']
    ],
    "ADMU.per=+this.value;ADMU.page=0;try{localStorage.setItem('it_adm_per',ADMU.per)}catch(_){}auLoad(true)"
  )}
 <nav class="au-pn" aria-label="Pages"><button type="button" aria-label="Previous page" ${p ? '' : 'disabled'} onclick="ADMU.page--;auLoad(true)">${sv('chev', 16)}</button>${nums.map(n => (n === '…' ? '<span>…</span>' : `<button type="button" class="${n === p ? 'on' : ''}" ${n === p ? 'aria-current="page"' : ''} onclick="ADMU.page=${n};auLoad(true)">${n + 1}</button>`)).join('')}<button type="button" aria-label="Next page" ${p + 1 < pages ? '' : 'disabled'} onclick="ADMU.page++;auLoad(true)">${sv('chev', 16)}</button></nav></div></div>`;
}
function auBulk() {
  const n = ADMU.sel.size;
  return n
    ? `<div class="au-bulk" role="region" aria-label="Selection"><b>${n} selected</b>${canU(['owner', 'admin']) ? `<button type="button" class="ix-btn sm" onclick="auExport(true)">${sv('arrow', 15)} Export selected</button>` : ''}<button type="button" class="ix-btn sm" onclick="ADMU.sel.clear();auPaintTable()">Clear selection</button></div>`
    : '';
}
function auPaintTable() {
  const t = $('#autbody');
  if (t) {
    t.classList.remove('busy');
    t.innerHTML = auBulk() + auTable() + auFoot();
  }
}
function auSort(k) {
  if (ADMU.sort === k) ADMU.dir = ADMU.dir === 'asc' ? 'desc' : 'asc';
  else {
    ADMU.sort = k;
    ADMU.dir = k === 'name' ? 'asc' : 'desc';
  }
  ADMU.page = 0;
  auLoad(true);
}
function auPick(id, on) {
  if (on) ADMU.sel.add(id);
  else ADMU.sel.delete(id);
  const b = $('.au-bulk');
  const t = $('#autbody');
  if (t) {
    const old = t.querySelector('.au-bulk');
    const h = auBulk();
    if (old) old.outerHTML = h || '';
    else if (h) t.insertAdjacentHTML('afterbegin', h);
  }
}
function auPickAll(on) {
  (ADMU.data.rows || []).forEach(r => (on ? ADMU.sel.add(r.id) : ADMU.sel.delete(r.id)));
  auPaintTable();
}
/* page */
function auSkel() {
  return (
    auHead() +
    `<div class="au-cs">${'<div class="au-c sk"><i></i><b></b></div>'.repeat(4)}</div><div class="ix-card sk" style="height:420px"></div>`
  );
}
function auPage() {
  return `<div id="auwrap" class="au${ADMU.open ? ' po' : ''}"><div class="au-main">${auHead()}${ADMU.limited ? `<p class="ix-upd">Run database update 005 for overview counts, plan and status filters, sorting and the full details panel.</p>` : ''}<div class="au-cs" id="aucounts">${auCounts()}</div>
 <section class="ix-card au-card"><div id="autb">${auToolbar()}</div><div id="autbody">${auBulk()}${auTable()}${auFoot()}</div></section></div>
 <aside class="au-panel" id="aupanel" aria-label="User details">${ADMU.open ? auPanel() : ''}</aside><div class="au-scrim" onclick="auClose()" aria-hidden="true"></div></div>`;
}
/* row menu */
function auMenu(e, id) {
  e.stopPropagation();
  auMenuClose();
  const u = (ADMU.data.rows || []).find(r => r.id === id);
  if (!u) return;
  const b = e.currentTarget.getBoundingClientRect();
  const it = [
    ['eye', 'View details', `auOpen('${id}')`, 1],
    ['brief', 'Change plan', `auPlan('${id}')`, canU(['owner', 'admin', 'finance'])],
    [
      'mail',
      'Send login link',
      `auLink('${id}')`,
      canU(['owner', 'admin', 'support']) && u.status !== 'banned'
    ],
    ['key', 'Reset password', `auReset('${id}')`, canU(['owner', 'admin', 'support'])],
    u.status === 'suspended' || u.status === 'banned'
      ? [
          'check',
          'Reactivate',
          `admStatusAsk('${id}','active')`,
          canU(['owner', 'admin', 'moderator']) && u.staff !== 'owner'
        ]
      : [
          'pause',
          'Suspend',
          `admStatusAsk('${id}','suspended')`,
          canU(['owner', 'admin', 'moderator']) && u.staff !== 'owner'
        ],
    [
      'trash',
      'Delete account',
      `admDeleteAsk('${id}','${esc(u.handle || 'user')}')`,
      canU(['owner', 'admin']) && !u.staff,
      'bad'
    ]
  ].filter(x => x[3]);
  const m = document.createElement('div');
  m.className = 'au-menu';
  m.id = 'aumenu';
  m.setAttribute('role', 'menu');
  m.innerHTML = it
    .map(
      ([ic, l, fn, , c]) =>
        `<button type="button" role="menuitem" class="${c || ''}" onclick="auMenuClose();${fn}">${sv(ic, 16)}${l}</button>`
    )
    .join('');
  document.body.appendChild(m);
  const mw = 220,
    top = Math.min(window.innerHeight - m.offsetHeight - 8, b.bottom + 6);
  m.style.top = top + window.scrollY + 'px';
  m.style.left = Math.max(8, b.right - mw + window.scrollX) + 'px';
  const f = m.querySelector('button');
  if (f) f.focus();
  m.addEventListener('keydown', ev => {
    const bs = [...m.querySelectorAll('button')];
    const i = bs.indexOf(document.activeElement);
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      bs[(i + 1) % bs.length].focus();
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      bs[(i - 1 + bs.length) % bs.length].focus();
    } else if (ev.key === 'Escape') {
      auMenuClose();
      e.currentTarget && e.currentTarget.focus && e.currentTarget.focus();
    }
  });
}
function auMenuClose() {
  const m = $('#aumenu');
  if (m) m.remove();
}
document.addEventListener('click', e => {
  if (!e.target.closest('#aumenu')) auMenuClose();
});
/* detail panel */
async function auOpen(id) {
  ADMU.open = id;
  ADMU.tab = 'overview';
  const w = $('#auwrap');
  if (w) w.classList.add('po');
  const p = $('#aupanel');
  if (p) p.innerHTML = `<div class="au-ph">${admLoading()}</div>`;
  document.querySelectorAll('.au-t tr.on').forEach(r => r.classList.remove('on'));
  const tr = document.querySelector(`.au-t tr[data-id="${id}"]`);
  if (tr) tr.classList.add('on');
  try {
    const [u, m] = await Promise.all([
      arpc('admin_user', { uid: id }).catch(() => null),
      ADMU.limited
        ? Promise.resolve(null)
        : arpc('admin_user_more', { uid: id }).catch(e => {
            if (/admin_user_more|could not find|schema cache/i.test(e.message || '')) return null;
            throw e;
          })
    ]);
    const row = (ADMU.data.rows || []).find(r => r.id === id) || {};
    ADMU.more[id] = {
      u: u || {
        profile: { name: row.name, handle: row.handle },
        email: row.email,
        plan: row.plan,
        status: row.status,
        counts: { threads: row.threads },
        created_at: row.created_at,
        last_sign_in_at: row.last_sign_in_at,
        confirmed_email: row.confirmed_email
      },
      m,
      row
    };
    if (ADMU.open === id && p) {
      p.innerHTML = auPanel();
      const c = p.querySelector('.au-x');
      if (c && window.innerWidth < 1280) c.focus();
    }
  } catch (e) {
    if (p)
      p.innerHTML = `<div class="au-ph"><p class="adm-err">${esc((e && e.message) || 'Could not load')}</p><button class="ix-btn sm" onclick="auOpen('${id}')">Try again</button></div>`;
  }
}
function auClose() {
  ADMU.open = null;
  const w = $('#auwrap');
  if (w) w.classList.remove('po');
  const p = $('#aupanel');
  if (p) p.innerHTML = '';
  document.querySelectorAll('.au-t tr.on').forEach(r => r.classList.remove('on'));
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && ADMU.open && !$('#mback.open') && !$('#aumenu') && $('#auwrap')) auClose();
});
function auPanel() {
  const id = ADMU.open,
    X = ADMU.more[id];
  if (!X) return `<div class="au-ph">${admLoading()}</div>`;
  const u = X.u,
    m = X.m,
    r = X.row,
    p = u.profile || {},
    c = u.counts || {};
  const st = r.status || u.status;
  const pub = p.handle ? '/' + p.handle : null;
  const tabs = [
    ['overview', 'Overview'],
    ['activity', 'Activity'],
    ['threads', 'Threads'],
    ['notes', 'Notes']
  ];
  return `<div class="au-ph"><button type="button" class="au-x" onclick="auClose()" aria-label="Close details">${sv('x2', 18)}</button>
 <div class="au-pt"><span class="adm2-av lg" aria-hidden="true">${esc(initials(p.name || r.name))}</span><div><h2>${esc(p.name || r.name || 'User')} ${auSt(st)}</h2><p>${esc(u.email || r.email || '')}</p><p>${p.handle ? '@' + esc(p.handle) : 'Profile not finished'}</p></div></div>
 <div class="au-pb">${pub ? `<a class="ix-btn sm" href="${pub}" target="_blank" rel="noopener">${sv('ext', 15)} View profile</a>` : ''}${canU(['owner', 'admin', 'support']) && (u.email || '').includes('@') && !(u.email || '').includes('***') ? `<a class="ix-btn sm" href="mailto:${esc(u.email)}">${sv('mail', 15)} Message</a>` : ''}</div>
 <div class="au-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" id="aut-${k}" aria-selected="${ADMU.tab === k}" aria-controls="autp" class="${ADMU.tab === k ? 'on' : ''}" onclick="ADMU.tab='${k}';$('#aupanel').innerHTML=auPanel()">${l}${k === 'notes' && m && m.notes.length ? ` <em>${m.notes.length}</em>` : ''}</button>`).join('')}</div>
 <div id="autp" role="tabpanel" aria-labelledby="aut-${ADMU.tab}">${ADMU.tab === 'overview' ? auOverview(u, m, r) : ADMU.tab === 'activity' ? auActivity(u, m, r) : ADMU.tab === 'threads' ? auThreads(m) : auNotes(m)}</div></div>`;
}
function auDL(rows) {
  return `<dl class="au-dl">${rows
    .filter(Boolean)
    .map(([k, v, x]) => `<div><dt>${k}</dt><dd>${v}${x || ''}</dd></div>`)
    .join('')}</dl>`;
}
function auOverview(u, m, r) {
  const p = u.profile || {},
    c = u.counts || {},
    id = ADMU.open;
  const st = r.status || u.status;
  const acts = [
    canU(['owner', 'admin', 'support']) ? ['key', 'Reset password', `auReset('${id}')`, 'b'] : null,
    canU(['owner', 'admin', 'support']) && st !== 'banned'
      ? ['mail', 'Send login link', `auLink('${id}')`, 'o']
      : null,
    canU(['owner', 'admin', 'moderator']) && r.staff !== 'owner'
      ? st === 'suspended' || st === 'banned'
        ? ['check', 'Reactivate account', `admStatusAsk('${id}','active')`, 'g']
        : ['pause', 'Suspend account', `admStatusAsk('${id}','suspended')`, 'r']
      : null,
    canU(['owner', 'admin']) && !r.staff
      ? ['trash', 'Delete account', `admDeleteAsk('${id}','${esc(p.handle || 'user')}')`, 'r']
      : null
  ].filter(Boolean);
  return `<section class="au-sec"><h3>${sv('user', 16)} Account details</h3>${auDL([
    ['Name', esc(p.name || r.name || dash)],
    ['Email', esc(u.email || r.email || dash)],
    ['Handle', p.handle ? '@' + esc(p.handle) : dash],
    [
      'Plan',
      esc((u.plan || r.plan || 'free').replace(/^./, x => x.toUpperCase())),
      canU(['owner', 'admin', 'finance'])
        ? `<button type="button" class="au-inl" onclick="auPlan('${id}')">Change plan</button>`
        : ''
    ],
    p.role || p.company ? ['Works as', esc([p.role, p.company].filter(Boolean).join(', '))] : null,
    p.city ? ['City', esc(p.city)] : null,
    ['Joined', `${fmtD(u.created_at || r.created_at)}, ${fmtT(u.created_at || r.created_at)}`],
    ['Last sign-in', u.last_sign_in_at ? `${fmtD(u.last_sign_in_at)}, ${fmtT(u.last_sign_in_at)}` : 'Never'],
    ['Email confirmed', u.confirmed_email ? 'Yes' : '<span class="au-warn">Not yet</span>'],
    (u.providers || []).length ? ['Sign-in methods', esc(u.providers.join(', '))] : null,
    u.status_reason ? ['Status reason', esc(u.status_reason)] : null
  ])}</section>
 <section class="au-sec"><h3>${sv('bars', 16)} Usage</h3><div class="au-use">${[
   ['linkc', 'Threads', c.threads],
   ['okc', 'Confirmed', c.confirmed],
   ['contact', 'Contacts', m ? m.contacts : c.contacts],
   ['cal', 'Rooms created', m ? m.rooms : c.rooms]
 ]
   .map(
     ([ic, l, v]) =>
       `<div><span class="ix-ki t-b sm" aria-hidden="true">${sv(ic, 16)}</span><b>${isNum(v) ? fmtN(v) : dash}</b><small>${l}</small></div>`
   )
   .join('')}</div></section>
 ${acts.length ? `<section class="au-sec"><h3>${sv('shield', 16)} Actions</h3><div class="au-acts">${acts.map(([ic, l, fn, t]) => `<button type="button" class="au-ab ${t}" onclick="${fn}">${sv(ic, 16)}${l}</button>`).join('')}</div><p class="au-fine">Every action asks for a reason and is saved in the audit log.</p></section>` : ''}`;
}
function auActivity(u, m, r) {
  if (!m) return `<p class="ix-mu au-pad">Run database update 005 to see activity.</p>`;
  const ev = [];
  ev.push({ at: m.signed_up || u.created_at, ic: 'userplus', t: 'Signed up' });
  if (u.last_sign_in_at) ev.push({ at: u.last_sign_in_at, ic: 'lock', t: 'Last signed in' });
  (m.threads || [])
    .slice(0, 20)
    .forEach(t =>
      ev.push({ at: t.created_at, ic: 'linkc', t: `Created a Thread${t.room ? ' at ' + esc(t.room) : ''}` })
    );
  (m.events || []).forEach(e => {
    const L = {
      confirm: 'A Thread was confirmed',
      answer: 'Answered "What\'s next?"',
      followup: 'Followed up',
      resolved: 'Closed a Thread'
    }[e.kind];
    if (L) ev.push({ at: e.at, ic: 'msg', t: L });
  });
  (m.audit || []).forEach(a =>
    ev.push({
      at: a.created_at,
      ic: 'shield',
      t: `Staff: ${esc(a.action)}${a.actor ? ' by ' + esc(a.actor) : ''}`,
      s: a.reason
    })
  );
  ev.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return `<ol class="au-tl">${ev
    .slice(0, 40)
    .map(
      e =>
        `<li><span aria-hidden="true">${sv(e.ic, 15)}</span><div><b>${e.t}</b>${e.s ? `<p>${esc(e.s)}</p>` : ''}<small>${fmtD(e.at)}, ${fmtT(e.at)}</small></div></li>`
    )
    .join('')}</ol>`;
}
function auThreads(m) {
  if (!m) return `<p class="ix-mu au-pad">Run database update 005 to see Threads.</p>`;
  const T = m.threads || [];
  if (!T.length) return `<div class="au-empty sm">${sv('linkc', 20)}<b>No Threads yet</b></div>`;
  return `<p class="au-fine">Shown with first name and initial only, to protect the other person's privacy. Private notes are never shown.</p><ul class="au-th-l">${T.map(t => `<li><div><b>With ${esc(t.other || 'someone')}</b><small>${fmtD(t.created_at)}${t.room ? ' · ' + esc(t.room) : ''}</small></div><span class="au-st ${t.resolved ? '' : t.confirmed ? 'active' : 'pending'}">${t.resolved ? 'Closed' : t.confirmed ? (t.mine && t.theirs ? 'Both answered' : 'Confirmed') : 'Waiting'}</span></li>`).join('')}</ul>`;
}
function auNotes(m) {
  if (!m) return `<p class="ix-mu au-pad">Run database update 005 to use staff notes.</p>`;
  const id = ADMU.open;
  return `<p class="au-fine">Private to staff. The person never sees these.</p><label class="x-f"><span class="sr">New note</span><textarea id="aunote" rows="3" maxlength="2000" placeholder="Add a note, for example a support conversation or context for a decision"></textarea></label><button type="button" class="ix-btn sm pri" onclick="auNoteAdd('${id}')">${sv('note', 15)} Add note</button>
 <ul class="au-notes">${(m.notes || []).map(n => `<li><p>${esc(n.body)}</p><small>${esc(n.author || 'Staff')} · ${fmtD(n.created_at)}, ${fmtT(n.created_at)}</small>${n.mine || canU(['owner', 'admin']) ? `<button type="button" class="au-inl" onclick="auNoteDel('${n.id}')">Delete</button>` : ''}</li>`).join('') || '<li class="ix-mu">No notes yet.</li>'}</ul>`;
}
async function auNoteAdd(id) {
  const t = (($('#aunote') || {}).value || '').trim();
  if (!t) return toast('Write a note first');
  try {
    await arpc('admin_add_note', { uid: id, body: t });
    toast('Note added');
    await auRefreshOpen();
  } catch (e) {
    toast((e && e.message) || 'Could not add the note');
  }
}
async function auNoteDel(nid) {
  if (!confirm('Delete this note?')) return;
  try {
    await arpc('admin_delete_note', { nid });
    toast('Note deleted');
    await auRefreshOpen();
  } catch (e) {
    toast((e && e.message) || 'Could not delete');
  }
}
async function auRefreshOpen() {
  const id = ADMU.open,
    tab = ADMU.tab;
  if (!id) return;
  await auOpen(id);
  ADMU.tab = tab;
  const p = $('#aupanel');
  if (p) p.innerHTML = auPanel();
}
/* actions that send email: Supabase sends them; we record them in the audit log */
async function auEmail(id) {
  const row = (ADMU.data.rows || []).find(r => r.id === id);
  if (row && row.email && !row.email.includes('***')) return row.email;
  return await arpc('admin_user_email', { uid: id });
}
function auLink(id) {
  admAsk({
    title: 'Send a login link',
    body: 'Supabase emails this person a secure sign-in link and code. It expires after a short time. Use this when they cannot sign in.',
    cta: 'Send link',
    run: async r => {
      const em = await auEmail(id);
      const { error } = await SB.auth.signInWithOtp({
        email: em,
        options: { shouldCreateUser: false, emailRedirectTo: location.origin + '/app' }
      });
      if (error) throw error;
      await arpc('admin_log', { act: 'user.login_link', uid: id, reason: r, details: {} }).catch(() => {});
      toast('Login link sent to ' + em);
    }
  });
}
function auReset(id) {
  admAsk({
    title: 'Send a password reset',
    body: 'Supabase emails this person a link to choose a new password. Their current password keeps working until they change it.',
    cta: 'Send reset email',
    run: async r => {
      const em = await auEmail(id);
      const { error } = await SB.auth.resetPasswordForEmail(em, { redirectTo: location.origin + '/' });
      if (error) throw error;
      await arpc('admin_log', { act: 'user.password_reset', uid: id, reason: r, details: {} }).catch(
        () => {}
      );
      toast('Reset email sent to ' + em);
    }
  });
}
function auPlan(id) {
  const row = (ADMU.data.rows || []).find(r => r.id === id) || {};
  admPlanAsk(id, row.plan || 'free');
}
function auInvite() {
  admAsk({
    title: 'Invite a user',
    body: 'They get an email with a sign-in link and code. Their account is created when they first sign in, and they finish their own profile.',
    extra: `<label class="x-f"><span>Email <i>*</i></span><input id="auinv" type="email" inputmode="email" autocomplete="off" placeholder="name@company.com"></label>`,
    cta: 'Send invite',
    run: async r => {
      const em = (($('#auinv') || {}).value || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) throw new Error('Enter a valid email');
      const { error } = await SB.auth.signInWithOtp({
        email: em,
        options: { shouldCreateUser: true, emailRedirectTo: location.origin + '/app' }
      });
      if (error) throw error;
      await arpc('admin_log', { act: 'user.invite', uid: null, reason: r, details: { email: em } }).catch(
        () => {}
      );
      toast('Invite sent to ' + em);
    }
  });
}
function auExport(selOnly) {
  if (!canU(['owner', 'admin'])) return toast('Only owners and admins can export');
  admAsk({
    title: selOnly ? 'Export selected users' : 'Export users',
    body: `Downloads a CSV of ${selOnly ? ADMU.sel.size + ' selected' : 'all matching'} users, including email addresses. Store it securely and delete it when done. The export is recorded.`,
    cta: 'Download CSV',
    run: async r => {
      let rows;
      if (ADMU.limited) rows = ADMU.data.rows;
      else {
        const d = await arpc('admin_users2', {
          q: ADMU.q,
          plan: ADMU.plan,
          st: ADMU.st,
          sort: ADMU.sort,
          dir: ADMU.dir,
          lim: 5000,
          off: 0
        });
        rows = d.rows;
      }
      if (selOnly) rows = rows.filter(x => ADMU.sel.has(x.id));
      await arpc('admin_log', {
        act: 'users.export',
        uid: null,
        reason: r,
        details: { count: rows.length, filters: { q: ADMU.q, plan: ADMU.plan, status: ADMU.st } }
      }).catch(e => {
        if (!ADMU.limited) throw e;
      });
      admDownload(
        'introthread-users-' + new Date().toISOString().slice(0, 10) + '.csv',
        admCsv(rows, [
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
  });
}
/* after any staff action, refresh the list and the open panel */
const _askGo35 = admAskGo;
admAskGo = async function (t) {
  await _askGo35.apply(this, arguments);
  if (ADM.tab === 'users' && !$('#mback.open') && ADMU.open) auRefreshOpen();
};
