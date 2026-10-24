// Introthread - Today screen (v85): dAction, dMenu, dIcs, fuOpen, fuSave, vToday. Moved out of js/core.js
// unchanged (code cleanup step 3). Since v87 its helpers (dChip, dWarm, dRing, dSecHead, dPromo, DRANGE, D_OUT) live
// at the top of this file too. Loads straight after auth-pages.js and shares core.js globals. Later files wrap some
// of these (vToday in contacts-import.js, dIcs in pro-gates.js). dMenu, dIcs, fuOpen, dChip and dSecHead are also
// used from the Threads screens, and DRANGE from billing.js, all at run time only.

/* v87: the Today screen helpers, moved unchanged from js/core.js. */
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
let DRANGE = 7;
const D_OUT = [
  ['message', 'Sent a message', 'mail'],
  ['call', 'Had a call', 'phone'],
  ['meeting', 'Meeting booked', 'cal'],
  ['opportunity', 'Opportunity created', 'spark'],
  ['notnow', 'Not now, stay in touch', 'sync'],
  ['resolved', 'Resolved', 'check']
];

function dAction(t) {
  const s = threadState(t);
  if (s === 'pending')
    return [
      'Send reminder',
      `copy(threadLink(findThread('${t.id}')),'Confirm link copied. Send it to ${esc(t.other.name.split(' ')[0]).replace(/'/g, '')}')`,
      1
    ];
  if (s === 'open' && !t.mine) return ['Answer', `go('/app/thread/${t.id}')`, 1];
  if (s === 'open' || s === 'matched') return ['Follow up', `go('/app/thread/${t.id}')`, 1];
  return ['View thread', `go('/app/thread/${t.id}')`, 0];
}

function dMenu(id) {
  const t = findThread(id);
  modal(
    `<div><div class="row" style="gap:12px;margin-bottom:14px">${xav(t.other.name, 44)}<div><b>${esc(t.other.name)}</b><div class="small muted">${esc([t.other.role, t.other.company].filter(Boolean).join(' · '))}</div></div></div><div class="t-more"><a href="/app/thread/${t.id}" data-on-click="closeModal()">${sv('eye', 18)} Open Thread</a><button data-on-click="copyThreadLink('${t.id}','Confirm link copied',true)">${sv('link', 18)} Copy confirm link</button><button data-on-click="waConfirm('${t.id}');closeModal()">${sv('send', 18)} Send confirm link on WhatsApp</button><button data-on-click="closeModal();tpEdit('${t.id}')">${sv('grid', 18)} Edit topics</button><button data-on-click="dIcs('${t.id}');closeModal()">${sv('cal', 18)} Add follow-up to calendar</button><button data-on-click="closeModal();delThread('${t.id}')" style="color:#d14343">${sv('close', 18)} Delete Thread</button></div></div>`
  );
}

function dIcs(id) {
  const t = findThread(id);
  const d = new Date(Date.now() + DAY);
  d.setHours(10, 0, 0, 0);
  const f = x => x.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const e = new Date(d.getTime() + 30 * 6e4);
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Introthread//EN',
    'BEGIN:VEVENT',
    'UID:' + t.id + '@introthread.com',
    'DTSTAMP:' + f(new Date()),
    'DTSTART:' + f(d),
    'DTEND:' + f(e),
    'SUMMARY:Follow up with ' + t.other.name,
    'DESCRIPTION:Met at ' + (t.where || '') + '. https://www.introthread.com/app/thread/' + t.id,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'follow-up-' + t.other.name.replace(/\s+/g, '-') + '.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast('Calendar reminder downloaded');
}

function fuOpen(id) {
  const t = findThread(id);
  if (!t) return toast('That Thread is no longer available.');
  const s = threadState(t);
  modal(`<div class="fu-m"><div class="row between"><div class="row" style="gap:12px">${xav(t.other.name, 46)}<div><b>${esc(t.other.name)}</b><div class="small muted">${esc([t.other.role, t.other.company].filter(Boolean).join(', ') || 'New connection')}</div></div></div><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div>
 <h3>Record the follow-up</h3><p class="fu-sub">${s === 'pending' ? 'They have not confirmed yet. Resend the confirm link, then log what happened.' : 'Log what happened so the Thread stays accurate.'}</p>
 <div class="fu-opts" role="radiogroup" aria-label="Outcome">${D_OUT.map(([k, l, i], n) => `<label><input type="radio" name="fuo" value="${k}" ${n === 0 ? 'checked' : ''}><span>${sv(i, 17)}${l}</span></label>`).join('')}</div>
 <label class="x-f"><span>Note <em>(optional)</em></span><textarea id="fun" maxlength="200" rows="2" placeholder="e.g. Intro call booked for Friday"></textarea></label>
 <div class="fu-b"><a class="t-how" href="/app/thread/${t.id}" data-on-click="closeModal()">${sv('eye', 16)} Open Thread</a>${s === 'pending' ? `<button type="button" class="t-how" data-on-click="copyThreadLink('${t.id}','Confirm link copied')">${sv('link', 16)} Copy confirm link</button><button type="button" class="t-how" data-on-click="waConfirm('${t.id}')">${sv('send', 16)} WhatsApp</button>` : ''}<button type="button" class="x-btn" data-on-click="fuSave('${t.id}')">Save outcome</button></div></div>`);
}

