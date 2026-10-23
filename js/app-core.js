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

/* ===== v12 Account settings (design: Account Settings) ===== */

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
function setQ(v) {
  Q = v;
}
function searchKey(e) {
  if (e.key === 'Enter') go('#/app/threads');
}
function amHelp() {
  amClose();
  location.href = 'mailto:hello@introthread.com?subject=Introthread%20support';
}

/* v63: named handler for a Rooms calendar day (tap again to clear). */
