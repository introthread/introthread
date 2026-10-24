/*
 * app-core.js - the original Introthread app (v1-v16): data store, router,
 * website pages and the main app screens (Today, Threads, Tap, Card, Rooms,
 * Settings). Every later feature file in /js builds on the functions here,
 * so this file must load first. Moved out of index.html in v56.
 */
/* Introthread prototype — local data store, router, views */
const $ = s => document.querySelector(s);
const esc = s =>
  String(s == null ? '' : s).replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
const uid = () => Math.random().toString(36).slice(2, 10);
const DAY = 864e5,
  HR = 36e5;
const COLORS = ['#3157ff', '#ff6b3d', '#12a065', '#7a5af8', '#0ea5e9', '#e11d74', '#c58a12', '#0f766e'];
const colorFor = s => COLORS[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const initials = n =>
  String(n || '?')
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
const av = (n, cls = '') =>
  `<div class="avatar ${cls}" style="background:${colorFor(n)}">${esc(initials(n))}</div>`;
const ago = t => {
  const d = Date.now() - t;
  if (d < HR) return Math.max(1, Math.round(d / 6e4)) + 'm ago';
  if (d < DAY) return Math.round(d / HR) + 'h ago';
  return Math.round(d / DAY) + 'd ago';
};
const slug = s =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 20) || 'me';

const IC = {
  logo: '<svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32"><defs><linearGradient id="itlg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6ea0ff"/><stop offset="1" stop-color="#ff5a1f"/></linearGradient></defs><path d="M9 22C22 36 26 -4 39 10" fill="none" stroke="url(#itlg)" stroke-width="3.6" stroke-linecap="round"/><circle cx="9" cy="22" r="6.5" fill="#ffffff"/><circle cx="39" cy="10" r="6.5" fill="#ff5a1f"/></svg>',
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>',
  thread:
    '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M8.5 12c2-4 5-4 7 0M8.5 12c2 4 5 4 7 0"/>',
  tap: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/><path d="M2 9c1.5-1.5 1.5-4.5 0-6M22 9c-1.5-1.5-1.5-4.5 0-6" transform="translate(0 6)"/>',
  room: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
  bell: '<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>',
  intro:
    '<circle cx="5" cy="7" r="2.5"/><circle cx="19" cy="7" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M7 8.5l3.5 7.5M17 8.5l-3.5 7.5"/>',
  keep: '<path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>',
  pause: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/>',
  out: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  nfc: '<path d="M6 8a6 6 0 010 8M10 5a10 10 0 010 14M14 2a14 14 0 010 20"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>'
};
const ic = (n, s = 18, c = 'currentColor', w = 1.9) =>
  n === 'logo'
    ? IC.logo
    : `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${IC[n] || ''}</svg>`;

/* What's next options */
const NEXT = {
  meet: { label: 'Meet again', desc: 'Book a proper conversation', icon: 'calendar' },
  intro: { label: 'Introduce someone', desc: 'One of us knows someone useful', icon: 'intro' },
  keep: { label: 'Stay in touch', desc: 'Keep the thread warm', icon: 'keep' },
  notnow: { label: 'Not now', desc: 'Quietly close, no awkwardness', icon: 'pause' }
};

/* ---------- store ---------- */
const KEY = 'introthread_v1';
let DB = load();
function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { users: [], session: null, threads: [], rooms: [] };
  } catch (e) {
    return { users: [], session: null, threads: [], rooms: [] };
  }
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(DB));
}
const me = () => DB.users.find(u => u.id === DB.session);
const myThreads = () =>
  DB.threads.filter(t => t.ownerId === DB.session).sort((a, b) => b.createdAt - a.createdAt);
const myRooms = () => DB.rooms.filter(r => r.ownerId === DB.session).sort((a, b) => b.date - a.date);
const findThread = id => DB.threads.find(t => t.id === id);

function threadState(t) {
  if (t.mine === 'notnow' || t.theirs === 'notnow') {
    if (t.mine && t.theirs) return 'closed';
  }
  if (t.resolvedAt) return 'resolved';
  if (t.mine && t.theirs) return t.mine === 'notnow' || t.theirs === 'notnow' ? 'closed' : 'matched';
  if (!t.confirmed) return 'pending';
  return 'open';
}
function stateChip(t) {
  const s = threadState(t);
  return {
    pending: '<span class="chip orange">Awaiting confirmation</span>',
    open: '<span class="chip blue">Waiting on "What\'s next?"</span>',
    matched: '<span class="chip green">Matched, act now</span>',
    resolved: '<span class="chip dark">Resolved</span>',
    closed: '<span class="chip">Closed gently</span>'
  }[s];
}
/* Resolve window: 7 days. Pulse = remaining share. */
function pulse(t) {
  if (t.resolvedAt || threadState(t) === 'closed') return 1;
  const left = Math.max(0, t.createdAt + 7 * DAY - Date.now());
  return left / (7 * DAY);
}
function ring(t) {
  const p = pulse(t),
    st = threadState(t);
  const c =
    st === 'resolved'
      ? '#0f1218'
      : st === 'closed'
        ? '#98a2b3'
        : p > 0.5
          ? '#3157ff'
          : p > 0.2
            ? '#ff6b3d'
            : '#d14343';
  const r = 18,
    C = 2 * Math.PI * r;
  const days = Math.ceil(p * 7);
  const label = st === 'resolved' ? ic('check', 14, '#0f1218', 3) : st === 'closed' ? '–' : days + 'd';
  return `<div class="ring" title="Thread pulse"><svg width="44" height="44"><circle cx="22" cy="22" r="${r}" stroke="#eceef2" stroke-width="4" fill="none"/><circle cx="22" cy="22" r="${r}" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}"/></svg><div class="t" style="color:${c}">${label}</div></div>`;
}
function warmth(t) {
  let s = 1;
  if (t.confirmed) s++;
  if (t.mine && t.theirs) s++;
  if (t.events.some(e => e.k === 'followup')) s++;
  if (t.resolvedAt) s++;
  return s;
}
const warmBar = n =>
  `<div class="warm" title="Verified warmth ${n}/5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`;

