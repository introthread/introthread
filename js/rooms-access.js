// Introthread - Rooms access (v36): Room pass by card, Room types, join page, private Rooms, seat limit, members; Admin > Users Room passes.
// Loaded by index.html after the main script, in this order: rooms-access, admin-idle, room-sessions, billing-sync.
// Uses the main script's globals (render, DB, SB, esc, ...). See ARCHITECTURE.md > Refactor plan.

/* v36 Rooms access: Room pass by card (Paystack), Room types and repeats, join page, private Rooms, seat limit, members.
   Server rules live in supabase/migrations/014_rooms_access.sql. Until 014 is run, everything falls back to the older behaviour. */
const RA = { m14: null, passes: null, box: {} };
const raKind = k => ({ community: 'Community', meeting: 'Team meeting' })[k] || 'Event';
const raRep = r => ({ weekly: 'Every week', biweekly: 'Every 2 weeks', monthly: 'Every month' })[r] || '';
function raNext(r) {
  const m = rm9(r);
  if (!m.repeat || !r.date) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const d = new Date(r.date);
  d.setHours(0, 0, 0, 0);
  let i = 0;
  while (d < t && i++ < 800) {
    if (m.repeat === 'monthly') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + (m.repeat === 'biweekly' ? 14 : 7));
  }
  return d;
}
async function raPasses() {
  if (!cloud()) return null;
  try {
    const { data, error } = await SB.rpc('my_room_passes');
    if (error) {
      RA.m14 = false;
      return null;
    }
    RA.m14 = true;
    RA.passes = +data || 0;
    return RA.passes;
  } catch (e) {
    return null;
  }
}
const _bRA36 = bRoomAllowed;
bRoomAllowed = function () {
  if (cloud() && RA.m14) return myRooms().length < FREE_ROOMS || (RA.passes || 0) > 0;
  return _bRA36();
};
const _bRP36 = bRoomPass;
bRoomPass = function () {
  if (!(cloud() && typeof IT_SV !== 'undefined' && IT_SV && IT_SV.pay)) return _bRP36.apply(this, arguments);
  modal(
    `<div class="bl-co"><div class="row between"><h3>Buy a Room pass</h3><button class="x" aria-label="Close" onclick="closeModal()">&times;</button></div><p class="fu-sub">One extra Room for an event or community: Room link and QR code, members and invitations, up to 1,000 people.</p><div class="bl-sum"><div class="tot"><span>Room pass, one Room</span><b>${money(199)}</b></div></div><button type="button" class="x-btn lg block" onclick="raPay(this)">Continue to secure payment</button><p class="bl-fine c">${sv('lock', 12)} Card payment on Paystack's secure page. Charged once in Kenyan shillings; your bank converts it. The pass is added as soon as the payment goes through.</p></div>`
  );
};
async function raPay(b) {
  b.disabled = true;
  b.textContent = 'Opening secure payment...';
  const r = await itApi('pay-init', { kind: 'rooms' });
  if (r && r.url) {
    location.href = r.url;
    return;
  }
  b.disabled = false;
  b.textContent = 'Continue to secure payment';
  toast(
    r && r.error === 'auth'
      ? 'Please sign in again.'
      : 'Payment could not start. Nothing was charged. Try again in a moment.'
  );
}

