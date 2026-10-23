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
const fmtDate = t =>
  new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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

function seed(u) {
  const now = Date.now();
  const people = [
    [
      'Sarah Williams',
      'Marketing Director',
      'Acme Technologies',
      'London Tech Week',
      'Interested in an enterprise partnership. Wants a pilot proposal.',
      2 * DAY,
      true,
      'meet',
      'meet',
      false
    ],
    [
      'James Carter',
      'CEO',
      'Northwind Capital',
      'SaaStr Europa',
      'Raising a fund focused on HR tech. Asked about our data story.',
      4 * DAY,
      true,
      'intro',
      null,
      false
    ],
    [
      'Priya Shah',
      'Head of Platform',
      'Lattice Ventures',
      'Founders Breakfast, Shoreditch',
      'Runs portfolio talent programme. Possible design partner.',
      6 * DAY + 10 * HR,
      true,
      null,
      null,
      false
    ],
    [
      'Daniel Okafor',
      'Partner',
      'Atlas Seed',
      'Web Summit',
      'Great chat on Africa to UK expansion.',
      11 * DAY,
      true,
      'keep',
      'keep',
      true
    ],
    [
      'Emma Laurent',
      'Product Lead',
      'Helio',
      'London Tech Week',
      'Not a fit right now.',
      9 * DAY,
      true,
      'notnow',
      'keep',
      false
    ],
    ['Michael Brown', 'VP Sales', 'Brightline', 'Coffee, Kings Cross', '', 5 * HR, false, null, null, false]
  ];
  const room = {
    id: uid(),
    ownerId: u.id,
    name: 'London Tech Week Founders Night',
    date: now - 2 * DAY,
    location: 'Shoreditch, London',
    code: 'LTW26',
    created: now - 3 * DAY
  };
  DB.rooms.push(room);
  people.forEach(([name, role, company, where, note, age, conf, mine, theirs, res], i) => {
    const c = now - age;
    const t = {
      id: uid(),
      ownerId: u.id,
      other: { name, role, company, email: slug(name) + '@example.com' },
      where,
      note,
      createdAt: c,
      confirmed: conf,
      mine,
      theirs,
      resolvedAt: res ? c + 3 * DAY : null,
      roomId: where === 'London Tech Week' ? room.id : null,
      events: [{ k: 'tap', at: c, text: 'Tapped at ' + where }]
    };
    if (conf)
      t.events.push({ k: 'confirm', at: c + 20 * 6e4, text: name.split(' ')[0] + ' confirmed the Thread' });
    if (mine) t.events.push({ k: 'answer', at: c + HR, text: 'You answered "What\'s next?"' });
    if (theirs)
      t.events.push({ k: 'answer', at: c + 3 * HR, text: name.split(' ')[0] + ' answered "What\'s next?"' });
    if (res) {
      t.events.push({ k: 'followup', at: c + DAY, text: 'Follow-up sent' });
      t.events.push({ k: 'resolved', at: c + 3 * DAY, text: 'Thread resolved: stayed in touch' });
    }
    DB.threads.push(t);
  });
  for (let i = 0; i < 14; i++) {
    const n = [
      'Ava Thompson',
      'Leo Martins',
      'Grace Kim',
      'Noah Patel',
      'Zara Ahmed',
      'Oliver Grant',
      'Mia Rossi',
      'Ethan Cole',
      'Isla Murray',
      'Lucas Bauer',
      'Chloe Evans',
      'Ben Adeyemi',
      'Sofia Ruiz',
      'Jack Turner'
    ][i];
    const c = room.date + i * 9 * 6e4;
    const mine = ['meet', 'intro', 'keep', 'keep', 'meet', null, 'notnow'][i % 7];
    const theirs = i % 3 ? mine : 'keep';
    DB.threads.push({
      id: uid(),
      ownerId: u.id,
      other: {
        name: n,
        role: ['Founder', 'Investor', 'Engineer', 'Designer', 'Operator'][i % 5],
        company: ['Kite', 'Orbit', 'Fable', 'Verve', 'Atlas'][i % 5],
        email: slug(n) + '@example.com'
      },
      where: room.name,
      note: '',
      createdAt: c,
      confirmed: i % 5 !== 4,
      mine,
      theirs: i % 5 !== 4 ? theirs : null,
      resolvedAt: i % 4 === 0 ? c + DAY : null,
      roomId: room.id,
      events: [{ k: 'tap', at: c, text: 'Tapped in room ' + room.code }]
    });
  }
}
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
function demoStage() {
  return `<div class="stage">
<div class="phone a"><div class="notch"></div><div class="scr"><div class="top"><div class="tiny muted" style="font-weight:800;letter-spacing:.1em">YOUR CARD</div></div>
<div class="mini-card"><div class="row">${av('Sarah Williams', 'sm')}<div><b style="font-size:13px">Sarah Williams</b><div class="tiny" style="color:#aab3c4">Marketing Director, Acme</div></div></div><div class="tiny" style="margin-top:34px;color:#aab3c4">introthread.com/sarah</div></div>
<div style="padding:14px"><div class="tiny muted" style="font-weight:800;margin-bottom:8px">LAST THREAD</div><div class="row" style="border:1px solid var(--line);border-radius:12px;padding:10px">${av('James Carter', 'sm')}<div style="flex:1"><b style="font-size:12px">James Carter</b><div class="tiny muted">London Tech Week &middot; just now</div></div><span class="chip green" style="font-size:10px">Confirmed</span></div></div></div></div>
<div class="tapwave"></div><div class="tapwave d2"></div><div class="tapwave d3"></div><div class="threadline"></div>
<div class="phone b"><div class="notch"></div><div class="scr"><div class="top"><div class="tiny muted" style="font-weight:800;letter-spacing:.1em">NEW THREAD</div><b style="font-size:17px;display:block;margin-top:6px;letter-spacing:-.4px">You and Sarah met at London Tech Week</b></div>
<div style="padding:0 18px 6px" class="tiny muted">One question. Only you see your answer until you both reply.</div>
<div style="padding:4px 18px 0;font-weight:900;font-size:15px">What's next?</div>
<div class="q-opt on">Meet again ${ic('check', 14, '#3157ff', 3)}</div><div class="q-opt">Introduce someone</div><div class="q-opt">Stay in touch</div><div class="q-opt">Not now</div>
<div style="margin:12px 14px" class="tiny muted">${ic('lock', 12)} Private until you both answer</div></div></div></div>`;
}

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

let TF = 'all';
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
function roomStats(r) {
  const T = DB.threads.filter(t => t.roomId === r.id);
  const v = T.filter(t => t.confirmed).length,
    a = T.filter(t => t.mine || t.theirs).length,
    m = T.filter(t => t.mine && t.mine === t.theirs && t.mine !== 'notnow').length,
    res = T.filter(t => t.resolvedAt).length;
  return { T, v, a, m, res, rate: T.length ? Math.round((res / T.length) * 100) : 0 };
}
/* vRooms: earlier version removed in the v54 merge (the later declaration below always won) */
/* newRoomModal: earlier version removed in the v54 merge (the later declaration below always won) */
function newRoom(e) {
  e.preventDefault();
  const n = $('#rn').value.trim();
  const r = {
    id: uid(),
    ownerId: DB.session,
    name: n,
    date: new Date($('#rd').value).getTime(),
    location: $('#rl').value.trim(),
    code: (n.replace(/[^A-Za-z]/g, '').slice(0, 3) + Math.floor(10 + Math.random() * 89)).toUpperCase(),
    created: Date.now()
  };
  DB.rooms.push(r);
  save();
  closeModal();
  toast('Room created');
  go('#/app/room/' + r.id);
  return false;
}
function vRoom(id) {
  const r = DB.rooms.find(x => x.id === id);
  if (!r) return shell('rooms', '<div class="card empty">Room not found.</div>');
  const s = roomStats(r);
  const by = k => s.T.filter(t => t.mine === k || t.theirs === k).length;
  return shell(
    'rooms',
    `<a href="#/app/rooms" class="small muted" style="font-weight:800">&larr; Rooms</a><div class="ph" style="margin-top:14px"><div><div class="eyebrow">Resolution Report &middot; ${esc(r.code)}</div><h1>${esc(r.name)}</h1><p>${fmtDate(r.date)}${r.location ? ' &middot; ' + esc(r.location) : ''}</p></div><div class="row"><button class="btn secondary" data-on-click="exportRoom('${r.id}')">${ic('chart', 16)} Export CSV</button><button class="btn primary" data-on-click="simTap('${r.id}')">${ic('tap', 16)} Simulate a tap</button></div></div>
 <div class="grid g4">${[
   ['Threads', s.T.length],
   ['Verified by both', s.v],
   ['Mutual matches', s.m],
   ['Resolution rate', s.rate + '%']
 ]
   .map(([l, v]) => `<div class="metric"><div class="l">${l}</div><div class="v">${v}</div></div>`)
   .join('')}</div>
 <div class="grid" style="grid-template-columns:1fr 1.3fr;margin-top:20px"><div class="stack" style="gap:18px"><div class="card pad"><b>What people want next</b>${Object.entries(
   NEXT
 )
   .map(([k, v]) => {
     const n = by(k);
     return `<div class="row between small" style="margin:14px 0 6px"><span>${v.label}</span><b>${n}</b></div><div class="bar"><i style="width:${s.T.length ? (n / s.T.length) * 100 : 0}%"></i></div>`;
   })
   .join('')}</div>
 <div class="card pad center"><b>Room QR</b><p class="small muted">Put this on screens, badges and tables.</p><div class="qrbox" id="qrRoom" style="border:1px solid var(--line)"></div><div class="small" style="margin-top:8px;font-weight:800">introthread.com/r/${esc(r.code)}</div></div></div>
 <div class="card pad livefeed"><div class="row between"><b>Live Threads</b><span class="chip green">Live</span></div><div class="stack" style="gap:8px;margin-top:14px">${
   s.T.sort((a, b) => b.createdAt - a.createdAt)
     .map(
       t =>
         `<div class="tl" data-on-click="go('#/app/thread/${t.id}')" style="cursor:pointer">${av(t.other.name, 'sm')}<div class="meta"><b>${esc(t.other.name)}</b><span>${esc(t.other.role)}, ${esc(t.other.company)} &middot; ${ago(t.createdAt)}</span></div>${stateChip(t)}</div>`
     )
     .join('') || '<div class="empty">No taps yet.</div>'
 }</div></div></div>`
  );
}
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
function vPublic(h) {
  h = String(h || '').toLowerCase();
  const u = DB.users.find(x => String(x.handle || '').toLowerCase() === h);
  if (!u) return vNotFound(h);
  const L = u.links || {};
  return `<div class="pub"><div class="pubcard"><div class="center" style="margin-bottom:22px">${logo()}</div>${bizCard(u)}
 <div class="card pad-lg" style="margin-top:18px">${u.bio ? `<p style="margin:0 0 16px;line-height:1.6">${esc(u.bio)}</p>` : ''}<div class="stack" style="gap:8px">${L.linkedin ? `<a class="btn secondary block" href="https://${esc(L.linkedin.replace(/^https?:\/\//, ''))}" target="_blank" rel="noopener">${ic('link', 16)} LinkedIn</a>` : ''}${L.website ? `<a class="btn secondary block" href="https://${esc(L.website.replace(/^https?:\/\//, ''))}" target="_blank" rel="noopener">${ic('globe', 16)} Website</a>` : ''}${L.calendar ? `<a class="btn secondary block" href="https://${esc(L.calendar.replace(/^https?:\/\//, ''))}" target="_blank" rel="noopener">${ic('calendar', 16)} Book a meeting</a>` : ''}<button class="btn secondary block" data-on-click="vcard('${u.id}')">${ic('user', 16)} Save contact</button></div></div>
 <div class="card pad-lg" style="margin-top:18px;border:2px solid var(--brand)"><div class="eyebrow">Just met ${esc(u.name.split(' ')[0])}?</div><h3 style="margin:6px 0 4px;letter-spacing:-.5px">Start a Thread</h3><p class="small muted" style="margin:0 0 14px">You'll both get a shared record of where you met, and one question: what's next? No app needed.</p>
 <form data-on-submit="return guestThread(event,'${u.id}')" class="stack"><input id="gn" required placeholder="Your name"><input id="ge" type="email" required placeholder="Your email"><div class="grid g2"><input id="gr" placeholder="Your title"><input id="gc" placeholder="Company"></div><input id="gw" placeholder="Where did you meet?"><button class="btn primary block lg">${ic('thread', 16)} Start a Thread</button></form><p class="tiny muted center" style="margin:12px 0 0">${ic('lock', 11)} We only share your details with ${esc(u.name.split(' ')[0])}.</p></div>
 <p class="center small muted" style="margin-top:22px">Want your own card? <a href="#/signup" style="color:var(--brand);font-weight:800">Create one free</a></p></div></div>`;
}
function vcard(id) {
  const u = DB.users.find(x => x.id === id);
  const v = `BEGIN:VCARD\nVERSION:3.0\nFN:${u.name}\nTITLE:${u.role}\nORG:${u.company}\nEMAIL:${u.email}\nURL:${profileUrl(u)}\nEND:VCARD`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([v], { type: 'text/vcard' }));
  a.download = u.handle + '.vcf';
  a.click();
  toast('Contact saved');
}
function guestThread(e, oid) {
  e.preventDefault();
  const n = $('#gn').value.trim();
  const t = {
    id: uid(),
    ownerId: oid,
    other: {
      name: n,
      role: $('#gr').value.trim() || 'Professional',
      company: $('#gc').value.trim(),
      email: $('#ge').value.trim()
    },
    where: $('#gw').value.trim() || 'In person',
    note: '',
    createdAt: Date.now(),
    confirmed: true,
    mine: null,
    theirs: null,
    resolvedAt: null,
    roomId: null,
    guest: true,
    events: [
      { k: 'tap', at: Date.now(), text: n.split(' ')[0] + ' started a Thread from your card' },
      { k: 'confirm', at: Date.now(), text: 'Verified by both' }
    ]
  };
  DB.threads.push(t);
  save();
  go('#/t/' + t.id);
  return false;
}
function vGuest(id) {
  const t = findThread(id);
  if (!t)
    return `<div class="pub"><div class="pubcard card pad-lg center">${logo()}<h2>This Thread is no longer available</h2></div></div>`;
  const o = DB.users.find(u => u.id === t.ownerId) || { name: 'Your contact', role: '', company: '' };
  const f = o.name.split(' ')[0];
  let body;
  if (!t.confirmed)
    body = `<h2 style="letter-spacing:-.8px;margin:0 0 6px">Did you meet ${esc(o.name)}?</h2><p class="muted">${esc(f)} started a Thread after meeting you at <b>${esc(t.where)}</b>. Confirm it to keep a shared record and decide what happens next.</p><div class="row" style="margin-top:18px"><button class="btn primary" style="flex:1" data-on-click="guestConfirm('${t.id}')">${ic('check', 16)} Yes, confirm</button><button class="btn secondary" data-on-click="toast('Thanks. ${esc(f)} will not be notified.')">Not me</button></div>`;
  else if (!t.theirs)
    body = `<div class="eyebrow">Verified Thread &middot; ${esc(t.where)}</div><h2 style="letter-spacing:-.8px;margin:8px 0 6px">What's next with ${esc(f)}?</h2><p class="small muted">${ic('lock', 12)} Private until you both answer. A "Not now" is never shown.</p><div class="answer" style="margin-top:14px">${Object.entries(
      NEXT
    )
      .map(
        ([k, v]) =>
          `<button class="ans" data-on-click="guestAnswer('${t.id}','${k}')">${ic(v.icon, 20, '#3157ff')}<b>${v.label}</b><span>${v.desc}</span></button>`
      )
      .join('')}</div>`;
  else
    body = `<div class="center"><div style="width:60px;height:60px;border-radius:50%;background:#e8f8f0;display:grid;place-items:center;margin:auto">${ic('check', 28, '#12a065', 3)}</div><h2 style="letter-spacing:-.8px">Answer locked in</h2><p class="muted">${t.mine ? (t.mine === 'notnow' ? `${esc(f)} would like to stay in touch. You are connected on Introthread.` : t.theirs === 'notnow' ? `Thanks for answering. You and ${esc(f)} stay connected on Introthread.` : `You both answered. ${esc(f)} will follow up.`) : `We'll reveal both answers when ${esc(f)} replies.`}</p><a href="#/signup" class="btn primary">Get your own free card</a>${DB.session === t.ownerId ? `<div style="margin-top:14px"><a href="#/app/thread/${t.id}" class="btn ghost">Back to your view as ${esc(f)}</a></div>` : ''}</div>`;
  return `<div class="pub"><div class="pubcard"><div class="center" style="margin-bottom:22px">${logo()}</div><div class="card pad row" style="margin-bottom:14px">${av(o.name, 'lg')}<div><b style="font-size:17px">${esc(o.name)}</b><div class="small muted">${esc(o.role)}${o.company ? ', ' + esc(o.company) : ''}</div></div></div><div class="card pad-lg">${body}</div><p class="tiny muted center" style="margin-top:16px">Introthread &middot; Every handshake, followed through.</p></div></div>`;
}
function guestConfirm(id) {
  const t = findThread(id);
  t.confirmed = true;
  t.events.push({ k: 'confirm', at: Date.now(), text: t.other.name.split(' ')[0] + ' confirmed the Thread' });
  save();
  render();
}
function guestAnswer(id, k) {
  const t = findThread(id);
  t.theirs = k;
  t.events.push({
    k: 'answer',
    at: Date.now(),
    text: t.other.name.split(' ')[0] + ' answered "What\'s next?"'
  });
  save();
  render();
}

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
const CFG = window.INTROTHREAD_CONFIG || {};
const SB =
  window.supabase && CFG.supabaseUrl && CFG.supabaseAnonKey
    ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;
let MODE = DB.session ? 'demo' : null;
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
const mapProfile = (p, email) => ({
  _c: true,
  id: p.id,
  name: p.name,
  email: email || '',
  role: p.role || '',
  company: p.company || '',
  city: p.city || '',
  bio: p.bio || '',
  handle: p.handle,
  theme: p.theme || 'midnight',
  photo: (p.links || {}).photo || null,
  links: p.links || {},
  plan: p.plan || 'Free',
  prefs: p.prefs || {},
  created: Date.parse(p.created_at) || Date.now()
});
const mapThread = r => ({
  _c: true,
  id: r.id,
  token: r.guest_token,
  ownerId: r.owner_id,
  other: {
    name: r.other_name,
    role: r.other_role || '',
    company: r.other_company || '',
    email: r.other_email || ''
  },
  where: r.where_met || 'In person',
  note: r.note || '',
  createdAt: Date.parse(r.created_at),
  confirmed: !!r.confirmed,
  mine: r.mine,
  theirs: r.theirs,
  resolvedAt: r.resolved_at ? Date.parse(r.resolved_at) : null,
  roomId: r.room_id,
  events: (r.thread_events || [])
    .map(e => ({ k: e.kind, at: Date.parse(e.at), text: e.text }))
    .sort((a, b) => a.at - b.at)
});
const mapRoom = r => ({
  _c: true,
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  date: Date.parse(r.event_date),
  location: r.location || '',
  code: r.code,
  created: Date.parse(r.created_at)
});
function fail(e) {
  console.error(e);
  toast(e && e.message ? e.message : 'Something went wrong. Please try again.');
  return null;
}

async function loadCloud(user) {
  let { data: p, error } = await SB.rpc('my_profile');
  if (error || (p && !p.id)) {
    if (error && !/function|schema cache/i.test(error.message || '')) console.warn(error);
    ({ data: p, error } = await SB.from('profiles').select('*').eq('id', user.id).maybeSingle());
    if (error) return fail(error);
  }
  if (!p) {
    const m = (user.user_metadata || {}).profile;
    if (!m) {
      MODE = 'cloud';
      DB.session = user.id;
      PENDING = user;
      return 'needs-profile';
    }
    const ins = await SB.from('profiles')
      .insert({
        id: user.id,
        handle: m.handle,
        name: m.name,
        role: m.role,
        company: m.company,
        city: m.city,
        bio: m.bio,
        theme: m.theme
      })
      .select('id,handle,name,role,company,city,bio,theme,links,created_at')
      .single();
    if (ins.error) return fail(ins.error);
    p = ins.data;
  }
  const [th, rm] = await Promise.all([
    SB.from('threads').select('*, thread_events(*)').order('created_at', { ascending: false }),
    SB.from('rooms').select('*')
  ]);
  if (th.error) return fail(th.error);
  if (rm.error) return fail(rm.error);
  clearCloud();
  DB.users.push(mapProfile(p, user.email));
  DB.threads.push(...th.data.map(mapThread));
  DB.rooms.push(...rm.data.map(mapRoom));
  DB.session = user.id;
  MODE = 'cloud';
  return 'ok';
}
let PENDING = null;
async function addEvent(t, k, text) {
  const at = Date.now();
  t.events.push({ k, at, text });
  if (cloud()) {
    const { error } = await SB.from('thread_events').insert({ thread_id: t.id, kind: k, text });
    if (error) fail(error);
  }
}
async function upd(table, id, patch) {
  if (!cloud()) return true;
  const { error } = await SB.from(table).update(patch).eq('id', id);
  if (error) {
    fail(error);
    return false;
  }
  return true;
}

/* auth */
doLogin = function (e) {
  e.preventDefault();
  const em = $('#le').value.trim().toLowerCase(),
    pw = $('#lp').value;
  if (em === 'demo@introthread.com') {
    demoLogin();
    return false;
  }
  if (!SB) {
    $('#lerr').textContent = 'Accounts are not available right now. Try the demo account.';
    return false;
  }
  const b = e.target.querySelector('button:not([type="button"])');
  b.disabled = true;
  b.textContent = 'Logging in...';
  SB.auth.signInWithPassword({ email: em, password: pw }).then(async ({ data, error }) => {
    b.disabled = false;
    b.textContent = 'Log in';
    if (error) {
      $('#lerr').textContent = /confirm/i.test(error.message)
        ? 'Please confirm your email first. Check your inbox for the link.'
        : 'That email and password do not match.';
      return;
    }
    const r = await loadCloud(data.user);
    if (r === 'needs-profile') {
      go('#/signup');
      SU = { step: 2, name: '', email: em };
      render();
      return;
    }
    if (r) {
      save();
      toast('Welcome back, ' + me().name.split(' ')[0]);
      go('#/app');
    }
  });
  return false;
};
const _demoLogin = demoLogin;
demoLogin = async function () {
  if (SB && MODE === 'cloud') {
    await SB.auth.signOut();
    clearCloud();
  }
  MODE = 'demo';
  _demoLogin();
};
oauth = function (p) {
  toast(p + ' sign-in is coming soon. Please use email for now.');
};
logout = async function () {
  if (cloud()) await SB.auth.signOut();
  clearCloud();
  DB.session = null;
  MODE = null;
  save();
  toast('Logged out');
  go('#/');
};

const _su1 = su1;
su1 = function (e) {
  e.preventDefault();
  const em = $('#se').value.trim().toLowerCase();
  if (em === 'demo@introthread.com') {
    $('#serr').textContent = 'That email is reserved for the demo.';
    return false;
  }
  Object.assign(SU, { name: $('#sn').value.trim(), email: em, pwRaw: $('#sp').value, step: 2 });
  render();
  return false;
};
su2 = function (e) {
  e.preventDefault();
  const h = slug($('#sh').value);
  const next = () => {
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
  };
  const taken = () => {
    $('#shh').textContent = 'That link is taken. Try another.';
    $('#shh').style.color = 'var(--bad)';
  };
  if (DB.users.some(u => u.handle === h)) return (taken(), false);
  if (!SB) {
    next();
    return false;
  }
  SB.rpc('handle_available', { p_handle: h }).then(({ data, error }) => {
    if (error) return fail(error);
    data ? next() : taken();
  });
  return false;
};
su3 = async function () {
  const prof = {
    handle: SU.handle,
    name: SU.name,
    role: SU.role,
    company: SU.company,
    city: SU.city,
    bio: SU.bio,
    theme: SU.theme || 'midnight'
  }; /* the photo lives in links.photo; profiles has no photo column */
  if (!SB) {
    toast('Accounts are not available right now.');
    return;
  }
  if (PENDING) {
    const { error } = await SB.from('profiles').insert(
      Object.assign({ id: PENDING.id }, prof, SU.photo ? { links: { photo: SU.photo } } : {})
    );
    if (error) return fail(error);
    const u = PENDING;
    PENDING = null;
    await loadCloud(u);
    SU = { step: 1 };
    save();
    go('#/app');
    return;
  }
  const { data, error } = await SB.auth.signUp({
    email: SU.email,
    password: SU.pwRaw,
    options: { data: { profile: prof }, emailRedirectTo: 'https://www.introthread.com/' }
  });
  if (error) {
    SU.step = 1;
    render();
    setTimeout(() => {
      const el = $('#serr');
      if (el)
        el.textContent = /registered/i.test(error.message)
          ? 'An account with this email already exists. Log in instead.'
          : error.message;
    }, 0);
    return;
  }
  const email = SU.email,
    pwTmp = SU.pwRaw;
  SU = { step: 1 };
  if (data.session) {
    const r = await loadCloud(data.user);
    if (r) {
      save();
      go('#/app');
      modal(
        `<div class="center"><div style="width:64px;height:64px;border-radius:50%;background:#e8f8f0;display:grid;place-items:center;margin:auto">${ic('check', 30, '#12a065', 3)}</div><h2 style="letter-spacing:-.8px">Your card is live</h2><p class="muted">introthread.com/${esc(prof.handle)}</p><button class="btn primary" data-on-click="closeModal();go('#/app/tap')">Start sharing</button></div>`
      );
    }
  } else {
    OTP = {
      kind: 'signup',
      email,
      handle: prof.handle,
      sent: Date.now(),
      err: '',
      msg: 'We emailed you a verification code. Enter it below to finish creating your account.'
    };
    SU = { step: 'code' };
    render();
  }
};