/* ---------- UI helpers ---------- */
function toast(msg) {
  const t = $('#toast');
  t.innerHTML = ic('check', 16, '#7ee2b0', 3) + esc(msg);
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 2600);
}
function modal(html) {
  $('#modal').innerHTML = html;
  $('#mback').classList.add('open');
}
function closeModal() {
  $('#mback').classList.remove('open');
}
function RH() {
  return '#' + (location.pathname || '/');
}
function go(h) {
  const p = String(h).replace(/^#/, '') || '/';
  if (location.pathname !== p) {
    history.pushState(null, '', p);
    window.dispatchEvent(new Event('itroute'));
  }
}
function copy(text, msg) {
  (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(
    () => toast(msg || 'Copied'),
    () => {
      const a = document.createElement('textarea');
      a.value = text;
      document.body.appendChild(a);
      a.select();
      try {
        document.execCommand('copy');
      } catch (e) {}
      a.remove();
      toast(msg || 'Copied');
    }
  );
}
let profileUrl = u => 'https://introthread.com/' + u.handle;
function qr(el, text, size = 150) {
  if (!el) return;
  el.innerHTML = '';
  try {
    if (window.qrcode) {
      const q = qrcode(0, 'M');
      q.addData(text);
      q.make();
      el.innerHTML = q.createImgTag(Math.max(2, Math.floor(size / q.getModuleCount())), 0);
    } else throw 0;
  } catch (e) {
    el.innerHTML = `<div style="width:${size}px;height:${size}px;background:repeating-conic-gradient(#0f1218 0 25%,#fff 0 50%) 0 0/12px 12px;border-radius:6px"></div>`;
  }
}

/* ---------- marketing shell ---------- */
/* mnav: earlier version removed in the v54 merge (the later declaration below always won) */
/* foot: earlier version removed in the v54 merge (the later declaration below always won) */

/* vHome: earlier version removed in the v54 merge (the later declaration below always won) */

/* vHow: earlier version removed in the v54 merge (the later declaration below always won) */

/* vRoomsPage: earlier version removed in the v54 merge (the later declaration below always won) */

/* vNetworks: earlier version removed in the v54 merge (the later declaration below always won) */

let billing = 'm';
/* vPricing: earlier version removed in the v54 merge (the later declaration below always won) */

/* vAbout: earlier version removed in the v54 merge (the later declaration below always won) */
/* vPrivacy: earlier version removed in the v54 merge (the later declaration below always won) */
/* ---------- auth ---------- */
/* vLogin: earlier version removed in the v54 merge (the later declaration below always won) */
const oG = () =>
  '<svg width="17" height="17" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-4z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41 35.4 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"/></svg>';
const oM = () =>
  '<svg width="16" height="16" viewBox="0 0 23 23"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>';
function doLogin(e) {
  e.preventDefault();
  const em = $('#le').value.trim().toLowerCase(),
    pw = $('#lp').value;
  const u = DB.users.find(x => x.email === em);
  if (!u || u.pw !== btoa(pw)) {
    $('#lerr').textContent = 'That email and password do not match. Try the demo account below.';
    return false;
  }
  DB.session = u.id;
  save();
  toast('Welcome back, ' + u.name.split(' ')[0]);
  go('#/app');
  return false;
}
function demoLogin() {
  let u = DB.users.find(x => x.email === 'demo@introthread.com');
  if (!u) {
    u = {
      id: uid(),
      name: 'Sarah Williams',
      email: 'demo@introthread.com',
      pw: btoa('demo1234'),
      role: 'Marketing Director',
      company: 'Acme Technologies',
      city: 'London',
      bio: 'I help B2B teams grow through partnerships and great storytelling.',
      handle: 'sarah',
      theme: 'midnight',
      links: { linkedin: 'linkedin.com/in/sarahwilliams', website: 'acme.com', calendar: 'cal.com/sarah' },
      plan: 'Pro',
      created: Date.now()
    };
    DB.users.push(u);
    seed(u);
  }
  DB.session = u.id;
  save();
  toast('Demo account loaded');
  go('#/app');
}
function oauth(p) {
  toast(p + ' sign-in connects in production. Opening the demo.');
  setTimeout(demoLogin, 700);
}

let SU = { step: 1 };
/* vSignup: earlier version removed in the v54 merge (the later declaration below always won) */
function su1(e) {
  e.preventDefault();
  const em = $('#se').value.trim().toLowerCase();
  if (DB.users.some(u => u.email === em)) {
    $('#serr').textContent = 'An account with this email already exists. Log in instead.';
    return false;
  }
  Object.assign(SU, { name: $('#sn').value.trim(), email: em, pw: btoa($('#sp').value), step: 2 });
  render();
  return false;
}
function su2(e) {
  e.preventDefault();
  const h = slug($('#sh').value);
  if (DB.users.some(u => u.handle === h)) {
    $('#shh').textContent = 'That link is taken. Try another.';
    $('#shh').style.color = 'var(--bad)';
    return false;
  }
  Object.assign(SU, {
    role: $('#sr').value.trim(),
    company: $('#sc').value.trim(),
    city: $('#sct').value.trim(),
    handle: h,
    bio: $('#sb').value.trim(),
    step: 3,
    theme: SU.theme || 'midnight'
  });
  render();
  return false;
}
function su3() {
  const u = {
    id: uid(),
    name: SU.name,
    email: SU.email,
    pw: SU.pw,
    role: SU.role,
    company: SU.company,
    city: SU.city,
    bio: SU.bio,
    handle: SU.handle,
    theme: SU.theme || 'midnight',
    links: {},
    plan: 'Free',
    created: Date.now()
  };
  DB.users.push(u);
  DB.session = u.id;
  save();
  SU = { step: 1 };
  modal(
    `<div class="center"><div style="width:64px;height:64px;border-radius:50%;background:#e8f8f0;display:grid;place-items:center;margin:auto">${ic('check', 30, '#12a065', 3)}</div><h2 style="letter-spacing:-.8px">Your card is live</h2><p class="muted">introthread.com/${esc(u.handle)}</p><p class="small muted">Want to see how Threads work with sample data first?</p><div class="row" style="justify-content:center;margin-top:18px"><button class="btn secondary" data-on-click="closeModal();go('#/app/tap')">Start sharing</button><button class="btn primary" data-on-click="suSample()">Add sample Threads</button></div></div>`
  );
  go('#/app');
}

/* ---------- app shell ---------- */
function shell(on, inner) {
  const u = me();
  const open = myThreads().filter(t => ['open', 'pending', 'matched'].includes(threadState(t))).length;
  const nav = (h, i, l, k, c) =>
    `<a href="${h}" class="nav ${on === k ? 'on' : ''}">${ic(i)}${l}${c ? `<span class="cnt">${c}</span>` : ''}</a>`;
  return `<div class="app"><aside class="sidebar"><div style="padding:6px 10px 18px">${logo(true)}</div>
 <a href="#/app/tap" class="btn primary block" style="margin-bottom:14px">${ic('tap', 16)} Tap to Thread</a>
 ${nav('#/app', 'home', 'Today', 'today')}${nav('#/app/threads', 'thread', 'Threads', 'threads', open)}${nav('#/app/rooms', 'room', 'Rooms', 'rooms')}
 <div class="navgroup">You</div>${nav('#/app/card', 'user', 'My card', 'card')}${nav('#/app/profile', 'globe', 'Public profile', 'pub')}${nav('#/app/settings', 'gear', 'Settings', 'settings')}
 <div style="margin-top:auto" class="card pad" ><div class="small" style="font-weight:850">Your Warmth</div><div class="small muted" style="margin:4px 0 10px">${myThreads().filter(t => t.confirmed).length} verified relationships</div>${warmBar(Math.min(5, 1 + Math.floor(myThreads().filter(t => t.resolvedAt).length / 2)))}</div>
 <div class="row" style="margin-top:14px;padding:8px">${av(u.name, 'sm')}<div style="flex:1;min-width:0"><b class="small" style="display:block">${esc(u.name)}</b><span class="tiny muted">${esc(u.plan)} plan</span></div><button class="x" title="Log out" data-on-click="logout()">${ic('out', 15)}</button></div></aside>
 <main class="main"><div class="topbar"><div class="search">${ic('search', 16)}<input placeholder="Search Threads, people, rooms, events..." data-on-input="setQ(this.value)" data-on-keydown="searchKey(event)"></div><div class="t-tb"><button type="button" class="t-chip" data-on-click="copy('${profileUrl(u)}','Link copied')" title="Copy your link">${sv('globe', 16)}<span>introthread.com/${esc(u.handle)}</span>${sv('copy', 16)}</button><button type="button" class="t-bell" data-on-click="showNudges()" aria-label="Nudges">${sv('bell', 20)}${nudges().length ? '<i></i>' : ''}</button><button type="button" class="t-user" data-on-click="acctMenu()">${avatarC(u, 40)}<span><b>${esc(u.name)}</b><small>${esc(u.role || u.plan + ' plan')}</small></span>${sv('chevd', 16)}</button></div></div><div class="content">${inner}</div></main>
 <nav class="mobile-tab">${[
   ['#/app', 'home', 'Today', 'today'],
   ['#/app/threads', 'thread', 'Threads', 'threads'],
   ['#/app/tap', 'tap', 'Tap', 'tap'],
   ['#/app/rooms', 'room', 'Rooms', 'rooms'],
   ['#/app/card', 'user', 'Card', 'card']
 ]
   .map(([h, i, l, k]) => `<a href="${h}" class="${on === k ? 'on' : ''}">${ic(i, 20)}${l}</a>`)
   .join('')}</nav></div>`;
}
let Q = '';
function logout() {
  DB.session = null;
  save();
  toast('Logged out');
  go('#/');
}
function tRow(t) {
  return `<div class="tl" data-on-click="go('#/app/thread/${t.id}')">${ring(t)}${av(t.other.name)}<div class="meta"><b>${esc(t.other.name)}</b><span>${esc(t.other.role)}${t.other.company ? ', ' + esc(t.other.company) : ''} &middot; ${esc(t.where)} &middot; ${ago(t.createdAt)}</span></div>${warmBar(warmth(t))}<div class="hide-sm">${stateChip(t)}</div></div>`;
}
function nudges() {
  return myThreads().filter(t => {
    const s = threadState(t);
    return (s === 'open' && !t.mine) || s === 'matched' || (s === 'pending' && Date.now() - t.createdAt > HR);
  });
}
function showNudges() {
  const n = nudges();
  modal(
    `<div class="row between"><h3 style="margin:0">Nudges</h3><button class="x" data-on-click="closeModal()">&times;</button></div><div class="stack" style="margin-top:16px">${n.length ? n.map(t => `<div class="tl" data-on-click="closeModal();go('#/app/thread/${t.id}')">${av(t.other.name, 'sm')}<div class="meta"><b>${esc(t.other.name)}</b><span>${threadState(t) === 'matched' ? 'You matched. Send the follow-up.' : threadState(t) === 'pending' ? 'Waiting for them to confirm.' : 'Answer "What\'s next?" before the Thread fades.'}</span></div></div>`).join('') : '<div class="empty">All caught up.</div>'}</div>`
  );
}

/* vToday: earlier version removed in the v54 merge (the later declaration below always won) */

/* vThreads: earlier version removed in the v54 merge (the later declaration below always won) */

function draftFor(t) {
  const u = me(),
    f = t.other.name.split(' ')[0];
  const m = t.mine === 'notnow' || t.theirs === 'notnow' ? 'keep' : t.mine;
  const ctx = t.note
    ? ` I keep thinking about what you said: ${t.note.replace(/\.$/, '').toLowerCase()}.`
    : '';
  return {
    meet: `Hi ${f},\n\nGreat meeting you at ${t.where}.${ctx} We both said we'd like to meet again, so let's make it happen. Would any of these work for a 30-minute call?\n\n- Thursday, 10:00\n- Friday, 14:30\n- Next Tuesday, 11:00\n\nOr grab a time here: introthread.com/${u.handle}\n\nBest,\n${u.name.split(' ')[0]}`,
    intro: `Hi ${f},\n\nIt was great to connect at ${t.where}.${ctx} As promised, I'd like to introduce you to someone I think you should know. I'll send a short double opt-in note first so it's useful for both of you.\n\nSpeak soon,\n${u.name.split(' ')[0]}`,
    keep: `Hi ${f},\n\nReally enjoyed our conversation at ${t.where}.${ctx} No agenda for now, I just wanted to say thanks and stay in touch. If there's ever anything I can help with, my details are at introthread.com/${u.handle}.\n\nAll the best,\n${u.name.split(' ')[0]}`
  }[m || 'keep'];
}
/* vThread: earlier version removed in the v54 merge (the later declaration below always won) */
function answer(id, k) {
  const t = findThread(id);
  t.mine = k;
  if (k) t.events.push({ k: 'answer', at: Date.now(), text: 'You answered "What\'s next?"' });
  if (k === 'notnow' && t.theirs && !t.resolvedAt) {
  }
  save();
  render();
  if (k) toast(t.theirs ? 'Answers revealed' : 'Answer locked in privately');
}
function sendFollow(id) {
  const t = findThread(id);
  t.events.push({ k: 'followup', at: Date.now(), text: 'Follow-up sent to ' + t.other.name.split(' ')[0] });
  save();
  toast('Follow-up sent');
  render();
}
function resolve(id, how) {
  const t = findThread(id);
  t.resolvedAt = Date.now();
  t.events.push({ k: 'resolved', at: Date.now(), text: 'Thread resolved: ' + how.toLowerCase() });
  save();
  toast('Thread resolved');
  render();
}
function saveNote(id) {
  findThread(id).note = $('#note').value;
  save();
  toast('Note saved');
}
function delThread(id) {
  if (!confirm('Delete your side of this Thread? This cannot be undone.')) return;
  DB.threads = DB.threads.filter(t => t.id !== id);
  save();
  toast('Thread deleted');
  go('#/app/threads');
}
/* ---------- tap ---------- */
/* vTap: earlier version removed in the v54 merge (the later declaration below always won) */
function shareNative() {
  const u = me();
  if (navigator.share)
    navigator.share({ title: u.name + ' on Introthread', url: profileUrl(u) }).catch(() => {});
  else copy(profileUrl(u), 'Link copied');
}
function newThread(e) {
  e.preventDefault();
  const rid = $('#tw').value,
    room = DB.rooms.find(r => r.id === rid);
  const where = room ? room.name : $('#tw2').value.trim() || 'In person';
  const t = {
    id: uid(),
    ownerId: DB.session,
    other: {
      name: $('#tn').value.trim(),
      role: $('#tr').value.trim() || 'Professional',
      company: $('#tc').value.trim(),
      email: $('#te').value.trim()
    },
    where,
    note: $('#tx').value.trim(),
    createdAt: Date.now(),
    confirmed: false,
    mine: null,
    theirs: null,
    resolvedAt: null,
    roomId: room ? room.id : null,
    events: [{ k: 'tap', at: Date.now(), text: 'Thread started at ' + where }]
  };
  DB.threads.push(t);
  save();
  toast('Thread started. Confirm link sent.');
  go('#/app/thread/' + t.id);
  return false;
}

/* ---------- card ---------- */
/* vCard: earlier version removed in the v54 merge (the later declaration below always won) */
function saveCard(e) {
  e.preventDefault();
  const u = me();
  Object.assign(u, {
    name: $('#cn').value.trim(),
    role: $('#cr').value.trim(),
    company: $('#cc').value.trim(),
    city: $('#cct').value.trim(),
    bio: $('#cb').value.trim()
  });
  u.links = {
    linkedin: $('#cl').value.trim(),
    website: $('#cw').value.trim(),
    calendar: $('#ck').value.trim()
  };
  save();
  toast('Card updated');
  render();
  return false;
}

/* ---------- rooms ---------- */
/* vRooms: earlier version removed in the v54 merge (the later declaration below always won) */
/* newRoomModal: earlier version removed in the v54 merge (the later declaration below always won) */
function simTap(rid) {
  const r = DB.rooms.find(x => x.id === rid);
  const N = [
    'Hannah Reid',
    'Omar Haddad',
    'Lily Chen',
    'Samuel Ndungu',
    'Ruby Walsh',
    'Tom Fischer',
    'Aisha Bello',
    'Max Larsen'
  ];
  const n = N[Math.floor(Math.random() * N.length)];
  DB.threads.push({
    id: uid(),
    ownerId: DB.session,
    other: {
      name: n,
      role: ['Founder', 'Investor', 'Head of Growth', 'CTO'][Math.floor(Math.random() * 4)],
      company: ['Nova', 'Pillar', 'Quanta', 'Rivet'][Math.floor(Math.random() * 4)],
      email: slug(n) + '@example.com'
    },
    where: r.name,
    note: '',
    createdAt: Date.now(),
    confirmed: true,
    mine: null,
    theirs: ['meet', 'intro', 'keep'][Math.floor(Math.random() * 3)],
    resolvedAt: null,
    roomId: r.id,
    events: [
      { k: 'tap', at: Date.now(), text: 'Tapped in room ' + r.code },
      { k: 'confirm', at: Date.now(), text: n.split(' ')[0] + ' confirmed the Thread' }
    ]
  });
  save();
  toast(n + ' just tapped in');
  render();
}
function exportRoom(rid) {
  const s = roomStats(DB.rooms.find(x => x.id === rid));
  const rows = [['Name', 'Role', 'Company', 'Verified', 'Your answer', 'Their answer', 'Resolved']].concat(
    s.T.map(t => [
      t.other.name,
      t.other.role,
      t.other.company,
      t.confirmed ? 'yes' : 'no',
      t.mine || '',
      t.theirs === 'notnow' ? 'keep' : t.theirs || '',
      t.resolvedAt ? 'yes' : 'no'
    ])
  );
  const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'resolution-report.csv';
  a.click();
  toast('Report downloaded');
}

/* ---------- settings ---------- */
/* vSettings: earlier version removed in the v54 merge (the later declaration below always won) */
function exportMine() {
  const data = { profile: me(), threads: myThreads(), rooms: myRooms() };
  delete data.profile.pw;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = 'introthread-export.json';
  a.click();
  toast('Export downloaded');
}
function delAccount() {
  if (!confirm('Delete your account and your side of every Thread?')) return;
  const id = DB.session;
  DB.threads = DB.threads.filter(t => t.ownerId !== id);
  DB.rooms = DB.rooms.filter(r => r.ownerId !== id);
  DB.users = DB.users.filter(u => u.id !== id);
  DB.session = null;
  save();
  toast('Account deleted');
  go('#/');
}

/* ---------- public profile & recipient view ---------- */

/* ---------- router ---------- */
function render() {
  const h = RH().slice(1);
  const p = h.split('/').filter(Boolean);
  let html;
  const authed = !!me();
  if (p[0] === 'app') {
    if (!authed) {
      go('#/login');
      return;
    }
    html = !p[1]
      ? vToday()
      : p[1] === 'threads'
        ? vThreads()
        : p[1] === 'thread'
          ? vThread(p[2])
          : p[1] === 'tap'
            ? vTap()
            : p[1] === 'card'
              ? vCard()
              : p[1] === 'rooms'
                ? vRooms()
                : p[1] === 'room'
                  ? vRoom(p[2])
                  : p[1] === 'profile'
                    ? vProfile()
                    : p[1] === 'settings'
                      ? vSettings()
                      : vToday();
  } else if (!p[0]) html = vHome();
  else
    html = (
      {
        how: vHow,
        rooms: vRoomsPage,
        networks: vNetworks,
        pricing: vPricing,
        about: vAbout,
        privacy: vPrivacy,
        terms: vTerms,
        login: () => (authed ? (go('#/app'), '') : vLogin()),
        signup: () => (authed ? (go('#/app'), '') : vSignup()),
        t: () => vGuest(p[1])
      }[p[0]] || (() => vPublic(p[0]))
    )();
  if (html == null) return;
  $('#root').innerHTML = html;
  const u = me();
  if (u) {
    qr($('#qrToday'), profileUrl(u), 96);
    qr($('#qrTap'), profileUrl(u), 164);
    qr($('#qrCard'), profileUrl(u), 96);
  }
  const rq = $('#qrRoom');
  if (rq) {
    const r = DB.rooms.find(x => x.id === p[2]);
    qr(rq, 'https://introthread.com/r/' + r.code, 150);
  }
  document.title =
    {
      app: 'Introthread',
      login: 'Log in | Introthread',
      signup: 'Create your card | Introthread',
      pricing: 'Pricing | Introthread'
    }[p[0]] || 'Introthread | Every handshake, followed through';
  if (!window._keepScroll) window.scrollTo(0, 0);
}
let lastHash = RH();
const _onRoute = () => {
  window._keepScroll = false;
  document.body.classList.remove('x-open');
  lastHash = RH();
  render();
};
window.addEventListener('popstate', _onRoute);
window.addEventListener('itroute', _onRoute);
window.addEventListener('hashchange', () => {
  if (location.hash.startsWith('#/')) {
    history.replaceState(null, '', location.hash.slice(1) || '/');
    _onRoute();
  }
});
const _r = render;
render = function () {
  const same = RH() === lastHash && window._rendered;
  window._keepScroll = same;
  _r();
  window._rendered = true;
};
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});
setInterval(() => {
  if (
    RH().startsWith('#/app') &&
    !$('#mback').classList.contains('open') &&
    !document.activeElement.matches('input,textarea,select')
  )
    render();
}, 60000);
/* ---------- Supabase cloud layer ----------
   Real accounts, cards, Threads and Rooms live in Supabase (row-level security).
   The "Explore the live demo" account stays local to the browser so anyone can try it safely. */