/* Join page: introthread.com/r/CODE */
const RJ = {};
const _vRC36 = vRoomCode;
vRoomCode = function (code) {
  code = String(code || '').toUpperCase();
  if (!SB || (MODE === 'demo' && DB.session)) return _vRC36(code);
  const st = RJ[code];
  if (st && st.fallback) return _vRC36(code);
  if (!st) {
    RJ[code] = { loading: true };
    rjLoad(code);
  }
  return `<div class="pub"><div class="pubcard"><div class="center" style="margin-bottom:22px">${logo()}</div><div class="card pad-lg center rj" id="rjb">${st && st.data ? rjBody(code, st.data) : '<p class="muted">Loading Room...</p>'}</div></div></div>`;
};
async function rjLoad(code) {
  try {
    const { data, error } = await SB.rpc('room_public', { p_code: code });
    if (error) {
      RJ[code] = { fallback: true };
    } else RJ[code] = { data };
  } catch (e) {
    RJ[code] = { fallback: true };
  }
  if ((RH() || '').toUpperCase().includes('/R/' + code)) render();
}
function rjBody(code, d) {
  if (!d.found)
    return `<span class="chip blue">Room ${esc(code)}</span><h2>Room not found</h2><p class="muted">Check the code, or ask the organiser for the link.</p>`;
  const priv = d.priv === 'private',
    dt = d.date
      ? new Date(d.date + 'T12:00:00').toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : '';
  const info = `<span class="chip blue">Room ${esc(d.code)}</span> <span class="chip">${raKind(d.kind)}</span> <span class="chip">${priv ? 'Private, invite only' : 'Public'}</span><h2 style="letter-spacing:-.6px">${esc(d.name)}</h2>
 <p class="muted rj-m">${dt ? esc(dt) : ''}${d.start ? ' &middot; ' + esc(d.start) + (d.end ? '-' + esc(d.end) : '') : ''}${d.repeat ? ' &middot; ' + raRep(d.repeat) : ''}${d.place ? '<br>' + esc(d.place) : ''}${d.owner ? '<br>Organised by ' + esc(d.owner) : ''}</p>${d.desc ? `<p class="rj-d">${esc(d.desc)}</p>` : ''}
 <p class="rj-n">${d.members} ${d.members === 1 ? 'person has' : 'people have'} joined${d.cap < 1000 ? ' &middot; ' + d.cap + ' places' : ''}</p>`;
  let act;
  if (!me() && d.full)
    act = `<p class="rj-no">This Room is full.</p><p class="small muted">Already a member? <a href="/login" onclick="try{localStorage.setItem('it_join','${esc(d.code)}')}catch(e){}">Sign in</a></p>`;
  else if (!me())
    act = `<button type="button" class="btn primary" onclick="rjSignIn('${esc(d.code)}')">Sign in to join</button><p class="small muted" style="margin-top:12px">New to Introthread? <a href="/signup" onclick="try{localStorage.setItem('it_join','${esc(d.code)}')}catch(e){}">Get your free card</a></p>`;
  else if (d.is_owner || d.status === 'member')
    act = `<p class="rj-ok">${d.is_owner ? 'This is your Room.' : 'You are in this Room.'}</p>${d.link ? `<p><a href="${esc(d.link)}" target="_blank" rel="noopener">Join online</a></p>` : ''}<button type="button" class="btn primary" onclick="rjOpen('${d.id}')">Open Room</button>`;
  else if (d.status === 'pending') act = `<p class="rj-ok">Request sent. The organiser will let you in.</p>`;
  else if (d.full) act = `<p class="rj-no">This Room is full.</p>`;
  else if (priv && !d.invited)
    act = `${d.status === 'declined' ? '<p class="rj-no">The organiser did not accept your last request.</p>' : '<p class="muted small">This Room is invite only. Ask to join and the organiser will decide.</p>'}<button type="button" class="btn primary" onclick="rjJoin('${esc(d.code)}',this)">Request to join</button>`;
  else
    act = `<button type="button" class="btn primary" onclick="rjJoin('${esc(d.code)}',this)">Join Room</button>`;
  return (
    info +
    `<div class="rj-a">${act}</div><p class="small muted" style="margin-top:16px">Tap or scan the card of anyone you meet here to start a Thread.</p>`
  );
}
const rjCode = c => (/^[A-Z0-9]{2,12}$/.test(String(c || '').toUpperCase()) ? String(c).toUpperCase() : '');
function rjSignIn(code) {
  code = rjCode(code);
  try {
    if (code) localStorage.setItem('it_join', code);
  } catch (e) {}
  go('/login');
}
async function rjOpen(id) {
  if (!DB.rooms.find(r => r.id === id)) {
    const { data } = await SB.from('rooms').select('*').eq('id', id).maybeSingle();
    if (data) {
      const r = mapRoom(data);
      rm9(r);
      DB.rooms.push(r);
    }
  }
  go('/app/room/' + id);
}
async function rjJoin(code, b) {
  if (b) {
    b.disabled = true;
  }
  try {
    const { data, error } = await SB.rpc('room_join', { p_code: code });
    if (error) throw error;
    if (data === 'member') {
      toast('You joined the Room');
    } else if (data === 'pending') toast('Request sent');
    else if (data === 'full') toast('Sorry, this Room is full');
    delete RJ[code];
    render();
  } catch (e) {
    if (b) b.disabled = false;
    toast((e && e.message) || 'Could not join. Try again.');
  }
}