/* thread actions */
answer = async function (id, k) {
  const t = findThread(id);
  if (!(await upd('threads', id, { mine: k }))) return;
  t.mine = k;
  if (k) await addEvent(t, 'answer', 'You answered "What\'s next?"');
  save();
  render();
  if (k) toast(t.theirs ? 'Answers revealed' : 'Answer locked in privately');
};
sendFollow = async function (id) {
  const t = findThread(id);
  await addEvent(t, 'followup', 'Follow-up sent to ' + t.other.name.split(' ')[0]);
  save();
  toast('Follow-up logged');
  render();
};
resolve = async function (id, how) {
  const t = findThread(id);
  const now = new Date();
  if (!(await upd('threads', id, { resolved_at: now.toISOString(), resolved_how: how }))) return;
  t.resolvedAt = now.getTime();
  await addEvent(t, 'resolved', 'Thread resolved: ' + how.toLowerCase());
  save();
  toast('Thread resolved');
  render();
};
saveNote = async function (id) {
  const v = $('#note').value;
  if (!(await upd('threads', id, { note: v }))) return;
  findThread(id).note = v;
  save();
  toast('Note saved');
};
delThread = async function (id) {
  if (!confirm('Delete your side of this Thread? This cannot be undone.')) return;
  if (cloud()) {
    const { error } = await SB.from('threads').delete().eq('id', id);
    if (error) return fail(error);
  }
  DB.threads = DB.threads.filter(t => t.id !== id);
  save();
  toast('Thread deleted');
  go('#/app/threads');
};
newThread = function (e) {
  e.preventDefault();
  const rid = $('#tw').value,
    room = DB.rooms.find(r => r.id === rid);
  const where = room ? room.name : $('#tw2').value.trim() || 'In person';
  const o = {
      name: $('#tn').value.trim(),
      role: $('#tr').value.trim() || 'Professional',
      company: $('#tc').value.trim(),
      email: $('#te').value.trim()
    },
    note = $('#tx').value.trim();
  if (!cloud()) {
    const t = {
      id: uid(),
      ownerId: DB.session,
      other: o,
      where,
      note,
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
    toast('Thread started');
    go('#/app/thread/' + t.id);
    return false;
  }
  SB.from('threads')
    .insert({
      owner_id: DB.session,
      other_name: o.name,
      other_role: o.role,
      other_company: o.company,
      other_email: o.email,
      where_met: where,
      note,
      room_id: room ? room.id : null
    })
    .select()
    .single()
    .then(async ({ data, error }) => {
      if (error) return fail(error);
      const t = mapThread(data);
      DB.threads.push(t);
      await addEvent(t, 'tap', 'Thread started at ' + where);
      copy(threadLink(t), 'Thread started. Confirm link copied, send it to ' + o.name.split(' ')[0]);
      go('#/app/thread/' + t.id);
    });
  return false;
};
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
newRoom = function (e) {
  e.preventDefault();
  const n = $('#rn').value.trim();
  const code = (
    n.replace(/[^A-Za-z]/g, '').slice(0, 3) + Math.floor(100 + Math.random() * 899)
  ).toUpperCase();
  const date = $('#rd').value,
    loc = $('#rl').value.trim();
  if (!cloud()) {
    const r = {
      id: uid(),
      ownerId: DB.session,
      name: n,
      date: new Date(date).getTime(),
      location: loc,
      code,
      created: Date.now()
    };
    DB.rooms.push(r);
    save();
    closeModal();
    toast('Room created');
    go('#/app/room/' + r.id);
    return false;
  }
  SB.from('rooms')
    .insert({ owner_id: DB.session, name: n, event_date: date, location: loc, code })
    .select()
    .single()
    .then(({ data, error }) => {
      if (error) return fail(error);
      const r = mapRoom(data);
      DB.rooms.push(r);
      closeModal();
      toast('Room created');
      go('#/app/room/' + r.id);
    });
  return false;
};
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
const PUB = {},
  GUEST = {};
const _vPublic = vPublic;
vPublic = function (h) {
  h = String(h).toLowerCase();
  if (DB.users.some(u => u.handle === h) || !SB || PUB[h] === null) return _vPublic(h);
  if (!PUB[h]) {
    SB.from('profiles')
      .select('id,handle,name,role,company,city,bio,theme,links')
      .eq('handle', h)
      .maybeSingle()
      .then(({ data }) => {
        PUB[h] = data ? mapProfile(data, '') : null;
        if (data) DB.users.push(PUB[h]);
        render();
      });
    return `<div class="pub"><div class="pubcard center"><div style="margin:60px 0">${logo()}</div><p class="muted">Loading card...</p></div></div>`;
  }
  return _vPublic(h);
};
vcard = function (id) {
  const u = DB.users.find(x => x.id === id);
  const v = `BEGIN:VCARD\nVERSION:3.0\nFN:${u.name}\nTITLE:${u.role}\nORG:${u.company}\n${u.email ? 'EMAIL:' + u.email + '\n' : ''}URL:${profileUrl(u)}\nEND:VCARD`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([v], { type: 'text/vcard' }));
  a.download = u.handle + '.vcf';
  a.click();
  toast('Contact saved');
};
const _guestThread = guestThread;
guestThread = function (e, oid) {
  const owner = DB.users.find(u => u.id === oid);
  if (!owner || !owner._c || !SB) return _guestThread(e, oid);
  e.preventDefault();
  const b = e.target.querySelector('button');
  b.disabled = true;
  SB.rpc('start_thread_from_card', {
    p_handle: owner.handle,
    p_name: $('#gn').value.trim(),
    p_email: $('#ge').value.trim(),
    p_role: $('#gr').value.trim(),
    p_company: $('#gc').value.trim(),
    p_where: $('#gw').value.trim()
  }).then(({ data, error }) => {
    b.disabled = false;
    if (error) return fail(error);
    delete GUEST[data];
    go('#/t/' + data);
  });
  return false;
};
const _vGuest = vGuest;
vGuest = function (tok) {
  if (findThread(tok) && !findThread(tok)._c) return _vGuest(tok);
  if (!SB) return _vGuest(tok);
  const g = GUEST[tok];
  if (g === undefined) {
    SB.rpc('get_guest_thread', { p_token: tok }).then(({ data }) => {
      GUEST[tok] = data || null;
      render();
    });
    return `<div class="pub"><div class="pubcard center"><div style="margin:60px 0">${logo()}</div><p class="muted">Loading Thread...</p></div></div>`;
  }
  if (!g)
    return `<div class="pub"><div class="pubcard card pad-lg center">${logo()}<h2>This Thread is no longer available</h2></div></div>`;
  const o = g.owner,
    f = o.name.split(' ')[0];
  let body;
  if (!g.confirmed)
    body = `<h2 style="letter-spacing:-.8px;margin:0 0 6px">Did you meet ${esc(o.name)}?</h2><p class="muted">${esc(f)} started a Thread after meeting you at <b>${esc(g.where_met)}</b>. Confirm it to keep a shared record and decide what happens next.</p><div class="row" style="margin-top:18px"><button class="btn primary" style="flex:1" data-on-click="guestConfirm('${esc(tok)}')">${ic('check', 16)} Yes, confirm</button><button class="btn secondary" data-on-click="toast('Thanks. ${esc(f)} will not be notified.')">Not me</button></div>`;
  else if (!g.theirs)
    body = `<div class="eyebrow">Verified Thread &middot; ${esc(g.where_met)}</div><h2 style="letter-spacing:-.8px;margin:8px 0 6px">What's next with ${esc(f)}?</h2><p class="small muted">${ic('lock', 12)} Private until you both answer. A "Not now" is never shown.</p><div class="answer" style="margin-top:14px">${Object.entries(
      NEXT
    )
      .map(
        ([k, v]) =>
          `<button class="ans" data-on-click="guestAnswer('${esc(tok)}','${k}')">${ic(v.icon, 20, '#3157ff')}<b>${v.label}</b><span>${v.desc}</span></button>`
      )
      .join('')}</div>`;
  else {
    const oa = g.owner_answer,
      match = oa && oa === g.theirs && oa !== 'notnow';
    body = `<div class="center"><div style="width:60px;height:60px;border-radius:50%;background:#e8f8f0;display:grid;place-items:center;margin:auto">${ic('check', 28, '#12a065', 3)}</div><h2 style="letter-spacing:-.8px">${match ? `It's a match: you both chose ${NEXT[oa].label.toLowerCase()}` : 'Answer locked in'}</h2><p class="muted">${oa ? (match ? `${esc(f)} will follow up soon.` : oa === 'notnow' ? `${esc(f)} would like to stay in touch. You are connected on Introthread.` : `${esc(f)} chose ${((NEXT[oa] || {}).label || '').toLowerCase()}.`) : `We'll reveal both answers when ${esc(f)} replies.`}</p><a href="#/signup" class="btn primary">Get your own free card</a></div>`;
  }
  return `<div class="pub"><div class="pubcard"><div class="center" style="margin-bottom:22px">${logo()}</div><div class="card pad row" style="margin-bottom:14px">${av(o.name, 'lg')}<div><b style="font-size:17px">${esc(o.name)}</b><div class="small muted">${esc(o.role || '')}${o.company ? ', ' + esc(o.company) : ''}</div></div></div><div class="card pad-lg">${body}</div><p class="tiny muted center" style="margin-top:16px">Introthread &middot; Every handshake, followed through.</p></div></div>`;
};
const _gc = guestConfirm;
guestConfirm = function (tok) {
  if (findThread(tok) && !findThread(tok)._c) return _gc(tok);
  SB.rpc('guest_confirm', { p_token: tok }).then(({ error }) => {
    if (error) return fail(error);
    delete GUEST[tok];
    refreshOwned(tok);
    render();
  });
};
const _ga = guestAnswer;
guestAnswer = function (tok, k) {
  if (findThread(tok) && !findThread(tok)._c) return _ga(tok, k);
  SB.rpc('guest_answer', { p_token: tok, p_answer: k }).then(({ error }) => {
    if (error) return fail(error);
    delete GUEST[tok];
    refreshOwned(tok);
    render();
  });
};
async function refreshOwned(tok) {
  if (!cloud()) return;
  const t = DB.threads.find(x => x.token === tok && x._c);
  if (!t) return;
  const { data } = await SB.from('threads').select('*, thread_events(*)').eq('id', t.id).maybeSingle();
  if (data) {
    Object.assign(t, mapThread(data));
  }
}
function vRoomCode(code) {
  return `<div class="pub"><div class="pubcard"><div class="center" style="margin-bottom:22px">${logo()}</div><div class="card pad-lg center"><span class="chip blue">Room ${esc(String(code || '').toUpperCase())}</span><h2 style="letter-spacing:-.8px">You're in the Room</h2><p class="muted">Tap or scan the card of anyone you meet here to start a Thread. Every Thread is tagged to this event.</p><a href="#/signup" class="btn primary">Get your free card</a></div></div></div>`;
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
const feat3 = a =>
  `<div class="x-f3">${a.map(([ic, t, s]) => `<div class="x-f3-i"><span class="x-f3-ic">${sv(ic, 21)}</span><h3>${t}</h3><p>${s}</p></div>`).join('')}</div>`;
const secHead = (eye, h, p) =>
  `<div class="x-head2"><div><div class="x-eye">${eye}</div><h2 class="x-h2">${h}</h2></div>${p ? `<p class="x-sub">${p}</p>` : '<span></span>'}</div>`;

const PAGE_META = {
  '/': [
    'Introthread | Every handshake, followed through',
    'Create your professional card, share it by tap, QR or link, and turn every introduction into a shared Thread with one clear next step. Built for professionals everywhere.'
  ],
  '/how': [
    'How it works | Introthread',
    "Tap or scan, confirm a shared Thread, answer one private question: What's next? See how Introthread turns introductions into follow-through."
  ],
  '/rooms': [
    'Thread Rooms for events and communities | Introthread',
    'Measure what your event created: verified connections, meetings booked and introductions made, live and for 30 days after.'
  ],
  '/networks': [
    'Warmth for teams and networks | Introthread',
    'Consented, verified relationship strength for VC platform teams, accelerators and professional communities. Warm intros that are actually warm.'
  ],
  '/pricing': [
    'Pricing | Introthread',
    'Start free with your card, link, QR and unlimited Threads. Pro for people who follow through, Rooms from $166 per event, custom plans for networks.'
  ],
  '/about': [
    'About | Introthread',
    'Introthread records the moment two people meet and agree on what happens next. Our story, and how to get in touch.'
  ],
  '/privacy': [
    'Trust and privacy | Introthread',
    'Two-sided consent, private answers and opt-in network visibility. Designed for UK GDPR, the DPA 2018 and US state privacy laws.'
  ],
  '/terms': [
    'Terms of Service | Introthread',
    'The terms for using Introthread: your account, your content, acceptable use, plans and payments, and your rights.'
  ],
  '/login': ['Log in | Introthread', 'Log in to Introthread and pick up every Thread where you left it.'],
  '/signup': [
    'Create your free card | Introthread',
    'Create your free Introthread card in 60 seconds. No card required.'
  ]
};
function setMeta() {
  const p = '/' + (location.pathname.split('/').filter(Boolean)[0] || '');
  const m = PAGE_META[p];
  if (!m) return;
  document.title = m[0];
  const set = (sel, attr, val) => {
    const e = document.head.querySelector(sel);
    if (e) e.setAttribute(attr, val);
  };
  set('meta[name="description"]', 'content', m[1]);
  set('link[rel="canonical"]', 'href', 'https://www.introthread.com' + (p === '/' ? '/' : p));
  set('meta[property="og:title"]', 'content', m[0]);
  set('meta[property="og:description"]', 'content', m[1]);
  set('meta[property="og:url"]', 'content', 'https://www.introthread.com' + (p === '/' ? '/' : p));
}

/* profile photo */
function upBox() {
  const has = !!SU.photo;
  return `<label class="x-up-in">${has ? `<img src="${SU.photo}" alt="">` : `<span class="x-up-ph">${sv('user', 26)}</span>`}<span class="x-up-t"><b>${has ? 'Change photo' : 'Upload a photo'}</b><small>JPG, PNG or WebP (max 5MB)</small></span><input type="file" accept="image/jpeg,image/png,image/webp" data-on-change="pickPhoto(this)"></label>${has ? `<button type="button" class="x-up-rm" data-on-click="suPhotoClear()">Remove</button>` : ''}`;
}
function shrinkImg(file) {
  return new Promise((res, rej) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return rej('Please choose a JPG, PNG or WebP image.');
    if (file.size > 5 * 1024 * 1024) return rej('That image is over 5MB. Please choose a smaller one.');
    const r = new FileReader();
    r.onerror = () => rej('Could not read that file.');
    r.onload = () => {
      const im = new Image();
      im.onerror = () => rej('Could not read that image.');
      im.onload = () => {
        const s = Math.min(im.width, im.height),
          S = 320,
          c = document.createElement('canvas');
        c.width = c.height = S;
        const x = c.getContext('2d');
        x.imageSmoothingQuality = 'high';
        x.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, S, S);
        let q = 0.85,
          d = c.toDataURL('image/jpeg', q);
        while (d.length > 70000 && q > 0.5) {
          q -= 0.1;
          d = c.toDataURL('image/jpeg', q);
        }
        res(d);
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  });
}
async function pickPhoto(inp, live) {
  const f = inp.files && inp.files[0];
  if (!f) return;
  try {
    const d = await shrinkImg(f);
    if (live) {
      const u = me();
      const links = Object.assign({}, u.links || {}, { photo: d });
      if (await upd('profiles', u.id, { links })) {
        u.links = links;
        u.photo = d;
        save();
        toast('Photo updated');
        window._keepScroll = true;
        render();
      }
    } else {
      SU.photo = d;
      $('#xup').innerHTML = upBox();
      liveP();
    }
  } catch (e) {
    toast(typeof e === 'string' ? e : 'Could not use that image.');
  }
}
async function removePhoto() {
  const u = me();
  const links = Object.assign({}, u.links || {});
  delete links.photo;
  if (await upd('profiles', u.id, { links })) {
    u.links = links;
    u.photo = null;
    save();
    toast('Photo removed');
    window._keepScroll = true;
    render();
  }
}
function photoRow(u) {
  return `<div class="x-prow">${avatarC(u, 64)}<div><b>Profile photo</b><small>Shown on your card and public profile.</small><div class="x-prow-b"><label class="x-btn sm ghost">${u.photo ? 'Change photo' : 'Upload photo'}<input type="file" hidden accept="image/jpeg,image/png,image/webp" data-on-change="pickPhoto(this,1)"></label>${u.photo ? '<button type="button" class="x-btn sm ghost" data-on-click="removePhoto()">Remove</button>' : ''}</div></div></div>`;
}
let _phBusy = false;
async function applyPhoto() {
  const ph = localStorage.getItem('it_photo');
  const u = me();
  if (!ph || !u || _phBusy || typeof cloud !== 'function' || !cloud()) return;
  if (u.photo === ph) {
    localStorage.removeItem('it_photo');
    return;
  }
  _phBusy = true;
  const links = Object.assign({}, u.links || {}, { photo: ph });
  if (await upd('profiles', u.id, { links })) {
    u.links = links;
    u.photo = ph;
    save();
    localStorage.removeItem('it_photo');
    render();
  }
  _phBusy = false;
}
const _su3x = su3;
su3 = async function () {
  try {
    if (SU.photo) localStorage.setItem('it_photo', SU.photo);
  } catch (e) {}
  return _su3x.apply(this, arguments);
};

/* legal + not found */
const POLICY = [
  [
    'who',
    'Who we are',
    '<p>Introthread (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides digital professional cards and shared Threads that record when two people meet. We are the controller of the personal data described here. Contact us at <a href="mailto:privacy@introthread.com">privacy@introthread.com</a>.</p>'
  ],
  [
    'data',
    'Data we collect',
    '<ul><li><b>Account data:</b> name, email address and password (stored as a secure hash by our authentication provider).</li><li><b>Card data:</b> job title, company, city, bio, links, profile photo and card style you choose to add.</li><li><b>Thread data:</b> who you met, when and where, your private notes and your answer to What&rsquo;s next?.</li><li><b>Details of people you meet or import:</b> when you add someone (typed, scanned from a QR code or business card, pasted, picked from your phone contacts or imported from a LinkedIn, Google or Outlook file), we store the name, email, phone, LinkedIn, job title, company and other details you choose to keep. Importing never contacts anyone.</li><li><b>Billing data:</b> if you buy a paid plan, your plan, payment status and invoices. Card details are handled by our payment provider and never reach us.</li><li><b>Time and location of a Thread:</b> when you save a Thread, the exact time and, if you allow it, your phone&rsquo;s location. See &ldquo;Location when you save a Thread&rdquo; below.</li><li><b>Technical data:</b> basic device and log information needed to keep the service secure.</li></ul>'
  ],
  [
    'location',
    'Location when you save a Thread',
    '<p>When you save a new Thread, we record the exact time you saved it. If you allow it, we also record your phone&rsquo;s location at that moment: the coordinates, how accurate they are (for example &ldquo;about 12 m&rdquo;) and a place name, so you can remember where you met.</p><ul><li><b>Your permission:</b> your phone asks before sharing your location. If you say no, the Thread is still saved, with the time only.</li><li><b>Only your own location:</b> we record the location of your phone, never the location of the person you met.</li><li><b>Place name:</b> to turn the coordinates into a place name, we send them to OpenStreetMap&rsquo;s Nominatim service. We send only the coordinates, not your name or any details about the person you met.</li><li><b>Who can see it:</b> the time and location are shown only to you, on your Thread, and are included when you export your data.</li><li><b>Turn it off:</b> you can stop recording location at any time in Settings, under &ldquo;Your data and privacy&rdquo;, with the &ldquo;Save where I meet people&rdquo; switch. You can also remove location permission in your phone or browser settings.</li></ul><p>We use this data to provide the feature you chose to use (contract), and the location part only with your permission, which you can withdraw at any time. It is kept and deleted with the Thread it belongs to.</p>'
  ],
  [
    'scan',
    'Business card and QR scanning',
    '<p>When you scan a business card, the text is read on your own phone or computer. The photo is not uploaded to us; only the details you choose to save are stored with your Thread or contact.</p>'
  ],
  [
    'ai',
    'AI follow-up drafts',
    '<p>If you switch on &ldquo;Draft follow-ups with AI&rdquo;, we send the context of that one Thread (names, where you met, your note and your answers) to our AI provider to write a suggested message. Drafts are never sent without you. Our AI provider processes this data only to create the draft, under a data processing agreement, and may not use it to train its models. You can switch this off at any time in Settings.</p>'
  ],
  [
    'use',
    'How and why we use it',
    '<p>We use your data to provide the service you asked for (contract), to keep it secure and improve it (legitimate interests), and to send service messages such as sign-in codes, Thread invitations to the person you met, and follow-up reminders you have switched on. When you start a Thread with someone, we email them once so they can confirm it; they can ignore it and nothing more is sent. We do not sell your personal data and we do not use it for third-party advertising.</p>'
  ],
  [
    'sharing',
    'Who can see what',
    '<p>Your public card is visible to anyone with your link. A Thread is only created when both people confirm it. Your answer to What&rsquo;s next? stays hidden until both people reply, and your private notes are never shown to anyone else. Event organisers and networks only see aggregate results, and only where you opted in.</p>'
  ],
  [
    'processors',
    'Service providers and transfers',
    '<p>We use trusted providers to run Introthread, including hosting (Vercel), database and authentication (Supabase), email delivery (Resend), payments (Paystack), AI follow-up drafts when you switch them on, sign-in with Google, Microsoft or LinkedIn when you choose it, fonts (Google Fonts) and place names for saved locations (OpenStreetMap Nominatim, which receives only coordinates). Where data is transferred outside the UK or EEA, we rely on appropriate safeguards such as the UK International Data Transfer Addendum or Standard Contractual Clauses.</p>'
  ],
  [
    'retention',
    'How long we keep it',
    '<p>We keep your data while your account is active. If you delete your account, we delete your card and your side of every Thread within 30 days, except where we must keep limited records by law.</p>'
  ],
  [
    'rights',
    'Your rights',
    '<p>Under UK GDPR and applicable US state laws you can access, correct, export or delete your data, object to or restrict certain processing, and withdraw consent at any time. You can export or delete your data in Settings, or email <a href="mailto:privacy@introthread.com">privacy@introthread.com</a>. You may also complain to the UK Information Commissioner&rsquo;s Office (ico.org.uk).</p>'
  ],
  [
    'cookies',
    'Cookies and storage',
    '<p>We only use storage that is strictly necessary to keep you signed in and remember your preferences. We do not use advertising cookies. If we add product analytics to understand how the service is used, we will ask for your consent first where the law requires it and update this policy.</p>'
  ],
  [
    'security',
    'Security',
    '<p>Data is encrypted in transit, access is protected by row-level security so you can only read and change your own records, and passwords are never stored in plain text.</p>'
  ],
  [
    'changes',
    'Changes to this policy',
    '<p>If we make material changes we will tell you by email or in the app before they take effect.</p>'
  ]
];
const TERMS = [
  [
    'accept',
    'Using Introthread',
    '<p>By creating an account or using Introthread you agree to these terms. If you use Introthread for an organisation, you confirm you can accept them on its behalf.</p>'
  ],
  [
    'account',
    'Your account',
    '<p>You must be at least 16, give accurate information and keep your password secure. You are responsible for activity on your account.</p>'
  ],
  [
    'content',
    'Your content',
    '<p>You own the content you add. You give us permission to host and display it so we can run the service, for example showing your card to people you share it with.</p>'
  ],
  [
    'use',
    'Acceptable use',
    '<ul><li>Do not impersonate others or create Threads with people you have not met.</li><li>Do not send spam, scrape the service or try to access other people&rsquo;s data.</li><li>Do not upload unlawful, misleading or infringing content.</li></ul>'
  ],
  [
    'plans',
    'Plans and payments',
    '<p>The Free plan is free. Paid plans are billed in advance, monthly or annually, and renew until cancelled. You can cancel at any time and keep access until the end of the paid period. Prices exclude VAT and sales tax where applicable. UK consumers have a 14-day right to cancel a new subscription.</p>'
  ],
  [
    'availability',
    'Availability and changes',
    '<p>We work to keep Introthread available and secure but cannot promise it will be uninterrupted. We may improve or change features, and will give notice of material changes.</p>'
  ],
  [
    'ending',
    'Ending your account',
    '<p>You can delete your account at any time in Settings. We may suspend accounts that break these terms.</p>'
  ],
  [
    'liability',
    'Liability',
    '<p>Nothing in these terms limits liability that cannot be limited by law. Otherwise, to the extent permitted by law, we are not liable for indirect or consequential losses, and our total liability is limited to the amount you paid us in the 12 months before the claim.</p>'
  ],
  [
    'law',
    'Governing law',
    '<p>These terms are governed by the laws of England and Wales. If you live elsewhere, you keep any mandatory protections of your local law.</p>'
  ],
  [
    'contact',
    'Contact',
    '<p>Questions about these terms: <a href="mailto:hello@introthread.com">hello@introthread.com</a>.</p>'
  ]
];

/* ===== v5 Tap to Thread ===== */
let TAPM = 'q';
function tapWhereSet(id, label) {
  $('#tw').value = id || '';
  $('#tw2').value = label || '';
  const b = $('#twb span');
  if (b) {
    b.textContent = label || 'Select a location';
    b.parentNode.classList.toggle('set', !!label);
  }
  const d = $('#twd');
  if (d) d.removeAttribute('open');
}
function tapWhereCustom() {
  const v = ($('#twc').value || '').trim();
  if (v) tapWhereSet('', v);
}
function tapMode(m) {
  TAPM = m;
  document.querySelectorAll('.t-seg button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  const f = $('#tfull');
  if (f) f.hidden = m !== 'f';
}
function tapQR() {
  const u = me();
  modal(
    `<div class="center" style="padding:6px"><div class="x-eye" style="margin-bottom:6px">Scan to connect</div><h2 style="margin:0 0 4px;font-size:24px">${esc(u.name)}</h2><p class="muted" style="margin:0 0 18px">introthread.com/${esc(u.handle)}</p><div class="t-qrbig"><div id="qrBig"></div><span class="t-qrlogo"><span class="x-lm"><i></i><i></i></span></span></div><button class="x-btn block" style="margin-top:20px" data-on-click="closeModal()">Done</button></div>`
  );
  setTimeout(() => qr($('#qrBig'), profileUrl(u), 300), 20);
}
async function tapNFC() {
  const u = me();
  if ('NDEFReader' in window) {
    try {
      toast('Hold an NFC card or sticker to the back of your phone...');
      const w = new NDEFReader();
      await w.write({ records: [{ recordType: 'url', data: profileUrl(u) }] });
      toast('NFC card linked to introthread.com/' + u.handle);
    } catch (e) {
      toast('NFC write was cancelled or failed. Try again.');
    }
  } else
    toast(
      'Writing NFC cards works in Chrome on Android. On iPhone and desktop, use the QR code or your link.'
    );
}
function tapMore() {
  const u = me();
  modal(
    `<div><h2 style="margin:0 0 14px;font-size:20px">More options</h2><div class="t-more"><button data-on-click="closeModal();tapQR()">${sv('qr', 18)} Show full-screen QR code</button><button data-on-click="tapDownloadQR()">${sv('arrow', 18)} Download QR code (PNG)</button><a href="/${esc(u.handle)}" data-on-click="closeModal()">${sv('globe', 18)} View public profile</a><a href="/app/card" data-on-click="closeModal()">${sv('user', 18)} Edit my card</a></div></div>`
  );
}
function tapDownloadQR() {
  const u = me();
  const d = document.createElement('div');
  qr(d, profileUrl(u), 600);
  const img = d.querySelector('img');
  if (!img) return toast('QR code is not available right now.');
  const a = document.createElement('a');
  a.href = img.src;
  a.download = 'introthread-' + u.handle + '-qr.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast('QR code downloaded');
}
function tapVcf(o) {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:' + o.name,
    o.role ? 'TITLE:' + o.role : '',
    o.company ? 'ORG:' + o.company : '',
    /@/.test(o.email) ? 'EMAIL:' + o.email : o.email ? 'TEL:' + o.email : '',
    'NOTE:Met via Introthread' + (o.where ? ' at ' + o.where : ''),
    'END:VCARD'
  ]
    .filter(Boolean)
    .join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines], { type: 'text/vcard' }));
  a.download = (o.name || 'contact').replace(/\s+/g, '-') + '.vcf';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