/* v57: remember when the page has finished loading every script (see boot()). */
let DOM_READY = document.readyState === 'complete';
document.addEventListener('DOMContentLoaded', () => (DOM_READY = true), { once: true });
const cloud = () => MODE === 'cloud' && SB;
const SITE = 'https://introthread.com';
profileUrl = u => SITE + '/' + u.handle;
const threadLink = t => SITE + '/t/' + (t.token || t.id);

/* persist only demo data locally */
save = function () {
  const keep = x => !x._c;
  localStorage.setItem(
    KEY,
    JSON.stringify({
      users: DB.users.filter(keep),
      threads: DB.threads.filter(keep),
      rooms: DB.rooms.filter(keep),
      session: MODE === 'demo' ? DB.session : null
    })
  );
};
function clearCloud() {
  DB.users = DB.users.filter(x => !x._c);
  DB.threads = DB.threads.filter(x => !x._c);
  DB.rooms = DB.rooms.filter(x => !x._c);
}
function fail(e) {
  console.error(e);
  toast(e && e.message ? e.message : 'Something went wrong. Please try again.');
  return null;
}

let PENDING = null;

/* auth */

/* thread actions */
saveCard = function (e) {
  e.preventDefault();
  const u = me();
  const patch = {
    name: $('#cn').value.trim(),
    role: $('#cr').value.trim(),
    company: $('#cc').value.trim(),
    city: $('#cct').value.trim(),
    bio: $('#cb').value.trim(),
    links: {
      linkedin: $('#cl').value.trim(),
      website: $('#cw').value.trim(),
      calendar: $('#ck').value.trim()
    }
  };
  upd('profiles', u.id, patch).then(ok => {
    if (!ok) return;
    Object.assign(u, patch);
    save();
    toast('Card updated');
    render();
  });
  return false;
};
async function setTheme(k) {
  const u = me();
  if (await upd('profiles', u.id, { theme: k })) {
    u.theme = k;
    save();
    render();
  }
}
async function setPref(k, v) {
  const u = me();
  const prefs = Object.assign({}, u.prefs || {}, { [k]: v });
  if (await upd('profiles', u.id, { prefs })) {
    u.prefs = prefs;
    save();
    toast('Saved');
  }
}
function setPlan(p) {
  if (cloud()) return toast('Pro billing opens soon. You will be first to know.');
  me().plan = p;
  save();
  render();
  toast('Upgraded to Pro (demo)');
}
const _simTap = simTap;
simTap = function (rid) {
  if (cloud())
    return toast(
      'Simulated taps are for the demo. In a live Room, log each Thread with this Room as the place.'
    );
  _simTap(rid);
};
delAccount = async function () {
  if (!confirm('Delete your account data and your side of every Thread?')) return;
  if (cloud()) {
    const id = DB.session;
    await SB.from('threads').delete().eq('owner_id', id);
    await SB.from('rooms').delete().eq('owner_id', id);
    await SB.from('profiles').delete().eq('id', id);
    await SB.auth.signOut();
    clearCloud();
    DB.session = null;
    MODE = null;
    save();
    toast('Your data has been deleted');
    go('#/');
    return;
  }
  const id = DB.session;
  DB.threads = DB.threads.filter(t => t.ownerId !== id);
  DB.rooms = DB.rooms.filter(r => r.ownerId !== id);
  DB.users = DB.users.filter(u => u.id !== id);
  DB.session = null;
  MODE = null;
  save();
  toast('Account deleted');
  go('#/');
};

