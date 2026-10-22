// Introthread - Admin Rooms (v37, screen 4 of 9). Prefix rm / RMX.
// Moved out of index.html in v52 (code split step 4). Load order matters: see the <script> list at the end of index.html.

/* ================= v37: Admin screen 4 of 9 - Rooms ================= */
Object.assign(SV, {
  plus: '<path d="M12 5v14M5 12h14"/>',
  pulse: '<path d="M3 12h4l2.5-6 4 12 2.5-6h5"/>',
  share:
    '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
  qr2: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'
});
const RKIND = { event: 'Conference or event', community: 'Community', meeting: 'Team meeting' };
const RFMT = { inperson: 'In person', online: 'Online', hybrid: 'Hybrid' };
let RMX = {
  q: '',
  st: 'all',
  kind: 'all',
  dr: 'any',
  sort: 'new',
  per: 25,
  page: 0,
  data: null,
  limited: false,
  open: null,
  tab: 'overview',
  det: {}
};
const canRoomEdit = () => admOk(['owner', 'admin', 'moderator', 'support']),
  canRoomDel = () => admOk(['owner', 'admin', 'moderator']);
const rmLink = c => 'https://introthread.com/r/' + c;
const _alt37 = admLoadTab;
admLoadTab = async function () {
  if (ADM.stage === 'ready' && ADM.tab === 'rooms') return rmLoad();
  return _alt37.apply(this, arguments);
};
const rmMiss = e =>
  /admin_rooms2|admin_room_detail|admin_room_save|admin_room_log|could not find|schema cache|does not exist/i.test(
    (e && e.message) || ''
  );