function tapNoteCount() {
  const n = $('#tx');
  if (n && $('#txc')) $('#txc').textContent = n.value.length;
}
function vTap() {
  const u = me();
  const rooms = cloud() ? DB.rooms.slice().sort((a, b) => b.date - a.date) : myRooms();
  const t = THEMES[u.theme] || THEMES.midnight;
  return shell(
    'tap',
    `<div class="t-head"><div><div class="t-eye">Tap to Thread</div><h1 class="t-h1">Share your card, start a Thread</h1><p class="t-sub">Connect instantly. Share your card via NFC, QR code or link. The other person needs no app.</p></div><a href="/how" class="t-how"><span class="x-play">${sv('play', 10)}</span>How it works</a></div>
<div class="t-grid">
<div class="t-card ${t.light ? 'lt' : ''}" style="background:${t.bg};color:${t.fg};--sub:${t.sub}">
 <div class="t-card-top"><span class="x-logo ${t.light ? '' : 'dk'}" style="font-size:20px"><span class="x-lm"><i></i><i></i></span><span>intro<b>thread</b></span></span>${sv('nfc', 24)}</div>
 <div class="t-card-id">${avatarC(u, 104)}<b>${esc(u.name)}</b>${u.role ? `<small>${esc(u.role)}</small>` : ''}${u.company ? `<small class="t-co">${esc(u.company)}</small>` : ''}</div>
 <div class="t-qr"><div id="qrTap"></div><span class="t-qrlogo"><span class="x-lm"><i></i><i></i></span></span></div>
 <div class="t-url">introthread.com/${esc(u.handle)}</div>${tapTags(u)}
 <div class="t-acts"><button type="button" data-on-click="copy('${profileUrl(u)}','Link copied')">${sv('link', 16)} Copy link</button><button type="button" data-on-click="shareNative()">${sv('send', 16)} Share</button><button type="button" data-on-click="toast('Apple and Google Wallet passes are coming soon.')">${sv('wallet', 16)} Add to Wallet</button><button type="button" aria-label="More options" data-on-click="tapMore()">&bull;&bull;&bull;</button></div>
</div>
<form class="t-form" data-on-submit="return newThread(event)" autocomplete="off">
 <div class="t-form-h"><div><h2>Add a new connection</h2><p>Create a Thread in seconds. We&rsquo;ll send them a link to confirm.</p></div><div class="x-seg t-seg"><button type="button" data-m="q" class="${TAPM === 'q' ? 'on' : ''}" data-on-click="tapMode('q')">Quick add</button><button type="button" data-m="f" class="${TAPM === 'f' ? 'on' : ''}" data-on-click="tapMode('f')">Full details</button></div></div>
 <div class="t-g2">
  <label class="x-f"><span>Name <i>*</i></span><input id="tn" required placeholder="Their name" autocomplete="off"></label>
  <label class="x-f"><span>Email or phone <i>*</i></span><input id="te" required autocomplete="off" placeholder="name@company.com or +44 7XXX XXX"></label>
  <label class="x-f"><span>Role <em>(optional)</em></span><input id="tr" placeholder="e.g. Founder, Investor, Designer"></label>
  <label class="x-f"><span>Company <em>(optional)</em></span><input id="tc" placeholder="e.g. Acme Technologies"></label>
  <div class="x-f"><span>Where did you meet?</span><input type="hidden" id="tw"><input type="hidden" id="tw2">
   <details class="t-where" id="twd"><summary id="twb">${sv('pin', 18)}<span>Select a location</span>${sv('chev', 16)}</summary><div class="t-where-m">
    ${rooms.length ? `<small>Your Rooms</small>${rooms.map(r => `<button type="button" data-on-click="tapWhereSet('${r.id}','${esc(r.name).replace(/'/g, '&#39;')}')">${sv('users', 15)}${esc(r.name)}</button>`).join('')}` : ''}
    <small>Quick picks</small>${['Conference', 'Coffee meeting', 'Client meeting', 'Networking event', 'Office'].map(p => `<button type="button" data-on-click="tapWhereSet('','${p}')">${sv('pin', 15)}${p}</button>`).join('')}
    <div class="t-where-c"><input id="twc" placeholder="Somewhere else..." data-on-keydown="tapWhereKey(event)"><button type="button" data-on-click="tapWhereCustom()">Use</button></div></div></details></div>
  <label class="x-f"><span>Add a note <em>(optional)</em></span><div class="t-note"><textarea id="tx" maxlength="200" rows="3" placeholder="What did you talk about?" data-on-input="tapNoteCount()"></textarea><small><b id="txc">0</b>/200</small></div></label>
 </div>
${topicsField(TSEL)}
 <div class="t-g2" id="tfull" ${TAPM === 'f' ? '' : 'hidden'}><label class="x-f"><span>LinkedIn <em>(optional)</em></span><input id="tli" placeholder="linkedin.com/in/..."></label><label class="x-f"><span>Follow up in</span><select id="tfu"><option value="">No reminder</option><option>2 days</option><option selected>3 days</option><option>1 week</option><option>2 weeks</option></select></label></div>
 <div class="t-opts"><label class="t-tog"><input type="checkbox" id="tsave" checked><span class="t-sw"></span><span><b>Save to my contacts</b><small>Keep their details for easier follow up.</small></span></label><div class="t-priv">${sv('lock', 18)}<span><b>This information is private</b><small>It will only be shared after they confirm.</small></span></div></div>
 <button class="t-start">${sv('link', 20)} Start Thread ${sv('arrow', 18)}</button>
</form></div>
<div class="t-ways">
 <button type="button" class="t-way o" data-on-click="tapNFC()"><span class="t-way-ic">${sv('nfc', 24)}</span><span><b>Tap with an NFC card</b><small>Hold your NFC card or phone close to theirs to start a Thread.</small></span>${sv('chev', 18)}</button>
 <button type="button" class="t-way b" data-on-click="tapQR()"><span class="t-way-ic">${sv('qr', 24)}</span><span><b>Scan QR code</b><small>Let them scan your code to open your Introthread card.</small></span>${sv('chev', 18)}</button>
 <button type="button" class="t-way g" data-on-click="shareNative()"><span class="t-way-ic">${sv('send', 22)}</span><span><b>Share your link</b><small>Send your link via any channel: email, SMS, WhatsApp or social media.</small></span>${sv('chev', 18)}</button><button type="button" class="t-way g" data-on-click="capCard()"><span class="t-way-ic">${sv('photo', 22)}</span><span><b>Scan a paper card</b><small>Take a photo of their business card. Introthread reads it on your phone and fills in the details.</small></span>${sv('chev', 18)}</button><button type="button" class="t-way g" data-on-click="waCard()"><span class="t-way-ic">${sv('send', 22)}</span><span><b>Send on WhatsApp</b><small>Open WhatsApp with your card link ready to send.</small></span>${sv('chev', 18)}</button>
</div>
<div class="t-tip"><span class="t-tip-ic">${sv('spark', 20)}</span><span><b>Pro tip: Add context after the event</b><small>Take quick notes while it&rsquo;s fresh. You can always update the Thread later with more details and next steps.</small></span><a href="/how">Learn more ${sv('chev', 15)}</a></div>
${tapInsights()}`
  );
}

/* ===== v6 Tap to Thread: card tags, recent activity, sharing analytics ===== */
function tapTags(u) {
  const c = ['b', 'v', 'g'];
  const t = (u.tags || []).filter(Boolean).slice(0, 3);
  return t.length
    ? `<div class="t-tags">${t.map((x, k) => `<span class="${c[k]}">${esc(x)}</span>`).join('')}</div>`
    : '';
}
function tapInsights() {
  const T = myThreads()
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);
  const D = 864e5,
    now = Date.now();
  const m30 = T.filter(t => now - t.createdAt < 30 * D),
    conf = m30.filter(t => t.confirmed).length,
    both = m30.filter(t => t.mine && t.theirs).length,
    rate = m30.length ? Math.round((conf / m30.length) * 100) : 0;
  const days = [...Array(7)].map((_, k) => {
    const s = new Date();
    s.setHours(0, 0, 0, 0);
    s.setDate(s.getDate() - (6 - k));
    const e = s.getTime() + D;
    return {
      l: s.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2),
      n: T.filter(t => t.createdAt >= s.getTime() && t.createdAt < e).length
    };
  });
  const mx = Math.max(1, ...days.map(d => d.n));
  const wk = days.reduce((a, d) => a + d.n, 0);
  const act = T.slice(0, 5)
    .map(
      t =>
        `<button type="button" class="t-act" data-on-click="go('/app/thread/${t.id}')">${av(t.other.name, 'sm')}<span class="t-act-m"><b>${esc(t.other.name)}</b><small>${esc([t.other.role, t.other.company].filter(Boolean).join(', ') || 'New connection')} &middot; ${esc(t.where || 'In person')}</small></span><span class="t-act-r">${stateChip(t)}<small>${ago(t.createdAt)}</small></span></button>`
    )
    .join('');
  const st = (n, l, s) =>
    `<div class="t-stat"><b>${n}</b><span>${l}</span>${s ? `<small>${s}</small>` : ''}</div>`;
  return `<div class="t-ins">
 <section class="t-panel"><div class="t-panel-h"><div><h3>Recent activity</h3><p>Your latest Threads and where each one stands.</p></div><a href="/app/threads">View all ${sv('chev', 14)}</a></div>
  ${act ? `<div class="t-acts-l">${act}</div>` : `<div class="t-empty">${sv('link', 22)}<b>No Threads yet</b><small>Start your first Thread above. It will appear here with its status.</small></div>`}</section>
 <section class="t-panel"><div class="t-panel-h"><div><h3>Sharing analytics</h3><p>Last 30 days</p></div></div>
  <div class="t-stats">${st(m30.length, 'Threads started')}${st(conf, 'Confirmed', m30.length ? rate + '% confirmation rate' : '')}${st(both, 'Both answered', '&ldquo;What&rsquo;s next?&rdquo;')}${st(wk, 'This week')}</div>
  <div class="t-chart" role="img" aria-label="Threads started in the last 7 days">${days.map(d => `<div><span style="height:${Math.round((d.n / mx) * 100)}%" title="${d.n} Thread${d.n === 1 ? '' : 's'}"></span><small>${d.l}</small></div>`).join('')}</div></section>
 </div>`;
}

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
/* wrap newThread: Full details + save to contacts */
const _ntX = newThread;
newThread = function (e) {
  const v = id => {
    const x = $('#' + id);
    return x ? x.value.trim() : '';
  };
  const o = { name: v('tn'), email: v('te'), role: v('tr'), company: v('tc'), where: v('tw2') };
  if (!o.name) {
    e.preventDefault();
    toast('Add their name to start a Thread');
    return false;
  }
  if (TAPM === 'f') {
    const extra = [v('tli') ? 'LinkedIn: ' + v('tli') : '', v('tfu') ? 'Follow up in ' + v('tfu') : '']
      .filter(Boolean)
      .join(' · ');
    if (extra && $('#tx'))
      $('#tx').value = ($('#tx').value.trim() ? $('#tx').value.trim() + ' · ' : '') + extra;
  }
  if ($('#tsave') && $('#tsave').checked) {
    try {
      tapVcf(o);
    } catch (_) {}
  }
  return _ntX.call(this, e);
};
document.addEventListener('click', e => {
  const d = $('#twd');
  if (d && d.open && !d.contains(e.target)) d.removeAttribute('open');
});
/* topbar: account menu */
/* acctMenu: earlier version removed in the v54 merge (the later declaration below always won) */

/* ===== v5 Public profile workspace ===== */
let PF = null,
  PFT = 'qr';