/* public profile & guest (no account) */
async function refreshOwned(tok) {
  if (!cloud()) return;
  const t = DB.threads.find(x => x.token === tok && x._c);
  if (!t) return;
  const { data } = await SB.from('threads').select('*, thread_events(*)').eq('id', t.id).maybeSingle();
  if (data) {
    Object.assign(t, mapThread(data));
  }
}

/* ===== v4 UI: home + onboarding ===== */
const SV = {
  li: '<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.1c0-1.22-.02-2.78-1.7-2.78-1.7 0-1.96 1.33-1.96 2.7V21h-4z" fill="currentColor" stroke="none"/>',
  x: '<path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z" fill="currentColor" stroke="none"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M12 14h2M8 17h2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 7 8.5-7"/>',
  pin: '<path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  brief:
    '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12.5h18"/>',
  building: '<rect x="4" y="3" width="11" height="18" rx="1"/><path d="M15 9h5v12h-5M8 7h3M8 11h3M8 15h3"/>',
  users:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.4 3.5 5.2"/>',
  send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>',
  chart: '<path d="M5 20V12M10 20V5M15 20v-6M20 20V9"/>',
  palette:
    '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.7-.8 1.7-1.7 0-1.2-1-1.5-1-2.6 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/>',
  phone: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  sync: '<path d="M4 9h14l-3.5-3.5M20 15H6l3.5 3.5"/>',
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  chevd: '<path d="m6 9 6 6 6-6"/>',
  nfc: '<path d="M8.5 8.5a5 5 0 0 1 0 7M12 6a8.5 8.5 0 0 1 0 12M15.5 3.5a12 12 0 0 1 0 17"/>',
  qr: '<rect x="3.5" y="3.5" width="6" height="6" rx="1"/><rect x="14.5" y="3.5" width="6" height="6" rx="1"/><rect x="3.5" y="14.5" width="6" height="6" rx="1"/><path d="M14.5 14.5h2v2M20.5 14.5v6h-6M17.5 18.5h.01"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  shield:
    '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.3 7.5 9.5 4.3-1.2 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  menu2: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  contact:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10.5" r="2.5"/><path d="M5.5 17c.5-2 1.9-3 3.5-3s3 1 3.5 3M15 9h3M15 13h3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  hub: '<circle cx="12" cy="12" r="2.5"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M6.5 6.5l3.6 3.6M17.5 6.5l-3.6 3.6M6.5 17.5l3.6-3.6M17.5 17.5l-3.6-3.6"/>',
  handarrow: '<path d="M4 4c10 2 16 8 15 17M19 21l-4-3M19 21l2-4.5"/>'
};
const sv = (k, s = 18, c = 'currentColor', w = 1.8) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SV[k] || ''}</svg>`;
const handArrow = (w = 60, h = 50, flip) =>
  `<svg width="${w}" height="${h}" viewBox="0 0 60 50" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" style="${flip ? 'transform:scaleX(-1)' : ''}"><path d="M54 4C58 24 44 40 14 42"/><path d="M22 35l-9 7 10 4"/></svg>`;
