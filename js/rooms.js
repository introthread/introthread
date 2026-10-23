// Introthread - Rooms screens (v90): the Rooms list and calendar (vRooms, r*, ro*), a Room page (vRoom, rm9),
// creating a Room (newRoom, newRoomModal, newRoom9), Room codes (vRoomCode), stats and the demo Rooms. Moved out of
// js/app-core.js unchanged and in their original order (code cleanup step 6). Two load-time wrappers moved with
// them so they still run right after the functions they wrap: the v4 newRoom replacement and the v9 vRoom wrapper.
// Loads straight after tap-card.js; shares app-core globals (RIMG, RIMG9, rYmd, rFmt, ...). Later files wrap
// newRoomModal, newRoom9 and vRoom.

function roomStats(r) {
  const T = DB.threads.filter(t => t.roomId === r.id);
  const v = T.filter(t => t.confirmed).length,
    a = T.filter(t => t.mine || t.theirs).length,
    m = T.filter(t => t.mine && t.mine === t.theirs && t.mine !== 'notnow').length,
    res = T.filter(t => t.resolvedAt).length;
  return { T, v, a, m, res, rate: T.length ? Math.round((res / T.length) * 100) : 0 };
}

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

function vRoomCode(code) {
  return `<div class="pub"><div class="pubcard"><div class="center" style="margin-bottom:22px">${logo()}</div><div class="card pad-lg center"><span class="chip blue">Room ${esc(String(code || '').toUpperCase())}</span><h2 style="letter-spacing:-.8px">You're in the Room</h2><p class="muted">Tap or scan the card of anyone you meet here to start a Thread. Every Thread is tagged to this event.</p><a href="#/signup" class="btn primary">Get your free card</a></div></div></div>`;
}

function rMenu(id) {
  const r = DB.rooms.find(x => x.id === id);
  modal(
    `<div><h2 style="margin:0 0 4px;font-size:20px">${esc(r.name)}</h2><p class="muted" style="margin:0 0 14px">Room code ${esc(r.code)}</p><div class="t-more"><a href="/app/room/${r.id}" data-on-click="closeModal()">${sv('eye', 18)} Open Room</a><button data-on-click="copy('https://introthread.com/r/${esc(r.code)}','Room link copied');closeModal()">${sv('link', 18)} Copy Room link</button><button data-on-click="exportRoom('${r.id}');closeModal()">${sv('arrow', 18)} Export report (CSV)</button></div></div>`
  );
}

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

function rTzAbbr(tz, ymd) {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: tz, timeZoneName: 'short' })
      .formatToParts(new Date(ymd + 'T12:00:00Z'))
      .find(p => p.type === 'timeZoneName').value;
  } catch (_) {
    return '';
  }
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

function rCalDay(k) {
  RDAY = RDAY === k ? '' : k;
  RLIM9 = 6;
  keepRender();
}