function pfInit() {
  const u = me();
  if (!PF || PF._id !== u.id) {
    const L = u.links || {};
    const links = [];
    if (L.linkedin) links.push(L.linkedin);
    if (L.website) links.push(L.website);
    if (L.calendar) links.push(L.calendar);
    (L.extra || []).forEach(x => x && links.push(x));
    PF = {
      _id: u.id,
      name: u.name || '',
      role: u.role || '',
      company: u.company || '',
      city: u.city || '',
      bio: u.bio || '',
      theme: u.theme || 'midnight',
      links: links.length ? links : [''],
      hidden: !!L.hidden
    };
  }
  return PF;
}
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
function pfUser() {
  const u = me();
  const ls = PF.links.map(x => x.trim()).filter(Boolean);
  const L = Object.assign({}, u.links || {});
  L.linkedin = ls.find(x => linkKind(x) === 'li') || '';
  L.calendar = ls.find(x => linkKind(x) === 'cal') || '';
  const rest = ls.filter(x => x !== L.linkedin && x !== L.calendar);
  L.website = rest[0] || '';
  L.extra = rest.slice(1);
  L.hidden = PF.hidden;
  return Object.assign({}, u, {
    name: PF.name,
    role: PF.role,
    company: PF.company,
    city: PF.city,
    bio: PF.bio,
    theme: PF.theme,
    links: L
  });
}
function pfPreview() {
  const u = pfUser();
  return bizCard(
    Object.assign({}, u, { tags: (u.links && u.links.tags) || [], open: u.links && u.links.open }),
    {}
  );
}
function pfSync() {
  const g = id => {
    const e = $('#' + id);
    return e ? e.value : null;
  };
  [
    ['name', 'pfn'],
    ['role', 'pfr'],
    ['company', 'pfc'],
    ['city', 'pfct'],
    ['bio', 'pfb']
  ].forEach(([k, id]) => {
    const v = g(id);
    if (v != null) PF[k] = v;
  });
  document.querySelectorAll('.pf-link input').forEach((el, i) => {
    PF.links[i] = el.value;
    const ic = el.parentNode.querySelector('.pf-lic');
    if (ic) ic.innerHTML = sv(linkKind(el.value), 18);
  });
  if ($('#pfbc')) $('#pfbc').textContent = (PF.bio || '').length;
  const p = $('#pfprev');
  if (p) p.innerHTML = pfPreview();
}
function pfLinks() {
  return PF.links
    .map(
      (v, i) =>
        `<div class="pf-link"><span class="pf-lic ${linkKind(v) === 'li' ? 'li' : ''}">${sv(linkKind(v), 18)}</span><input value="${esc(v)}" placeholder="linkedin.com/in/you, website or calendar link" data-on-input="pfSync()"><button type="button" aria-label="Remove link" data-on-click="pfLinkDel(${i})">${sv('close', 15)}</button></div>`
    )
    .join('');
}
function pfAdd() {
  pfSync();
  if (PF.links.length >= 6) return toast('You can add up to 6 links');
  PF.links.push('');
  $('#pflinks').innerHTML = pfLinks();
  const all = document.querySelectorAll('.pf-link input');
  all[all.length - 1].focus();
}
async function pfSave(b) {
  pfSync();
  if (!PF.name.trim()) return toast('Add your full name');
  const u = me();
  const nu = pfUser();
  const patch = {
    name: nu.name.trim(),
    role: nu.role.trim(),
    company: nu.company.trim(),
    city: nu.city.trim(),
    bio: nu.bio.trim(),
    links: nu.links
  };
  b.disabled = true;
  const ok = await upd('profiles', u.id, patch);
  b.disabled = false;
  if (!ok) return;
  Object.assign(u, patch);
  save();
  toast('Profile saved');
  window._keepScroll = true;
  render();
}
async function pfTheme(k) {
  PF.theme = k;
  document.querySelectorAll('.pf-sty').forEach(b => {
    const on = b.dataset.k === k;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
  const p = $('#pfprev');
  if (p) p.innerHTML = pfPreview();
  const u = me();
  if (await upd('profiles', u.id, { theme: k })) {
    u.theme = k;
    save();
    toast(THEMES[k].n + ' style applied');
  }
}
async function pfVis(on) {
  const u = me();
  PF.hidden = !on;
  const links = Object.assign({}, u.links || {}, { hidden: !on });
  if (await upd('profiles', u.id, { links })) {
    u.links = links;
    save();
    toast(on ? 'Your profile is public' : 'Your profile is now hidden');
  } else {
    const c = $('#pfvis');
    if (c) c.checked = !on;
  }
}
function pfTab(t) {
  PFT = t;
  document.querySelectorAll('.pf-tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  const b = $('#pfshare');
  if (b) {
    b.innerHTML = pfShareBody();
    if (t === 'qr') qr($('#qrPf'), profileUrl(me()), 104);
  }
}
function pfShareBody() {
  const u = me(),
    url = profileUrl(u),
    short = 'introthread.com/' + u.handle;
  const field = `<div class="pf-url"><span>${esc(short)}</span><button type="button" aria-label="Copy link" data-on-click="copy('${url}','Link copied')">${sv('copy', 18)}</button></div>`;
  if (PFT === 'link')
    return `<div class="pf-sb1">${field}<div class="pf-shares"><button type="button" data-on-click="shareNative()">${sv('send', 16)} Share</button><a href="mailto:?subject=${encodeURIComponent('My Introthread card')}&body=${encodeURIComponent(url)}">${sv('mail', 16)} Email</a><a target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(url)}">${sv('send', 16)} WhatsApp</a><a target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}">${sv('li', 16)} LinkedIn</a></div><p class="pf-fine">Add it to your email signature and social bios.</p></div>`;
  if (PFT === 'nfc')
    return `<div class="pf-sb1"><div class="pf-nfc"><span>${sv('nfc', 26)}</span><div><b>Link an NFC card or sticker</b><small>On Android Chrome, tap the button and hold the card to your phone. It will open ${esc(short)}.</small></div></div><button type="button" class="pf-dl" data-on-click="tapNFC()">${sv('nfc', 18)} Write to NFC card</button><p class="pf-fine">On iPhone, use the QR code or your link.</p></div>`;
  return `<div class="pf-qrw"><div class="pf-qr"><div id="qrPf"></div><span class="t-qrlogo" style="width:30px;height:30px"><span class="x-lm"><i></i><i></i></span></span></div><div class="pf-qrr">${field}<button type="button" class="pf-dl" data-on-click="tapDownloadQR()">${sv('arrow', 18)} Download QR code</button><p class="pf-fine">Print it once. It always points to your latest card.</p></div></div>`;
}
/* vProfile: earlier version removed in the v54 merge (the later declaration below always won) */
/* hidden profiles: visitors see a private notice */
const _vPubX = vPublic;
vPublic = function (h) {
  const u = DB.users.find(x => x.handle === String(h).toLowerCase());
  const mine = me() && u && me().id === u.id;
  if (u && u.links && u.links.hidden && !mine)
    return (
      mnav() +
      `<section class="x-ph c x-nf"><div class="x-wrap"><div class="x-eye">Private profile</div><h1 class="x-h1 x-ph-h">This profile is <em>private.</em></h1><p class="x-lead" style="margin:0 auto">The owner has chosen not to show their card publicly right now.</p><div class="x-cta-row" style="justify-content:center"><a href="/signup" class="x-btn lg">Create your own card ${sv('arrow', 17)}</a></div></div></section>` +
      foot()
    );
  return _vPubX(h);
};

/* ===== v5 Account settings ===== */
let STAB = 'account';
const CC = [
  ['+44', 'gb', 'United Kingdom'],
  ['+1', 'us', 'United States'],
  ['+254', 'ke', 'Kenya'],
  ['+353', 'ie', 'Ireland'],
  ['+49', 'de', 'Germany'],
  ['+33', 'fr', 'France'],
  ['+971', 'ae', 'UAE'],
  ['+27', 'za', 'South Africa'],
  ['+91', 'in', 'India']
];
const flag = c => String.fromCodePoint(...[...c.toUpperCase()].map(x => 127397 + x.charCodeAt()));
function stTab(t) {
  STAB = t;
  window._keepScroll = true;
  render();
}
function stCount() {
  const b = $('#stb');
  if (b && $('#stbc')) $('#stbc').textContent = b.value.length;
}
/* stSave: earlier version removed in the v54 merge (the later declaration below always won) */
function stPw() {
  modal(
    `<div><h2 style="margin:0 0 6px;font-size:22px">Change password</h2><p class="muted" style="margin:0 0 16px">Use at least 8 characters.</p><form class="x-form" style="margin:0" data-on-submit="return stPwDo(event)"><label class="x-f"><span>New password</span><input id="pw1" type="password" minlength="8" required autocomplete="new-password"></label><label class="x-f"><span>Confirm new password</span><input id="pw2" type="password" minlength="8" required autocomplete="new-password"></label><div id="pwe" class="x-err"></div><div class="row" style="gap:10px;margin-top:6px"><button type="button" class="x-btn ghost" data-on-click="closeModal()">Cancel</button><button class="x-btn grow">Update password</button></div></form></div>`
  );
}
async function stPwDo(e) {
  e.preventDefault();
  const a = $('#pw1').value,
    b = $('#pw2').value;
  if (a !== b) {
    $('#pwe').textContent = 'Passwords do not match.';
    return false;
  }
  if (cloud()) {
    const { error } = await SB.auth.updateUser({ password: a });
    if (error) {
      $('#pwe').textContent = error.message;
      return false;
    }
  }
  closeModal();
  toast('Password updated');
  return false;
}
async function stDeactivate() {
  if (
    !confirm(
      'Deactivate your account? Your profile will be hidden and you will stop receiving new introductions. You can reactivate any time by switching your profile back to public.'
    )
  )
    return;
  const u = me();
  const links = Object.assign({}, u.links || {}, { hidden: true, deactivated: true });
  if (await upd('profiles', u.id, { links })) {
    u.links = links;
    if (PF) PF.hidden = true;
    save();
    toast('Account deactivated. Your profile is hidden.');
    window._keepScroll = true;
    render();
  }
}
async function stReactivate() {
  const u = me();
  const links = Object.assign({}, u.links || {}, { hidden: false, deactivated: false });
  if (await upd('profiles', u.id, { links })) {
    u.links = links;
    if (PF) PF.hidden = false;
    save();
    toast('Welcome back. Your profile is public again.');
    window._keepScroll = true;
    render();
  }
}
const stCard = (ic, t, s, body, right, cls) =>
  `<section class="st-box ${cls || ''}"><div class="st-h"><span class="st-hic">${ic}</span><div><b>${t}</b><small>${s}</small></div>${right || ''}</div>${body}</section>`;
const stTog = (k, l, d, on, fn) =>
  `<label class="t-tog st-row"><input type="checkbox" ${on ? 'checked' : ''} data-on-change="${fn || `setPref('${k}',this.checked)`}"><span class="t-sw"></span><span><b>${l}</b><small>${d}</small></span></label>`;
/* stPlan: earlier version removed in the v54 merge (the later declaration below always won) */
/* stConnected: earlier version removed in the v54 merge (the later declaration below always won) */
/* stDanger: earlier version removed in the v54 merge (the later declaration below always won) */
/* stAccount: earlier version removed in the v54 merge (the later declaration below always won) */
function stOther(u, t) {
  const P = u.prefs || {};
  const L = u.links || {};
  if (t === 'privacy')
    return stCard(
      sv('lock', 22),
      'Privacy &amp; visibility',
      'Decide who sees your profile and your Threads.',
      stTog(
        '',
        'Public profile',
        'Allow anyone with your link or QR code to view your profile.',
        !L.hidden,
        'pfVis(this.checked)'
      ) +
        stTog(
          'net',
          'Include my verified Threads in network Warmth',
          'Only Threads where both people opt in.',
          P.net !== false
        ) +
        `<div class="st-row st-data"><div><b>Your data</b><small>Download everything we hold about you as a file.</small></div><button type="button" class="pf-btn" data-on-click="exportMine()">${sv('arrow', 16)} Export my data</button></div>`
    );
  if (t === 'notifications')
    return stCard(
      sv('bell', 22),
      'Notifications',
      'Choose when Introthread reaches out.',
      stTog('nudge', 'Nudge me at 48 hours', 'A gentle reminder before a Thread fades.', P.nudge !== false) +
        stTog(
          'emailMatch',
          'Email me when we match',
          'When both people answer What&rsquo;s next?',
          P.emailMatch !== false
        ) +
        stTog('digest', 'Weekly summary', 'A short Monday recap of open Threads.', P.digest === true)
    );
  if (t === 'integrations')
    return (
      stConnected() +
      stCard(
        sv('hub', 22),
        'Team integrations',
        'Sync resolved Threads with the tools your team already uses.',
        [
          ['HubSpot', 'Sync resolved Threads to contacts and deals.'],
          ['Salesforce', 'Log Threads as activities on leads and contacts.']
        ]
          .map(
            ([n, d]) =>
              `<div class="st-conn"><span class="st-ci">${sv('grid', 20)}</span><div><b>${n}</b><small>${d}</small></div><button type="button" data-on-click="toast('${n} is available on team plans. Email hello@introthread.com.')">Learn more</button></div>`
          )
          .join('')
      )
    );
  if (t === 'preferences')
    return stCard(
      sv('palette', 22),
      'Preferences',
      'Tune how Introthread works for you.',
      stTog('ai', 'Draft follow-ups with AI', 'Drafts never send without you.', P.ai !== false) +
        `<div class="st-row st-data"><div><b>Card style</b><small>Currently ${esc((THEMES[u.theme] || THEMES.midnight).n)}. Change it on your public profile.</small></div><a class="pf-btn" href="/app/profile">${sv('palette', 16)} Change style</a></div>`
    );
  if (t === 'security')
    return stCard(
      sv('shield', 22),
      'Security',
      'Keep your account safe.',
      `<div class="st-row st-data"><div><b>Password</b><small>Change the password you use to log in.</small></div><button type="button" class="pf-btn" data-on-click="stPw()">${sv('lock', 16)} Change password</button></div><div class="st-row st-data"><div><b>Sign out</b><small>Sign out of Introthread on this device.</small></div><button type="button" class="pf-btn" data-on-click="logout()">${sv('arrow', 16)} Sign out</button></div>`
    );
  if (t === 'billing')
    return `<div class="st-grid one">${stPlan(u)}${stCard(sv('brief', 22), 'Billing details', 'Invoices and payment method.', `<p class="st-p">Paid plans are billed in advance, monthly or annually. Prices exclude VAT and sales tax where applicable. For invoices or changes, email <a href="mailto:hello@introthread.com">hello@introthread.com</a>.</p>`)}</div>`;
  return '';
}
/* vSettings: earlier version removed in the v54 merge (the later declaration below always won) */

/* ===== v5 Today, Threads, Rooms ===== */
const xav = (n, s = 44) =>
  `<span class="d-av" style="width:${s}px;height:${s}px;font-size:${Math.round(s * 0.36)}px;background:${colorFor(n)}">${esc(initials(n))}</span>`;
const dChip = t => {
  const s = threadState(t);
  const m = {
    pending: ['o', 'Awaiting confirmation'],
    open: ['b', t.mine ? 'Waiting on them' : 'Waiting on &ldquo;What&rsquo;s next?&rdquo;'],
    matched: ['g', 'Matched, act now'],
    resolved: ['g', 'Resolved'],
    closed: ['n', 'Closed gently']
  }[s];
  return `<span class="d-chip ${m[0]}">${m[1]}</span>`;
};
const dWarm = t => {
  const n = warmth(t),
    s = threadState(t),
    c = s === 'pending' ? 'o' : s === 'closed' ? 'n' : s === 'open' ? 'b' : 'g';
  return `<span class="d-warm ${c}" title="Warmth ${n}/5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
};
const dRing = t => {
  const p = pulse(t),
    st = threadState(t);
  const c =
    st === 'resolved' || st === 'matched'
      ? '#12a065'
      : st === 'closed'
        ? '#98a2b3'
        : p > 0.5
          ? '#1f5eff'
          : p > 0.2
            ? '#ff6a3d'
            : '#d14343';
  const r = 19,
    C = 2 * Math.PI * r;
  const d = Math.max(1, Math.ceil((1 - p) * 7) || 1);
  const lab = st === 'resolved' ? '&#10003;' : st === 'closed' ? '&ndash;' : (Math.ceil(p * 7) || 0) + 'd';
  return `<span class="d-ring" style="color:${c}"><svg width="46" height="46"><circle cx="23" cy="23" r="${r}" stroke="#eceff4" stroke-width="3" fill="none"/><circle cx="23" cy="23" r="${r}" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}" transform="rotate(-90 23 23)"/></svg><b>${lab}</b></span>`;
};
const dSecHead = (t, href, lab) =>
  `<div class="d-sh"><b>${t}</b>${href ? `<a href="${href}">${lab || 'View all'} ${sv('arrow', 15)}</a>` : ''}</div>`;
const dPromo = (title, items, cta) =>
  `<div class="d-promo"><span class="d-promo-ic">${sv('spark', 22)}</span><div><b>${title}</b>${items ? `<ul>${items.map(x => `<li>${sv('check', 12, '#fff', 3)}${x}</li>`).join('')}</ul>` : ''}${cta || ''}</div></div>`;
/* ---------- Today ---------- */
/* vToday: earlier version removed in the v54 merge (the later declaration below always won) */
/* ---------- Threads ---------- */
let TF2 = 'all',
  TQ2 = '',
  TS2 = 'recent';
/* vThreads: earlier version removed in the v54 merge (the later declaration below always won) */
/* ---------- Rooms ---------- */
let RF = 'all',
  RQ = '',
  RS = 'recent';
const RIMG = ['uc-conferences', 'uc-communities', 'uc-teams', 'uc-professionals'];
/* vRooms: earlier version removed in the v54 merge (the later declaration below always won) */
function rMenu(id) {
  const r = DB.rooms.find(x => x.id === id);
  modal(
    `<div><h2 style="margin:0 0 4px;font-size:20px">${esc(r.name)}</h2><p class="muted" style="margin:0 0 14px">Room code ${esc(r.code)}</p><div class="t-more"><a href="/app/room/${r.id}" data-on-click="closeModal()">${sv('eye', 18)} Open Room</a><button data-on-click="copy('https://introthread.com/r/${esc(r.code)}','Room link copied');closeModal()">${sv('link', 18)} Copy Room link</button><button data-on-click="exportRoom('${r.id}');closeModal()">${sv('arrow', 18)} Export report (CSV)</button></div></div>`
  );
}

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
const _ntT = newThread;
newThread = function (e) {
  const tags = TSEL.slice();
  const before = new Set(DB.threads.map(t => t.id));
  const r = _ntT.call(this, e);
  if (tags.length) {
    let n = 0;
    const iv = setInterval(() => {
      const t = DB.threads.find(x => !before.has(x.id) && x.ownerId === DB.session);
      if (t) {
        clearInterval(iv);
        saveTags(t, tags).then(() => {
          window._keepScroll = true;
          render();
        });
      } else if (++n > 50) clearInterval(iv);
    }, 200);
  }
  TSEL = [];
  return r;
};
const _rT = render;
render = function () {
  normTags();
  return _rT.apply(this, arguments);
};

/* ===== Google sign-in + Calendar ===== */
const GSCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
oauth = async function (p, withCal) {
  if (p !== 'Google') return toast(p + ' sign-in is coming soon. Please use Google or email for now.');
  if (typeof SB === 'undefined' || !SB)
    return toast('Sign-in is not available right now. Please try again shortly.');
  try {
    sessionStorage.setItem('it_oauth', '1');
  } catch (_) {}
  const { error } = await SB.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://www.introthread.com/',
      ...(withCal ? { scopes: GSCOPE } : {}),
      queryParams: { access_type: 'offline', prompt: 'select_account' }
    }
  });
  if (error) toast(error.message);
};
function gTokSave(s) {
  if (s && s.provider_token) {
    try {
      sessionStorage.setItem('it_gtok', JSON.stringify({ t: s.provider_token, exp: Date.now() + 50 * 6e4 }));
    } catch (_) {}
  }
}
function gTok() {
  try {
    const o = JSON.parse(sessionStorage.getItem('it_gtok') || 'null');
    return o && o.exp > Date.now() ? o.t : null;
  } catch (_) {
    return null;
  }
}
let GCAL = null,
  GCAL_BUSY = false;
async function gcalLoad() {
  const tok = gTok();
  if (!tok || GCAL_BUSY || GCAL) return;
  GCAL_BUSY = true;
  try {
    const a = new Date();
    a.setHours(0, 0, 0, 0);
    const b = new Date(a.getTime() + 7 * DAY);
    const r = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=8&timeMin=' +
        encodeURIComponent(new Date().toISOString()) +
        '&timeMax=' +
        encodeURIComponent(b.toISOString()),
      { headers: { Authorization: 'Bearer ' + tok } }
    );
    if (r.status === 401 || r.status === 403) {
      sessionStorage.removeItem('it_gtok');
      GCAL = [];
    } else {
      const j = await r.json();
      GCAL = (j.items || []).map(e => ({
        title: e.summary || 'Busy',
        where: e.location || '',
        start: Date.parse(e.start.dateTime || e.start.date),
        allDay: !e.start.dateTime,
        link: e.htmlLink
      }));
    }
  } catch (_) {
    GCAL = [];
  }
  GCAL_BUSY = false;
  if (/^#\/app\/?$/.test(RH())) {
    window._keepScroll = true;
    render();
  }
}
function gcalPanel() {
  const tok = gTok();
  if (!tok)
    return `<div class="g-conn"><span>${oG()}</span><div><b>Connect Google Calendar</b><small>See today&rsquo;s meetings here and start Threads from them.</small></div><button type="button" class="d-act ghost sm" data-on-click="oauth('Google',1)">Connect</button></div>`;
  if (!GCAL) {
    gcalLoad();
    return '<p class="d-muted">Loading your calendar...</p>';
  }
  if (!GCAL.length) return '<p class="d-muted">No meetings in the next 7 days.</p>';
  return GCAL.map(e => {
    const d = new Date(e.start);
    const today = new Date().toDateString() === d.toDateString();
    return `<a class="d-ev" href="${esc(e.link || '#')}" target="_blank" rel="noopener"><span class="d-evd">${today ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' })}<b>${e.allDay ? d.getDate() : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</b></span><span class="d-evl"><i></i></span><span class="d-evt"><b>${esc(e.title)}</b><small>${esc(e.where || (e.allDay ? 'All day' : 'Google Calendar'))}</small></span><em>${today ? 'Today' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</em></a>`;
  }).join('');
}
if (typeof SB !== 'undefined' && SB) {
  SB.auth.onAuthStateChange((ev, s) => {
    gTokSave(s);
  });
  SB.auth.getSession().then(({ data }) => gTokSave(data && data.session));
}

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
let DRANGE = 7;
const D_OUT = [
  ['message', 'Sent a message', 'mail'],
  ['call', 'Had a call', 'phone'],
  ['meeting', 'Meeting booked', 'cal'],
  ['opportunity', 'Opportunity created', 'spark'],
  ['notnow', 'Not now, stay in touch', 'sync'],
  ['resolved', 'Resolved', 'check']
];

/* ===== v8 Threads screen (design: Relationship Thread) ===== */
let TSORT = 'priority',
  TLIM = 20,
  TCOMPACT = false,
  TFT = [],
  TFV = false;
const TH_SORTS = [
  ['priority', 'Priority'],
  ['recent', 'Most recent'],
  ['oldest', 'Oldest'],
  ['next', 'Next follow-up']
];

/* ===== v9 Rooms: events and communities ===== */
let RF9 = 'all',
  RQ9 = '',
  RDAY = '',
  RCAL = null,
  RLIM9 = 6,
  RFF = { fmt: '', priv: '', topic: '' },
  RNT = [];