const SARAH = {
  name: 'Sarah Williams',
  role: 'Marketing Director',
  company: 'Acme Technologies',
  city: 'London, UK',
  handle: 'sarahwilliams',
  theme: 'midnight',
  photo: '/img/sarah.jpg',
  bio: 'I help brands grow through strategic marketing and partnerships.',
  tags: ['Marketing', 'Partnerships', 'Events'],
  links: { website: 'acmetechnologies.com' },
  open: 1
};
const THEMES = {
  midnight: {
    n: 'Midnight',
    d: 'Modern and professional',
    c: ['professional', 'executive'],
    bg: 'radial-gradient(110% 70% at 105% -5%,rgba(60,100,230,.42),transparent 55%),radial-gradient(80% 60% at 110% 105%,rgba(255,106,61,.38),transparent 55%),linear-gradient(160deg,#0b1122,#121a30)',
    fg: '#fff',
    sub: 'rgba(255,255,255,.66)'
  },
  cobalt: {
    n: 'Cobalt',
    d: 'Clean and modern',
    c: ['professional', 'minimal'],
    bg: 'radial-gradient(80% 70% at 100% 100%,rgba(255,170,120,.6),transparent 60%),radial-gradient(70% 60% at 0% 0%,rgba(120,150,255,.35),transparent 60%),linear-gradient(150deg,#e3e9ff,#f8f9ff 55%,#eef1ff)',
    fg: '#0b1122',
    sub: '#4a5470',
    light: 1
  },
  ember: {
    n: 'Ember',
    d: 'Bold and distinctive',
    c: ['creative'],
    bg: 'radial-gradient(90% 80% at 100% 100%,rgba(255,130,80,.75),transparent 60%),linear-gradient(150deg,#260d07,#6b2410 60%,#c4461d)',
    fg: '#fff',
    sub: 'rgba(255,255,255,.72)'
  },
  forest: {
    n: 'Forest',
    d: 'Confident and unique',
    c: ['professional', 'executive'],
    bg: 'radial-gradient(90% 80% at 100% 0%,rgba(60,190,130,.45),transparent 60%),linear-gradient(150deg,#06231b,#0d3d2e 60%,#14634a)',
    fg: '#fff',
    sub: 'rgba(255,255,255,.72)'
  },
  ivory: {
    n: 'Ivory',
    d: 'Elegant and minimal',
    c: ['executive', 'minimal'],
    bg: 'linear-gradient(120deg,#efe6d8,#fbf8f3 52%,#e9dfcd)',
    fg: '#1b1712',
    sub: '#6b6152',
    light: 1
  },
  plum: {
    n: 'Plum',
    d: 'Creative and modern',
    c: ['creative'],
    bg: 'radial-gradient(90% 80% at 100% 100%,rgba(170,120,255,.6),transparent 60%),linear-gradient(150deg,#1a0d33,#3b1d74 60%,#6a3fd0)',
    fg: '#fff',
    sub: 'rgba(255,255,255,.72)'
  }
};
function avatarC(u, s) {
  if (u.photo)
    return `<img class="x-av" src="${esc(u.photo)}" alt="${esc(u.name || '')}" width="${s}" height="${s}" style="width:${s}px;height:${s}px">`;
  return `<div class="x-av" style="width:${s}px;height:${s}px;font-size:${Math.round(s * 0.34)}px">${esc(initials(u.name || 'Your Name'))}</div>`;
}
function bizCard(u, o = {}) {
  const t = THEMES[u.theme] || THEMES.midnight;
  const site = (u.links && u.links.website) || 'introthread.com/' + (u.handle || 'yourname');
  const tags = u.tags || [];
  return `<div class="x-card ${t.light ? 'lt' : ''} ${o.phone ? 'ph' : ''}" style="background:${t.bg};color:${t.fg};--sub:${t.sub}">
 <div class="x-card-top"><span class="x-card-brand"><span class="x-lm"><i></i><i></i></span>introthread</span>${sv('nfc', 20)}</div>
 <div class="x-card-id">${avatarC(u, o.phone ? 78 : 96)}<div class="x-card-name">${esc(u.name || 'Your name')}</div><div class="x-card-role">${esc(u.role || 'Your title')}${u.company ? ' &bull; ' + esc(u.company) : ''}</div></div>
 <div class="x-card-icons">${['li', 'x', 'cal', 'link', 'mail'].map(k => `<span>${sv(k, 17)}</span>`).join('')}</div>
 <a class="x-card-save" ${o.save ? `data-on-click="${o.save}"` : ''}>Save Contact</a>
 ${o.phone && u.bio ? `<div class="x-card-about"><b>About</b><p>${esc(u.bio)}</p></div>` : ''}
 <div class="x-card-rows"><div>${sv('pin', 17)}<span>${esc(u.city || 'Your city')}</span></div><div>${sv('globe', 17)}<span>${esc(site)}</span>${sv('chev', 15)}</div>${u.open ? `<div>${sv('brief', 17)}<span>Open to opportunities</span>${sv('chev', 15)}</div>` : !o.phone && u.bio ? `<div>${sv('brief', 17)}<span>${esc(u.bio)}</span></div>` : ''}</div>
 ${tags.length ? `<div class="x-card-tags"><b>Let's connect</b><div>${tags.map(x => `<span>${esc(x)}</span>`).join('')}</div></div>` : ''}</div>`;
}
function profileView(u) {
  const t = THEMES[u.theme] || THEMES.midnight;
  return `<div class="x-pview"><div class="x-pview-cv" style="background:${t.bg}"></div><div class="x-pview-b">${avatarC(u, 88)}<h4>${esc(u.name || 'Your name')}</h4><div class="r">${esc(u.role || 'Your title')}${u.company ? ' &bull; ' + esc(u.company) : ''}</div><p>${esc(u.bio || 'Your one-line bio appears here.')}</p><a class="x-btn">Save contact</a><a class="x-btn ghost">Start a Thread ${sv('arrow', 15)}</a><div class="rows"><div>${sv('pin', 16)}${esc(u.city || 'Your city')}</div><div>${sv('globe', 16)}introthread.com/${esc(u.handle || 'yourname')}</div></div></div></div>`;
}
const phone = (inner, wh) =>
  `<div class="x-phone ${wh ? 't' : ''}"><div class="x-scr ${wh ? 'wh' : ''}"><div class="x-sbar"><span>9:41</span><span>&#9679;&#9679;&#9679;</span></div>${inner}</div></div>`;