function rmParse(loc) {
  loc = loc || '';
  const i = loc.indexOf('\n@@');
  if (i < 0) return { place: loc, meta: {} };
  let m = {};
  try {
    m = JSON.parse(loc.slice(i + 3)) || {};
  } catch (_) {}
  return { place: loc.slice(0, i), meta: m };
}
const ymdToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
function rmStatus(date, meta) {
  const t = ymdToday(),
    d = String(date || '').slice(0, 10);
  return d > t ? 'upcoming' : d === t || (meta || {}).kind === 'community' ? 'live' : 'past';
}
/* load */
async function rmLoad(keep) {
  const wasLim = RMX.limited;
  if (!keep || !$('#rmwrap')) admBody(rmSkel());
  else {
    const t = $('#rmlist');
    if (t) t.classList.add('busy');
  }
  try {
    let d = null;
    if (!RMX.limited) {
      try {
        d = await arpc('admin_rooms2', {
          q: RMX.q,
          st: RMX.st,
          kind: RMX.kind,
          dr: RMX.dr,
          sort: RMX.sort,
          lim: (RMX.page + 1) * RMX.per,
          off: 0
        });
      } catch (e) {
        if (rmMiss(e)) RMX.limited = true;
        else throw e;
      }
    }
    if (RMX.limited) d = rmLocal(await arpc('admin_rooms'));
    RMX.data = d;
    if (ADM.tab !== 'rooms') return;
    if (keep && $('#rmwrap') && wasLim === RMX.limited) {
      rmPaintList();
      rmPaintCounts();
    } else admBody(rmPage());
  } catch (e) {
    admBody(
      rmHead() +
        `<div class="ix-card ix-fail" role="alert">${sv('alert', 22)}<div><b>Rooms could not load</b><p>${esc((e && e.message) || 'Unknown error')}</p></div><button type="button" class="ix-btn" onclick="rmLoad()">${sv('refresh', 16)} Try again</button></div>`
    );
  }
}
/* without update 007: same filters in the browser on the newest 500 Rooms */
function rmLocal(L) {
  const t = ymdToday(),
    dd = n => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    };
  const base = (L || []).map(m => {
    const p = rmParse(m.location);
    const meta = p.meta;
    return Object.assign({}, m, {
      place: p.place,
      meta,
      status: rmStatus(m.event_date, meta),
      rkind: meta.kind || 'event',
      confirmed: null
    });
  });
  const q = RMX.q.toLowerCase(),
    ym = t.slice(0, 7);
  let f = base.filter(
    m =>
      (RMX.st === 'all' || m.status === RMX.st) &&
      (RMX.kind === 'all' || m.rkind === RMX.kind) &&
      (RMX.dr === 'any' ||
        (RMX.dr === 'next30' && m.event_date >= t && m.event_date <= dd(30)) ||
        (RMX.dr === 'month' && String(m.event_date).slice(0, 7) === ym) ||
        (RMX.dr === 'past30' && m.event_date <= t && m.event_date >= dd(-30)) ||
        (RMX.dr === 'past90' && m.event_date <= t && m.event_date >= dd(-90))) &&
      (!q ||
        [m.name, m.place, m.code, m.meta.desc, m.meta.platform, (m.owner || {}).name, (m.owner || {}).handle]
          .join(' ')
          .toLowerCase()
          .includes(q))
  );
  const S = {
    date: (a, b) => String(b.event_date).localeCompare(a.event_date),
    soon: (a, b) =>
      (a.event_date < t) - (b.event_date < t) || String(a.event_date).localeCompare(b.event_date),
    threads: (a, b) => (b.threads || 0) - (a.threads || 0),
    name: (a, b) => a.name.localeCompare(b.name),
    old: (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
    new: (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
  };
  f.sort(S[RMX.sort] || S.new);
  return {
    total: f.length,
    rows: f.slice(0, (RMX.page + 1) * RMX.per),
    counts: {
      total: base.length,
      attendees: null,
      connections: base.reduce((s, m) => s + (m.threads || 0), 0),
      active: base.filter(m => m.status === 'live').length,
      upcoming: base.filter(m => m.status === 'upcoming').length,
      links_used: base.filter(m => m.threads > 0).length
    }
  };
}
/* header + cards */
function rmHead() {
  return `<div class="ix-h"><div><h1>Rooms</h1><p>Create and manage events, meetings and communities. People can join using a link, QR code or from your website.</p></div><div class="ix-hc">${canRoomEdit() ? `<button type="button" class="ix-btn pri rm-cta" onclick="rmEdit()">${sv('plus', 18)}<span>Create room</span></button>` : ''}</div></div>`;
}
function rmCounts() {
  const c = (RMX.data && RMX.data.counts) || {};
  const v = k => (isNum(c[k]) ? fmtN(c[k]) : dash);
  const card = (k, l, ic, tone, sub, st) =>
    `<${st ? `button type="button" onclick="rmFilter('st','${RMX.st === st ? 'all' : st}')" aria-pressed="${RMX.st === st}"` : 'div'} class="rm-c${st && RMX.st === st ? ' on' : ''}"><span class="md-wi t-${tone}w" aria-hidden="true">${sv(ic, 24)}</span><span><span class="rm-cl">${l}</span><b>${v(k)}</b><small>${sub}</small></span></${st ? 'button' : 'div'}>`;
  return (
    card('total', 'Total rooms', 'cal', 'b', 'All time') +
    card(
      'attendees',
      'Total attendees',
      'users',
      'g',
      isNum(c.connections)
        ? `${fmtN(c.connections)} connection${c.connections === 1 ? '' : 's'} made`
        : 'All events'
    ) +
    card(
      'active',
      'Active rooms',
      'pulse',
      'o',
      isNum(c.upcoming) ? `Happening now · ${fmtN(c.upcoming)} upcoming` : 'Happening now',
      'live'
    ) +
    card('links_used', 'Unique room links', 'link', 'p', 'Used by at least one person')
  );
}
function rmPaintCounts() {
  const e = $('#rmcounts');
  if (e) e.innerHTML = rmCounts();
}
/* toolbar */
function rmToolbar() {
  const on = RMX.q || RMX.st !== 'all' || RMX.kind !== 'all' || RMX.dr !== 'any';
  return `<div class="md-tb rm-tb"><label class="au-search md-q">${sv('search', 17)}<input id="rmq" type="search" placeholder="Search by name, description or location..." value="${esc(RMX.q)}" oninput="rmSearch(this.value)" aria-label="Search rooms"></label>
 ${mdSel(
   'rmst',
   'Status',
   RMX.st,
   [
     ['all', 'All'],
     ['live', 'Happening now'],
     ['upcoming', 'Upcoming'],
     ['past', 'Past']
   ],
   "rmFilter('st',this.value)"
 )}
 ${mdSel(
   'rmkind',
   'Type',
   RMX.kind,
   [
     ['all', 'All'],
     ['event', 'Conferences and events'],
     ['community', 'Communities'],
     ['meeting', 'Team meetings']
   ],
   "rmFilter('kind',this.value)"
 )}
 ${mdSel(
   'rmdr',
   'Date',
   RMX.dr,
   [
     ['any', 'Any date'],
     ['next30', 'Next 30 days'],
     ['month', 'This month'],
     ['past30', 'Past 30 days'],
     ['past90', 'Past 90 days']
   ],
   "rmFilter('dr',this.value)",
   'cal'
 ).replace('<span class="md-sl">Date:</span>', '<span class="sr">Date</span>')}
 <button type="button" class="rm-clr" ${on ? '' : 'disabled'} onclick="rmClear()">Clear filters</button></div>`;
}
let _rmT = null;
function rmSearch(v) {
  clearTimeout(_rmT);
  _rmT = setTimeout(() => {
    RMX.q = v.trim();
    RMX.page = 0;
    rmLoad(true);
    const b = $('.rm-clr');
    if (b) b.disabled = !(RMX.q || RMX.st !== 'all' || RMX.kind !== 'all' || RMX.dr !== 'any');
  }, 300);
}
function rmFilter(k, v) {
  RMX[k] = v;
  RMX.page = 0;
  const t = $('#rmtbw');
  if (t) t.innerHTML = rmToolbar();
  rmLoad(true);
}
function rmClear() {
  RMX.q = '';
  RMX.st = 'all';
  RMX.kind = 'all';
  RMX.dr = 'any';
  RMX.page = 0;
  const t = $('#rmtbw');
  if (t) t.innerHTML = rmToolbar();
  rmLoad(true);
}
/* list */
const rmStP = s =>
  `<span class="rm-st ${s}">${{ live: 'Happening now', upcoming: 'Upcoming', past: 'Past' }[s] || esc(s)}</span>`;
function rmWhen(m) {
  const meta = m.meta || {};
  return `${fmtD(m.event_date)}${meta.start ? ', ' + esc(meta.start) + (meta.end ? '–' + esc(meta.end) : '') : ''}`;
}
function rmWhere(m) {
  const meta = m.meta || {};
  return meta.fmt === 'online'
    ? esc(meta.platform || 'Online')
    : esc(m.place || (meta.fmt === 'hybrid' ? 'Hybrid' : ''));
}
function rmItem(m) {
  const meta = m.meta || {};
  const k = meta.kind || 'event';
  return `<li><button type="button" class="md-i rm-i${RMX.open === m.id ? ' on' : ''}" data-id="${m.id}" onclick="rmOpen('${m.id}')" aria-current="${RMX.open === m.id}"><span class="md-wi sm2 t-${k === 'community' ? 'p' : k === 'meeting' ? 'o' : 'b'}w" aria-hidden="true">${sv(k === 'community' ? 'users' : k === 'meeting' ? 'brief' : 'cal', 18)}</span>
 <span class="md-it"><span class="md-ir"><b>${esc(m.name)}</b>${meta.priv === 'private' ? `<span class="rm-pv">${sv('lock', 12)} Private</span>` : ''}</span><span class="md-is">${rmWhen(m)}${rmWhere(m) ? ' · ' + rmWhere(m) : ''}</span>
 <span class="md-im">${RKIND[k]} · by ${esc((m.owner || {}).name || 'a deleted account')} · code ${esc(m.code)}</span></span>
 <span class="md-ie">${rmStP(m.status)}<span class="rm-n">${fmtN(m.threads || 0)} Thread${m.threads === 1 ? '' : 's'}${isNum(m.people) ? ` · ${fmtN(m.people)} ${m.people === 1 ? 'person' : 'people'}` : ''}</span></span></button></li>`;
}
function rmList() {
  const d = RMX.data,
    R = d.rows || [];
  const filt = RMX.q || RMX.st !== 'all' || RMX.kind !== 'all' || RMX.dr !== 'any';
  if (!R.length)
    return `<div class="md-empty rm-empty"><span class="md-eic" aria-hidden="true">${sv('cal', 26)}</span><b>${filt ? 'No rooms match these filters' : 'No rooms yet'}</b><p>${filt ? 'Try a different search, or clear the filters.' : 'Create your first room to start connecting people at events, meetings or communities.'}</p>${filt ? `<button type="button" class="ix-btn" onclick="rmClear()">Clear filters</button>` : canRoomEdit() ? `<button type="button" class="ix-btn pri rm-cta" onclick="rmEdit()">${sv('plus', 17)} Create room</button>` : ''}</div>
 ${
   filt
     ? ''
     : `<div class="rm-how">${[
         ['link', 'Share a link', 'Let people join with a link'],
         ['qr2', 'QR code', 'Display at events or venues'],
         ['users', 'Manage attendees', 'See who joined and their activity']
       ]
         .map(
           ([ic, h, p]) => `<div><span aria-hidden="true">${sv(ic, 20)}</span><b>${h}</b><p>${p}</p></div>`
         )
         .join('')}</div>`
 }`;
  const more = d.total > R.length;
  return `<ul class="md-l">${R.map(rmItem).join('')}</ul>${more ? `<div class="md-more"><button type="button" class="ix-btn" onclick="RMX.page++;rmLoad(true)">Show more (${fmtN(d.total - R.length)} left)</button></div>` : ''}`;
}
function rmListHead() {
  const d = RMX.data || {};
  return `<div class="md-lh"><h2>Rooms (${isNum(d.total) ? fmtN(d.total) : 0})</h2>${mdSel(
    'rmsort',
    'Sort',
    RMX.sort,
    [
      ['new', 'Newest first'],
      ['old', 'Oldest first'],
      ['soon', 'Next event first'],
      ['date', 'Latest event date'],
      ['threads', 'Most Threads'],
      ['name', 'Name A to Z']
    ],
    'RMX.sort=this.value;RMX.page=0;rmLoad(true)',
    'sort'
  ).replace('<span class="md-sl">Sort:</span>', '<span class="sr">Sort</span>')}</div>`;
}
function rmPaintList() {
  const l = $('#rmlist');
  if (l) {
    l.classList.remove('busy');
    l.innerHTML = rmList();
  }
  const h = $('#rmlh');
  if (h) h.innerHTML = rmListHead();
}
/* page */
function rmSkel() {
  return (
    rmHead() +
    `<div class="md-cs">${'<div class="md-c sk"><i></i><b></b></div>'.repeat(4)}</div><div class="ix-card sk" style="height:64px;margin-bottom:16px"></div><div class="md-g rm-g"><div class="ix-card sk" style="height:520px"></div><div class="ix-card sk" style="height:520px"></div></div>`
  );
}
function rmPage() {
  return `<div id="rmwrap" class="md rm${RMX.open ? ' po' : ''}">${rmHead()}${RMX.limited ? `<p class="ix-upd">Run database update 007 for attendee counts, full Room details, editing and creating Rooms for other people. Until then this page shows the newest 500 Rooms.</p>` : ''}
 <div class="md-cs" id="rmcounts">${rmCounts()}</div><div class="ix-card md-tbc" id="rmtbw">${rmToolbar()}</div>
 <div class="md-g rm-g"><section class="ix-card md-lc" aria-label="Rooms"><div id="rmlh">${rmListHead()}</div><div id="rmlist">${rmList()}</div></section>
 <aside class="ix-card md-p" id="rmpanel" aria-label="Room details">${RMX.open ? rmPanel() : rmIntro()}</aside></div><div class="md-scrim" onclick="rmClose()" aria-hidden="true"></div></div>`;
}
function rmIntro() {
  const it = [
    ['cal', 'b', 'Conferences &amp; events', 'Create rooms for conferences, summits and in-person events.'],
    ['users', 'p', 'Communities', 'Running groups, clubs or ongoing communities.'],
    ['users', 'o', 'Team meetings', 'Private rooms for internal team meetings or client calls.'],
    ['share', 'g', 'Easy access', 'Share a link or QR code. No app required for attendees.']
  ];
  return `<div class="md-in rm-in"><div class="rm-art" aria-hidden="true"><span class="rm-a1"><i></i>${'<em></em>'.repeat(18)}</span><span class="rm-a2"><i>${sv('user', 16)}</i><em></em><em></em><em></em></span><span class="rm-a3">${sv('link', 18)}</span></div><h2>Select a room</h2><p>Choose a room from the list to view details, attendees and activity.</p></div>
 <h3 class="md-wy">What you can do with Rooms</h3><ul class="md-wl">${it.map(([ic, t, h, p]) => `<li><span class="md-wi t-${t}w" aria-hidden="true">${sv(ic, 22)}</span><div><b>${h}</b><p>${p}</p></div></li>`).join('')}</ul>
 <div class="md-safe"><span aria-hidden="true">${sv('bulb', 22)}</span><div><b>Rooms help turn introductions into meaningful relationships.</b><p>People can join, answer "What's next?", and stay connected after the event.</p></div><button type="button" class="ix-btn sm" onclick="rmLearn()">Learn more</button></div>`;
}
function rmLearn() {
  modal(`<div class="cap-m md-guide"><div class="row between"><h3>How Rooms work</h3><button class="x" aria-label="Close" onclick="closeModal()">&times;</button></div>
 <p class="fu-sub">A Room groups every Thread started at one event, meeting or community, so the organiser can see which connections went somewhere.</p>
 <h4>1. Create</h4><p>Give it a name, date, type and place, or an online link. Each Room gets a short code and a link, introthread.com/r/CODE.</p>
 <h4>2. Share</h4><p>Show the QR code on screens, badges or tables, or send the link. Attendees open it in their browser. No app is needed.</p>
 <h4>3. Connect</h4><p>When two people tap or scan cards, the Thread is tagged to the Room. Each person answers one question, "What's next?". Answers stay sealed until both reply.</p>
 <h4>4. Measure</h4><p>Organisers see verified connections, answers, meetings agreed and introductions, live and for 30 days after. Private notes are never shown to organisers or staff.</p>
 <button class="cap-btn" onclick="closeModal()">Got it</button></div>`);
}
/* detail */
async function rmOpen(id) {
  RMX.open = id;
  RMX.tab = 'overview';
  const w = $('#rmwrap');
  if (w) w.classList.add('po');
  document.querySelectorAll('.rm-i').forEach(b => {
    const on = b.dataset.id === id;
    b.classList.toggle('on', on);
    b.setAttribute('aria-current', on);
  });
  const p = $('#rmpanel');
  if (p) p.innerHTML = `<div class="md-pp">${admLoading()}</div>`;
  try {
    let d = null;
    if (!RMX.limited) {
      try {
        d = await arpc('admin_room_detail', { rid: id });
      } catch (e) {
        if (rmMiss(e)) RMX.limited = true;
        else throw e;
      }
    }
    const row = ((RMX.data || {}).rows || []).find(r => r.id === id) || {};
    if (!d)
      d = {
        room: {
          id,
          name: row.name,
          event_date: row.event_date,
          code: row.code,
          created_at: row.created_at,
          place: row.place,
          meta: row.meta || {},
          status: row.status
        },
        owner: row.owner || null,
        stats: { threads: row.threads, people: row.people },
        attendees: null,
        recent: null,
        history: null,
        lite: true
      };
    RMX.det[id] = d;
    if (RMX.open === id && p) {
      p.innerHTML = rmPanel();
      const c = p.querySelector('.md-x');
      if (c && window.innerWidth < 1180) c.focus();
    }
  } catch (e) {
    if (p)
      p.innerHTML = `<div class="md-pp"><p class="adm-err">${esc((e && e.message) || 'Could not load')}</p><button class="ix-btn sm" onclick="rmOpen('${id}')">Try again</button></div>`;
  }
}
function rmClose() {
  RMX.open = null;
  const w = $('#rmwrap');
  if (w) w.classList.remove('po');
  const p = $('#rmpanel');
  if (p) p.innerHTML = rmIntro();
  document.querySelectorAll('.rm-i.on').forEach(b => {
    b.classList.remove('on');
    b.setAttribute('aria-current', 'false');
  });
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && RMX.open && !$('#mback.open') && $('#rmwrap')) rmClose();
});
function rmPanel() {
  const id = RMX.open,
    d = RMX.det[id];
  if (!d) return `<div class="md-pp">${admLoading()}</div>`;
  const r = d.room,
    m = r.meta || {},
    o = d.owner,
    k = m.kind || 'event';
  const tabs = [
    ['overview', 'Overview'],
    ['attendees', 'Attendees'],
    ['activity', 'Activity'],
    ['history', 'History']
  ];
  return `<div class="md-pp"><div class="md-ph"><div><div class="md-ir">${rmStP(r.status)}<span class="rm-k">${RKIND[k]}</span>${m.priv === 'private' ? `<span class="rm-pv">${sv('lock', 12)} Private</span>` : ''}${d.reports_open ? `<span class="md-sev high">${d.reports_open} open report${d.reports_open > 1 ? 's' : ''}</span>` : ''}</div><h2>${esc(r.name)}</h2><p>${rmWhen(r)}${m.tz ? ' ' + esc(m.tz) : ''}${rmWhere(r) ? ' · ' + rmWhere(r) : ''}</p></div><button type="button" class="au-x md-x" onclick="rmClose()" aria-label="Close room">${sv('x2', 18)}</button></div>
 <div class="rm-link"><span class="rm-lk">${sv('link', 16)}<code>introthread.com/r/${esc(r.code)}</code></span><button type="button" class="ix-btn sm" onclick="rmCopy('${id}')">${sv('copy', 15)} Copy link</button><button type="button" class="ix-btn sm" onclick="rmQr('${id}')">${sv('qr2', 15)} QR code</button><a class="ix-btn sm" href="/r/${esc(r.code)}" target="_blank" rel="noopener">${sv('ext', 15)} Open join page</a></div>
 <div class="au-tabs" role="tablist">${tabs.map(([t, l]) => `<button type="button" role="tab" id="rmt-${t}" aria-selected="${RMX.tab === t}" aria-controls="rmtp" class="${RMX.tab === t ? 'on' : ''}" onclick="RMX.tab='${t}';$('#rmpanel').innerHTML=rmPanel()">${l}${t === 'attendees' && isNum((d.stats || {}).people) ? ` <em>${d.stats.people}</em>` : ''}</button>`).join('')}</div>
 <div id="rmtp" role="tabpanel" aria-labelledby="rmt-${RMX.tab}">${RMX.tab === 'overview' ? rmOverview(d) : RMX.tab === 'attendees' ? rmAtt(d) : RMX.tab === 'activity' ? rmAct(d) : rmHist(d)}</div></div>`;
}
function rmOverview(d) {
  const r = d.room,
    m = r.meta || {},
    o = d.owner,
    s = d.stats || {},
    id = r.id;
  const pct = (a, b) => (b ? Math.round((a * 100) / b) + '%' : dash);
  const dl = rows =>
    `<dl class="au-dl">${rows
      .filter(Boolean)
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
      .join('')}</dl>`;
  const st = [
    ['linkc', 'Threads', s.threads],
    ['users', 'Attendees', s.people],
    ['okc', 'Confirmed', s.confirmed],
    ['msg', 'Both answered', s.answered],
    ['cal', 'Meetings agreed', s.meet],
    ['share', 'Introductions', s.intro]
  ];
  return `<section class="md-sec"><h3><span class="md-wi sm t-bw" aria-hidden="true">${sv('bars', 16)}</span>Results</h3><div class="rm-stats">${st.map(([ic, l, v]) => `<div><b>${isNum(v) ? fmtN(v) : dash}</b><small>${l}</small></div>`).join('')}</div>${isNum(s.confirmed) && s.threads ? `<p class="au-fine">${pct(s.confirmed, s.threads)} of Threads confirmed by both people, ${pct(s.resolved || 0, s.threads)} resolved.</p>` : d.lite ? '<p class="au-fine">Run update 007 for confirmations, answers and outcomes.</p>' : ''}</section>
 <div class="md-secs"><section class="md-sec"><h3><span class="md-wi sm t-ow" aria-hidden="true">${sv('cal', 16)}</span>Room details</h3>${dl([['Type', RKIND[m.kind || 'event']], ['Date', rmWhen(r) + (m.tz ? ' ' + esc(m.tz) : '')], ['Format', RFMT[m.fmt] || 'In person'], r.place ? ['Place', esc(r.place)] : null, m.platform ? ['Platform', esc(m.platform)] : null, m.link ? ['Meeting link', `<a href="${esc(m.link)}" target="_blank" rel="noopener">Open ${sv('ext', 12)}</a>`] : null, ['Access', m.priv === 'private' ? 'Private, invite only' : 'Public, anyone with the link'], m.cap ? ['Attendance limit', fmtN(m.cap)] : null, (m.topics || []).length ? ['Topics', esc(m.topics.join(', '))] : null, ['Code', esc(r.code)], ['Created', fmtD(r.created_at)]])}${m.desc ? `<div class="md-quote"><span>Description</span><p>${esc(m.desc)}</p></div>` : ''}</section>
 <section class="md-sec"><h3><span class="md-wi sm t-pw" aria-hidden="true">${sv('user', 16)}</span>Organiser</h3>${o && o.name ? dl([['Name', `${esc(o.name)}${o.handle ? ` <small>@${esc(o.handle)}</small>` : ''}`], o.company ? ['Company', esc(o.company)] : null, o.status ? ['Account', auSt(o.status)] : null]) + (o.id ? `<button type="button" class="au-inl" onclick="mdToUser('${o.id}')">Open in Users</button>` : '') : '<p class="ix-mu">The organiser account no longer exists.</p>'}
 ${isNum(d.reports) ? `<p class="md-sub">Reports about this Room</p><p class="rm-rp">${fmtN(d.reports)} in total${d.reports_open ? `, ${d.reports_open} open. <button type="button" class="au-inl" onclick="admGo('reports')">Go to Moderation</button>` : ''}</p>` : ''}</section></div>
 ${canRoomEdit() || canRoomDel() ? `<div class="md-acts">${canRoomEdit() && !d.lite ? `<button type="button" class="ix-btn" onclick="rmEdit('${id}')">${sv('edit', 16)} Edit room</button>` : ''}${canRoomEdit() && !d.lite ? `<button type="button" class="ix-btn" onclick="rmExport('${id}')">${sv('dl', 16)} Export results</button>` : ''}${canRoomDel() ? `<button type="button" class="ix-btn rm-del" onclick="rmDel('${id}')">${sv('trash', 16)} Delete room</button>` : ''}</div>${d.lite ? '<p class="au-fine">Editing and exports need database update 007.</p>' : ''}` : ''}`;
}
function rmAtt(d) {
  if (!d.attendees) return `<p class="ix-mu au-pad">Run database update 007 to see attendees.</p>`;
  const A = d.attendees;
  if (!A.length)
    return `<div class="au-empty sm">${sv('users', 20)}<b>No attendees yet</b><p>People appear here once they start a Thread in this Room.</p></div>`;
  return `<p class="au-fine">People who started Threads in this Room. The people they met are shown in Activity by first name and initial only.</p><ul class="au-th-l">${A.map(a => `<li><div><b>${esc(a.name || 'Deleted account')}${a.handle ? ` <small>@${esc(a.handle)}</small>` : ''}</b><small>${fmtN(a.threads)} Thread${a.threads === 1 ? '' : 's'} · ${fmtN(a.confirmed)} confirmed · last ${fmtD(a.last)}</small></div>${a.id && a.name ? `<button type="button" class="au-inl" onclick="mdToUser('${a.id}')">Open</button>` : ''}</li>`).join('')}</ul>`;
}
function rmAct(d) {
  if (!d.recent) return `<p class="ix-mu au-pad">Run database update 007 to see activity.</p>`;
  const R = d.recent;
  if (!R.length) return `<div class="au-empty sm">${sv('linkc', 20)}<b>No Threads yet</b></div>`;
  return `<ol class="au-tl">${R.map(t => `<li><span aria-hidden="true">${sv('linkc', 15)}</span><div><b>${esc(t.by || 'Someone')} met ${esc(t.other || 'someone')}</b><p>${t.resolved ? 'Resolved' : t.answered ? 'Both answered "What\'s next?"' : t.confirmed ? 'Confirmed by both' : 'Waiting for confirmation'}</p><small>${fmtD(t.created_at)}, ${fmtT(t.created_at)}</small></div></li>`).join('')}</ol>`;
}
function rmHist(d) {
  const r = d.room;
  if (!d.history) return `<p class="ix-mu au-pad">Run database update 007 to see history.</p>`;
  const H = d.history.slice();
  H.push({ action: 'room.created', created_at: r.created_at, actor: (d.owner || {}).name });
  const L = {
    'room.created': 'Room created',
    'room.create': 'Created by staff',
    'room.update': 'Room edited',
    'room.delete': 'Room deleted',
    'room.qr': 'QR code downloaded',
    'room.link': 'Link copied',
    'room.export': 'Results exported'
  };
  return `<ol class="au-tl">${H.map(h => `<li><span aria-hidden="true">${sv(h.action === 'room.created' ? 'cal' : 'shield', 15)}</span><div><b>${L[h.action] || esc(h.action)}${h.actor ? ` <small>by ${esc(h.actor)}</small>` : ''}</b>${h.reason ? `<p>${esc(h.reason)}</p>` : ''}<small>${fmtD(h.created_at)}, ${fmtT(h.created_at)}</small></div></li>`).join('')}</ol>`;
}
/* link, QR, export */
function rmCode(id) {
  const d = RMX.det[id];
  return d ? d.room.code : (((RMX.data || {}).rows || []).find(r => r.id === id) || {}).code;
}
function rmCopy(id) {
  copy(rmLink(rmCode(id)), 'Room link copied');
  if (!RMX.limited) arpc('admin_room_log', { rid: id, act: 'room.link' }).catch(() => {});
}
function rmQr(id) {
  const c = rmCode(id),
    n = (RMX.det[id] || { room: {} }).room.name || 'Room';
  modal(
    `<div class="cap-m rm-qrm"><div class="row between"><h3>QR code</h3><button class="x" aria-label="Close" onclick="closeModal()">&times;</button></div><p class="fu-sub">Show this on screens, badges or tables. Scanning it opens the ${esc(n)} join page.</p><div id="rmqr" class="rm-qr"></div><p class="rm-qc">introthread.com/r/${esc(c)}</p><button class="cap-btn" onclick="rmQrDl('${id}')">${sv('dl', 16)} Download PNG</button></div>`
  );
  setTimeout(() => qr($('#rmqr'), rmLink(c), 240), 0);
}
function rmQrDl(id) {
  const c = rmCode(id);
  try {
    if (!window.qrcode) throw 0;
    const q = qrcode(0, 'M');
    q.addData(rmLink(c));
    q.make();
    const n = q.getModuleCount(),
      cell = 16,
      pad = 4 * cell,
      sz = n * cell + pad * 2;
    const cv = document.createElement('canvas');
    cv.width = cv.height = sz;
    const x = cv.getContext('2d');
    x.fillStyle = '#fff';
    x.fillRect(0, 0, sz, sz);
    x.fillStyle = '#0b1122';
    for (let r = 0; r < n; r++)
      for (let k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect(pad + k * cell, pad + r * cell, cell, cell);
    const a = document.createElement('a');
    a.download = 'introthread-room-' + c + '.png';
    a.href = cv.toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (!RMX.limited) arpc('admin_room_log', { rid: id, act: 'room.qr' }).catch(() => {});
  } catch (_) {
    toast('Could not make the QR image. Try again.');
  }
}
function rmExport(id) {
  const d = RMX.det[id];
  if (!d || !d.attendees) return;
  const r = d.room;
  admDownload(
    'introthread-room-' + r.code + '.csv',
    admCsv(
      d.attendees.map(a => Object.assign({}, a, { last: a.last })),
      [
        ['name', 'Name'],
        ['handle', 'Handle'],
        ['threads', 'Threads'],
        ['confirmed', 'Confirmed'],
        ['last', 'Last Thread']
      ]
    ),
    'text/csv'
  );
  arpc('admin_room_log', { rid: id, act: 'room.export' }).catch(() => {});
  toast('Results downloaded');
}
function rmDel(id) {
  const d = RMX.det[id] || { room: {} };
  admAsk({
    title: 'Delete this room',
    danger: true,
    body: `Deletes ${esc(d.room.name || 'this Room')} and its link. Threads made there are kept, but lose their Room tag. This cannot be undone.`,
    typed: 'DELETE',
    cta: 'Delete room',
    run: async r => {
      await arpc('admin_delete_room', { room: id, reason: r });
      toast('Room deleted');
      RMX.open = null;
      RMX._after = 1;
    }
  });
}
/* create and edit */
function rmEdit(id) {
  const d = id ? RMX.det[id] : null,
    r = d ? d.room : {},
    m = (r && r.meta) || {};
  const v = x => esc(x == null ? '' : String(x));
  const fmt = m.fmt || 'inperson';
  admAsk({
    title: id ? 'Edit room' : 'Create room',
    cta: id ? 'Save changes' : 'Create room',
    body: id
      ? 'Changes show on the join page straight away.'
      : 'Each Room gets a short code and its own link and QR code.',
    extra: `<div class="rm-form"><label class="x-f"><span>Room name <i>*</i></span><input id="rmn" maxlength="80" value="${v(r.name)}" placeholder="Founders Night, London"></label>
  <label class="x-f"><span>Type</span><select id="rmk">${Object.entries(RKIND)
    .map(([k, l]) => `<option value="${k}" ${(m.kind || 'event') === k ? 'selected' : ''}>${l}</option>`)
    .join('')}</select></label>
  <div class="ro-g2"><label class="x-f"><span>Date <i>*</i></span><input id="rmd" type="date" value="${v(String(r.event_date || ymdToday()).slice(0, 10))}"></label><label class="x-f"><span>Format</span><select id="rmf" onchange="$('#rmpl').hidden=this.value==='online';$('#rmon').hidden=this.value==='inperson'">${Object.entries(
    RFMT
  )
    .map(([k, l]) => `<option value="${k}" ${fmt === k ? 'selected' : ''}>${l}</option>`)
    .join('')}</select></label></div>
  <div class="ro-g2"><label class="x-f"><span>Starts</span><input id="rms" type="time" value="${v(m.start)}"></label><label class="x-f"><span>Ends</span><input id="rme" type="time" value="${v(m.end)}"></label></div>
  <label class="x-f" id="rmpl" ${fmt === 'online' ? 'hidden' : ''}><span>Place</span><input id="rmp" maxlength="120" value="${v(r.place)}" placeholder="Venue, area, city"></label>
  <div class="ro-g2" id="rmon" ${fmt === 'inperson' ? 'hidden' : ''}><label class="x-f"><span>Platform</span><input id="rmpf" maxlength="30" value="${v(m.platform)}" placeholder="Zoom, Google Meet, Teams"></label><label class="x-f"><span>Meeting link</span><input id="rmu" type="url" maxlength="300" value="${v(m.link)}" placeholder="https://"></label></div>
  <div class="ro-g2"><label class="x-f"><span>Access</span><select id="rmv"><option value="public">Public: anyone with the link</option><option value="private" ${m.priv === 'private' ? 'selected' : ''}>Private: invite only</option></select></label><label class="x-f"><span>Attendance limit</span><input id="rmc" type="number" min="2" max="100000" value="${v(m.cap || '')}" placeholder="No limit"></label></div>
  <label class="x-f"><span>Description</span><textarea id="rmx" rows="2" maxlength="280" placeholder="Who is it for and what will happen?">${v(m.desc)}</textarea></label>
  ${RMX.limited ? '' : `<label class="x-f"><span>Organiser ${id ? '(leave empty to keep the current one)' : '(email or handle, leave empty for you)'}</span><input id="rmo" maxlength="120" autocomplete="off" placeholder="${id ? esc((d.owner || {}).handle ? '@' + d.owner.handle : '') : 'name@company.com or @handle'}"></label>`}</div>`,
    run: async reason => {
      const g = x => (($('#' + x) || {}).value || '').trim();
      const name = g('rmn'),
        date = g('rmd'),
        f = g('rmf') || 'inperson';
      if (!name) throw new Error('Add a Room name');
      if (!date) throw new Error('Add a date');
      const link = f === 'inperson' ? '' : g('rmu');
      if (link && !/^https:\/\//i.test(link)) throw new Error('Meeting link must start with https://');
      const s = g('rms'),
        e = g('rme');
      if (s && e && e <= s) throw new Error('End time must be after the start time');
      const meta = Object.assign({}, m, {
        kind: g('rmk') || 'event',
        fmt: f,
        start: s,
        end: e,
        tz: m.tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
        platform: f === 'inperson' ? '' : g('rmpf'),
        link,
        priv: g('rmv') || 'public',
        cap: +g('rmc') || 0,
        desc: g('rmx'),
        topics: m.topics || []
      });
      const place = f === 'online' ? '' : g('rmp');
      if (RMX.limited) {
        if (id) throw new Error('Editing needs database update 007');
        const code = (
          name.replace(/[^A-Za-z]/g, '').slice(0, 3) + Math.floor(10 + Math.random() * 89)
        ).toUpperCase();
        const { data, error } = await SB.from('rooms')
          .insert({
            owner_id: DB.session,
            name,
            event_date: date,
            location: place + '\n@@' + JSON.stringify(meta),
            code
          })
          .select()
          .single();
        if (error) throw error;
        await arpc('admin_log', {
          act: 'room.create',
          uid: null,
          reason,
          details: { room: data.id, name }
        }).catch(() => {});
        RMX._after = data.id;
        toast('Room created');
      } else {
        const res = await arpc('admin_room_save', {
          rid: id || null,
          owner_ref: g('rmo'),
          p_name: name,
          p_date: date,
          p_place: place,
          p_meta: meta,
          reason
        });
        RMX._after = (res && res.id) || id;
        toast(id ? 'Room updated' : 'Room created, code ' + ((res && res.code) || ''));
      }
    }
  });
}
const _askGo37 = admAskGo;
admAskGo = async function () {
  await _askGo37.apply(this, arguments);
  if (ADM.tab === 'rooms' && !$('#mback.open') && RMX._after) {
    const id = RMX._after;
    RMX._after = null;
    await rmLoad(true);
    if (typeof id === 'string') {
      await rmOpen(id);
    } else rmClose();
  }
};