const RIMG9 = ['uc-conferences', 'uc-communities', 'uc-professionals', 'uc-teams'];
function rm9(r) {
  if (!r) return {};
  if (!r._m) {
    const L = r.location || '',
      i = L.indexOf('\n@@');
    if (i >= 0) {
      try {
        r._m = JSON.parse(L.slice(i + 3));
      } catch (_) {
        r._m = {};
      }
      r.location = L.slice(0, i);
    } else r._m = r.meta || {};
  }
  return r._m;
}
const _render9 = render;
render = function () {
  try {
    (DB.rooms || []).forEach(rm9);
  } catch (_) {}
  return _render9.apply(this, arguments);
};
const rYmd = r => new Date(r.date).toISOString().slice(0, 10);
const ymdL = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const rFmt = (r, o) => new Date(r.date).toLocaleDateString('en-GB', Object.assign({ timeZone: 'UTC' }, o));
function rTzAbbr(tz, ymd) {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: tz, timeZoneName: 'short' })
      .formatToParts(new Date(ymd + 'T12:00:00Z'))
      .find(p => p.type === 'timeZoneName').value;
  } catch (_) {
    return '';
  }
}
function r12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
function rUtc(ymd, t, tz) {
  const [y, mo, d] = ymd.split('-').map(Number),
    [h, mi] = t.split(':').map(Number);
  const g = Date.UTC(y, mo - 1, d, h, mi);
  try {
    const s = new Date(g).toLocaleString('en-US', { timeZone: tz, hour12: false });
    const p = new Date(s + ' UTC').getTime();
    return g - (p - g);
  } catch (_) {
    return g;
  }
}
function rTime(r) {
  const m = rm9(r);
  if (!m.start) return 'Time to be confirmed';
  const ymd = rYmd(r),
    tz = m.tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  let s = `${r12(m.start)}${m.end ? ' &ndash; ' + r12(m.end) : ''} (${rTzAbbr(tz, ymd)})`;
  const mine = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz !== mine) {
    const u = rUtc(ymd, m.start, tz);
    s += `<em class="ro-local">${new Date(u).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })} your time</em>`;
  }
  return s;
}
function rPlace(r) {
  const m = rm9(r);
  if (m.fmt === 'online') return 'Online' + (m.platform ? ' (' + esc(m.platform) + ')' : '');
  return esc(r.location || 'Venue to be confirmed') + (m.fmt === 'hybrid' ? ' &middot; and online' : '');
}
function rState(r) {
  const t = ymdL(new Date()),
    y = rYmd(r);
  if (y < t) return ['n', 'Past'];
  if (y === t) return ['g', 'Today'];
  const n = Math.round((Date.parse(y) - Date.parse(t)) / DAY);
  return n <= 7 ? ['o', 'In ' + n + ' day' + (n > 1 ? 's' : '')] : ['b', 'Upcoming'];
}
function rImg(r) {
  return '/img/' + RIMG9[Math.abs([...String(r.id)].reduce((a, c) => a + c.charCodeAt(0), 0)) % 4] + '.jpg';
}
function rComms() {
  const T = myThreads();
  const m = {};
  T.forEach(t =>
    tagsOf(t).forEach(g => {
      (m[g] = m[g] || { n: 0, co: {}, v: 0 }).n++;
      if (t.confirmed) m[g].v++;
      tagsOf(t).forEach(o => {
        if (o !== g) m[g].co[o] = (m[g].co[o] || 0) + 1;
      });
    })
  );
  return Object.entries(m)
    .map(([k, v]) => ({
      k,
      n: v.n,
      v: v.v,
      co: Object.entries(v.co)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(x => x[0])
    }))
    .sort((a, b) => b.n - a.n);
}
function rCalNav(d) {
  const c = RCAL ? new Date(RCAL) : new Date();
  c.setDate(1);
  c.setMonth(c.getMonth() + d);
  RCAL = c.getTime();
  window._keepScroll = true;
  render();
}
function rCal(all) {
  const base = RCAL ? new Date(RCAL) : new Date();
  const y = base.getFullYear(),
    mo = base.getMonth();
  const first = new Date(y, mo, 1),
    start = new Date(y, mo, 1 - ((first.getDay() + 6) % 7));
  const today = ymdL(new Date());
  const by = {};
  all.forEach(r => {
    (by[rYmd(r)] = by[rYmd(r)] || []).push(r);
  });
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const k = ymdL(d),
      ev = by[k] || [],
      out = d.getMonth() !== mo;
    if (i === 35 && out) break;
    cells += `<button type="button" class="${out ? 'out' : ''} ${k === today ? 'today' : ''} ${RDAY === k ? 'sel' : ''} ${ev.length ? 'has' : ''}" ${ev.length ? `data-on-click="rCalDay('${k}')" aria-label="${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}: ${ev.length} Room${ev.length > 1 ? 's' : ''}" title="${esc(ev.map(r => r.name).join(', '))}"` : 'tabindex="-1" aria-hidden="true"'}>${d.getDate()}${ev.length ? '<i></i>' : ''}</button>`;
  }
  return `<div class="ro-cal"><div class="ro-calh"><b>${first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</b><span><button type="button" aria-label="Previous month" data-on-click="rCalNav(-1)">${sv('chev', 16)}</button><button type="button" aria-label="Next month" data-on-click="rCalNav(1)">${sv('chev', 16)}</button></span></div><div class="ro-dow">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => `<span>${x}</span>`).join('')}</div><div class="ro-days">${cells}</div></div>`;
}
function rFilter() {
  const tp = [...new Set(DB.rooms.flatMap(r => rm9(r).topics || []))];
  const opt = (id, cur, arr) =>
    `<select id="${id}" class="th-sort" style="width:100%">${arr.map(([v, l]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  modal(
    `<div><div class="row between"><h3 style="margin:0;font:600 19px var(--xss)">Filter Rooms</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div><div class="ro-fg"><label class="x-f"><span>Format</span>${opt(
      'rff',
      RFF.fmt,
      [
        ['', 'Any format'],
        ['inperson', 'In person'],
        ['online', 'Online'],
        ['hybrid', 'Hybrid']
      ]
    )}</label><label class="x-f"><span>Access</span>${opt('rfp', RFF.priv, [
      ['', 'Public and private'],
      ['public', 'Public'],
      ['private', 'Private (invite only)']
    ])}</label><label class="x-f"><span>Topic</span>${opt('rft', RFF.topic, [['', 'Any topic'], ...tp.map(x => [x, x])])}</label></div><div class="fu-b"><button type="button" class="t-how" data-on-click="rFiltClear()">Clear</button><button type="button" class="x-btn" data-on-click="rFiltApply()">Apply</button></div></div>`
  );
}
function newRoomModal() {
  RNT = [];
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzs = [
    ...new Set([
      tz,
      'Europe/London',
      'America/New_York',
      'America/Chicago',
      'America/Los_Angeles',
      'Africa/Nairobi',
      'Africa/Lagos',
      'Europe/Paris',
      'Asia/Dubai',
      'Asia/Singapore'
    ])
  ];
  modal(`<form class="ro-new" data-on-submit="return newRoom9(event)"><div class="row between"><div><h3>Create a Room</h3><p>Every tap inside your Room becomes a Thread.</p></div><button type="button" class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div>
 <label class="x-f"><span>Room name <i>*</i></span><input id="rn" required maxlength="80" placeholder="e.g. London Tech Week Founders Night"></label>
 <div class="ro-g3"><label class="x-f"><span>Date <i>*</i></span><input id="rd" type="date" required value="${ymdL(new Date())}"></label><label class="x-f"><span>Starts</span><input id="rs" type="time" value="18:00"></label><label class="x-f"><span>Ends</span><input id="re" type="time" value="20:00"></label></div>
 <label class="x-f"><span>Time zone</span><select id="rz" class="th-sort" style="width:100%">${tzs.map(z => `<option value="${z}" ${z === tz ? 'selected' : ''}>${z.replace(/_/g, ' ')} (${rTzAbbr(z, ymdL(new Date()))})</option>`).join('')}</select></label>
 <div class="x-f"><span>Format</span><div class="x-seg ro-seg">${[
   ['inperson', 'In person'],
   ['online', 'Online'],
   ['hybrid', 'Hybrid']
 ]
   .map(
     ([k, l], i) =>
       `<button type="button" data-f="${k}" class="${i ? '' : 'on'}" data-on-click="roSeg(this)">${l}</button>`
   )
   .join('')}</div></div>
 <label class="x-f" id="rvw"><span>Venue</span><input id="rl" maxlength="120" placeholder="Venue, area, city"></label>
 <div class="ro-g2" id="rlw" hidden><label class="x-f"><span>Platform</span><input id="rp" maxlength="30" placeholder="Zoom, Google Meet, Teams"></label><label class="x-f"><span>Meeting link</span><input id="ru" type="url" maxlength="300" placeholder="https://"></label></div>
 <div class="ro-g2"><label class="x-f"><span>Type</span><select id="rk" class="th-sort" style="width:100%" data-on-change="roType(this.value)"><option value="event">Event</option><option value="community">Community</option><option value="meeting">Team meeting</option></select></label><label class="x-f" id="rrw" hidden><span>Repeats</span><select id="rr" class="th-sort" style="width:100%"><option value="">Does not repeat</option><option value="weekly">Every week</option><option value="biweekly">Every 2 weeks</option><option value="monthly">Every month</option></select></label></div>
 <div class="ro-g2"><label class="x-f"><span>Access</span><select id="rv" class="th-sort" style="width:100%"><option value="public">Public: anyone with the link</option><option value="private">Private: invite only</option></select></label><label class="x-f"><span>Attendance limit <em>(optional)</em></span><input id="rc" type="number" min="2" max="1000" placeholder="Up to 1,000"></label></div>
 <div class="x-f"><span>Topics <em>(optional, up to 3)</em></span><div class="tp-wrap">${TOPICS.map(x => `<button type="button" class="tp" aria-pressed="false" data-v="${esc(x)}" data-on-click="roTopic(this)">${esc(x)}</button>`).join('')}</div></div>
 <label class="x-f"><span>Description <em>(optional)</em></span><textarea id="rx" rows="2" maxlength="280" placeholder="Who is it for and what will happen?"></textarea></label>
 <button class="t-start" style="height:50px">${sv('cal', 18)} Create Room</button></form>`);
}
function newRoom9(e) {
  e.preventDefault();
  const v = id => {
    const x = $('#' + id);
    return x ? String(x.value).trim() : '';
  };
  const n = v('rn');
  if (!n) {
    toast('Add a Room name');
    return false;
  }
  const f = (document.querySelector('.ro-seg button.on') || {}).dataset.f || 'inperson';
  const meta = {
    start: v('rs'),
    end: v('re'),
    tz: v('rz'),
    fmt: f,
    platform: f === 'inperson' ? '' : v('rp'),
    link: f === 'inperson' ? '' : v('ru'),
    priv: v('rv'),
    cap: Math.min(1000, +v('rc') || 0),
    kind: v('rk') || 'event',
    repeat: (v('rk') || 'event') === 'event' ? '' : v('rr'),
    topics: [...document.querySelectorAll('.ro-new .tp.on')].map(b => b.dataset.v),
    desc: v('rx')
  };
  if (meta.link && !/^https:\/\//i.test(meta.link)) {
    toast('Meeting link must start with https://');
    return false;
  }
  const loc = f === 'online' ? '' : v('rl'),
    date = v('rd');
  const code = (n.replace(/[^A-Za-z]/g, '').slice(0, 3) + Math.floor(10 + Math.random() * 89)).toUpperCase();
  if (!cloud()) {
    const r = {
      id: uid(),
      ownerId: DB.session,
      name: n,
      date: new Date(date).getTime(),
      location: loc,
      code,
      created: Date.now(),
      meta
    };
    r._m = meta;
    DB.rooms.push(r);
    save();
    closeModal();
    toast('Room created');
    go('/app/room/' + r.id);
    return false;
  }
  SB.from('rooms')
    .insert({
      owner_id: DB.session,
      name: n,
      event_date: date,
      location: loc + '\n@@' + JSON.stringify(meta),
      code
    })
    .select()
    .single()
    .then(({ data, error }) => {
      if (error) {
        if (/room_pass_required/.test(error.message || '')) {
          closeModal();
          RA.passes = 0;
          bRoomPass();
          return;
        }
        toast('Could not create the Room. Please try again.');
        return fail(error);
      }
      const r = mapRoom(data);
      rm9(r);
      DB.rooms.push(r);
      closeModal();
      toast('Room created');
      raPasses();
      go('/app/room/' + r.id);
    });
  return false;
}
const _vRoom9 = vRoom;
vRoom = function (id) {
  const r = DB.rooms.find(x => x.id === id);
  if (r) rm9(r);
  let h = _vRoom9(id);
  if (!r) return h;
  h = h.split(fmtDate(r.date)).join(rFmt(r, { day: 'numeric', month: 'short', year: 'numeric' }));
  const m = rm9(r);
  const strip = `<div class="ro-strip"><span>${sv('cal', 16)} ${rFmt(r, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} &middot; ${rTime(r)}</span><span>${sv(m.fmt === 'online' ? 'globe' : 'pin', 16)} ${rPlace(r)}</span>${m.link ? `<a href="${esc(m.link)}" target="_blank" rel="noopener">${sv('link', 16)} Join online</a>` : ''}<span>${sv(m.priv === 'private' ? 'lock' : 'users', 16)} ${m.priv === 'private' ? 'Private, invite only' : 'Public'}${m.cap ? ' &middot; limit ' + m.cap : ''}</span></div>${m.desc ? `<p class="ro-desc">${esc(m.desc)}</p>` : ''}`;
  const i = h.indexOf('</h1>');
  return i > 0 ? h.slice(0, i + 5) + strip + h.slice(i + 5) : h;
};
function vRooms() {
  const all = myRooms();
  all.forEach(rm9);
  const t = ymdL(new Date());
  const up = all.filter(r => rYmd(r) >= t).sort((a, b) => a.date - b.date),
    past = all.filter(r => rYmd(r) < t);
  let R =
    RF9 === 'upcoming'
      ? up
      : RF9 === 'past'
        ? past.slice().sort((a, b) => b.date - a.date)
        : RF9 === 'invites'
          ? []
          : [...up, ...past.slice().sort((a, b) => b.date - a.date)];
  const q = RQ9.toLowerCase().trim();
  if (q)
    R = R.filter(r =>
      [r.name, r.location, r.code, (rm9(r).topics || []).join(' '), rm9(r).platform || '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  if (RDAY) R = R.filter(r => rYmd(r) === RDAY);
  if (RFF.fmt) R = R.filter(r => (rm9(r).fmt || 'inperson') === RFF.fmt);
  if (RFF.priv) R = R.filter(r => (rm9(r).priv || 'public') === RFF.priv);
  if (RFF.topic) R = R.filter(r => (rm9(r).topics || []).includes(RFF.topic));
  const comms = rComms();
  const conn = all.reduce((a, r) => a + roomStats(r).T.length, 0);
  const nf = ['fmt', 'priv', 'topic'].filter(k => RFF[k]).length;
  const fmtN = n => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : n);
  const tabs = [
    ['all', 'All rooms', all.length],
    ['upcoming', 'Upcoming', up.length],
    ['past', 'Past', past.length],
    ['mine', 'My rooms', all.length],
    ['invites', 'Invites', 0]
  ];
  const card = (r, i) => {
    const m = rm9(r),
      s = roomStats(r);
    const [c, l] =
      m.fmt === 'online' && rState(r)[1] !== 'Past'
        ? ['g', 'Online']
        : i === 0 && RF9 !== 'past' && rState(r)[1] !== 'Past' && !q && !RDAY
          ? ['b', 'Featured']
          : rState(r);
    return `<article class="ro-card"><a class="ro-img" href="/app/room/${r.id}" style="background-image:linear-gradient(180deg,rgba(10,16,32,.05),rgba(10,16,32,.35)),url(${rImg(r)})" aria-label="Open ${esc(r.name)}"><em class="${c}">${l}</em>${m.priv === 'private' ? `<em class="pv">${sv('lock', 12)} Private</em>` : ''}<span class="ro-dt"><small>${rFmt(r, { month: 'short' }).toUpperCase()}</small><b>${rFmt(r, { day: 'numeric' })}</b></span></a>
  <div class="ro-cb"><a href="/app/room/${r.id}" class="ro-name">${esc(r.name)}</a><small>${sv(m.fmt === 'online' ? 'globe' : 'pin', 14)} ${rPlace(r)}</small><small>${sv('users', 14)} ${s.T.length} ${s.T.length === 1 ? 'person' : 'people'}${m.cap ? ' of ' + m.cap : ''} &middot; ${s.v} verified</small>${
    (m.topics || []).length
      ? `<span class="d-tags">${m.topics
          .map(x => {
            const cc = colorFor(x);
            return `<i style="color:${cc};background:${cc}17">${esc(x)}</i>`;
          })
          .join('')}</span>`
      : ''
  }
  <div class="ro-ca"><a href="/app/room/${r.id}" class="d-act">Open room</a><button type="button" class="d-dots ro-dots" aria-label="More options for ${esc(r.name)}" data-on-click="rMenu('${r.id}')">&bull;&bull;&bull;</button></div></div></article>`;
  };
  const ico = ['users', 'spark', 'chart', 'brief'],
    cls = ['b', 'o', 'g', 'v'];
  return shell(
    'rooms',
    `<div class="t-head"><div><div class="t-eye">Rooms</div><h1 class="t-h1">Events and communities</h1><p class="t-sub">Create Rooms for your events, communities and meetups. Every tap in a Room becomes a Thread.</p></div><button type="button" class="x-btn lg th-new" data-on-click="newRoomModal()"><span aria-hidden="true">+</span> Create a Room</button></div>
 <div class="d7-top ro-grid"><div class="ro-main">
 <section class="ro-hero"><div class="ro-hc"><h2>Turn events into opportunities</h2><p>Host or join events, communities and private networks. Meet people, share your card and build meaningful relationships.</p><div class="ro-hb"><button type="button" class="x-btn lg" data-on-click="newRoomModal()">Create a Room</button><a href="/rooms" class="ro-learn"><span>${sv('play', 10)}</span>Learn more</a></div></div>
 <div class="ro-hs"><span>${sv('cal', 26)}<b>${fmtN(all.length)}</b><small>Events hosted</small></span><span>${sv('user', 26)}<b>${fmtN(conn)}</b><small>Connections</small></span><span>${sv('users', 26)}<b>${fmtN(comms.length)}</b><small>Communities</small></span></div></section>
 <div class="ro-bar"><nav class="ro-tabs" aria-label="Room filter">${tabs.map(([k, l, c]) => `<button type="button" class="${RF9 === k ? 'on' : ''}" aria-pressed="${RF9 === k}" data-on-click="roTab('${k}')">${l} (${c})</button>`).join('')}</nav>
 <label class="ro-s">${sv('search', 16)}<input placeholder="Search rooms, events..." value="${esc(RQ9)}" aria-label="Search rooms" data-on-input="roSearch(this.value)"></label><button type="button" class="th-filter ${nf ? 'on' : ''}" data-on-click="rFilter()">${sv('grid', 16)} Filter${nf ? ` <i>${nf}</i>` : ''}</button></div>
 ${RDAY ? `<div class="th-q">Showing Rooms on ${new Date(RDAY + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })} <button type="button" data-on-click="roDayClear()">Show all dates</button></div>` : ''}
 <div class="ro-sh"><div><h3>${RF9 === 'past' ? 'Past rooms' : RF9 === 'upcoming' ? 'Upcoming rooms' : RF9 === 'invites' ? 'Invites' : RF9 === 'mine' ? 'Rooms you host' : 'Featured rooms'}</h3><p>${RF9 === 'invites' ? 'Private Rooms you have been invited to.' : RF9 === 'past' ? 'See which connections from past events went somewhere.' : 'Your events and communities, happening now and soon.'}</p></div>${R.length > RLIM9 ? `<button type="button" class="ro-va" data-on-click="roAll()">View all ${sv('arrow', 15)}</button>` : ''}</div>
 ${R.length ? `<div class="ro-cards">${R.slice(0, RLIM9).map(card).join('')}${RF9 !== 'past' && RF9 !== 'invites' && !q && !RDAY ? [...Array(Math.max(0, 3 - Math.min(R.length, RLIM9)))].map((_, i) => `<button type="button" class="ro-ph" data-on-click="newRoomModal()"><span>${sv(['cal', 'users', 'globe'][i % 3], 24)}</span><b>${['Host your next event', 'Start a community meetup', 'Run an online session'][i % 3]}</b><small>${['Create a Room and every tap becomes a Thread.', 'Bring your network together around one topic.', 'Add a Zoom, Meet or Teams link and track who connects.'][i % 3]}</small><em>${sv('arrow', 14)} Create a Room</em></button>`).join('') : ''}</div>` : `<div class="d-empty">${sv(RF9 === 'invites' ? 'mail' : 'cal', 22)}<div><b>${RF9 === 'invites' ? 'No invites yet' : all.length ? 'No Rooms match' : 'No Rooms yet'}</b><small>${RF9 === 'invites' ? 'When someone invites you to a private Room, it will appear here.' : all.length ? 'Try another tab, date or filter.' : 'Create a Room for your next event. Every tap inside it becomes a Thread.'}</small></div>${RF9 === 'invites' ? '' : `<button type="button" class="x-btn sm" data-on-click="newRoomModal()">Create a Room</button>`}</div>`}
 <div class="ro-sh"><div><h3>Trending communities</h3><p>Join communities based on your interests and the topics in your network.</p></div>${comms.length > 4 ? `<a class="ro-va" href="/app/threads">View all ${sv('arrow', 15)}</a>` : ''}</div>
 ${
   comms.length
     ? `<div class="ro-comms">${comms
         .slice(0, 4)
         .concat(
           TOPICS.filter(x => !comms.some(c => c.k === x))
             .slice(0, Math.max(0, 4 - comms.length))
             .map(k => ({ k, n: 0, v: 0, co: [], sug: 1 }))
         )
         .map(
           (c, i) =>
             `<article class="ro-cm"><div class="ro-cmh"><span class="ro-cmi ${cls[i % 4]}">${sv(ico[i % 4], 22)}</span><div><b>${esc(c.k)}</b><small>${c.sug ? 'Suggested for you' : `${c.n} connection${c.n === 1 ? '' : 's'} &middot; ${c.v} verified`}</small></div></div><p>${c.sug ? `Tag your next Thread with ${esc(c.k)} to start this community.` : `People in your network you met around ${esc(c.k.toLowerCase())}.`}</p>${
               c.co.length
                 ? `<span class="d-tags">${c.co
                     .map(x => {
                       const cc = colorFor(x);
                       return `<i style="color:${cc};background:${cc}17">${esc(x)}</i>`;
                     })
                     .join('')}</span>`
                 : ''
             }${c.sug ? `<button type="button" class="ro-join" data-on-click="roJoin('${esc(c.k).replace(/'/g, '&#39;')}')">Join</button>` : `<button type="button" class="ro-join" data-on-click="roThreads('${esc(c.k).replace(/'/g, '&#39;')}')">View people</button>`}</article>`
         )
         .join('')}</div>`
     : `<div class="d-empty">${sv('users', 22)}<div><b>No communities yet</b><small>Add topics when you start Threads and your communities will form here.</small></div><a href="/app/tap" class="x-btn sm">Start a Thread</a></div>`
 }
 </div><div class="d-side">
 <section class="d-box"><div class="d-sh"><b>My calendar</b><button type="button" class="ro-va sm" data-on-click="roReset()">View all ${sv('arrow', 14)}</button></div>${rCal(all)}</section>
 <section class="d-box">${dSecHead('Upcoming events')}${
   up.length
     ? up
         .slice(0, 3)
         .map(r => {
           const m = rm9(r),
             s = roomStats(r);
           return `<a class="ro-up" href="/app/room/${r.id}"><span class="ro-ud"><small>${rFmt(r, { month: 'short' }).toUpperCase()}</small><b>${rFmt(r, { day: 'numeric' })}</b></span><span class="ro-ui"><b>${esc(r.name)}</b><small>${rTime(r)}</small><small><span>${sv(m.fmt === 'online' ? 'globe' : 'pin', 13)} ${rPlace(r)}</span><span>${sv('users', 13)} ${s.T.length}</span></small></span>${sv('chev', 18)}</a>`;
         })
         .join('')
     : `<div class="d7-emp"><span>${sv('cal', 24)}</span><div><b>No upcoming events</b><small>Create a Room for your next event and every tap becomes a Thread.</small></div></div>`
 }</section>
 <section class="d-box ro-host"><span>${sv('cal', 30)}</span><div><b>Host your own event</b><small>Create a Room for your event, community or private network.</small><button type="button" class="x-btn" data-on-click="newRoomModal()">Create a Room ${sv('arrow', 16)}</button></div></section>
 </div></div>`
  );
}

/* v9.1 demo: realistic upcoming Rooms so the demo shows the full Rooms experience */
function seedDemoRooms9() {
  try {
    if (MODE === 'demo' && DB.session && !DB.rooms.some(x => x.demoUp)) {
      const d = n => {
        const x = new Date();
        x.setDate(x.getDate() + n);
        return Date.parse(ymdL(x));
      };
      [
        [
          'Kenya Investment Networking Meetup',
          3,
          'Nairobi, Kenya',
          {
            start: '17:00',
            end: '20:00',
            tz: 'Africa/Nairobi',
            fmt: 'inperson',
            priv: 'public',
            cap: 120,
            topics: ['Investing', 'Funding']
          }
        ],
        [
          'AI for Business Leaders',
          7,
          '',
          {
            start: '14:00',
            end: '16:00',
            tz: 'Africa/Nairobi',
            fmt: 'online',
            platform: 'Zoom',
            link: 'https://zoom.us',
            priv: 'public',
            cap: 500,
            topics: ['Technology', 'Product']
          }
        ],
        [
          'Women in Tech Community',
          12,
          'Nairobi, Kenya',
          {
            start: '18:00',
            end: '20:00',
            tz: 'Africa/Nairobi',
            fmt: 'hybrid',
            priv: 'private',
            cap: 80,
            topics: ['Community', 'Mentoring']
          }
        ]
      ].forEach(([n, dd, loc, m]) =>
        DB.rooms.push({
          id: uid(),
          ownerId: DB.session,
          name: n,
          date: d(dd),
          location: loc,
          code: (n.replace(/[^A-Za-z]/g, '').slice(0, 3) + Math.floor(10 + Math.random() * 89)).toUpperCase(),
          created: Date.now(),
          meta: m,
          _m: m,
          demoUp: 1
        })
      );
      save();
    }
  } catch (_) {}
}
const _render91 = render;
render = function () {
  seedDemoRooms9();
  return _render91.apply(this, arguments);
};
/* ===== v10 My card (design: Digital My Card) ===== */
let CTAB = 'basic',
  SHT = 'qr',
  CD = null;
function cdInit() {
  const u = me();
  const L = u.links || {};
  CD = {
    name: u.name || '',
    role: u.role || '',
    company: u.company || '',
    city: u.city || '',
    bio: u.bio || '',
    linkedin: L.linkedin || '',
    x: L.x || '',
    website: L.website || '',
    calendar: L.calendar || '',
    email: L.email || '',
    phone: L.phone || '',
    tags: (L.tags || []).slice(0, 3),
    open: !!L.open,
    uid: u.id
  };
}
function cdUser() {
  const u = me();
  return Object.assign({}, u, {
    name: CD.name,
    role: CD.role,
    company: CD.company,
    city: CD.city,
    bio: CD.bio,
    links: Object.assign({}, u.links || {}, {
      linkedin: CD.linkedin,
      x: CD.x,
      website: CD.website,
      calendar: CD.calendar,
      email: CD.email,
      phone: CD.phone,
      tags: CD.tags,
      open: CD.open
    })
  });
}
const cdHref = v => (!v ? '' : /^https?:\/\//i.test(v) ? v : 'https://' + v);
function cdCard(u) {
  const t = THEMES[u.theme] || THEMES.midnight,
    L = u.links || {};
  const site = (L.website || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const ic = [
    ['li', L.linkedin && cdHref(L.linkedin), 'LinkedIn'],
    ['x', L.x && cdHref(/^@/.test(L.x) ? 'x.com/' + L.x.slice(1) : L.x), 'X'],
    ['cal', L.calendar && cdHref(L.calendar), 'Book a meeting'],
    ['link', L.website && cdHref(L.website), 'Website'],
    ['mail', L.email && 'mailto:' + L.email, 'Email']
  ];
  return `<div class="cd-card ${t.light ? 'lt' : ''}" style="background:${t.bg};color:${t.fg};--sub:${t.sub}"><div class="cd-top"><span class="x-logo ${t.light ? '' : 'dk'}"><span class="x-lm"><i></i><i></i></span><span>intro<b>thread</b></span></span>${sv('nfc', 22)}</div>
 <div class="cd-id"><span class="cd-ring">${avatarC(u, 112)}</span><b>${esc(u.name || 'Your name')}${u.email || u._c ? `<span class="d-ver" title="Verified account">${sv('check', 10, '#fff', 3.2)}</span>` : ''}</b><small>${esc(u.role || 'Your job title')}</small>${u.company ? `<small>${esc(u.company)}</small>` : ''}</div>
 <div class="cd-ics">${ic.map(([k, h, l]) => (h ? `<a href="${esc(h)}" target="_blank" rel="noopener" aria-label="${l}" title="${l}">${sv(k, 17)}</a>` : `<span class="off" title="Add your ${l} in Links &amp; social">${sv(k, 17)}</span>`)).join('')}</div>
 <button type="button" class="cd-save" data-on-click="cdVcf()">${sv('user', 17)} Save Contact</button>
 <div class="cd-rows">${u.city ? `<div>${sv('pin', 16)}<span>${esc(u.city)}</span></div>` : ''}${site ? `<div>${sv('globe', 16)}<span>${esc(site)}</span></div>` : ''}${u.bio ? `<div>${sv('brief', 16)}<span>${esc(u.bio)}</span></div>` : ''}${L.open ? `<div>${sv('spark', 16)}<span>Open to opportunities</span></div>` : ''}${!u.city && !site && !u.bio ? `<div><span class="cd-ph">Add your location, website and bio to complete your card.</span></div>` : ''}</div>
 ${(L.tags || []).length ? `<div class="t-tags cd-tags">${L.tags.map((x, k) => `<span class="${['b', 'v', 'g'][k]}">${esc(x)}</span>`).join('')}</div>` : ''}</div>`;
}
function cdLive() {
  const p = $('#cdprev');
  if (p) p.innerHTML = cdCard(cdUser());
  const c = $('#cdbc');
  if (c) c.textContent = (CD.bio || '').length;
  const tp = $('#cdtips');
  if (tp) tp.outerHTML = cdTips();
}
function cdIn(k, v) {
  CD[k] = v;
  cdLive();
}
function cdF(id, k, l, o = {}) {
  return `<label class="x-f"><span>${l}${o.req ? ' <i>*</i>' : o.opt ? ' <em>(optional)</em>' : ''}</span>${o.icon ? `<div class="cd-in">${sv(o.icon, 17)}` : ''}<input id="${id}" value="${esc(CD[k] || '')}" ${o.req ? 'required' : ''} maxlength="${o.max || 80}" placeholder="${o.ph || ''}" ${o.type ? `type="${o.type}"` : ''} autocomplete="${o.ac || 'off'}" data-on-input="cdIn('${k}',this.value)">${o.clear ? `<button type="button" class="cd-clr" aria-label="Clear ${l}" data-on-click="cdClear('${id}','${k}')">&times;</button>` : ''}${o.icon ? '</div>' : ''}</label>`;
}
function cdBioSuggest() {
  const r = CD.role || 'professional',
    c = CD.company,
    tp = CD.tags.length ? CD.tags.join(', ').toLowerCase() : 'partnerships and growth';
  const opts = [
    `${r}${c ? ' at ' + c : ''}. I help teams grow through ${tp}.`,
    `I connect people and ideas in ${tp}. ${r}${c ? ', ' + c : ''}.`,
    `${r} focused on ${tp}. Always happy to meet people building something meaningful.`
  ].map(s => s.slice(0, 160));
  modal(
    `<div><div class="row between"><h3 style="margin:0;font:600 19px var(--xss)">Improve your bio</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div><p class="fu-sub" style="margin-top:6px">Suggestions based on your title, company and topics. Pick one, then edit it to sound like you.</p><div class="cd-sug">${opts.map((s, i) => `<button type="button" data-on-click="cdBioPick(this)" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>`
  );
}
async function cdSave(e) {
  if (e) e.preventDefault();
  const u = me();
  if (!CD.name.trim()) {
    toast('Add your full name');
    return false;
  }
  if (!CD.role.trim()) {
    toast('Add your job title');
    return false;
  }
  for (const k of ['linkedin', 'website', 'calendar']) {
    const v = CD[k].trim();
    if (v && /\s/.test(v)) {
      toast('Check your ' + k + ' link, it contains spaces');
      return false;
    }
  }
  if (CD.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(CD.email.trim())) {
    toast('Check your contact email');
    return false;
  }
  const links = Object.assign({}, u.links || {}, {
    linkedin: CD.linkedin.trim(),
    x: CD.x.trim(),
    website: CD.website.trim(),
    calendar: CD.calendar.trim(),
    email: CD.email.trim(),
    phone: CD.phone.trim(),
    tags: CD.tags,
    open: CD.open
  });
  const patch = {
    name: CD.name.trim(),
    role: CD.role.trim(),
    company: CD.company.trim(),
    city: CD.city.trim(),
    bio: CD.bio.trim(),
    links
  };
  const b = $('#cdsave');
  if (b) {
    b.disabled = true;
    b.dataset.l = b.innerHTML;
    b.innerHTML = 'Saving...';
  }
  const ok = await upd('profiles', u.id, patch);
  if (b) {
    b.disabled = false;
    b.innerHTML = b.dataset.l;
  }
  if (!ok) return false;
  Object.assign(u, patch);
  save();
  toast('Card updated');
  window._keepScroll = true;
  render();
  return false;
}
function cdVcf() {
  const u = cdUser(),
    L = u.links;
  const v = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:' + u.name,
    u.role ? 'TITLE:' + u.role : '',
    u.company ? 'ORG:' + u.company : '',
    L.email ? 'EMAIL:' + L.email : '',
    L.phone ? 'TEL:' + L.phone : '',
    u.city ? 'ADR:;;;' + u.city + ';;;' : '',
    'URL:' + profileUrl(u),
    u.bio ? 'NOTE:' + u.bio.replace(/\n/g, ' ') : '',
    'END:VCARD'
  ]
    .filter(Boolean)
    .join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([v], { type: 'text/vcard' }));
  a.download = (u.name || 'contact').replace(/\s+/g, '-') + '.vcf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast('Contact card downloaded');
}
function cdPrint() {
  const u = cdUser();
  const d = document.createElement('div');
  qr(d, profileUrl(u), 400);
  const img = d.querySelector('img');
  const w = window.open('', '_blank');
  if (!w) return toast('Allow pop-ups to print your card.');
  w.document.write(
    `<!doctype html><title>${esc(u.name)} - Introthread card</title><style>body{font-family:sans-serif;display:flex;justify-content:center;padding:40px}.c{width:85mm;height:55mm;border:1px solid #ddd;border-radius:4mm;padding:6mm;display:flex;gap:5mm;align-items:center;box-sizing:border-box}.c img{width:30mm;height:30mm}b{font-size:15pt;display:block}span{display:block;font-size:9.5pt;color:#444;margin-top:1mm}small{display:block;margin-top:3mm;font-size:8.5pt;color:#1f5eff}@media print{body{padding:0}}</style><div class="c"><div style="flex:1"><b>${esc(u.name)}</b><span>${esc(u.role || '')}</span><span>${esc(u.company || '')}</span><small>introthread.com/${esc(u.handle)}</small></div>${img ? `<img src="${img.src}" alt="QR code">` : ''}</div><scr` +
      `ipt>setTimeout(()=>print(),300)</scr` +
      `ipt>`
  );
  w.document.close();
}
async function cdVis(on) {
  const u = me();
  const links = Object.assign({}, u.links || {}, { hidden: !on });
  if (await upd('profiles', u.id, { links })) {
    u.links = links;
    save();
    toast(on ? 'Your card is public' : 'Your card is now private');
    window._keepScroll = true;
    render();
  }
}
async function cdTheme(k) {
  await setTheme(k);
}
function cdTagT(x) {
  const i = CD.tags.indexOf(x);
  if (i >= 0) CD.tags.splice(i, 1);
  else {
    if (CD.tags.length >= 3) return toast('Pick up to 3 topics');
    CD.tags.push(x);
  }
  document.querySelectorAll('.cd-tp .tp').forEach(b => {
    const on = CD.tags.includes(b.dataset.v);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
  cdLive();
}
function cdTips() {
  const u = cdUser(),
    L = u.links;
  const nl = ['linkedin', 'x', 'website', 'calendar', 'email'].filter(k => L[k]).length;
  const T = [
    ['Add a clear professional photo', !!u.photo],
    ['Write a compelling bio', (u.bio || '').length >= 40],
    ['Include your key links', nl >= 2],
    ['Keep your information up to date', !!(u.role && u.company && u.city)]
  ];
  const n = T.filter(x => x[1]).length;
  return `<section class="d-box cd-tipb" id="cdtips"><div class="cd-bh"><span class="cd-bi o">${sv('spark', 20)}</span><div><b>Profile tips</b><small>${n === 4 ? 'Your card is complete.' : n + ' of 4 done'}</small></div></div><ul class="cd-tips">${T.map(([l, d]) => `<li class="${d ? 'ok' : ''}"><i>${d ? sv('check', 11, '#fff', 3.2) : ''}</i>${l}</li>`).join('')}</ul><div class="cd-pbar" role="progressbar" aria-valuemin="0" aria-valuemax="4" aria-valuenow="${n}" aria-label="Card completeness"><span style="width:${n * 25}%"></span></div></section>`;
}
function cdShare(u) {
  const url = profileUrl(u),
    short = 'introthread.com/' + u.handle;
  const tabs = `<div class="cd-st" role="tablist">${[
    ['qr', 'QR code'],
    ['link', 'Link'],
    ['nfc', 'NFC card']
  ]
    .map(
      ([k, l]) =>
        `<button type="button" role="tab" aria-selected="${SHT === k}" class="${SHT === k ? 'on' : ''}" data-on-click="cdShTab('${k}')">${l}</button>`
    )
    .join('')}</div>`;
  const urlRow = `<div class="cd-url"><input value="${esc(short)}" readonly aria-label="Your card link"><button type="button" class="x-btn" aria-label="Copy link" data-on-click="copy('${url}','Link copied')">${sv('copy', 18)}</button></div>`;
  const body =
    SHT === 'qr'
      ? `<div class="cd-qr"><div id="qrCard9"></div><span class="t-qrlogo"><span class="x-lm"><i></i><i></i></span></span></div>${urlRow}<button type="button" class="t-start cd-dl" data-on-click="tapDownloadQR()">${sv('arrow', 18).replace('M5 12h14M13 6l6 6-6 6', 'M12 5v14M6 13l6 6 6-6')} Download QR code</button><p class="cd-cap">Print it, add to your email signature or use it at events.</p>`
      : SHT === 'link'
        ? `${urlRow}<div class="cd-sh">${[
            ['WhatsApp', `https://wa.me/?text=${encodeURIComponent('My Introthread card: ' + url)}`],
            [
              'Email',
              `mailto:?subject=${encodeURIComponent('My Introthread card')}&body=${encodeURIComponent(url)}`
            ],
            ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`],
            ['SMS', `sms:?&body=${encodeURIComponent(url)}`]
          ]
            .map(([l, h]) => `<a href="${h}" target="_blank" rel="noopener">${l}</a>`)
            .join(
              ''
            )}</div><button type="button" class="t-start cd-dl" data-on-click="shareNative()">${sv('send', 18)} Share my card</button><p class="cd-cap">Your link always shows your latest card, even on printed QR codes.</p>`
        : `<div class="cd-nfc"><span>${sv('nfc', 30)}</span><p>Write your link to any NFC card or sticker. A tap on their phone opens your card, no app needed.</p></div><button type="button" class="t-start cd-dl" data-on-click="tapNFC()">${sv('nfc', 18)} Write to an NFC card</button><p class="cd-cap">Works in Chrome on Android. On iPhone, use your QR code or link.</p>`;
  return `<section class="d-box cd-share"><div class="cd-bh"><span class="cd-bi">${sv('hub', 20)}</span><div><b>Share your card</b><small>Meet people instantly, no app needed.</small></div></div>${tabs}${body}</section>`;
}
function vCard() {
  const u = me();
  if (!CD || CD.uid !== u.id) cdInit();
  const pub = !(u.links && u.links.hidden);
  const cu = cdUser();
  const tabs = [
    ['basic', 'Basic information'],
    ['links', 'Links &amp; social'],
    ['style', 'Card style'],
    ['share', 'QR code &amp; sharing'],
    ['adv', 'Advanced']
  ];
  let form = '';
  if (CTAB === 'basic')
    form = `<div class="cd-photo"><span class="cd-pav">${avatarC(u, 112)}<label class="cd-cam" aria-label="Upload photo">${sv('photo', 16)}<input type="file" hidden accept="image/jpeg,image/png,image/webp" data-on-change="pickPhoto(this,1)"></label></span><div><b>Profile photo</b><small>JPG, PNG or WebP (max 5MB)</small><div class="cd-pb"><label class="t-how sm">${sv('photo', 16)} ${u.photo ? 'Change photo' : 'Upload photo'}<input type="file" hidden accept="image/jpeg,image/png,image/webp" data-on-change="pickPhoto(this,1)"></label>${u.photo ? `<button type="button" class="cd-rm" data-on-click="removePhoto()">${sv('close', 15)} Remove</button>` : ''}</div></div></div>
  <div class="t-g2">${cdF('cdn', 'name', 'Full name', { req: 1, ac: 'name' })}${cdF('cdr', 'role', 'Job title', { req: 1, ph: 'e.g. Marketing Director' })}${cdF('cdc', 'company', 'Company', { ph: 'e.g. Acme Technologies' })}${cdF('cdl', 'city', 'Location', { icon: 'pin', clear: 1, ph: 'City, Country' })}</div>
  <label class="x-f"><span class="cd-bl">Bio <small id="cdbcw"><b id="cdbc">${(CD.bio || '').length}</b>/160</small></span><textarea id="cdb" maxlength="160" rows="3" placeholder="What you do and who you help" data-on-input="cdIn('bio',this.value)">${esc(CD.bio)}</textarea></label>`;
  else if (CTAB === 'links')
    form = `<p class="cd-help">These links power the icons on your card. Leave any blank to hide it.</p><div class="t-g2">${cdF('cli', 'linkedin', 'LinkedIn', { icon: 'li', opt: 1, ph: 'linkedin.com/in/you', max: 200 })}${cdF('cx', 'x', 'X (Twitter)', { icon: 'x', opt: 1, ph: '@handle or x.com/you', max: 200 })}${cdF('cw', 'website', 'Website', { icon: 'globe', opt: 1, ph: 'yourcompany.com', max: 200 })}${cdF('ck', 'calendar', 'Booking link', { icon: 'cal', opt: 1, ph: 'cal.com/you or calendly.com/you', max: 200 })}${cdF('ce', 'email', 'Contact email', { icon: 'mail', opt: 1, ph: 'name@company.com', type: 'email', max: 120 })}${cdF('cp', 'phone', 'Phone', { icon: 'phone', opt: 1, ph: '+44 7700 900000', type: 'tel', max: 30 })}</div><p class="cd-help">Your email and phone are only added to the contact file people save. They are not shown as text on your public card.</p>`;
  else if (CTAB === 'style')
    form = `<div class="cd-styles">${Object.entries(THEMES)
      .map(
        ([k, v]) =>
          `<button type="button" class="cd-sty ${u.theme === k ? 'on' : ''}" aria-pressed="${u.theme === k}" data-on-click="cdTheme('${k}')"><span style="background:${v.bg}">${u.theme === k ? `<i>${sv('check', 12, '#fff', 3.2)}</i>` : ''}</span><b>${v.n}</b><small>${esc(v.d || '')}</small></button>`
      )
      .join('')}</div>
  <div class="x-f cd-tp"><span>Card topics <em>(up to 3, shown on your card)</em></span><div class="tp-wrap">${[...new Set([...TOPICS, ...CD.tags])].map(x => `<button type="button" class="tp ${CD.tags.includes(x) ? 'on' : ''}" aria-pressed="${CD.tags.includes(x)}" data-v="${esc(x)}" data-on-click="cdTagT(this.dataset.v)">${esc(x)}</button>`).join('')}</div></div>
  <label class="t-tog"><input type="checkbox" ${CD.open ? 'checked' : ''} data-on-change="cdIn('open',this.checked)"><span class="t-sw"></span><span><b>Open to opportunities</b><small>Show a badge on your card.</small></span></label>`;
  else if (CTAB === 'share')
    form = `<div class="cd-qrbig"><div class="cd-qr lg"><div id="qrCard10"></div><span class="t-qrlogo"><span class="x-lm"><i></i><i></i></span></span></div><div><b>Your dynamic QR code</b><p>Print it once. It always opens your latest card, so you never need to reprint after changes.</p><div class="cd-pb"><button type="button" class="x-btn" data-on-click="tapDownloadQR()">Download PNG</button><button type="button" class="t-how" data-on-click="tapQR()">${sv('qr', 16)} Full screen</button><button type="button" class="t-how" data-on-click="cdPrint()">Print card</button></div></div></div>`;
  else
    form = `<div class="cd-adv"><div><b>Your Introthread link</b><small>introthread.com/${esc(u.handle)}</small><a class="t-how sm" href="/app/settings">Change in Settings</a></div><div><b>Contact file</b><small>Download your card as a contact (vCard) to share by email or AirDrop.</small><button type="button" class="t-how sm" data-on-click="cdVcf()">Download .vcf</button></div><div><b>Public profile</b><small>Choose what appears on your full public profile page.</small><a class="t-how sm" href="/app/profile">Edit public profile</a></div><div><b>Visibility</b><small>${pub ? 'Anyone with your link or QR code can view your card.' : 'Only you can see your card right now.'}</small><button type="button" class="t-how sm" data-on-click="cdVis(${!pub})">${pub ? 'Make private' : 'Make public'}</button></div></div>`;
  const showSave = ['basic', 'links', 'style'].includes(CTAB);
  setTimeout(() => {
    const a = $('#qrCard9');
    if (a) qr(a, profileUrl(u), 150);
    const b = $('#qrCard10');
    if (b) qr(b, profileUrl(u), 200);
  }, 20);
  return shell(
    'card',
    `<div class="t-head"><div><div class="t-eye">My card</div><h1 class="t-h1">Your professional identity</h1><p class="t-sub">Create and customise your Introthread card. Share it via QR code, link or NFC. Changes update instantly.</p></div><a href="/${esc(u.handle)}" class="t-how" target="_blank" rel="noopener">${sv('eye', 18)} View public profile</a></div>
 <div class="cd-grid">
 <div class="cd-left"><nav class="cd-tabs" role="tablist" aria-label="Card sections">${tabs.map(([k, l]) => `<button type="button" role="tab" aria-selected="${CTAB === k}" class="${CTAB === k ? 'on' : ''}" data-on-click="cdTab('${k}')">${l}</button>`).join('')}</nav>
 <div class="cd-top2"><form class="d-box cd-form" data-on-submit="return cdSave(event)" autocomplete="off" novalidate>${form}${showSave ? `<div class="cd-fb">${CTAB === 'basic' ? `<button type="button" class="t-how" data-on-click="cdBioSuggest()">${sv('spark', 16)} Improve my bio</button>` : '<span></span>'}<button class="x-btn lg cd-sv" id="cdsave">${sv('lock', 17)} Save changes</button></div>` : ''}</form>
 <div class="cd-pv" id="cdprev">${cdCard(cu)}</div></div></div>
 <div class="cd-right">${cdShare(u)}
 <section class="d-box cd-vis"><div class="cd-bh"><span class="cd-bi">${sv('globe', 20)}</span><div><b>Card visibility</b><small>Allow anyone with your link or QR code to view your card.</small></div><span class="cd-pill ${pub ? '' : 'off'}">${pub ? 'Public' : 'Private'}</span></div><label class="t-tog cd-vt"><input type="checkbox" ${pub ? 'checked' : ''} data-on-change="cdVis(this.checked)" aria-label="Card is public"><span class="t-sw"></span><span><b>${pub ? 'Visible to anyone with your link' : 'Hidden from visitors'}</b></span></label><a class="cd-visit" href="/${esc(u.handle)}" target="_blank" rel="noopener">View as visitor ${sv('arrow', 14)}</a><small class="cd-lock">${sv('lock', 14)} Control what information is visible on your <a href="/app/profile">public profile</a>.</small></section></div>
 <section class="d-box cd-stb"><div class="cd-bh"><span class="cd-bi">${sv('palette', 20)}</span><div><b>Card style</b><small>Choose a style for your Introthread card.</small></div></div><div class="cd-sw">${Object.entries(
   THEMES
 )
   .map(
     ([k, v]) =>
       `<button type="button" class="${u.theme === k ? 'on' : ''}" aria-pressed="${u.theme === k}" aria-label="${v.n} style" data-on-click="cdTheme('${k}')"><span style="background:${v.bg}">${u.theme === k ? `<i>${sv('check', 11, '#fff', 3.2)}</i>` : ''}</span><small>${v.n}</small></button>`
   )
   .join('')}</div></section>
 <section class="d-box cd-qab"><div class="cd-bh"><span class="cd-bi">${sv('spark', 20)}</span><div><b>Quick actions</b><small>Common actions for your card.</small></div></div><div class="cd-qa"><button type="button" data-on-click="shareNative()">${sv('send', 18)} Share my card</button><button type="button" data-on-click="cdPrint()">${sv('brief', 18)} Print card</button><button type="button" data-on-click="toast('Apple Wallet passes are coming soon.')">${sv('wallet', 18)} Add to Apple Wallet</button><button type="button" data-on-click="toast('Google Wallet passes are coming soon.')">${sv('wallet', 18)} Add to Google Wallet</button></div></section>
 ${cdTips()}
 </div>`
  );
}

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
let PTAB = 'info',
  PP = null,
  PPT = null;
function ppInit() {
  const u = me(),
    L = u.links || {};
  PP = {
    uid: u.id,
    name: u.name || '',
    role: u.role || '',
    company: u.company || '',
    city: u.city || '',
    bio: u.bio || '',
    headline: L.headline || '',
    topics: (L.interests || L.tags || []).slice(0, 10),
    linkedin: L.linkedin || '',
    x: L.x || '',
    website: L.website || '',
    calendar: L.calendar || '',
    email: L.email || '',
    phone: L.phone || '',
    extra: (L.extra || []).slice(0, 3),
    open: !!L.open,
    show: Object.assign({ loc: true, co: true, topics: true, bio: true }, L.show || {}),
    seoDesc: L.seoDesc || '',
    noindex: !!L.noindex
  };
}
function ppUser() {
  const u = me();
  return Object.assign({}, u, {
    name: PP.name,
    role: PP.role,
    company: PP.company,
    city: PP.city,
    bio: PP.bio,
    links: Object.assign({}, u.links || {}, {
      headline: PP.headline,
      interests: PP.topics,
      linkedin: PP.linkedin,
      x: PP.x,
      website: PP.website,
      calendar: PP.calendar,
      email: PP.email,
      phone: PP.phone,
      extra: PP.extra.filter(Boolean),
      open: PP.open,
      show: PP.show,
      seoDesc: PP.seoDesc,
      noindex: PP.noindex
    })
  });
}
function ppCard(u) {
  const t = THEMES[u.theme] || THEMES.midnight,
    L = u.links || {},
    S = L.show || {};
  const tp = L.interests || L.tags || [];
  const ic = [
    ['li', L.linkedin && cdHref(L.linkedin), 'LinkedIn'],
    ['x', L.x && cdHref(/^@/.test(L.x) ? 'x.com/' + L.x.slice(1) : L.x), 'X'],
    ['cal', L.calendar && cdHref(L.calendar), 'Book a meeting'],
    ['link', L.website && cdHref(L.website), 'Website'],
    ['mail', L.email && 'mailto:' + L.email, 'Email']
  ];
  const facts = [
    S.loc !== false && u.city ? `<div>${sv('pin', 18)}<span>${esc(u.city)}</span></div>` : '',
    S.co !== false && u.company ? `<div>${sv('building', 18)}<span>${esc(u.company)}</span></div>` : '',
    L.open
      ? `<div class="ok"><i>${sv('check', 10, '#fff', 3.2)}</i><span>Open to<b>Networking</b></span></div>`
      : ''
  ].filter(Boolean);
  return `<div class="pp-card ${t.light ? 'lt' : ''}" style="background:${t.bg};color:${t.fg};--sub:${t.sub}"><div class="pp-top"><span class="x-logo ${t.light ? '' : 'dk'}"><span class="x-lm"><i></i><i></i></span><span>intro<b>thread</b></span></span><button type="button" class="pp-sh" data-on-click="shareNative()">${sv('hub', 17)} Share</button></div>
 <div class="pp-id"><span class="pp-ring">${avatarC(u, 140)}<i title="Verified account">${sv('check', 13, '#fff', 3.2)}</i></span><h2>${esc(u.name || 'Your name')}</h2><p class="pp-role">${esc(u.role || 'Your job title')}${u.company ? ` <span>&bull;</span> ${esc(u.company)}` : ''}</p>${L.headline ? `<p class="pp-hl">${esc(L.headline)}</p>` : ''}${S.bio !== false && u.bio ? `<p class="pp-bio">${esc(u.bio)}</p>` : ''}</div>
 <div class="pp-ics">${ic.map(([k, h, l]) => (h ? `<a href="${esc(h)}" target="_blank" rel="noopener" aria-label="${l}" title="${l}">${sv(k, 19)}</a>` : `<span class="off" title="Add your ${l} in Links &amp; social">${sv(k, 19)}</span>`)).join('')}</div>
 <div class="pp-info">${facts.length ? `<div class="pp-facts">${facts.join('')}</div>` : ''}${
   S.topics !== false && tp.length
     ? `<div class="pp-tps">${tp
         .slice(0, 5)
         .map(x => {
           const c = colorFor(x);
           return `<i style="color:${c};background:${c}17">${esc(x)}</i>`;
         })
         .join(
           ''
         )}${tp.length > 5 ? `<i class="more" title="${esc(tp.slice(5).join(', '))}">+${tp.length - 5}</i>` : ''}</div>`
     : ''
 }${!facts.length && !(S.topics !== false && tp.length) ? `<div class="pp-empty">Add your location, company and topics to complete your profile.</div>` : ''}</div>
 <button type="button" class="pp-save" data-on-click="ppVcf()">${sv('user', 18)} Save Contact</button></div>`;
}
function ppVcf() {
  const u = ppUser(),
    L = u.links;
  const v = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:' + u.name,
    u.role ? 'TITLE:' + u.role : '',
    u.company ? 'ORG:' + u.company : '',
    L.email ? 'EMAIL:' + L.email : '',
    L.phone ? 'TEL:' + L.phone : '',
    'URL:' + profileUrl(u),
    u.bio ? 'NOTE:' + u.bio.replace(/\n/g, ' ') : '',
    'END:VCARD'
  ]
    .filter(Boolean)
    .join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([v], { type: 'text/vcard' }));
  a.download = (u.name || 'contact').replace(/\s+/g, '-') + '.vcf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast('Contact card downloaded');
}
function ppStatus(s) {
  const e = $('#ppst');
  if (e) {
    e.textContent = s;
    e.className = 'pp-st ' + (s === 'Saved' ? 'ok' : s === 'Saving...' ? '' : 'err');
  }
}
function ppLive() {
  const p = $('#ppprev');
  if (p) p.innerHTML = ppCard(ppUser());
  const c = $('#ppbc');
  if (c) c.textContent = (PP.bio || '').length;
  const d = $('#ppdc');
  if (d) d.textContent = (PP.seoDesc || '').length;
  const g = $('#ppgs');
  if (g) g.innerHTML = ppSnippet();
}
function ppSet(k, v) {
  PP[k] = v;
  ppLive();
  ppQueue();
}
function ppQueue() {
  clearTimeout(PPT);
  ppStatus('Unsaved changes');
  PPT = setTimeout(ppSave, 900);
}
async function ppSave() {
  clearTimeout(PPT);
  const u = me();
  if (!PP.name.trim()) {
    ppStatus('Full name is required');
    return;
  }
  if (!PP.role.trim()) {
    ppStatus('Job title is required');
    return;
  }
  if (PP.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(PP.email.trim())) {
    ppStatus('Check your contact email');
    return;
  }
  const nu = ppUser();
  const patch = {
    name: nu.name.trim(),
    role: nu.role.trim(),
    company: nu.company.trim(),
    city: nu.city.trim(),
    bio: nu.bio.trim(),
    links: nu.links
  };
  ppStatus('Saving...');
  const ok = await upd('profiles', u.id, patch);
  if (!ok) {
    ppStatus('Not saved. Check your connection.');
    return;
  }
  Object.assign(u, patch);
  save();
  CD = null;
  PF = null;
  ppStatus('Saved');
}
function ppF(id, k, l, o = {}) {
  return `<label class="x-f"><span>${l}${o.req ? ' <i>*</i>' : o.opt ? ' <em>(optional)</em>' : ''}</span>${o.icon ? `<div class="cd-in">${sv(o.icon, 17)}` : ''}<input id="${id}" value="${esc(PP[k] || '')}" maxlength="${o.max || 80}" placeholder="${o.ph || ''}" ${o.type ? `type="${o.type}"` : ''} autocomplete="off" data-on-input="ppSet('${k}',this.value)">${o.clear ? `<button type="button" class="cd-clr" aria-label="Clear ${l}" data-on-click="ppClear('${id}','${k}')">&times;</button>` : ''}${o.icon ? '</div>' : ''}</label>`;
}
function ppTopicRm(i) {
  PP.topics.splice(i, 1);
  $('#pptp').innerHTML = ppTopics();
  ppLive();
  ppQueue();
}
function ppTopicAdd(v) {
  v = String(v || '')
    .trim()
    .replace(/[,#]/g, '')
    .slice(0, 24);
  if (!v) return;
  if (PP.topics.length >= 10) return toast('You can add up to 10 topics');
  if (PP.topics.some(x => x.toLowerCase() === v.toLowerCase())) return toast('That topic is already added');
  PP.topics.push(v);
  $('#pptp').innerHTML = ppTopics();
  ppLive();
  ppQueue();
  const i = $('#ppta');
  if (i) i.focus();
}
function ppTopics() {
  const sug = TOPICS.filter(x => !PP.topics.includes(x));
  return (
    PP.topics
      .map(
        (x, i) =>
          `<span class="pp-tp">${esc(x)}<button type="button" aria-label="Remove ${esc(x)}" data-on-click="ppTopicRm(${i})">&times;</button></span>`
      )
      .join('') +
    (PP.topics.length < 10
      ? `<label class="pp-tpa">${sv('close', 14, 'currentColor', 2.2).replace('<path d="M6 6l12 12M18 6 6 18"/>', '<path d="M12 5v14M5 12h14"/>')}<input id="ppta" list="ppsug" placeholder="Add topic" maxlength="24" data-on-keydown="ppTopicKey(event,this)" data-on-change="ppTopicChange(this)"><datalist id="ppsug">${sug.map(x => `<option value="${esc(x)}">`).join('')}</datalist></label>`
      : '')
  );
}
function ppAI() {
  const r = PP.role || 'Professional',
    c = PP.company,
    tp = PP.topics.slice(0, 3);
  const area = tp.length ? tp.join(', ') : 'partnerships and growth';
  const hl = [
    tp.length ? tp.join(', ').replace(/, ([^,]*)$/, ' & $1') : r,
    `${r}${c ? ' at ' + c : ''}`,
    `Helping teams grow through ${area.toLowerCase()}`
  ].map(s => s.slice(0, 80));
  const bio = [
    `${r}${c ? ' at ' + c : ''}. I help teams grow through ${area.toLowerCase()}. Open to connecting with founders, investors and operators.`,
    `I work at the intersection of ${area.toLowerCase()}. ${r}${c ? ', ' + c : ''}. Happy to meet people building something meaningful.`,
    `${r} focused on ${area.toLowerCase()}. I enjoy turning introductions into real partnerships.`
  ].map(s => s.slice(0, 200));
  modal(`<div><div class="row between"><h3 style="margin:0;font:600 19px var(--xss)">Suggest a headline and bio</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div><p class="fu-sub" style="margin-top:6px">Built from your title, company and topics. Pick one of each, then edit it to sound like you.</p>
 <b class="pp-sl">Headline</b><div class="cd-sug">${hl.map(s => `<button type="button" data-v="${esc(s)}" data-on-click="ppPick(this,'headline','pph')">${esc(s)}</button>`).join('')}</div>
 <b class="pp-sl">Bio</b><div class="cd-sug">${bio.map(s => `<button type="button" data-v="${esc(s)}" data-on-click="ppPick(this,'bio','ppb')">${esc(s)}</button>`).join('')}</div><div class="fu-b"><button type="button" class="x-btn" data-on-click="closeModal()">Done</button></div></div>`);
}
function ppSnippet() {
  const u = ppUser();
  const t = `${u.name || 'Your name'}${u.role ? ' - ' + u.role : ''}${u.company ? ' at ' + u.company : ''} | Introthread`;
  const d = (PP.seoDesc || u.bio || 'Connect with ' + (u.name || 'me') + ' on Introthread.').slice(0, 160);
  return `<small>introthread.com &rsaquo; ${esc(u.handle)}</small><b>${esc(t)}</b><p>${esc(d)}</p>`;
}
async function ppTheme(k) {
  await setTheme(k);
}
function ppShow(k, on) {
  PP.show[k] = on;
  ppLive();
  ppQueue();
}
function vProfile() {
  const u = me();
  if (!PP || PP.uid !== u.id) ppInit();
  const pub = !(u.links && u.links.hidden);
  const url = profileUrl(u),
    short = 'introthread.com/' + u.handle;
  const tabs = [
    ['info', 'Profile information'],
    ['links', 'Links &amp; social'],
    ['look', 'Appearance'],
    ['seo', 'SEO &amp; sharing']
  ];
  let body = '';
  if (PTAB === 'info')
    body = `<section class="pp-sec"><div class="cd-bh"><span class="cd-bi">${sv('user', 20)}</span><div><b>Basic information</b><small>Edit your public profile. Changes appear instantly.</small></div><button type="button" class="pp-ai" data-on-click="ppAI()">${sv('spark', 16)} Suggest with AI</button></div>
  <div class="t-g2 pp-g">${ppF('ppn', 'name', 'Full name', { req: 1 })}${ppF('ppr', 'role', 'Job title', { req: 1, ph: 'e.g. Marketing Director' })}${ppF('ppc', 'company', 'Company', { ph: 'e.g. Acme Technologies' })}${ppF('pph', 'headline', 'Headline', { ph: 'e.g. B2B Growth, Partnerships & Technology', max: 80 })}
  <div class="pp-col">${ppF('ppl', 'city', 'Location', { icon: 'pin', clear: 1, ph: 'City, Country' })}<label class="t-tog pp-open"><input type="checkbox" ${PP.open ? 'checked' : ''} data-on-change="ppSet('open',this.checked)"><span class="t-sw"></span><span><b>Open to networking</b><small>Show this on your profile.</small></span></label></div>
  <label class="x-f"><span>Bio</span><div class="pp-ta"><textarea id="ppb" maxlength="200" rows="4" placeholder="What you do, who you help and who you want to meet" data-on-input="ppSet('bio',this.value)">${esc(PP.bio)}</textarea><small><b id="ppbc">${PP.bio.length}</b>/200</small></div></label></div></section>
  <section class="pp-sec"><div class="cd-bh"><span class="cd-bi">${sv('palette', 20)}</span><div><b>Topics &amp; interests <em>(up to 10)</em></b><small>Help people understand what you&rsquo;re interested in.</small></div></div><div class="pp-tps2" id="pptp">${ppTopics()}</div></section>`;
  else if (PTAB === 'links')
    body = `<section class="pp-sec"><div class="cd-bh"><span class="cd-bi">${sv('link', 20)}</span><div><b>Links &amp; social</b><small>These power the icon buttons on your profile. Leave any blank to hide it.</small></div></div><div class="t-g2 pp-g">${ppF('pli', 'linkedin', 'LinkedIn', { icon: 'li', opt: 1, ph: 'linkedin.com/in/you', max: 200 })}${ppF('plx', 'x', 'X (Twitter)', { icon: 'x', opt: 1, ph: '@handle or x.com/you', max: 200 })}${ppF('plw', 'website', 'Website', { icon: 'globe', opt: 1, ph: 'yourcompany.com', max: 200 })}${ppF('plk', 'calendar', 'Booking link', { icon: 'cal', opt: 1, ph: 'cal.com/you', max: 200 })}${ppF('ple', 'email', 'Contact email', { icon: 'mail', opt: 1, ph: 'name@company.com', type: 'email', max: 120 })}${ppF('plp', 'phone', 'Phone', { icon: 'phone', opt: 1, ph: '+44 7700 900000', type: 'tel', max: 30 })}</div><p class="cd-help">Email and phone go only into the contact file people save. They are never shown as text on your profile.</p></section>`;
  else if (PTAB === 'look')
    body = `<section class="pp-sec"><div class="cd-bh"><span class="cd-bi">${sv('palette', 20)}</span><div><b>Card style</b><small>The same style is used on your card and public profile.</small></div></div><div class="cd-styles">${Object.entries(
      THEMES
    )
      .map(
        ([k, v]) =>
          `<button type="button" class="cd-sty ${u.theme === k ? 'on' : ''}" aria-pressed="${u.theme === k}" data-on-click="ppTheme('${k}')"><span style="background:${v.bg}">${u.theme === k ? `<i>${sv('check', 12, '#fff', 3.2)}</i>` : ''}</span><b>${v.n}</b><small>${esc(v.d || '')}</small></button>`
      )
      .join('')}</div></section>
  <section class="pp-sec"><div class="cd-bh"><span class="cd-bi">${sv('eye', 20)}</span><div><b>What visitors see</b><small>Choose which details appear on your public profile.</small></div></div><div class="pp-shw">${[
    ['bio', 'Bio'],
    ['loc', 'Location'],
    ['co', 'Company'],
    ['topics', 'Topics &amp; interests']
  ]
    .map(
      ([k, l]) =>
        `<label class="t-tog"><input type="checkbox" ${PP.show[k] !== false ? 'checked' : ''} data-on-change="ppShow('${k}',this.checked)"><span class="t-sw"></span><span><b>${l}</b></span></label>`
    )
    .join('')}</div></section>`;
  else
    body = `<section class="pp-sec"><div class="cd-bh"><span class="cd-bi">${sv('search', 20)}</span><div><b>Search preview</b><small>How your profile can appear in Google and when shared.</small></div></div><div class="pp-gs" id="ppgs">${ppSnippet()}</div>
  <label class="x-f" style="margin-top:14px"><span class="cd-bl">Search description <small><b id="ppdc">${PP.seoDesc.length}</b>/160</small></span><textarea id="ppd" maxlength="160" rows="3" placeholder="Leave blank to use your bio" data-on-input="ppSet('seoDesc',this.value)">${esc(PP.seoDesc)}</textarea></label>
  <label class="t-tog" style="margin-top:12px"><input type="checkbox" ${PP.noindex ? '' : 'checked'} data-on-change="ppSet('noindex',!this.checked)"><span class="t-sw"></span><span><b>Allow search engines to show my profile</b><small>Turn off to ask Google and Bing not to index your page.</small></span></label></section>`;
  return shell(
    'pub',
    `<div class="t-head"><div><div class="t-eye">Public profile</div><h1 class="t-h1">Your professional profile</h1><p class="t-sub">This is what people see when you share your Introthread link or QR code.</p></div><a href="/${esc(u.handle)}" class="t-how" target="_blank" rel="noopener">${sv('eye', 18)} View as visitor</a></div>
 <div class="pp-grid"><div class="pp-pv" id="ppprev">${ppCard(ppUser())}</div>
 <div class="pp-ed"><div class="pp-tabbar"><nav class="cd-tabs pp-tabs" role="tablist" aria-label="Profile sections">${tabs.map(([k, l]) => `<button type="button" role="tab" aria-selected="${PTAB === k}" class="${PTAB === k ? 'on' : ''}" data-on-click="ppTab('${k}')">${l}</button>`).join('')}</nav><span class="pp-st ok" id="ppst" role="status" aria-live="polite">All changes saved</span></div><div class="d-box pp-box">${body}</div></div></div>
 <div class="pp-bot"><section class="d-box"><div class="cd-bh"><span class="cd-bi">${sv('link', 20)}</span><div><b>Profile link</b><small>Your unique Introthread link.</small></div></div><div class="cd-url"><input value="${esc(short)}" readonly aria-label="Your profile link"><button type="button" class="x-btn pp-copy" data-on-click="copy('${url}','Link copied')">${sv('copy', 17)} Copy link</button></div></section>
 <section class="d-box"><div class="cd-bh"><span class="cd-bi">${sv('hub', 20)}</span><div><b>Share options</b><small>Choose how people can find and connect with you.</small></div></div><div class="pp-so"><button type="button" class="on" data-on-click="tapQR()">${sv('qr', 19)} QR code</button><button type="button" data-on-click="shareNative()">${sv('link', 19)} Link</button><button type="button" data-on-click="tapNFC()">${sv('nfc', 19)} NFC card</button></div></section>
 <section class="d-box"><div class="cd-bh"><span class="cd-bi">${sv('eye', 20)}</span><div><b>Profile visibility</b><small>Control who can view your public profile.</small></div></div><label class="t-tog"><input type="checkbox" ${pub ? 'checked' : ''} data-on-change="cdVis(this.checked)" aria-label="Public profile"><span class="t-sw"></span><span><b>${pub ? 'Public profile' : 'Private profile'}</b><small>${pub ? 'Allow anyone with your link or QR code to view your profile.' : 'Only you can see your profile right now.'}</small></span></label></section></div>`
  );
}
/* public page: apply profile SEO settings */
const _vPub11 = vPublic;
vPublic = function (hd) {
  const out = _vPub11(hd);
  setTimeout(() => {
    try {
      const u = DB.users.find(x => x.handle === String(hd).toLowerCase());
      if (u && !(u.links && u.links.hidden)) {
        const L = u.links || {};
        document.title = `${u.name}${u.role ? ' - ' + u.role : ''}${u.company ? ' at ' + u.company : ''} | Introthread`;
        const d = document.querySelector('meta[name="description"]');
        if (d)
          d.setAttribute(
            'content',
            (L.seoDesc || u.bio || 'Connect with ' + u.name + ' on Introthread.').slice(0, 160)
          );
        let r = document.querySelector('meta[name="robots"]');
        if (L.noindex) {
          if (!r) {
            r = document.createElement('meta');
            r.name = 'robots';
            document.head.appendChild(r);
          }
          r.content = 'noindex';
        } else if (r) r.remove();
      }
    } catch (_) {}
  }, 0);
  return out;
};
const _cdSave11 = cdSave;
cdSave = async function (e) {
  const r = await _cdSave11.call(this, e);
  PP = null;
  return r;
};

/* ===== v12 Account settings (design: Account Settings) ===== */
let ST12 = null;
const ST_TABS = [
  ['account', 'Account', 'user'],
  ['privacy', 'Privacy &amp; visibility', 'shield'],
  ['notifications', 'Notifications', 'bell'],
  ['integrations', 'Integrations', 'link'],
  ['preferences', 'Preferences', 'grid'],
  ['security', 'Security', 'lock'],
  ['billing', 'Billing', 'brief']
];
function st12Init() {
  const u = me();
  ST12 = { uid: u.id, topics: ((u.links || {}).interests || (u.links || {}).tags || []).slice(0, 10) };
}
function st12Topics() {
  return (
    ST12.topics
      .map(
        (x, i) =>
          `<span class="pp-tp">${esc(x)}<button type="button" aria-label="Remove ${esc(x)}" data-on-click="st12TopicDel(${i})">&times;</button></span>`
      )
      .join('') +
    (ST12.topics.length < 10
      ? `<label class="pp-tpa">${sv('close', 14, 'currentColor', 2.2).replace('<path d="M6 6l12 12M18 6 6 18"/>', '<path d="M12 5v14M5 12h14"/>')}<input id="stta" list="stsug" placeholder="Add topic" maxlength="24" data-on-keydown="stTopicKey(event,this)" data-on-change="stTopicChange(this)"><datalist id="stsug">${TOPICS.filter(
          x => !ST12.topics.includes(x)
        )
          .map(x => `<option value="${esc(x)}">`)
          .join('')}</datalist></label>`
      : '')
  );
}
function st12TopicAdd(v) {
  v = String(v || '')
    .trim()
    .replace(/[,#]/g, '')
    .slice(0, 24);
  if (!v) return;
  if (ST12.topics.length >= 10) return toast('You can add up to 10 topics');
  if (ST12.topics.some(x => x.toLowerCase() === v.toLowerCase())) return toast('That topic is already added');
  ST12.topics.push(v);
  $('#sttp').innerHTML = st12Topics();
  const i = $('#stta');
  if (i) i.focus();
}
async function stSave(btn) {
  const u = me();
  const v = id => (($('#' + id) || {}).value || '').trim();
  const name = v('stn'),
    em = v('ste').toLowerCase();
  if (!name) return toast('Add your full name');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return toast('Enter a valid email address');
  const num = v('stp');
  if (num && !/^[\d\s()-]{5,20}$/.test(num)) return toast('Check your phone number');
  const links = Object.assign({}, u.links || {}, {
    phone: num ? v('stcc') + ' ' + num : '',
    interests: ST12.topics
  });
  const patch = { name, role: v('str'), company: v('stc'), city: v('stct'), bio: v('stb'), links };
  btn.disabled = true;
  const lab = btn.innerHTML;
  btn.innerHTML = 'Saving...';
  const ok = await upd('profiles', u.id, patch);
  btn.disabled = false;
  btn.innerHTML = lab;
  if (!ok) return;
  Object.assign(u, patch);
  if (em !== (u.email || '').toLowerCase()) {
    if (cloud()) {
      const { error } = await SB.auth.updateUser(
        { email: em },
        { emailRedirectTo: 'https://www.introthread.com/' }
      );
      if (error) toast(error.message);
      else toast('Saved. Check ' + em + ' to confirm your new email address.');
    } else {
      u.email = em;
      toast('Settings saved');
    }
  } else toast('Settings saved');
  save();
  CD = null;
  PP = null;
  PF = null;
  window._keepScroll = true;
  render();
}
function stNextBill(u) {
  const c = new Date(u.created || Date.now()),
    n = new Date();
  const d = new Date(n.getFullYear(), n.getMonth(), Math.min(c.getDate(), 28));
  if (d <= n) d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function stManage() {
  const u = me();
  const pro = u.plan && u.plan !== 'Free';
  modal(`<div><div class="row between"><h3 style="margin:0;font:600 20px var(--xss)">Manage subscription</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div>
 <div class="st12-mrow"><span>Plan</span><b>${pro ? esc(u.plan) + ' plan, ' + usd0(proM()) + ' / month' : 'Free plan'}</b></div>${pro ? `<div class="st12-mrow"><span>Next billing date</span><b>${stNextBill(u)}</b></div>` : ''}<div class="st12-mrow"><span>Billing email</span><b>${esc(u.email || '')}</b></div>
 <p class="fu-sub" style="margin-top:14px">${cloud() ? 'Online card payments are being set up. Until then, email <a href="mailto:hello@introthread.com">hello@introthread.com</a> for invoices, plan changes or cancellation.' : 'This is the demo account, so no real payment is taken.'}</p>
 <div class="fu-b">${pro && !cloud() ? `<button type="button" class="t-how" data-on-click="stCancelPro()">Cancel subscription</button>` : ''}${!pro ? `<button type="button" class="x-btn" data-on-click="closeModal();setPlan('Pro')">Upgrade to Pro</button>` : `<button type="button" class="x-btn" data-on-click="closeModal()">Done</button>`}</div></div>`);
}
function stPlan(u) {
  const pro = u.plan && u.plan !== 'Free';
  return `<section class="d-box st12-box"><div class="cd-bh"><span class="cd-bi o">${sv('spark', 20)}</span><div><b>Subscription plan</b><small>${pro ? `You&rsquo;re on the ${esc(u.plan)} plan. Thanks for supporting Introthread.` : 'You&rsquo;re on the Free plan. Upgrade when you&rsquo;re ready.'}</small></div></div>
 <div class="st12-plan"><div><b>Pro plan</b><div class="st12-price">${usd0(proM())}<small>/month</small></div>${pro ? '' : '<small class="st12-cur">Current plan: Free</small>'}</div><ul>${['AI follow-ups in your voice', 'Calendar booking from a match', 'NFC card support', 'Advanced analytics'].map(x => `<li><i>${sv('check', 10, '#fff', 3.2)}</i>${x}</li>`).join('')}</ul>${pro ? '<em class="st12-act">Active</em>' : ''}</div>
 <div class="st12-bill"><span>${pro ? 'Next billing date: ' + stNextBill(u) : 'Billed monthly. Cancel anytime.'}</span><button type="button" class="x-btn" data-on-click="stManage()">${pro ? 'Manage subscription' : 'Upgrade to Pro'} ${sv('arrow', 16)}</button></div></section>`;
}
function stMs() {
  return `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="9.5" height="9.5" fill="#f25022"/><rect x="12.5" y="2" width="9.5" height="9.5" fill="#7fba00"/><rect x="2" y="12.5" width="9.5" height="9.5" fill="#00a4ef"/><rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#ffb900"/></svg>`;
}
function stGConnect() {
  if (!cloud()) return toast('Google connects on your live account. This is the demo.');
  if (typeof oauth === 'function') oauth('Google', 1);
}
function stGDisc() {
  try {
    sessionStorage.removeItem('it_gtok');
  } catch (_) {}
  if (typeof GCAL !== 'undefined') GCAL = null;
  toast('Google Calendar disconnected on this device');
  window._keepScroll = true;
  render();
}
function stConnected() {
  const g = typeof gTok === 'function' && gTok();
  const row = (ic, cls, n, d, btn) =>
    `<div class="st12-conn"><span class="st12-ci ${cls}">${ic}</span><div><b>${n}</b><small>${d}</small></div>${btn}</div>`;
  return `<section class="d-box st12-box"><div class="cd-bh"><span class="cd-bi">${sv('link', 20)}</span><div><b>Connected accounts</b><small>Connect your accounts to make networking easier.</small></div></div>
 ${row(sv('li', 20), 'li', 'LinkedIn', 'Connect to import your profile and contacts.', `<button type="button" class="st12-cb" data-on-click="toast('LinkedIn connection is coming soon. It needs LinkedIn app approval first.')">Connect</button>`)}
 ${row(typeof oG === 'function' ? oG() : sv('globe', 20), 'g', 'Google', g ? 'Connected. Today&rsquo;s meetings show on your dashboard.' : 'Connect to add events and calendar.', g ? `<button type="button" class="st12-cb on" data-on-click="stGDisc()">Disconnect</button>` : `<button type="button" class="st12-cb" data-on-click="stGConnect()">Connect</button>`)}
 ${row(stMs(), 'ms', 'Microsoft', 'Connect your Outlook calendar.', `<button type="button" class="st12-cb" data-on-click="toast('Microsoft connection is coming soon. It needs a Microsoft app registration first.')">Connect</button>`)}
 <p class="st12-sec">${sv('lock', 13)} Connections use the provider&rsquo;s secure sign-in. Introthread never sees your password.</p></section>`;
}
function stConfirm(kind) {
  const u = me();
  const del = kind === 'delete';
  modal(`<div class="st12-cf"><span class="st12-cfi">${sv(del ? 'close' : 'lock', 24)}</span><h3>${del ? 'Delete your account permanently?' : 'Deactivate your account?'}</h3><p>${del ? 'This deletes your profile, your Rooms and your side of every Thread. It cannot be undone. Consider exporting your data first.' : 'Your profile will be hidden and you will stop receiving new introductions. You can reactivate any time from Settings.'}</p>
 ${del ? `<button type="button" class="t-how sm" data-on-click="exportMine()">${sv('arrow', 15)} Export my data first</button><label class="x-f" style="margin-top:14px"><span>Type <b>DELETE</b> to confirm</span><input id="stdel" autocomplete="off" data-on-input="stDelInput(this.value)"></label>` : ''}
 <div class="fu-b"><button type="button" class="t-how" data-on-click="closeModal()">Cancel</button><button type="button" class="st12-red" id="stgo" ${del ? 'disabled' : ''} data-on-click="stConfirmDo('${kind}')">${del ? 'Delete permanently' : 'Deactivate account'}</button></div></div>`);
}
async function stConfirmDo(kind) {
  const c = window.confirm;
  window.confirm = () => true;
  try {
    closeModal();
    if (kind === 'delete') await delAccount();
    else await stDeactivate();
  } finally {
    window.confirm = c;
  }
}
function stDanger(u) {
  const off = u.links && u.links.deactivated;
  return `<section class="d-box st12-box"><div class="cd-bh"><span class="cd-bi r">${sv('shield', 20)}</span><div><b>Danger zone</b><small>These actions are permanent. Please be careful.</small></div></div>
 ${off ? `<button type="button" class="st12-dz ok" data-on-click="stReactivate()"><span>${sv('sync', 20)}</span><div><b>Reactivate account</b><small>Make your profile public again.</small></div>${sv('chev', 18)}</button>` : `<button type="button" class="st12-dz" data-on-click="stConfirm('deactivate')"><span>${sv('lock', 20)}</span><div><b>Deactivate account</b><small>Hide your profile and stop receiving new introductions.</small></div>${sv('chev', 18)}</button>`}
 <button type="button" class="st12-dz" data-on-click="stConfirm('delete')"><span>${sv('close', 20)}</span><div><b>Delete account</b><small>Permanently delete your account and all data.</small></div>${sv('chev', 18)}</button></section>`;
}
function stAccount(u) {
  if (!ST12 || ST12.uid !== u.id) st12Init();
  const L = u.links || {};
  const ph = (L.phone || '').match(/^(\+\d+)\s*(.*)$/);
  const cc = ph ? ph[1] : '+44',
    num = ph ? ph[2] : L.phone || '';
  return `<div class="st12-grid"><section class="d-box st12-form"><div class="cd-bh"><span class="cd-bi">${sv('user', 20)}</span><div><b>Profile information</b><small>Update your basic details and how you appear on Introthread.</small></div><a class="pp-ai" href="/${esc(u.handle)}" target="_blank" rel="noopener">${sv('eye', 16)} View public profile</a></div>
 <div class="st12-photo"><span class="cd-pav">${avatarC(u, 104)}<label class="cd-cam" aria-label="Upload photo">${sv('photo', 15)}<input type="file" hidden accept="image/jpeg,image/png,image/webp" data-on-change="pickPhoto(this,1)"></label></span><div><b>Profile photo</b><small>JPG, PNG or WebP (max 5MB)</small><div class="cd-pb"><label class="t-how sm">${sv('photo', 16)} ${u.photo ? 'Change photo' : 'Upload photo'}<input type="file" hidden accept="image/jpeg,image/png,image/webp" data-on-change="pickPhoto(this,1)"></label>${u.photo ? `<button type="button" class="cd-rm" data-on-click="removePhoto()">${sv('close', 15)} Remove</button>` : ''}</div></div></div>
 <div class="t-g2 pp-g"><label class="x-f"><span>Full name <i>*</i></span><input id="stn" value="${esc(u.name || '')}" required autocomplete="name" maxlength="80"></label><label class="x-f"><span>Email address <i>*</i></span><input id="ste" type="email" value="${esc(u.email || '')}" required autocomplete="email" maxlength="120"></label>
 <label class="x-f"><span>Job title</span><input id="str" value="${esc(u.role || '')}" maxlength="80"></label><label class="x-f"><span>Company</span><input id="stc" value="${esc(u.company || '')}" maxlength="80"></label>
 <label class="x-f"><span>Location</span><div class="cd-in">${sv('pin', 17)}<input id="stct" value="${esc(u.city || '')}" maxlength="80" placeholder="City, Country"><button type="button" class="cd-clr" aria-label="Clear location" data-on-click="stClearCt()">&times;</button></div></label>
 <label class="x-f"><span>Phone <em>(optional)</em></span><div class="st-phone"><select id="stcc" aria-label="Country code">${CC.map(([c, f, n]) => `<option value="${c}" ${c === cc ? 'selected' : ''} title="${n}">${f.toUpperCase()} ${c}</option>`).join('')}</select><input id="stp" type="tel" value="${esc(num)}" placeholder="7700 900123" autocomplete="tel-national" maxlength="20"></div></label></div>
 <label class="x-f"><span class="cd-bl">Bio <small><b id="stbc">${(u.bio || '').length}</b>/200</small></span><textarea id="stb" rows="3" maxlength="200" data-on-input="stBioCount(this.value)">${esc(u.bio || '')}</textarea></label>
 <div class="x-f"><span>Topics <em>(up to 10)</em></span><div class="pp-tps2 st12-tps" id="sttp">${st12Topics()}</div></div>
 <div class="st12-foot"><button type="button" class="x-btn lg st12-save" data-on-click="stSave(this)">${sv('lock', 17)} Save changes</button></div></section>
 <div class="st12-side">${stPlan(u)}${stConnected()}${stDanger(u)}</div></div>`;
}
function vSettings() {
  const u = me();
  return shell(
    'settings',
    `<div class="t-head"><div><div class="t-eye">Settings</div><h1 class="t-h1">Account settings</h1><p class="t-sub">Manage your account, privacy, notifications, integrations and preferences.</p></div></div>
 <nav class="cd-tabs st12-tabs" role="tablist" aria-label="Settings sections">${ST_TABS.map(([k, l, i]) => `<button type="button" role="tab" aria-selected="${STAB === k}" class="${STAB === k ? 'on' : ''}" data-on-click="stTab('${k}')">${sv(i, 18)} ${l}</button>`).join('')}</nav>
 ${STAB === 'account' ? stAccount(u) : `<div class="st-one st12-one">${stOther(u, STAB)}</div>`}`
  );
}

/* ===== v14 Public card page (design: Tap to Thread Profile Card) ===== */
function pcVcf(id) {
  const u = DB.users.find(x => x.id === id);
  if (!u) return;
  const L = u.links || {};
  const v = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:' + u.name,
    u.role ? 'TITLE:' + u.role : '',
    u.company ? 'ORG:' + u.company : '',
    L.email ? 'EMAIL:' + L.email : '',
    L.phone ? 'TEL:' + L.phone : '',
    u.city ? 'ADR:;;;' + u.city + ';;;' : '',
    'URL:' + profileUrl(u),
    'END:VCARD'
  ]
    .filter(Boolean)
    .join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([v], { type: 'text/vcard' }));
  a.download = (u.handle || 'contact') + '.vcf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast('Contact saved');
}
const _vPub14 = vPublic;
vPublic = function (hd) {
  const h = String(hd).toLowerCase();
  const u = DB.users.find(x => String(x.handle || '').toLowerCase() === h);
  const mine = me() && u && me().id === u.id;
  const prev = _vPub14(hd);
  if (!u || (u.links && u.links.hidden && !mine)) return prev;
  const t = THEMES[u.theme] || THEMES.midnight,
    L = u.links || {},
    S = L.show || {},
    f = esc((u.name || '').split(' ')[0] || 'them');
  const site = (L.website || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const li = L.linkedin && cdHref(L.linkedin),
    xx = L.x && cdHref(/^@/.test(L.x) ? 'x.com/' + L.x.slice(1) : L.x),
    cal = L.calendar && cdHref(L.calendar),
    web = L.website && cdHref(L.website),
    mail = L.email && 'mailto:' + L.email;
  const ic = [
    ['li', li, 'LinkedIn'],
    ['x', xx, 'X'],
    ['cal', cal, 'Book a meeting'],
    ['link', web, 'Website'],
    ['mail', mail, 'Email']
  ].filter(x => x[1]);
  const qa = [
    li && ['li', 'LinkedIn', 'View my LinkedIn profile', `href="${esc(li)}" target="_blank" rel="noopener"`],
    web && ['globe', 'Website', 'Visit my website', `href="${esc(web)}" target="_blank" rel="noopener"`],
    cal && [
      'cal',
      'Book a meeting',
      'Find a time to connect',
      `href="${esc(cal)}" target="_blank" rel="noopener"`
    ],
    mail && !cal && ['mail', 'Email', 'Send me a message', `href="${esc(mail)}"`],
    [
      'user',
      'Save contact',
      'Add to your contacts',
      `href="#" data-on-click="event.preventDefault();pcVcf('${u.id}')"`
    ]
  ]
    .filter(Boolean)
    .slice(0, 4);
  const rows = [
    S.loc !== false && u.city ? `<div>${sv('pin', 18)}<span>${esc(u.city)}</span></div>` : '',
    site
      ? `<a href="${esc(web)}" target="_blank" rel="noopener">${sv('globe', 18)}<span>${esc(site)}</span>${sv('chev', 16)}</a>`
      : '',
    S.bio !== false && u.bio ? `<div>${sv('brief', 18)}<span>${esc(u.bio)}</span></div>` : ''
  ].filter(Boolean);
  const fi = (id, icn, ph, o = '') =>
    `<label class="pc-in">${sv(icn, 18)}<input id="${id}" placeholder="${ph}" ${o}></label>`;
  return `<div class="pc-page"><div class="pc-wrap">
 ${mine ? `<div class="pc-own">${sv('eye', 16)} This is how visitors see your card. <a href="/app/card">Edit card</a></div>` : ''}
 <header class="pc-head"><a href="/" class="x-logo" aria-label="Introthread home"><span class="x-lm"><i></i><i></i></span><span>intro<b>thread</b></span></a><p>Meet &middot; Connect &middot; Follow through</p></header>
 <article class="pc-card ${t.light ? 'lt' : ''}" style="background:${t.bg};color:${t.fg};--sub:${t.sub}">
  <div class="pc-top"><span class="x-logo ${t.light ? '' : 'dk'}"><span class="x-lm"><i></i><i></i></span><span>intro<b>thread</b></span></span><span class="pc-tr">${sv('nfc', 22)}<span class="pc-ver"><i>${sv('check', 9, '#fff', 3.4)}</i>Verified</span></span></div>
  <div class="pc-id"><span class="pc-ring">${avatarC(u, 128)}<i>${sv('check', 12, '#fff', 3.2)}</i></span><h1>${esc(u.name)}</h1><p>${esc(u.role || '')}${u.company && S.co !== false ? `${u.role ? ' <span>&bull;</span> ' : ''}${esc(u.company)}` : ''}</p>${L.headline ? `<p class="pc-hl">${esc(L.headline)}</p>` : ''}</div>
  ${ic.length ? `<div class="pc-ics">${ic.map(([k, hr, l]) => `<a href="${esc(hr)}" ${k === 'mail' ? '' : 'target="_blank" rel="noopener"'} aria-label="${l}" title="${l}">${sv(k, 19)}</a>`).join('')}</div>` : ''}
  <button type="button" class="pc-save" data-on-click="pcVcf('${u.id}')">${sv('user', 19)} Save Contact</button>
  ${rows.length ? `<div class="pc-rows">${rows.join('')}</div>` : ''}
 </article>
 <section class="pc-box"><div class="pc-bh"><span class="pc-bi">${sv('spark', 20)}</span><div><b>Quick actions</b><small>Connect and take the next step.</small></div></div><div class="pc-qa">${qa.map(([k, l, d, attr]) => `<a class="pc-q" ${attr}><span class="pc-qi">${sv(k, 22)}</span><span><b>${l}</b><small>${d}</small></span>${sv('chev', 16)}</a>`).join('')}</div></section>
 <section class="pc-box pc-start" id="start"><div class="pc-bh"><span class="pc-bi">${sv('send', 20)}</span><div><div class="pc-eye">Just met ${f}?</div><h2>Start a Thread</h2><small>You&rsquo;ll both get a shared record of where you met, and one question: what&rsquo;s next? No app needed.</small></div></div>
  <form class="pc-form" data-on-submit="return guestThread(event,'${u.id}')"><div class="pc-g2">${fi('gn', 'user', 'Your name', 'required maxlength="80" autocomplete="name" aria-label="Your name"')}${fi('ge', 'mail', 'Your email', 'required type="email" maxlength="120" autocomplete="email" aria-label="Your email"')}${fi('gr', 'brief', 'Your title (optional)', 'maxlength="80" autocomplete="organization-title" aria-label="Your title"')}${fi('gc', 'building', 'Company (optional)', 'maxlength="80" autocomplete="organization" aria-label="Company"')}</div>${fi('gw', 'pin', 'Where did you meet?', 'maxlength="120" aria-label="Where did you meet?"')}
  <button class="pc-go">${sv('send', 19)} Start a Thread</button><p class="pc-priv">${sv('lock', 14)} We only share your details with ${f}.</p></form></section>
 <p class="pc-own2"><span></span>Want your own card? <a href="/signup">Create one free ${sv('arrow', 15)}</a><span></span></p>
 </div></div>`;
};

/* ===== v15 Thread detail (design: Thread Detail Dashboard) ===== */
let TDT = 'conv',
  TDC = 'note',
  TDF = 'all';

/* ===== v16 Account menu: one professional dropdown for the top bar and the sidebar footer ===== */
function amClose() {
  const m = document.getElementById('acm');
  if (m) m.remove();
  document.querySelectorAll('[data-am]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  document.removeEventListener('keydown', amKey, true);
  document.removeEventListener('mousedown', amOut, true);
}
function amOut(e) {
  const m = document.getElementById('acm');
  if (m && !m.contains(e.target) && !e.target.closest('[data-am]')) amClose();
}
function amKey(e) {
  const m = document.getElementById('acm');
  if (!m) return;
  const it = [...m.querySelectorAll('[role="menuitem"]')];
  const i = it.indexOf(document.activeElement);
  if (e.key === 'Escape') {
    e.preventDefault();
    const t = document.querySelector('[data-am][aria-expanded="true"]');
    amClose();
    if (t) t.focus();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    (it[(i + 1) % it.length] || it[0]).focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    (it[(i - 1 + it.length) % it.length] || it[0]).focus();
  } else if (e.key === 'Tab') {
    amClose();
  }
}
function amGo(path, tab) {
  amClose();
  if (tab) {
    STAB = tab;
  }
  go(path);
}
function acctMenu(btn, dir) {
  const open = document.getElementById('acm');
  if (open) {
    const same = btn && btn.getAttribute('aria-expanded') === 'true';
    amClose();
    if (same) return;
  }
  const u = me();
  if (!u) return;
  btn = btn || document.querySelector('.t-user');
  const pro = u.plan && u.plan !== 'Free';
  const pub = !(u.links && u.links.hidden);
  const it = (ic, l, act, o = {}) =>
    `<button type="button" role="menuitem" class="am-it ${o.cls || ''}" data-on-click="${act}">${sv(ic, 18)}<span>${l}</span>${o.badge ? `<em class="${o.bc || ''}">${o.badge}</em>` : ''}${o.ext ? sv('arrow', 14) : ''}</button>`;
  const m = document.createElement('div');
  m.id = 'acm';
  m.className = 'am';
  m.setAttribute('role', 'menu');
  m.setAttribute('aria-label', 'Account menu');
  m.innerHTML = `<div class="am-h">${avatarC(u, 48)}<div class="am-hi"><b>${esc(u.name || '')}</b><small>${esc(u.email || 'introthread.com/' + u.handle)}</small><span class="am-tags"><span class="am-plan ${pro ? 'pro' : ''}">${pro ? sv('spark', 11) + ' ' + esc(u.plan) : 'Free plan'}</span><span class="am-vis ${pub ? '' : 'off'}"><i></i>${pub ? 'Profile live' : 'Profile private'}</span></span></div></div>
 <div class="am-link"><span>introthread.com/${esc(u.handle)}</span><button type="button" role="menuitem" aria-label="Copy my link" data-on-click="copy('${profileUrl(u)}','Link copied')">${sv('copy', 15)}</button></div>
 <div class="am-g">${it('user', 'My card', "amGo('/app/card')")}${it('globe', 'Public profile', "amGo('/app/profile')")}${it('eye', 'View as visitor', `amClose();window.open('/${esc(u.handle)}','_blank','noopener')`, { ext: 1 })}</div>
 <div class="am-g">${it('gear', 'Account settings', "amGo('/app/settings','account')")}${it('shield', 'Privacy &amp; visibility', "amGo('/app/settings','privacy')")}${it('bell', 'Notifications', "amGo('/app/settings','notifications')")}${it('brief', 'Plan &amp; billing', "amGo('/app/settings','billing')", { badge: pro ? '' : 'Upgrade', bc: 'up' })}</div>
 <div class="am-g">${it('mail', 'Help &amp; support', 'amHelp()')}${it('play', 'How Introthread works', "amClose();go('/how')")}</div>
 <div class="am-g">${it('out', 'Log out', 'amClose();logout()', { cls: 'am-out' })}</div>`;
  document.body.appendChild(m);
  btn.setAttribute('aria-expanded', 'true');
  const r = btn.getBoundingClientRect(),
    W = m.offsetWidth,
    H = m.offsetHeight,
    vw = innerWidth,
    vh = innerHeight;
  let left, top;
  if (dir === 'up') {
    left = Math.max(8, Math.min(r.left, vw - W - 8));
    top = Math.max(8, r.top - H - 8);
  } else {
    left = Math.max(8, Math.min(r.right - W, vw - W - 8));
    top = Math.min(r.bottom + 8, vh - H - 8);
    if (top < 8) top = 8;
  }
  m.style.left = left + 'px';
  m.style.top = top + 'px';
  m.classList.add(dir === 'up' ? 'up' : 'down');
  document.addEventListener('keydown', amKey, true);
  setTimeout(() => document.addEventListener('mousedown', amOut, true), 0);
  const f = m.querySelector('[role="menuitem"]');
  if (f) f.focus({ preventScroll: true });
}
window.addEventListener('resize', amClose);
window.addEventListener('itroute', amClose);
window.addEventListener('popstate', amClose);
const _shell16 = shell;
shell = function (on, inner) {
  let h = _shell16(on, inner);
  const u = me();
  if (!u) return h;
  const pro = u.plan && u.plan !== 'Free';
  h = h.replace(
    /<div class="row" style="margin-top:14px;padding:8px">[\s\S]*?<\/button><\/div><\/aside>/,
    `<button type="button" class="sb-user" data-am aria-haspopup="menu" aria-expanded="false" data-on-click="acctMenu(this,'up')">${avatarC(u, 40)}<span class="sb-ui"><b>${esc(u.name || '')}</b><small>${pro ? esc(u.plan) + ' plan' : 'Free plan'}</small></span><span class="sb-chev">${sv('chevd', 16)}</span></button></aside>`
  );
  h = h.replace(
    'class="t-user" data-on-click="acctMenu()"',
    'class="t-user" data-am aria-haspopup="menu" aria-expanded="false" data-on-click="acctMenu(this,\'down\')"'
  );
  return h;
};

/* v61: named handlers for the website pages, signup and login (no inline JavaScript). */
function suSample() {
  seed(me());
  save();
  closeModal();
  render();
  toast('Sample Threads added');
}
function pwToggle(id) {
  const i = $('#' + id);
  if (i) i.type = i.type === 'password' ? 'text' : 'password';
}
function suStep(n, live) {
  if (live) liveP();
  SU.step = n;
  render();
}
function suCat(k) {
  SU.cat = k;
  window._keepScroll = true;
  render();
}
function scrollToId(e, id) {
  e.preventDefault();
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}
function setBilling(v) {
  billing = v;
  window._keepScroll = true;
  render();
}
function contactSend(e) {
  e.preventDefault();
  if (!$('#ce').value.includes('@')) return toast('Add a valid email');
  location.href =
    'mailto:hello@introthread.com?subject=' +
    encodeURIComponent('Introthread enquiry from ' + $('#cn').value) +
    '&body=' +
    encodeURIComponent($('#cm').value + '\n\n' + $('#cn').value + ' <' + $('#ce').value + '>');
  toast('Opening your email app to send this.');
}

/* v61: named handlers for the Today screen (no inline JavaScript). */
function copyThreadLink(id, msg, close) {
  copy(threadLink(findThread(id)), msg);
  if (close) closeModal();
}
function setDRange(v) {
  DRANGE = +v;
  window._keepScroll = true;
  render();
}

/* v61: named handlers for the Threads list and Thread detail (no inline JavaScript). */
const keepRender = () => {
  window._keepScroll = true;
  render();
};
function copyDraft() {
  copy($('#draft').value, 'Draft copied');
}
function draftMail(a) {
  a.href = a.href.split('&body=')[0] + '&body=' + encodeURIComponent($('#draft').value);
}
function resolveAsk(id, l) {
  if (confirm('Resolve this Thread as: ' + l + '?')) resolve(id, l);
}

/* v61: named handlers for the Tap screen (no inline JavaScript). */
function tapWhereKey(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    tapWhereCustom();
  }
}

/* v61: named handlers for My card and Profile (no inline JavaScript). */
function suPhotoClear() {
  SU.photo = null;
  $('#xup').innerHTML = upBox();
  liveP();
}
function pfLinkDel(i) {
  pfSync();
  PF.links.splice(i, 1);
  if (!PF.links.length) PF.links.push('');
  $('#pflinks').innerHTML = pfLinks();
  pfSync();
}
function cdClear(id, k) {
  $('#' + id).value = '';
  cdIn(k, '');
}
function cdBioPick(el) {
  CD.bio = el.dataset.v;
  closeModal();
  const b = $('#cdb');
  if (b) b.value = CD.bio;
  cdLive();
}
function cdShTab(k) {
  SHT = k;
  keepRender();
}
function cdTab(k) {
  CTAB = k;
  keepRender();
}
function ppClear(id, k) {
  $('#' + id).value = '';
  ppSet(k, '');
}
function ppTopicKey(e, el) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    ppTopicAdd(el.value);
    el.value = '';
  }
}
function ppTopicChange(el) {
  if (el.value) {
    ppTopicAdd(el.value);
    el.value = '';
  }
}
function ppPick(el, key, inputId) {
  PP[key] = el.dataset.v;
  const i = $('#' + inputId);
  if (i) i.value = PP[key];
  ppLive();
  ppQueue();
  el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el));
}
function ppTab(k) {
  PTAB = k;
  keepRender();
}