const threadScreen = () =>
  `<div class="x-tsc"><small>&lsaquo;&nbsp; NEW THREAD</small><h5>You and Sarah met at London Tech Week</h5><h6>What's next?</h6><div class="v-opt on">${sv('cal', 14)}Meet again<em>${sv('check', 14)}</em></div><div class="v-opt">${sv('users', 14)}Introduce someone</div><div class="v-opt">${sv('bell', 14)}Stay in touch</div><div class="v-opt">${sv('close', 14)}Not now</div></div>`;
const logo = dark =>
  `<a href="#/" class="x-logo ${dark ? 'dk' : ''}" aria-label="Introthread home"><span class="x-lm"><i></i><i></i></span><span>intro<b>thread</b></span></a>`;
/* ---------- onboarding ---------- */
let _hT;
/* prevHTML: earlier version removed in the v54 merge (the later declaration below always won) */

const _rx = render;
render = function () {
  const r = _rx.apply(this, arguments);
  [
    ['qrHero', 84],
    ['qrCta', 112]
  ].forEach(([id, s]) => {
    const el = document.getElementById(id);
    if (el && !el.firstChild) qr(el, 'https://www.introthread.com', s);
  });
  setMeta();
  applyPhoto();
  if ($('#qrPf') && !$('#qrPf').firstChild) qr($('#qrPf'), profileUrl(me()), 104);
  if (location.hash && /^#[a-z]+$/.test(location.hash)) {
    const t = document.getElementById(location.hash.slice(1));
    if (t) setTimeout(() => t.scrollIntoView(), 60);
  }
  document
    .querySelectorAll('a[href^="#/"]')
    .forEach(a => a.setAttribute('href', a.getAttribute('href').slice(1) || '/'));
  const dl = document.querySelector('.x-dl');
  if (dl && !dl.classList.contains('in')) {
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        es => {
          if (es.some(e => e.isIntersecting)) {
            dl.classList.add('in');
            io.disconnect();
          }
        },
        { threshold: 0.25 }
      );
      io.observe(dl);
    } else dl.classList.add('in');
  }
  return r;
};