/* Room page: type, repeats, next session, members, requests and invitations */
function raStrip(r) {
  const m = rm9(r),
    n = raNext(r);
  return `<span class="ra-t">${raKind(m.kind)}${m.repeat ? ' &middot; ' + raRep(m.repeat) : ''}${n ? ' &middot; next session ' + n.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}</span>`;
}
function raBox(id) {
  const r = DB.rooms.find(x => x.id === id);
  if (!r) return '';
  const own = r.ownerId === DB.session;
  if (!cloud())
    return `<div class="card pad ra-box"><h3>People in this Room</h3><p class="muted small">Members, invitations and join requests show here on the live site.</p></div>`;
  if (RA.m14 === false) return '';
  const B = RA.box[id];
  if (!B) {
    RA.box[id] = { loading: true };
    raLoad(id);
  }
  if (!B || B.loading)
    return `<div class="card pad ra-box" id="rab"><h3>People in this Room</h3><p class="muted small">Loading...</p></div>`;
  if (B.err)
    return `<div class="card pad ra-box" id="rab"><h3>People in this Room</h3><p class="muted small">${esc(B.err)}</p></div>`;
  const d = B.data,
    M = d.members.filter(x => x.status === 'member'),
    P = d.members.filter(x => x.status === 'pending'),
    m = rm9(r);
  const who = x =>
    `<span class="ra-w"><b>${esc(x.name || 'Member')}</b><small>${esc([x.role, x.company].filter(Boolean).join(', '))}</small></span>`;
  let h = `<div class="card pad ra-box" id="rab"><div class="row between"><h3>People in this Room</h3><span class="ra-c">${M.length}${d.cap < 1000 ? ' of ' + d.cap : ''} joined</span></div>`;
  if (own && P.length)
    h += `<h4>Waiting for you (${P.length})</h4><ul class="ra-l">${P.map(x => `<li>${who(x)}<span class="ra-b"><button type="button" class="x-btn sm" onclick="raAct('${id}','${x.id}','member')">Let in</button><button type="button" class="t-how sm" onclick="raAct('${id}','${x.id}','declined')">Decline</button></span></li>`).join('')}</ul>`;
  h += M.length
    ? `<ul class="ra-l">${M.map(x => `<li>${x.handle ? `<a href="/${esc(x.handle)}" class="ra-wl">${who(x)}</a>` : who(x)}${own ? `<span class="ra-b"><button type="button" class="t-how sm" onclick="raAct('${id}','${x.id}','remove')" aria-label="Remove ${esc(x.name || 'member')}">Remove</button></span>` : ''}</li>`).join('')}</ul>`
    : `<p class="muted small">No one has joined yet. Share the Room link or QR code.</p>`;
  if (own && m.priv === 'private')
    h += `<h4>Invitations</h4><p class="muted small">Invited people get in straight away when they open the Room link and sign in with this email. Anyone else can ask, and you decide.</p><label class="x-f"><span>Email addresses</span><textarea id="rai" rows="2" maxlength="4000" placeholder="name@company.com, another@company.com"></textarea></label><button type="button" class="x-btn sm" onclick="raInvite('${id}')">Add invitations</button>${d.invites.length ? `<ul class="ra-l ra-inv">${d.invites.map(e => `<li><span>${esc(e)}</span><button type="button" class="t-how sm" onclick="raUninvite('${id}','${esc(e)}')" aria-label="Remove invitation for ${esc(e)}">Remove</button></li>`).join('')}</ul>` : ''}`;
  if (!own)
    h += `<button type="button" class="t-how" style="margin-top:12px" onclick="raLeave('${id}')">Leave this Room</button>`;
  return h + `</div>`;
}
async function raLoad(id) {
  try {
    const { data, error } = await SB.rpc('room_members_list', { p_room: id });
    if (error) {
      if (/function|schema cache/i.test(error.message || '')) {
        RA.m14 = false;
        delete RA.box[id];
      } else RA.box[id] = { err: error.message };
    } else RA.box[id] = { data };
  } catch (e) {
    RA.box[id] = { err: 'Could not load members.' };
  }
  if ((RH() || '').includes('/app/room/' + id)) {
    window._keepScroll = true;
    render();
  }
}
async function raAct(id, u, st) {
  const { data, error } = await SB.rpc('room_member_set', { p_room: id, p_user: u, p_status: st });
  if (error) return toast(error.message);
  if (data === 'full') toast('The Room is full. Raise the limit or remove someone first.');
  else toast(st === 'member' ? 'Let in' : st === 'remove' ? 'Removed' : 'Declined');
  delete RA.box[id];
  window._keepScroll = true;
  render();
}
async function raInvite(id) {
  const v = (($('#rai') || {}).value || '')
    .split(/[\s,;]+/)
    .map(x => x.trim())
    .filter(Boolean);
  if (!v.length) return toast('Add at least one email');
  const { data, error } = await SB.rpc('room_invite', { p_room: id, p_emails: v });
  if (error) return toast(error.message);
  const m = await itApi('room-invite', { room_id: id, emails: v });
  toast(
    m && m.sent
      ? m.sent +
          ' invitation' +
          (m.sent === 1 ? '' : 's') +
          ' emailed' +
          (m.failed ? ', ' + m.failed + ' could not be sent. Share the Room link with them.' : '.')
      : data + ' invitation' + (data === 1 ? '' : 's') + ' added. Send them the Room link.'
  );
  delete RA.box[id];
  window._keepScroll = true;
  render();
}
async function raUninvite(id, e) {
  const { error } = await SB.rpc('room_uninvite', { p_room: id, p_email: e });
  if (error) return toast(error.message);
  delete RA.box[id];
  window._keepScroll = true;
  render();
}
async function raLeave(id) {
  if (!confirm('Leave this Room?')) return;
  const { error } = await SB.rpc('room_leave', { p_room: id });
  if (error) return toast(error.message);
  DB.rooms = DB.rooms.filter(r => r.id !== id);
  delete RA.box[id];
  toast('You left the Room');
  go('/app/rooms');
}