/* v61: named handlers for the Rooms screens (no inline JavaScript). */
function rFiltClear() {
  RFF = { fmt: '', priv: '', topic: '' };
  closeModal();
  render();
}
function rFiltApply() {
  RFF = { fmt: $('#rff').value, priv: $('#rfp').value, topic: $('#rft').value };
  RLIM9 = 6;
  closeModal();
  render();
}
function roSeg(el) {
  document.querySelectorAll('.ro-seg button').forEach(b => b.classList.toggle('on', b === el));
  $('#rvw').hidden = el.dataset.f === 'online';
  $('#rlw').hidden = el.dataset.f === 'inperson';
}
function roType(v) {
  $('#rrw').hidden = v === 'event';
}
function roTopic(el) {
  const on = !el.classList.contains('on');
  if (on && document.querySelectorAll('.ro-new .tp.on').length >= 3) return toast('Pick up to 3 topics');
  el.classList.toggle('on', on);
  el.setAttribute('aria-pressed', on);
}
function roTab(k) {
  RF9 = k;
  RLIM9 = 6;
  keepRender();
}
function roSearch(v) {
  RQ9 = v;
  clearTimeout(window._rq9);
  window._rq9 = setTimeout(() => {
    keepRender();
    const i = document.querySelector('.ro-s input');
    if (i) {
      i.focus();
      i.setSelectionRange(i.value.length, i.value.length);
    }
  }, 250);
}
function roDayClear() {
  RDAY = '';
  render();
}
function roAll() {
  RLIM9 = 999;
  keepRender();
}
function roJoin(k) {
  TSEL = [k];
  go('/app/tap');
}
function roThreads(k) {
  TFT = [k];
  TFV = false;
  TF2 = 'all';
  TLIM = 20;
  go('/app/threads');
}
function roReset() {
  RCAL = null;
  RDAY = '';
  RF9 = 'upcoming';
  render();
}