/* v4.1 login + compact previews */

/* ===== v4 inner pages ===== */

/* legal + not found */

/* ===== v5 Tap to Thread ===== */

/* ===== v6 Tap to Thread: card tags, recent activity, sharing analytics ===== */

/* v6.3 large-screen fit: scale = min(width/1700, height/820), between 0.72 and 1, for screens 1024px and wider */
function fitZ() {
  const w = innerWidth,
    hh = innerHeight;
  let s = 1;
  if (w >= 1024) s = Math.max(0.72, Math.min(1, w / 1700, hh / 820));
  document.documentElement.style.setProperty('--z', s.toFixed(3));
}
fitZ();
addEventListener('resize', fitZ);
document.addEventListener('click', e => {
  const d = $('#twd');
  if (d && d.open && !d.contains(e.target)) d.removeAttribute('open');
});
/* topbar: account menu */
/* acctMenu: earlier version removed in the v54 merge (the later declaration below always won) */

/* ===== v5 Public profile workspace ===== */
function linkKind(v) {
  v = (v || '').toLowerCase();
  return /linkedin\./.test(v)
    ? 'li'
    : /(cal\.com|calendly|savvycal|zcal)/.test(v)
      ? 'cal'
      : /(twitter\.com|x\.com)/.test(v)
        ? 'x'
        : 'globe';
}
/* vProfile: earlier version removed in the v54 merge (the later declaration below always won) */
/* hidden profiles: visitors see a private notice */

/* ===== v5 Account settings ===== */
const flag = c => String.fromCodePoint(...[...c.toUpperCase()].map(x => 127397 + x.charCodeAt()));
/* stSave: earlier version removed in the v54 merge (the later declaration below always won) */
/* stPlan: earlier version removed in the v54 merge (the later declaration below always won) */
/* stConnected: earlier version removed in the v54 merge (the later declaration below always won) */
/* stDanger: earlier version removed in the v54 merge (the later declaration below always won) */
/* stAccount: earlier version removed in the v54 merge (the later declaration below always won) */
/* vSettings: earlier version removed in the v54 merge (the later declaration below always won) */

/* ===== v5 Today, Threads, Rooms ===== */
const xav = (n, s = 44) =>
  `<span class="d-av" style="width:${s}px;height:${s}px;font-size:${Math.round(s * 0.36)}px;background:${colorFor(n)}">${esc(initials(n))}</span>`;
/* ---------- Today ---------- */
/* vToday: earlier version removed in the v54 merge (the later declaration below always won) */
/* ---------- Threads ---------- */
/* vThreads: earlier version removed in the v54 merge (the later declaration below always won) */
/* ---------- Rooms ---------- */
/* vRooms: earlier version removed in the v54 merge (the later declaration below always won) */