async function fuSave(id) {
  const t = findThread(id);
  const k = (document.querySelector('input[name="fuo"]:checked') || {}).value || 'message';
  const o = D_OUT.find(x => x[0] === k);
  const n = ($('#fun') || {}).value ? $('#fun').value.trim() : '';
  closeModal();
  if (k === 'resolved') {
    resolve(id, n || 'Followed through');
    return;
  }
  try {
    await addEvent(t, 'followup', o[1] + (n ? ': ' + n : ''));
    save();
    toast('Follow-up recorded');
    render();
  } catch (e) {
    toast('Could not save the follow-up. Check your connection and try again.');
  }
}

function vToday() {
  const u = me(),
    T = myThreads();
  const now = Date.now();
  const wk = T.filter(t => now - t.createdAt < 7 * DAY).length;
  const conf = T.filter(t => t.confirmed).length,
    openA = T.filter(t => threadState(t) === 'open');
  const need = T.filter(t => ['matched', 'open', 'pending'].includes(threadState(t))).sort(
    (a, b) => pulse(a) - pulse(b)
  );
  const hr = new Date().getHours(),
    greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const date = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const stat = (ic, c, l, v, up, s) =>
    `<div class="d-stat"><span class="d-stat-ic ${c}">${sv(ic, 26)}</span><div><small>${l}</small><b>${v}${up ? `<em>&uarr; ${up}</em>` : ''}</b><span>${s}</span></div></div>`;
  const evs = myRooms()
    .filter(r => rYmd(r) >= ymdL(new Date()))
    .sort((a, b) => a.date - b.date)
    .slice(0, 3);
  const days = [...Array(DRANGE)].map((_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - DRANGE + 1 + i);
    return d.getTime();
  });
  const bins = days.map(d0 => {
    const d1 = d0 + DAY,
      inr = x => x >= d0 && x < d1;
    const dt = new Date(d0);
    return {
      l: DRANGE > 7 ? String(dt.getDate()) : dt.toLocaleDateString('en-GB', { weekday: 'short' }),
      n: T.filter(t => inr(t.createdAt)).length,
      v: T.filter(t => t.confirmed && inr(t.createdAt)).length,
      r: T.filter(t => t.resolvedAt && inr(t.resolvedAt)).length
    };
  });
  const mx = Math.max(1, ...bins.map(b => b.n + b.r));
  const tot = k => bins.reduce((a, b) => a + b[k], 0);
  const acts = T.flatMap(t => (t.events || []).map(e => ({ e, t })))
    .sort((a, b) => b.e.at - a.e.at)
    .slice(0, 3);
  const nrow = t => {
    const last = (t.events || []).slice(-1)[0];
    const s = threadState(t);
    return `<div class="d-nrow">${dRing(t)}${xav(t.other.name, 52)}<div class="d-who"><b><a href="/app/thread/${t.id}">${esc(t.other.name)}</a>${t.confirmed ? `<span class="d-ver" title="Verified">${sv('check', 10, '#fff', 3.2)}</span>` : ''}</b><small>${esc([t.other.role, t.other.company].filter(Boolean).join(', ') || 'New connection')}</small>${tagChips(t)}</div><div class="d-st">${dChip(t)}<small>${sv(t.note ? 'mail' : 'pin', 14)} ${esc(t.note || (t.where ? 'Met at ' + t.where : '') || (last && last.text) || 'Thread started')}</small><small>${sv('cal', 14)} ${ago(t.createdAt)}</small></div><button type="button" class="d-act" data-on-click="${s === 'open' && !t.mine ? `go('/app/thread/${t.id}')` : `fuOpen('${t.id}')`}">${s === 'open' && !t.mine ? 'Answer' : 'Follow up'}</button><button type="button" class="d-dots" aria-label="More options for ${esc(t.other.name)}" data-on-click="dMenu('${t.id}')">&#8942;</button></div>`;
  };
  const qa = (href, fn, ic, l, s) =>
    `${href ? `<a href="${href}"` : `<button type="button" data-on-click="${fn}"`} class="d-qi"><span>${sv(ic, 20)}</span><span><b>${l}</b><small>${s}</small></span>${href ? '</a>' : '</button>'}`;
  return shell(
    'today',
    `<div class="t-head"><div><div class="t-eye">${date}</div><h1 class="t-h1">${greet}, ${esc((u.name || '').split(' ')[0])}</h1><p class="t-sub">${need.length ? `${need.length} Thread${need.length > 1 ? 's' : ''} need${need.length > 1 ? '' : 's'} a next step. Start with the relationships most likely to go cold.` : 'You are all caught up. Start a Thread at your next meeting.'}</p></div><div class="d-hbtns"><a href="/app/card" class="t-how">${sv('user', 18)} My card</a><a href="/app/tap" class="x-btn lg">${sv('nfc', 18)} Tap to Thread</a></div></div>
 <div class="d7-top"><div class="d-main">
 <div class="d-stats d7-stats">${stat('users', 'b', 'Threads', T.length, wk, 'All time')}${stat('shield', 'b', 'Verified', conf, 0, pct(conf, T.length) + '% confirmed by both')}${stat('bell', 'o', 'Awaiting answers', openA.length, 0, 'Need your follow-up')}</div>
 <section class="d-box">${dSecHead('Needs a next step', '/app/threads')}${need.length ? need.slice(0, 5).map(nrow).join('') : `<div class="d-empty">${sv('check', 22)}<div><b>Nothing waiting on you</b><small>New Threads will appear here as soon as you tap.</small></div><a href="/app/tap" class="x-btn sm">Tap to Thread</a></div>`}</section>
 </div><div class="d-side">
 <section class="d-box">${dSecHead('Today&rsquo;s meetings')}${gcalPanel()}</section>
 <section class="d-box">${dSecHead('Upcoming events', '/app/rooms')}${
   evs.length
     ? evs
         .map(r => {
           const dd = Math.round((Date.parse(rYmd(r)) - Date.parse(ymdL(new Date()))) / DAY);
           return `<a class="d-ev" href="/app/room/${r.id}"><span class="d-evd">${rFmt(r, { weekday: 'short' })}<b>${rFmt(r, { day: 'numeric' })}</b></span><span class="d-evl"><i></i></span><span class="d-evt"><b>${esc(r.name)}</b><small>${esc(r.location || 'Room ' + r.code)}</small></span><em>${dd <= 0 ? 'Today' : dd === 1 ? 'Tomorrow' : 'In ' + dd + ' days'}</em></a>`;
         })
         .join('')
     : `<div class="d7-emp"><span>${sv('cal', 24)}</span><div><b>No upcoming events</b><small>Create a Room for your next event and every tap becomes a Thread.</small><button type="button" class="x-btn sm" data-on-click="newRoomModal()">Create a Room</button></div></div>`
 }</section>
 <section class="d-box"><div class="d-sh"><b>Thread activity</b><select class="d7-sel" aria-label="Date range" data-on-change="setDRange(this.value)">${[7, 14, 30].map(n => `<option value="${n}" ${DRANGE === n ? 'selected' : ''}>Last ${n} days</option>`).join('')}</select></div><div class="d-chart ${DRANGE > 7 ? 'many' : ''}">${bins.map(b => `<div class="d-bar" title="${b.l}: ${b.n} new, ${b.v} verified, ${b.r} resolved"><span><i class="r" style="height:${(b.r / mx) * 100}%"></i><i class="n" style="height:${(Math.max(0, b.n - b.v) / mx) * 100}%"></i><i class="v" style="height:${(b.v / mx) * 100}%"></i></span><small>${b.l}</small></div>`).join('')}</div>
 <div class="d-leg"><span><i class="n"></i>New threads <b>${tot('n')}</b></span><span><i class="v"></i>Verified <b>${tot('v')}</b></span><span><i class="r"></i>Resolved <b>${tot('r')}</b></span></div></section>
 </div></div>
 <div class="d7-bot"><section class="d-box">${dSecHead('Recent activity', '/app/threads')}${acts.length ? acts.map(({ e, t }) => `<a class="d-act-row" href="/app/thread/${t.id}"><span class="d-aic">${sv(e.k === 'resolved' ? 'check' : e.k === 'confirm' ? 'users' : e.k === 'followup' ? 'mail' : 'pin', 17)}</span><span><b>${esc(t.other.name)}</b> ${esc(e.text || '')}<small>${ago(e.at)}</small></span></a>`).join('') : '<p class="d-muted">Activity on your Threads will show here.</p>'}</section>
 <section class="d-box">${dSecHead('Quick actions')}<div class="d7-qa">${qa('/app/tap', 0, 'nfc', 'Tap to Thread', 'Share instantly')}${qa(0, 'shareNative()', 'send', 'Share my card', 'Send your link')}${qa(0, 'tapQR()', 'qr', 'Scan a QR code', 'Open a card')}${qa(0, 'capCard()', 'photo', 'Scan a paper card', 'Save it in seconds')}${qa(0, 'newRoomModal()', 'cal', 'Create a Room', 'Host an event')}</div></section>
 <div class="d7-promo"><span class="d-promo-ic">${sv('chart', 22)}</span><div><b>Turn more Threads into opportunities</b><ul>${['Add context and notes', 'Set follow-up reminders', 'Track progress to resolution'].map(x => `<li><i>${sv('check', 11, '#fff', 3.2)}</i>${x}</li>`).join('')}</ul><a href="/how">Learn more ${sv('arrow', 15)}</a></div></div>
 </div>`
  );
}

/* v96: named handlers for this screen, moved unchanged from js/core.js (code cleanup). */
function setDRange(v) {
  DRANGE = +v;
  window._keepScroll = true;
  render();
}