/* v61: named handlers for Settings, the app shell search and the account menu (no inline JavaScript). */
function setQ(v) {
  Q = v;
}
function searchKey(e) {
  if (e.key === 'Enter') go('#/app/threads');
}
function st12TopicDel(i) {
  ST12.topics.splice(i, 1);
  $('#sttp').innerHTML = st12Topics();
}
function stTopicKey(e, el) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    st12TopicAdd(el.value);
    el.value = '';
  }
}
function stTopicChange(el) {
  if (el.value) {
    st12TopicAdd(el.value);
    el.value = '';
  }
}
function stCancelPro() {
  if (!confirm('Cancel Pro and return to the Free plan?')) return;
  me().plan = 'Free';
  save();
  closeModal();
  toast('You are now on the Free plan');
  render();
}
function stDelInput(v) {
  $('#stgo').disabled = v.trim() !== 'DELETE';
}
function stClearCt() {
  $('#stct').value = '';
}
function stBioCount(v) {
  $('#stbc').textContent = v.length;
}
function amHelp() {
  amClose();
  location.href = 'mailto:hello@introthread.com?subject=Introthread%20support';
}

/* v63: named handler for a Rooms calendar day (tap again to clear). */
function rCalDay(k) {
  RDAY = RDAY === k ? '' : k;
  RLIM9 = 6;
  keepRender();
}