/* ===== Topic tags on Threads ===== */
const TOPICS = [
  'Investing',
  'Hiring',
  'Partnership',
  'Sales',
  'Product',
  'Funding',
  'Marketing',
  'Technology',
  'Community',
  'Mentoring'
];
let TSEL = [];
const tagsOf = t => (t && t.tags) || [];
function normTags() {
  (DB.threads || []).forEach(t => {
    if (!t.events) return;
    const tg = t.events.filter(e => e.k === 'note' && /^#tags:/.test(e.text || ''));
    if (tg.length) {
      t.tags = tg[tg.length - 1].text
        .slice(6)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      t.events = t.events.filter(e => !(e.k === 'note' && /^#tags:/.test(e.text || '')));
    }
    if (!t.tags && typeof MODE !== 'undefined' && MODE === 'demo') {
      const n = [...String((t.other && t.other.name) || '')].reduce((a, c) => a + c.charCodeAt(0), 0);
      t.tags = [TOPICS[n % 10], TOPICS[(n * 7 + 3) % 10]].filter((x, i, a) => a.indexOf(x) === i);
    }
  });
}
function tagChips(t) {
  const g = tagsOf(t);
  return g.length
    ? `<span class="d-tags">${g
        .map(x => {
          const c = colorFor(x);
          return `<i style="color:${c};background:${c}17">${esc(x)}</i>`;
        })
        .join('')}</span>`
    : '';
}
const topicsField = sel =>
  `<div class="x-f t-topics"><span>Topics <em>(optional, up to 3)</em></span><div class="tp-wrap" id="tpw">${tpChips(sel)}</div></div>`;
async function saveTags(t, tags) {
  t.tags = tags.slice();
  await addEvent(t, 'note', '#tags:' + tags.join(','));
  t.events = t.events.filter(e => !(e.k === 'note' && /^#tags:/.test(e.text || '')));
  save();
}
const _rT = render;
render = function () {
  normTags();
  return _rT.apply(this, arguments);
};

/* Supabase email-link callback: introthread.com/app#access_token=... or #error=... */
const AUTH_CB = /(^|[#&])(access_token|error_description|error)=/.test(location.hash);
if (AUTH_CB) {
  const hp = new URLSearchParams(location.hash.slice(1));
  window._authErr = hp.get('error_description');
}
/* path URLs (introthread.com/handle, /t/token, /r/code) -> hash routes */
if (!AUTH_CB && location.hash.startsWith('#/')) {
  history.replaceState(null, '', location.hash.slice(1) || '/');
}
/* internal links: clean paths, no page reload */
document.addEventListener('click', e => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest && e.target.closest('a[href]');
  if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
  const href = a.getAttribute('href');
  if (!href) return;
  let p = null;
  if (href.startsWith('#/')) p = href.slice(1);
  else if (href.startsWith('/') && !href.startsWith('//') && !/\.[a-z0-9]{2,5}$/i.test(href.split('?')[0]))
    p = href;
  if (p == null) return;
  e.preventDefault();
  go(p);
});
const _render2 = render;
render = function () {
  const p = RH().slice(1).split('/').filter(Boolean);
  if (p[0] === 'r') {
    $('#root').innerHTML = vRoomCode(p[1]);
    return;
  }
  if (p[0] === 'app' && MODE === 'cloud' && PENDING && !me()) {
    go('#/signup');
    return;
  }
  _render2();
};
(async function boot() {
  /* wait until every script (main + /js files) has run, so all wrappers exist before the first render */ await new Promise(
    r =>
      /* v57: scripts are deferred, so readyState is already 'interactive' here.
         DOMContentLoaded fires only after every deferred file has run. */
      DOM_READY ? r() : document.addEventListener('DOMContentLoaded', r, { once: true })
  );
  if (AUTH_CB) {
    $('#root').innerHTML =
      `<div class="pub"><div class="pubcard center"><div style="margin:80px 0 20px">${logo()}</div><p class="muted">Signing you in...</p></div></div>`;
  }
  if (SB) {
    const { data } = await SB.auth.getSession();
    const s = data && data.session;
    if (s && MODE !== 'demo') {
      const r = await loadCloud(s.user);
      if (r === 'needs-profile') {
        SU = {
          step: 2,
          name: (s.user.user_metadata || {}).full_name || '',
          email: s.user.email,
          photo: (s.user.user_metadata || {}).avatar_url || null
        };
        go('#/signup');
      }
    }
    SB.auth.onAuthStateChange(async (ev, sess) => {
      if (ev === 'SIGNED_IN' && sess && MODE !== 'demo' && !me()) {
        const r = await loadCloud(sess.user);
        if (r === 'ok') {
          save();
          render();
        }
      }
    });
  }
  if (AUTH_CB) {
    if (SB) await new Promise(r => setTimeout(r, 400));
    const ok = SB && (await SB.auth.getSession()).data.session;
    history.replaceState(null, '', ok ? '/app' : '/login');
    if (!ok && window._authErr) setTimeout(() => toast(window._authErr.replace(/\+/g, ' ')), 300);
    else if (ok && !me()) {
      const r = await loadCloud(ok.user);
      if (r === 'needs-profile') {
        SU = {
          step: 2,
          name: (ok.user.user_metadata || {}).full_name || '',
          email: ok.user.email,
          photo: (ok.user.user_metadata || {}).avatar_url || null
        };
        go('#/signup');
      }
    }
    if (ok) setTimeout(() => toast('Email confirmed. Welcome to Introthread.'), 300);
  }
  render();
})();

/* ===== v7 Today dashboard (design: Relationship Today) ===== */

/* ===== v8 Threads screen (design: Relationship Thread) ===== */

/* ===== v9 Rooms: events and communities ===== */
const _render9 = render;
render = function () {
  try {
    (DB.rooms || []).forEach(rm9);
  } catch (_) {}
  return _render9.apply(this, arguments);
};
function r12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/* v9.1 demo: realistic upcoming Rooms so the demo shows the full Rooms experience */
const _render91 = render;
render = function () {
  seedDemoRooms9();
  return _render91.apply(this, arguments);
};
/* ===== v10 My card (design: Digital My Card) ===== */

const _saveCard10 = saveCard;
saveCard = function (e) {
  if (!$('#cn')) {
    if (e && e.preventDefault) e.preventDefault();
    if (!CD) cdInit();
    return cdSave();
  }
  return _saveCard10.call(this, e);
};
/* ===== v11 Public profile (design: Public Profile) ===== */
/* public page: apply profile SEO settings */

/* ===== v12 Account settings (design: Account Settings) ===== */

/* ===== v14 Public card page (design: Tap to Thread Profile Card) ===== */

/* ===== v15 Thread detail (design: Thread Detail Dashboard) ===== */

/* v61: named handlers for the website pages, signup and login (no inline JavaScript). */

/* v61: named handlers for the Today screen (no inline JavaScript). */

/* v61: named handlers for the Threads list and Thread detail (no inline JavaScript). */
const keepRender = () => {
  window._keepScroll = true;
  render();
};

/* v61: named handlers for the Tap screen (no inline JavaScript). */

/* v61: named handlers for My card and Profile (no inline JavaScript). */

/* v61: named handlers for the Rooms screens (no inline JavaScript). */

/* v61: named handlers for Settings, the app shell search and the account menu (no inline JavaScript). */

/* v63: named handler for a Rooms calendar day (tap again to clear). */