/* after each render: decorate the Room page and list joined Rooms */
const raPath = () => String(RH() || '').replace(/^#/, '');
function raPost() {
  const p = raPath().split('/').filter(Boolean);
  if (p[0] === 'app' && p[1] === 'room' && p[2]) {
    const r = DB.rooms.find(x => x.id === p[2]);
    if (!r) return;
    const s = document.querySelector('.ro-strip');
    if (s && !s.querySelector('.ra-t')) s.insertAdjacentHTML('afterbegin', raStrip(r));
    if (r.ownerId !== DB.session)
      document
        .querySelectorAll(
          '#root :is([onclick*="rMenu("],[data-on-click*="rMenu("],[onclick*="delRoom"],[data-on-click*="delRoom"])'
        )
        .forEach(e => (e.hidden = true));
    const box = raBox(r.id),
      old = $('#rab') || document.querySelector('.ra-box');
    if (old) {
      if (box) old.outerHTML = box;
      else old.remove();
    } else if (box) {
      const host =
        document.querySelector('#root main') || document.querySelector('#root .main') || $('#root');
      const t = s || host.querySelector('h1');
      (t && t.parentNode ? t.parentNode : host).insertAdjacentHTML('beforeend', box);
    }
  }
  if (p[0] === 'app' && p[1] === 'rooms' && !$('#raj')) {
    const J = DB.rooms.filter(r => r.ownerId && r.ownerId !== DB.session);
    if (!J.length || !cloud()) return;
    const h1 = document.querySelector('#root h1');
    if (!h1) return;
    const ph = h1.closest('.ph') || h1.parentNode;
    ph.insertAdjacentHTML(
      'afterend',
      `<div class="card pad ra-box" id="raj"><h3>Rooms you have joined</h3><ul class="ra-l">${J.map(r => `<li><a href="/app/room/${r.id}" class="ra-wl"><span class="ra-w"><b>${esc(r.name)}</b><small>${raKind(rm9(r).kind)} &middot; ${esc(rFmt ? rFmt(r, { day: 'numeric', month: 'short', year: 'numeric' }) : '')}</small></span></a></li>`).join('')}</ul></div>`
    );
  }
}
const _render36 = render;
render = function () {
  const r = _render36.apply(this, arguments);
  try {
    if (me() && cloud()) {
      let j = null;
      try {
        j = rjCode(localStorage.getItem('it_join')) || null;
        if (!j) localStorage.removeItem('it_join');
      } catch (e) {}
      if (j && raPath().startsWith('/app')) {
        try {
          localStorage.removeItem('it_join');
        } catch (e) {}
        delete RJ[j];
        go('/r/' + j);
        return r;
      }
      if (RA.m14 === null) {
        RA.m14 = undefined;
        raPasses();
      }
    }
    raPost();
  } catch (e) {
    console.error(e);
  }
  return r;
};

/* Admin > Users: add a Room pass by hand (bank transfer). Needs migration 014. */
const _auPanel36 = auPanel;
auPanel = function () {
  const h = _auPanel36.apply(this, arguments);
  const id = ADMU.open;
  if (!id || !admOk(['owner', 'admin', 'finance'])) return h;
  return (
    h +
    `<section class="au-sec"><h3>${sv('cal', 16)} Room passes</h3><p class="ix-mu">Each pass lets this person create one extra Room. Use this when they paid by bank transfer; card payments add passes automatically.</p><button type="button" class="ix-btn" onclick="auGrantPass('${id}')">Add a Room pass</button></section>`
  );
};
function auGrantPass(id) {
  admAsk({
    title: 'Add a Room pass',
    body: 'This person can create one more Room. Say how they paid, for example the invoice number.',
    run: async reason => {
      const { data, error } = await SB.rpc('admin_room_pass_grant', { p_user: id, p_reason: reason });
      if (error)
        throw new Error(
          /function|schema cache/i.test(error.message || '') ? 'Needs database update 014' : error.message
        );
      toast('Room pass added. Unused passes: ' + data);
    }
  });
}
