// Introthread - Navigation (v20-v21): Settings tab deep links, same-page links, mobile and tablet navigation.
// Moved out of index.html in v53 (code split step 5). Load order matters: see the <script> list at the end of index.html.

/* ===== v20 Deep links for Settings tabs: /app/settings?tab=notifications works from any page ===== */
const stTabKeys = () => ST_TABS.map(t => t[0]);
function stUrl(t) {
  return '/app/settings' + (t && t !== 'account' ? '?tab=' + t : '');
}
amGo = function (path, tab) {
  amClose();
  const url = path === '/app/settings' ? stUrl(tab) : path;
  if (tab) STAB = tab;
  if (location.pathname + location.search !== url) {
    if (location.pathname === url.split('?')[0]) history.pushState(null, '', url);
    else return go(url);
  }
  window._keepScroll = false;
  render();
  window.scrollTo(0, 0);
};
stTab = function (t) {
  if (!stTabKeys().includes(t)) t = 'account';
  STAB = t;
  if (location.pathname === '/app/settings') history.replaceState(null, '', stUrl(t));
  window._keepScroll = true;
  render();
};
const _render20 = render;
render = function () {
  if (location.pathname === '/app/settings') {
    const t = new URLSearchParams(location.search).get('tab') || 'account';
    if (stTabKeys().includes(t)) STAB = t;
  }
  return _render20();
};
/* ===== v21 Navigation: same-page links always respond, tabs have their own URLs ===== */
const _go21 = go;
go = function (h) {
  const p = String(h).replace(/^#/, '') || '/';
  if (p === location.pathname + location.search && !window._rendering) {
    window._keepScroll = false;
    try {
      amClose();
    } catch (_) {}
    render();
    window.scrollTo(0, 0);
    return;
  }
  return _go21(h);
};
/* each tabbed page keeps its tab in the address, so menus, refresh and links land on the right tab */
const TABSYNC = [
  {
    path: '/app/profile',
    param: 'tab',
    def: 'info',
    keys: ['info', 'links', 'look', 'seo'],
    get: () => PTAB,
    set: v => {
      PTAB = v;
    }
  },
  {
    path: '/app/card',
    param: 'tab',
    def: 'basic',
    keys: ['basic', 'links', 'style', 'share', 'adv'],
    get: () => CTAB,
    set: v => {
      CTAB = v;
    }
  },
  {
    path: '/app/threads',
    param: 'status',
    def: 'all',
    keys: ['all', 'matched', 'open', 'pending', 'resolved', 'closed'],
    get: () => TF2,
    set: v => {
      TF2 = v;
      TLIM = 20;
    }
  },
  {
    path: '/app/rooms',
    param: 'view',
    def: 'all',
    keys: ['all', 'upcoming', 'past', 'mine', 'invites'],
    get: () => RF9,
    set: v => {
      RF9 = v;
      RLIM9 = 6;
    }
  }
];
const _render21 = render;
render = function () {
  const ts = TABSYNC.find(t => t.path === location.pathname);
  const href = location.pathname + location.search;
  if (ts && href !== window._tsLast) {
    const v = new URLSearchParams(location.search).get(ts.param);
    ts.set(ts.keys.includes(v) ? v : ts.def);
  }
  window._rendering = true;
  try {
    _render21();
  } finally {
    window._rendering = false;
  }
  if (ts && location.pathname === ts.path) {
    const v = ts.get(),
      sp = new URLSearchParams(location.search);
    if (v === ts.def) sp.delete(ts.param);
    else sp.set(ts.param, v);
    const qs = sp.toString(),
      want = ts.path + (qs ? '?' + qs : '');
    if (want !== location.pathname + location.search) history.replaceState(null, '', want);
  }
  window._tsLast = location.pathname + location.search;
  mbAfterRender();
};
/* privacy link opens the right Public profile tab */
const _bPrivacy21 = bPrivacy;
bPrivacy = function (u) {
  return _bPrivacy21(u).replace(
    `href="/app/profile" data-on-click="setPTab('look')"`,
    'href="/app/profile?tab=look"'
  );
};

/* ===== v21 Mobile and tablet navigation (screens under 1024px) ===== */
const MB_BP = 1024;
const isMb = () => innerWidth < MB_BP;
function mbOpenCount() {
  return myThreads().filter(t => ['open', 'pending', 'matched'].includes(threadState(t))).length;
}
const _shell21 = shell;
shell = function (on, inner) {
  let h = _shell21(on, inner);
  const u = me();
  if (!u) return h;
  const n = mbOpenCount();
  const tab = (href, ic, l, k, badge) =>
    `<a href="${href}" class="mb-t ${on === k ? 'on' : ''}" ${on === k ? 'aria-current="page"' : ''}><span class="mb-ti">${sv(ic, 22)}${badge ? `<em>${badge > 99 ? '99+' : badge}</em>` : ''}</span><span>${l}</span></a>`;
  const bar = `<nav class="mobile-tab mb-bar" aria-label="Main">${tab('/app', 'home', 'Today', 'today')}${tab('/app/threads', 'thread', 'Threads', 'threads', n)}<a href="/app/tap" class="mb-tap ${on === 'tap' ? 'on' : ''}" aria-label="Tap to Thread"><span>${sv('nfc', 24)}</span><b>Tap</b></a>${tab('/app/rooms', 'cal', 'Rooms', 'rooms')}<button type="button" class="mb-t ${['card', 'pub', 'settings'].includes(on) ? 'on' : ''}" data-am aria-haspopup="menu" aria-expanded="false" data-on-click="acctMenu(this,'sheet')"><span class="mb-ti mb-av">${avatarC(u, 26)}</span><span>More</span></button></nav>`;
  h = h.replace(/<nav class="mobile-tab">[\s\S]*?<\/nav>/, bar);
  h = h.replace(
    '<div class="topbar">',
    `<div class="topbar"><a href="/app" class="mb-logo" aria-label="Introthread dashboard"><span class="x-lm"><i></i><i></i></span><span>intro<b>thread</b></span></a><button type="button" class="mb-sbtn" aria-label="Search" data-on-click="mbSearch()">${ic('search', 20)}</button>`
  );
  return h;
};
/* account menu becomes a bottom sheet on phones and tablets */
const _acct21 = acctMenu;
acctMenu = function (btn, dir) {
  _acct21(btn, dir);
  const m = document.getElementById('acm');
  if (!m || !isMb()) return;
  m.classList.remove('up', 'down');
  m.classList.add('sheet');
  m.style.left = '';
  m.style.top = '';
  if (!document.getElementById('acmb')) {
    const bd = document.createElement('div');
    bd.id = 'acmb';
    bd.className = 'am-bd';
    bd.onclick = amClose;
    document.body.appendChild(bd);
  }
  if (!m.querySelector('.am-grab'))
    m.insertAdjacentHTML('afterbegin', '<span class="am-grab" aria-hidden="true"></span>');
  const pages = m.querySelector('.am-g');
  if (pages && !m.querySelector('[data-mbnav]'))
    pages.insertAdjacentHTML(
      'afterbegin',
      `<button type="button" role="menuitem" class="am-it" data-mbnav data-on-click="amGo('/app/tap')">${sv('nfc', 18)}<span>Tap to Thread</span></button>`
    );
};
const _amClose21 = amClose;
amClose = function () {
  _amClose21();
  const b = document.getElementById('acmb');
  if (b) b.remove();
};
/* full-screen search */
function mbSearch() {
  if (document.getElementById('mbs')) return;
  const d = document.createElement('div');
  d.id = 'mbs';
  d.className = 'mbs';
  d.setAttribute('role', 'dialog');
  d.setAttribute('aria-label', 'Search');
  d.innerHTML = `<div class="mbs-h"><label class="mbs-in">${sv('search', 18)}<input id="mbsq" type="search" placeholder="Search people, companies, Rooms" autocomplete="off" enterkeyhint="search"></label><button type="button" class="mbs-x" data-on-click="mbSearchClose()">Cancel</button></div><div class="mbs-r" id="mbsr"></div>`;
  document.body.appendChild(d);
  document.body.classList.add('mbs-open');
  const i = d.querySelector('input');
  i.addEventListener('input', mbSearchRun);
  i.addEventListener('keydown', e => {
    if (e.key === 'Escape') mbSearchClose();
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = i.value.trim();
      mbSearchClose();
      TQ2 = v;
      Q = v;
      TF2 = 'all';
      go('/app/threads');
    }
  });
  mbSearchRun();
  setTimeout(() => i.focus(), 30);
}
function mbSearchClose() {
  const d = document.getElementById('mbs');
  if (d) d.remove();
  document.body.classList.remove('mbs-open');
}
function mbSearchRun() {
  const q = (($('#mbsq') || {}).value || '').toLowerCase().trim();
  const r = $('#mbsr');
  if (!r) return;
  if (!q) {
    r.innerHTML = `<small class="mbs-l">Go to</small>${[
      ['/app', 'home', 'Today'],
      ['/app/threads', 'thread', 'Threads'],
      ['/app/tap', 'nfc', 'Tap to Thread'],
      ['/app/rooms', 'cal', 'Rooms'],
      ['/app/card', 'user', 'My card'],
      ['/app/profile', 'globe', 'Public profile'],
      ['/app/settings', 'gear', 'Settings'],
      ['/app/settings?tab=help', 'mail', 'Help &amp; support']
    ]
      .map(
        ([h, ic, l]) =>
          `<button type="button" class="mbs-i" data-on-click="mbSearchClose();go('${h}')">${sv(ic, 18)}<span>${l}</span>${sv('chev', 14)}</button>`
      )
      .join('')}`;
    return;
  }
  const T = myThreads()
    .filter(t =>
      [t.other.name, t.other.company, t.other.role, t.where, tagsOf(t).join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
    .slice(0, 8);
  const R = myRooms()
    .filter(x => [x.name, x.location].join(' ').toLowerCase().includes(q))
    .slice(0, 4);
  r.innerHTML =
    (T.length
      ? `<small class="mbs-l">People</small>${T.map(t => `<button type="button" class="mbs-i" data-on-click="mbSearchClose();go('/app/thread/${t.id}')">${xav(t.other.name, 34)}<span><b>${esc(t.other.name)}</b><small>${esc([t.other.role, t.other.company].filter(Boolean).join(', ') || t.where)}</small></span>${sv('chev', 14)}</button>`).join('')}`
      : '') +
    (R.length
      ? `<small class="mbs-l">Rooms</small>${R.map(x => `<button type="button" class="mbs-i" data-on-click="mbSearchClose();go('/app/room/${x.id}')">${sv('cal', 18)}<span><b>${esc(x.name)}</b><small>${esc(x.location || '')}</small></span>${sv('chev', 14)}</button>`).join('')}`
      : '') +
    (!T.length && !R.length ? `<p class="mbs-e">No results for &ldquo;${esc(q)}&rdquo;</p>` : '');
}
window.addEventListener('itroute', mbSearchClose);
window.addEventListener('popstate', mbSearchClose);
/* keep the active tab visible in scrollable tab strips */
function mbAfterRender() {
  if (!isMb()) return;
  requestAnimationFrame(() =>
    document.querySelectorAll('.cd-tabs,.th-tabs,.ro-tabs,.st12-tabs').forEach(n => {
      const a = n.querySelector('.on');
      if (a && n.scrollWidth > n.clientWidth)
        n.scrollLeft = Math.max(0, a.offsetLeft - (n.clientWidth - a.offsetWidth) / 2);
    })
  );
}
/* resizing between desktop and mobile closes the sheet and re-renders the layout once */
let _mbWas = isMb();
window.addEventListener('resize', () => {
  const now = isMb();
  if (now !== _mbWas) {
    _mbWas = now;
    mbSearchClose();
    if (me() && location.pathname.startsWith('/app')) {
      window._keepScroll = true;
      render();
    }
  }
});
