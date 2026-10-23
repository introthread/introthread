// Introthread - Threads screens (v86): the Threads list (vThreads, th*), the Thread page (vThread, td*), topics (tp*)
// and threadVcf. Moved out of js/app-core.js unchanged (code cleanup step 4). Loads straight after today.js; shares
// app-core globals (threadState, threadLink, TF2, TQ2, TSORT, TH_SORTS, TDT, topicsField, ...). Later files wrap some
// of these (vThreads in billing.js, data-export.js, contacts-import.js, pro-gates.js and admin-audit.js).

function tpChips(sel) {
  const all = [...new Set([...TOPICS, ...sel])];
  return (
    all
      .map(
        x =>
          `<button type="button" class="tp ${sel.includes(x) ? 'on' : ''}" aria-pressed="${sel.includes(x)}" data-on-click="tpToggle(this.dataset.v)" data-v="${esc(x)}">${esc(x)}</button>`
      )
      .join('') +
    `<input class="tp-add" placeholder="+ Add your own" maxlength="20" data-on-keydown="tpKey(event,this)" data-on-blur="tpAddCustom(this)">`
  );
}

function tpToggle(x) {
  const i = TSEL.indexOf(x);
  if (i >= 0) TSEL.splice(i, 1);
  else {
    if (TSEL.length >= 3) return toast('Pick up to 3 topics');
    TSEL.push(x);
  }
  const w = $('#tpw');
  if (w) w.innerHTML = tpChips(TSEL);
}

function tpAddCustom(inp) {
  const v = inp.value.trim().replace(/[,#]/g, '').slice(0, 20);
  if (!v) return;
  inp.value = '';
  if (!TSEL.includes(v)) {
    if (TSEL.length >= 3) return toast('Pick up to 3 topics');
    TSEL.push(v);
  }
  const w = $('#tpw');
  if (w) w.innerHTML = tpChips(TSEL);
}

function tpEdit(id) {
  const t = findThread(id);
  TSEL = tagsOf(t).slice();
  modal(
    `<div><h2 style="margin:0 0 4px;font-size:20px">Topics for ${esc(t.other.name)}</h2><p class="muted" style="margin:0 0 16px">Tag what you talked about so you can find them later.</p>${topicsField(TSEL)}<div class="row" style="gap:10px;margin-top:18px"><button type="button" class="x-btn ghost" data-on-click="closeModal()">Cancel</button><button type="button" class="x-btn grow" data-on-click="tpSave('${t.id}')">Save topics</button></div></div>`
  );
}

async function tpSave(id) {
  const t = findThread(id);
  await saveTags(t, TSEL);
  closeModal();
  toast('Topics saved');
  window._keepScroll = true;
  render();
}

function thDaysLeft(t) {
  return Math.max(0, Math.ceil(pulse(t) * 7));
}

function thPri(t) {
  const s = threadState(t);
  if (s === 'resolved' || s === 'closed')
    return { c: 'n', l: 'Low priority', d: Math.max(1, Math.round((Date.now() - t.createdAt) / DAY)) + 'd' };
  if (s === 'matched' || (s === 'open' && !t.mine)) return { c: 'g', l: 'Respond', d: thDaysLeft(t) + 'd' };
  const d = thDaysLeft(t);
  return d <= 1 ? { c: 'r', l: 'High priority', d: d + 'd' } : { c: 'o', l: 'Follow up', d: d + 'd' };
}

function thRing(p) {
  const col = { r: '#e5484d', o: '#ff6a3d', g: '#12a065', n: '#98a2b3' }[p.c];
  return `<span class="th-pri ${p.c}"><span class="th-ring" style="border-color:${col}33;color:${col}"><b>${p.d}</b></span><small>${p.l}</small></span>`;
}

function thSorted(T) {
  const A = T.slice(),
    act = t => ['matched', 'open', 'pending'].includes(threadState(t));
  const rank = t => ({ matched: 0, open: 1, pending: 1, resolved: 3, closed: 4 })[threadState(t)];
  if (TSORT === 'recent') A.sort((a, b) => b.createdAt - a.createdAt);
  else if (TSORT === 'oldest') A.sort((a, b) => a.createdAt - b.createdAt);
  else if (TSORT === 'next') A.sort((a, b) => act(b) - act(a) || pulse(a) - pulse(b));
  else
    A.sort((a, b) => {
      const pa = thPri(a),
        pb = thPri(b),
        w = { r: 0, o: 1, g: 2, n: 3 };
      return w[pa.c] - w[pb.c] || pulse(a) - pulse(b) || b.createdAt - a.createdAt;
    });
  return A;
}

function thFilter() {
  const all = [...new Set(myThreads().flatMap(tagsOf))].sort();
  modal(`<div><div class="row between"><h3 style="margin:0;font:600 19px var(--xss)">Filter Threads</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div>
 <div class="x-f" style="margin-top:16px"><span>Topics</span><div class="tp-wrap">${all.length ? all.map(x => `<button type="button" class="tp ${TFT.includes(x) ? 'on' : ''}" aria-pressed="${TFT.includes(x)}" data-on-click="tpPress(this)" data-v="${esc(x)}">${esc(x)}</button>`).join('') : '<small class="muted">No topics on your Threads yet.</small>'}</div></div>
 <label class="t-tog" style="margin-top:16px"><input type="checkbox" id="tfv" ${TFV ? 'checked' : ''}><span class="t-sw"></span><span><b>Verified only</b><small>Show Threads both people confirmed.</small></span></label>
 <div class="fu-b"><button type="button" class="t-how" data-on-click="thFiltClear()">Clear</button><button type="button" class="x-btn" data-on-click="thFiltApply()">Apply</button></div></div>`);
}

function vThreads() {
  const all = myThreads();
  const cnt = s => all.filter(t => threadState(t) === s).length;
  const q = (TQ2 || Q || '').toLowerCase().trim();
  let T = all.slice();
  if (TF2 !== 'all') T = T.filter(t => threadState(t) === TF2);
  if (q)
    T = T.filter(t =>
      [t.other.name, t.other.company, t.other.role, t.where, t.note, tagsOf(t).join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  if (TFT.length) T = T.filter(t => tagsOf(t).some(x => TFT.includes(x)));
  if (TFV) T = T.filter(t => t.confirmed);
  T = thSorted(T);
  const shown = T.slice(0, TLIM);
  const tabs = [
    ['all', 'All', all.length],
    ['matched', 'Matched', cnt('matched')],
    ['open', 'Awaiting answers', cnt('open')],
    ['pending', 'Awaiting confirmation', cnt('pending')],
    ['resolved', 'Resolved', cnt('resolved')],
    ['closed', 'Closed', cnt('closed')]
  ];
  const conf = all.filter(t => t.confirmed).length,
    res = cnt('resolved'),
    wait = cnt('open') + cnt('matched') + cnt('pending');
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const fu = all
    .filter(t => ['matched', 'open', 'pending'].includes(threadState(t)))
    .sort((a, b) => pulse(a) - pulse(b))
    .slice(0, 3);
  const nf = TFT.length + (TFV ? 1 : 0);
  const sortL = (TH_SORTS.find(s => s[0] === TSORT) || [])[1].toLowerCase();
  const chipIc = s =>
    s === 'matched' || s === 'resolved'
      ? sv('check', 13, 'currentColor', 2.6)
      : s === 'closed'
        ? '<i class="th-minus"></i>'
        : sv('bell', 13);
  const row = t => {
    const s = threadState(t),
      p = thPri(t),
      act = ['matched', 'open', 'pending'].includes(s);
    const last = (t.events || []).slice(-1)[0];
    return `<div class="th-row ${p.c} ${TCOMPACT ? 'cmp' : ''}" role="link" tabindex="0" aria-label="Open Thread with ${esc(t.other.name)}" data-on-click="thRowClick(event,'${t.id}')" data-on-keydown="thRowKey(event,this,'${t.id}')">
  ${thRing(p)}${xav(t.other.name, TCOMPACT ? 44 : 60)}
  <div class="th-who"><b>${esc(t.other.name)}${t.confirmed ? `<span class="d-ver" title="Verified">${sv('check', 10, '#fff', 3.2)}</span>` : ''}</b><small>${esc([t.other.role, t.other.company].filter(Boolean).join(' · ') || 'New connection')}</small>
   <span class="th-meta"><span>${sv('pin', 14)} ${esc(t.where || 'In person')}</span><span>${sv('cal', 14)} ${ago(t.createdAt)}</span></span>${tagChips(t)}</div>
  <div class="th-st"><span class="th-chip ${{ pending: 'o', open: t.mine ? 'o' : 'b', matched: 'g', resolved: 'g', closed: 'n' }[s]}">${chipIc(s)} ${dChip(t).replace(/<[^>]+>/g, '')}</span><small>${sv('mail', 14)} <span>${esc(t.note || (last && last.text) || 'Thread started')}</span></small>${dWarm(t)}</div>
  ${act ? `<button type="button" class="d-act" data-on-click="${s === 'open' && !t.mine ? `go('/app/thread/${t.id}')` : `fuOpen('${t.id}')`}">${s === 'open' && !t.mine ? 'Answer' : 'Follow up'}</button>` : `<button type="button" class="d-act ghost" data-on-click="go('/app/thread/${t.id}')">View</button>`}
  <button type="button" class="d-dots" aria-label="More options for ${esc(t.other.name)}" data-on-click="dMenu('${t.id}')">&#8942;</button></div>`;
  };
  return shell(
    'threads',
    `<div class="t-head"><div><div class="t-eye">Threads</div><h1 class="t-h1">Every relationship, followed through</h1><p class="t-sub">Turn introductions into meaningful opportunities. ${all.length} Thread${all.length === 1 ? '' : 's'} &middot; sorted by ${sortL}</p></div><a href="/app/tap" class="x-btn lg th-new"><span aria-hidden="true">+</span> New Thread</a></div>
 <div class="th-bar"><nav class="th-tabs" aria-label="Thread status">${tabs.map(([k, l, c]) => `<button type="button" class="${TF2 === k ? 'on' : ''}" aria-pressed="${TF2 === k}" data-on-click="thTab('${k}')">${l} (${c})</button>`).join('')}</nav>
 <div class="th-tools"><select class="th-sort" aria-label="Sort Threads" data-on-change="thSort(this.value)">${TH_SORTS.map(([k, l]) => `<option value="${k}" ${TSORT === k ? 'selected' : ''}>${l}</option>`).join('')}</select><button type="button" class="th-ib ${TCOMPACT ? 'on' : ''}" aria-pressed="${TCOMPACT}" title="${TCOMPACT ? 'Comfortable rows' : 'Compact rows'}" aria-label="Toggle compact rows" data-on-click="thCompact()">${sv('menu2', 18)}</button><button type="button" class="th-filter ${nf ? 'on' : ''}" data-on-click="thFilter()">${sv('grid', 16)} Filter${nf ? ` <i>${nf}</i>` : ''}</button></div></div>
 ${q ? `<div class="th-q">Showing results for &ldquo;${esc(q)}&rdquo; <button type="button" data-on-click="thClearQ()">Clear search</button></div>` : ''}
 <div class="d7-top th-grid"><div class="th-list">${shown.length ? shown.map(row).join('') : `<div class="d-empty">${sv('search', 22)}<div><b>No Threads here</b><small>${q || nf ? 'Try a different search or clear your filters.' : 'Threads in this state will appear here.'}</small></div><a href="/app/tap" class="x-btn sm">Start a Thread</a></div>`}
 ${T.length > TLIM ? `<button type="button" class="th-more" data-on-click="thMore()">Show more <span>${Math.min(20, T.length - TLIM)} of ${T.length - TLIM} remaining</span></button>` : T.length > 20 ? `<p class="th-end">All ${T.length} Threads shown</p>` : ''}</div>
 <div class="d-side">
 <section class="d-box">${dSecHead('Threads at a glance', '/app', 'View analytics')}<div class="d-glance th-gl"><div class="b">${sv('users', 24)}<b>${all.length}</b><small>Total Threads</small></div><div class="g">${sv('shield', 24)}<b>${conf}</b><small>Verified (${pct(conf, all.length)}%)</small></div><div class="o">${sv('bell', 24)}<b>${wait}</b><small>Awaiting next step</small></div><div class="b">${sv('chart', 24)}<b>${res}</b><small>Resolved (${pct(res, all.length)}%)</small></div></div></section>
 <section class="d-box">${dSecHead('Upcoming follow-ups', '/app/threads')}${
   fu.length
     ? fu
         .map(t => {
           const p = thPri(t);
           return `<div class="th-fu"><span class="th-fud ${p.c}">${thDaysLeft(t)}d</span>${xav(t.other.name, 44)}<div class="th-fuw"><a href="/app/thread/${t.id}"><b>${esc(t.other.name)}</b></a><small>${esc([t.other.role, t.other.company].filter(Boolean).join(' · ') || 'New connection')}</small><small>${sv('pin', 12)} ${esc(t.where || 'In person')}</small>${tagChips(t)}</div><button type="button" class="th-cal" aria-label="Add follow-up with ${esc(t.other.name)} to calendar" title="Add to calendar" data-on-click="dIcs('${t.id}')">${sv('cal', 17)}</button></div>`;
         })
         .join('')
     : '<p class="d-muted">No follow-ups due. Nice work.</p>'
 }</section>
 <div class="d7-promo"><span class="d-promo-ic">${sv('spark', 22)}</span><div><b>Turn more Threads into opportunities</b><ul>${['Add context and notes', 'Set follow-up reminders', 'Track progress to resolution'].map(x => `<li><i>${sv('check', 11, '#fff', 3.2)}</i>${x}</li>`).join('')}</ul><a href="/how">Learn more ${sv('arrow', 15)}</a></div></div>
 </div></div>`
  );
}

function tdIcon(k) {
  return (
    {
      answer: ['b', 'check'],
      confirm: ['g', 'check'],
      tap: ['v', 'cal'],
      room: ['v', 'cal'],
      followup: ['o', 'mail'],
      resolved: ['g', 'check'],
      note: ['n', 'brief']
    }[k] || ['n', 'pin']
  );
}

function tdWhen(at) {
  const d = new Date(at);
  return (
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' &middot; ' +
    d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })
  );
}

function tdEdit(id) {
  const t = findThread(id);
  if (!t) return;
  const f = (i, l, v, o = '') =>
    `<label class="x-f"><span>${l}</span><input id="${i}" value="${esc(v || '')}" ${o}></label>`;
  modal(
    `<form data-on-submit="return tdEditSave(event,'${id}')"><div class="row between"><h3 style="margin:0;font:600 19px var(--xss)">Edit details</h3><button type="button" class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div><div class="t-g2" style="margin-top:14px">${f('ten', 'Name', t.other.name, 'required maxlength="80"')}${f('tee', 'Email', t.other.email, 'type="email" maxlength="120"')}${f('ter', 'Job title', t.other.role, 'maxlength="80"')}${f('tec', 'Company', t.other.company, 'maxlength="80"')}</div>${f('tew', 'Where you met', t.where, 'maxlength="120"')}<div class="fu-b"><button type="button" class="t-how" data-on-click="closeModal()">Cancel</button><button class="x-btn">Save details</button></div></form>`
  );
}

async function tdEditSave(e, id) {
  e.preventDefault();
  const t = findThread(id);
  const v = i => ($('#' + i).value || '').trim();
  if (!v('ten')) return (toast('Add their name'), false);
  const patch = {
    other_name: v('ten'),
    other_email: v('tee'),
    other_role: v('ter'),
    other_company: v('tec'),
    where_met: v('tew') || 'In person'
  };
  if (cloud() && !(await upd('threads', id, patch))) return false;
  Object.assign(t.other, {
    name: patch.other_name,
    email: patch.other_email,
    role: patch.other_role,
    company: patch.other_company
  });
  t.where = patch.where_met;
  save();
  closeModal();
  toast('Details updated');
  window._keepScroll = true;
  render();
  return false;
}

async function tdNoteAdd(id) {
  const t = findThread(id),
    x = $('#tdn');
  const v = ((x && x.value) || '').trim();
  if (!v) return toast('Write a note first');
  if (/^#tags:/.test(v)) return toast('Notes cannot start with #tags:');
  try {
    await addEvent(t, 'note', v);
    save();
    x.value = '';
    toast('Note saved');
    window._keepScroll = true;
    render();
  } catch (_) {
    toast('Could not save the note. Try again.');
  }
}

function tdSuggest(t) {
  const f = esc(t.other.name.split(' ')[0]),
    s = threadState(t);
  const tips =
    s === 'pending'
      ? [
          `Resend the confirm link to ${f} with a one-line reminder of where you met.`,
          `Add a private note now so you remember the context when ${f} confirms.`
        ]
      : s === 'open' && !t.mine
        ? [
            `Answer "What&rsquo;s next?" so ${f} can see the match when they reply.`,
            `Add context from the conversation while it is fresh.`
          ]
        : s === 'open'
          ? [
              `Send ${f} a short follow-up mentioning ${esc(t.where)}.`,
              `Set a calendar reminder to check in in 3 days.`
            ]
          : s === 'matched'
            ? [
                `You matched. Book the next step with ${f} today.`,
                `Use the drafted follow-up in the Follow-ups tab.`
              ]
            : [`Log the outcome in Opportunities.`, `Keep the relationship warm with a check-in next month.`];
  return `<div class="td-sug">${tips.map(x => `<div>${sv('spark', 15)}<span>${x}</span></div>`).join('')}<p class="td-fine">Suggestions are based on where this Thread stands.</p></div>`;
}

function tdReveal(t) {
  const u = me(),
    f = esc(t.other.name.split(' ')[0]),
    mine = t.mine && NEXT[t.mine],
    demo = !cloud();
  const link = threadLink(t);
  const pAv = (n, ph) => (ph ? avatarC(ph, 72) : xav(n, 72));
  if (!t.confirmed)
    return `<section class="td-rv"><div class="td-eye">Waiting for confirmation</div><div class="td-rvt">${f} has not confirmed this Thread yet.</div><p class="td-rvp">They received a link. When they confirm, the relationship becomes verified and you can both answer &ldquo;What&rsquo;s next?&rdquo;</p><div class="td-rvb"><button type="button" data-on-click="copy('${link}','Confirm link copied')">${sv('link', 16)} Copy confirm link</button><button type="button" data-on-click="go('/t/${t.token || t.id}')">${sv('eye', 16)} ${demo ? 'Simulate their view' : 'Open their view'}</button></div></section>`;
  if (!t.mine)
    return `<section class="td-rv"><div class="td-eye">One question</div><div class="td-rvt">What&rsquo;s next with ${f}?</div><p class="td-rvp">${sv('lock', 13)} Private until you both answer. A &ldquo;Not now&rdquo; is shown to them as &ldquo;Stay in touch&rdquo;.</p><div class="td-ans">${Object.entries(
      NEXT
    )
      .map(
        ([k, v]) =>
          `<button type="button" data-on-click="answer('${t.id}','${k}')"><b>${v.label}</b><small>${v.desc}</small></button>`
      )
      .join('')}</div></section>`;
  if (!t.theirs)
    return `<section class="td-rv"><div class="td-eye">The quiet reveal</div><div class="td-two"><div class="td-p">${pAv(u.name, u)}<div><b>${esc((u.name || '').split(' ')[0])} (You) <i>${sv('check', 9, '#fff', 3.4)}</i></b><span>${mine.label}</span></div></div><div class="td-lock"><span>${sv('lock', 20)}</span><small>Both answers are private<br>until ${f} replies.</small></div><div class="td-p">${pAv(t.other.name)}<div><b>${f}</b><span class="dim">Not answered yet</span></div></div></div><div class="td-rvt c">Your answer is locked in. We&rsquo;ll reveal both when ${f} replies.</div><div class="td-rvb c"><button type="button" data-on-click="answer('${t.id}',null)">${sv('brief', 16)} Change my answer</button><button type="button" data-on-click="go('/t/${t.token || t.id}')">${sv('spark', 16)} ${demo ? 'Simulate their answer' : 'Open their view'}</button></div></section>`;
  const closed = t.mine === 'notnow' || t.theirs === 'notnow',
    th = t.theirs === 'notnow' ? 'keep' : t.theirs,
    match = !closed && t.mine === t.theirs;
  return `<section class="td-rv"><div class="td-eye">Revealed</div><div class="td-two"><div class="td-p">${pAv(u.name, u)}<div><b>You</b><span>${mine.label}</span></div></div><div class="td-lock ${match ? 'ok' : ''}"><span>${sv(match ? 'check' : 'link', 20)}</span><small>${match ? 'It&rsquo;s a match' : 'Both answered'}</small></div><div class="td-p">${pAv(t.other.name)}<div><b>${f}</b><span>${NEXT[th].label}</span></div></div></div><div class="td-rvt c">${t.mine === 'notnow' ? `You closed this Thread gently. ${f} sees &ldquo;Stay in touch&rdquo;.` : match ? `You both chose ${NEXT[t.mine].label.toLowerCase()}.` : `You chose ${mine.label.toLowerCase()}, ${f} chose ${NEXT[th].label.toLowerCase()}.`}</div>${t.mine !== 'notnow' && !t.resolvedAt ? `<div class="td-rvb c"><button type="button" data-on-click="tdTab('fu')">${sv('mail', 16)} Open drafted follow-up</button></div>` : ''}</section>`;
}

function vThread(id) {
  const t = findThread(id);
  if (!t || t.ownerId !== DB.session)
    return shell(
      'threads',
      `<div class="d-empty">${sv('search', 22)}<div><b>Thread not found</b><small>It may have been deleted.</small></div><a href="/app/threads" class="x-btn sm">Back to Threads</a></div>`
    );
  const s = threadState(t),
    f = esc(t.other.name.split(' ')[0]),
    room = t.roomId && DB.rooms.find(r => r.id === t.roomId);
  const p = thPri(t);
  const evs = (t.events || [])
    .filter(e => !(e.k === 'note' && /^#tags:/.test(e.text || '')))
    .slice()
    .sort((a, b) => b.at - a.at);
  const ev = e => {
    const [c, i] = tdIcon(e.k);
    const who =
      e.k === 'answer' || e.k === 'followup' || e.k === 'note' ? me() : e.k === 'confirm' ? null : null;
    return `<li class="td-ev"><span class="td-dot ${c}">${sv('check', 10, '#fff', 3.2)}</span>${e.k === 'room' || e.k === 'tap' ? `<span class="td-eic v">${sv('cal', 18)}</span>` : who ? avatarC(who, 40) : e.k === 'confirm' ? xav(t.other.name, 40) : `<span class="td-eic ${c}">${sv(i, 18)}</span>`}<div><b>${esc(e.text || '')}</b><small>${tdWhen(e.at)}</small>${e.k === 'note' ? `<p class="td-q">${esc(e.text)}</p>`.replace(`<p class="td-q">${esc(e.text)}</p>`, '') : ''}${e.k === 'answer' && t.note ? `<p class="td-q">${esc(t.note)}</p>` : ''}${(e.k === 'room' || e.k === 'tap') && room ? `<a class="td-room" href="/app/room/${room.id}"><span style="background-image:url(${rImg(room)})"></span><div><b>${esc(room.name)}</b><small>${sv('pin', 13)} ${rPlace(room)}</small></div><em>${sv('users', 15)} ${roomStats(room).T.length} people</em>${sv('chev', 16)}</a>` : ''}</div></li>`;
  };
  const notes = evs.filter(e => e.k === 'note');
  let tab = '';
  if (TDT === 'conv')
    tab = `${evs.length ? `<ol class="td-evs">${evs.map(ev).join('')}</ol>` : '<p class="d-muted">No activity yet.</p>'}<div class="td-comp"><div class="td-ct">${[
      ['note', 'Add a note'],
      ['ai', 'Suggest a next step (AI)']
    ]
      .map(
        ([k, l]) =>
          `<button type="button" class="${TDC === k ? 'on' : ''}" data-on-click="tdCat('${k}')">${l}</button>`
      )
      .join(
        ''
      )}</div>${TDC === 'note' ? `<div class="td-box"><textarea id="tdn" rows="2" maxlength="500" placeholder="Add a private note about this conversation..."></textarea><div class="td-bb"><span>${sv('lock', 13)} Only you can see this note</span><button type="button" class="x-btn sm" data-on-click="tdNoteAdd('${t.id}')">Save note</button></div></div>` : tdSuggest(t)}</div>`;
  else if (TDT === 'det')
    tab = `<dl class="td-dl">${[
      ['Name', t.other.name],
      ['Job title', t.other.role],
      ['Company', t.other.company],
      ['Email', t.other.email || 'Not shared'],
      ['Where you met', t.where],
      ['Started', tdWhen(t.createdAt)],
      ['Status', dChip(t).replace(/<[^>]+>/g, '')],
      ['Verified', t.confirmed ? 'Yes, by both' : 'Not yet']
    ]
      .map(
        ([k, v]) =>
          `<div><dt>${k}</dt><dd>${v && String(v).includes('&middot;') ? v : esc(v || '-')}</dd></div>`
      )
      .join(
        ''
      )}</dl><button type="button" class="t-how sm" data-on-click="tdEdit('${t.id}')">${sv('brief', 15)} Edit details</button>`;
  else if (TDT === 'notes')
    tab = `${notes.length ? `<ul class="td-notes">${notes.map(n => `<li><p>${esc(n.text)}</p><small>${tdWhen(n.at)}</small></li>`).join('')}</ul>` : '<p class="d-muted">No notes yet. Add one from the Conversation tab.</p>'}`;
  else if (TDT === 'fu') {
    const fus = evs.filter(e => e.k === 'followup');
    tab = `${t.mine && t.mine !== 'notnow' && t.theirs && !t.resolvedAt ? `<div class="td-draft"><div class="row between"><b>${sv('spark', 14)} Drafted from this Thread</b><span class="th-chip b">Edit before sending</span></div><textarea id="draft" rows="8">${esc(draftFor(t))}</textarea><div class="fu-b" style="justify-content:flex-start"><button type="button" class="x-btn" data-on-click="sendFollow('${t.id}')">${sv('mail', 15)} Mark as sent</button><button type="button" class="t-how" data-on-click="copyDraft()">Copy</button><button type="button" class="t-how" data-on-click="waDraft('${t.id}')">${sv('send', 15)} Send on WhatsApp</button>${t.other.email ? `<a class="t-how" href="mailto:${esc(t.other.email)}?subject=${encodeURIComponent('Great meeting you')}&body=" data-on-click="draftMail(this)">Open in email</a>` : ''}</div></div>` : `<p class="d-muted">${t.resolvedAt ? 'This Thread is resolved.' : 'A drafted follow-up appears here once you both answer &ldquo;What&rsquo;s next?&rdquo;.'}</p>`}
  <div class="fu-b" style="justify-content:flex-start"><button type="button" class="t-how sm" data-on-click="fuOpen('${t.id}')">${sv('check', 15)} Record a follow-up</button><button type="button" class="t-how sm" data-on-click="dIcs('${t.id}')">${sv('cal', 15)} Add reminder to calendar</button></div>${fus.length ? `<ol class="td-evs">${fus.map(ev).join('')}</ol>` : ''}`;
  } else if (TDT === 'opp')
    tab = `<p class="td-fine" style="margin-top:0">${t.resolvedAt ? `Resolved ${tdWhen(t.resolvedAt)}.` : 'Record what this relationship led to. Resolving moves it out of your active list.'}</p><div class="td-opps">${[
      ['Meeting booked', 'cal'],
      ['Introduction made', 'users'],
      ['Opportunity created', 'spark'],
      ['Stayed in touch', 'sync']
    ]
      .map(
        ([l, i]) =>
          `<button type="button" ${t.resolvedAt ? 'disabled' : ''} data-on-click="resolveAsk('${t.id}','${l}')">${sv(i, 18)} ${l}</button>`
      )
      .join('')}</div>`;
  else
    tab = room
      ? `<a class="td-room big" href="/app/room/${room.id}"><span style="background-image:url(${rImg(room)})"></span><div><b>${esc(room.name)}</b><small>${rFmt(room, { day: 'numeric', month: 'short', year: 'numeric' })} &middot; ${rPlace(room)}</small></div><em>${sv('users', 15)} ${roomStats(room).T.length} people</em>${sv('chev', 16)}</a>`
      : `<p class="d-muted">This Thread was not started in a Room.</p><button type="button" class="t-how sm" data-on-click="newRoomModal()">Create a Room</button>`;
  const tl = evs
    .filter(
      e =>
        TDF === 'all' ||
        (TDF === 'answers' && (e.k === 'answer' || e.k === 'confirm')) ||
        (TDF === 'fu' && e.k === 'followup') ||
        (TDF === 'notes' && e.k === 'note')
    )
    .slice(0, 5);
  const chips = [
    `<span class="th-chip ${{ pending: 'o', open: t.mine ? 'o' : 'b', matched: 'g', resolved: 'g', closed: 'n' }[s]}">${dChip(t).replace(/<[^>]+>/g, '')}</span>`,
    t.confirmed ? `<span class="th-chip g">${sv('shield', 13)} Verified by both</span>` : '',
    room ? `<span class="th-chip o">${sv('link', 13)} Met at event</span>` : ''
  ].join('');
  return shell(
    'threads',
    `<div class="td-head"><div><a href="/app/threads" class="td-back">${sv('arrow', 15).replace('M5 12h14M13 6l6 6-6 6', 'M19 12H5M11 6l-6 6 6 6')} Back to Threads</a><div class="td-who">${xav(t.other.name, 84)}<div><h1>${esc(t.other.name)}${t.confirmed ? `<span class="d-ver" title="Verified">${sv('check', 11, '#fff', 3.2)}</span>` : ''}</h1><p>${esc([t.other.role, t.other.company].filter(Boolean).join(', ') || 'New connection')}</p><div class="td-chips">${chips}</div></div></div></div>
 <div class="td-acts"><div class="td-btns"><button type="button" class="t-how" data-on-click="copyThreadLink('${t.id}','Thread link copied')">${sv('hub', 17)} Share</button><button type="button" class="t-how" data-on-click="waConfirm('${t.id}')">${sv('send', 17)} WhatsApp</button><button type="button" class="t-how" data-on-click="threadVcf('${t.id}')">${sv('user', 17)} Add to contacts</button><button type="button" class="t-how" data-on-click="dMenu('${t.id}')">&bull;&bull;&bull; More</button>${['matched', 'open', 'pending'].includes(s) ? `<button type="button" class="x-btn lg" data-on-click="fuOpen('${t.id}')">${sv('cal', 17)} Follow up</button>` : ''}</div><div class="td-warm">${thRing(p).replace(/<small>[^<]*<\/small>/, '')}<div><small>Verified warmth</small>${dWarm(t)}</div></div></div></div>
 <div class="td-grid"><div class="td-main">${tdReveal(t)}<section class="d-box td-tabsbox"><nav class="cd-tabs td-tabs" role="tablist">${[
   ['conv', 'Conversation'],
   ['det', 'Details'],
   ['notes', 'Notes'],
   ['fu', 'Follow-ups'],
   ['opp', 'Opportunities'],
   ['rooms', 'Related Rooms']
 ]
   .map(
     ([k, l]) =>
       `<button type="button" role="tab" aria-selected="${TDT === k}" class="${TDT === k ? 'on' : ''}" data-on-click="tdTab('${k}')">${l}</button>`
   )
   .join('')}</nav><div class="td-tab">${tab}</div></section></div>
 <aside class="d-box td-side"><div class="td-sec"><div class="td-sh"><b>The moment</b><button type="button" class="td-ed" data-on-click="tdEdit('${t.id}')">${sv('brief', 14)} Edit</button></div><ul class="td-facts"><li>${sv('pin', 16)}${esc(t.where || 'In person')}</li><li>${sv('cal', 16)}${new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}, ${new Date(t.createdAt).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}</li>${t.other.email ? `<li>${sv('mail', 16)}<a href="mailto:${esc(t.other.email)}">${esc(t.other.email)}</a></li>` : ''}${t.other.company ? `<li>${sv('building', 16)}${esc(t.other.company)}</li>` : ''}${t.other.role ? `<li>${sv('brief', 16)}${esc(t.other.role)}</li>` : ''}${room ? `<li>${sv('users', 16)}<a href="/app/room/${room.id}">${esc(room.name)}</a></li>` : ''}</ul></div>
 <div class="td-sec"><div class="td-sh"><b>Private context (only you)</b><button type="button" class="td-ed" data-on-click="saveNote('${t.id}')">${sv('check', 14)} Save</button></div><textarea id="note" class="td-ctx" rows="3" maxlength="300" placeholder="What should you remember about ${f}?">${esc(t.note || '')}</textarea></div>
 <div class="td-sec"><div class="td-sh"><b>Tags</b><button type="button" class="td-ed" data-on-click="tpEdit('${t.id}')">${sv('brief', 14)} Edit</button></div><div class="td-tags">${tagChips(t) || ''}<button type="button" class="td-add" data-on-click="tpEdit('${t.id}')">+ Add tag</button></div></div>
 <div class="td-sec"><div class="td-sh"><b>Timeline</b><select class="d7-sel" aria-label="Filter timeline" data-on-change="tdFilter(this.value)">${[
   ['all', 'All activity'],
   ['answers', 'Answers'],
   ['fu', 'Follow-ups'],
   ['notes', 'Notes']
 ]
   .map(([k, l]) => `<option value="${k}" ${TDF === k ? 'selected' : ''}>${l}</option>`)
   .join('')}</select></div>${
   tl.length
     ? `<ol class="td-tl">${tl
         .map(e => {
           const [c] = tdIcon(e.k);
           return `<li class="${c}"><b>${esc(e.k === 'note' ? 'Note added' : e.text || '')}</b><small>${tdWhen(e.at)}</small></li>`;
         })
         .join('')}</ol>`
     : '<p class="d-muted">Nothing here yet.</p>'
 }</div>
 <button type="button" class="td-del" data-on-click="delThread('${t.id}')">${sv('close', 16)} Delete my side of this Thread</button></aside></div>`
  );
}

function tpKey(e, el) {
  if (e.key === 'Enter') {
    e.preventDefault();
    tpAddCustom(el);
  }
}

function tpPress(el) {
  el.classList.toggle('on');
  el.setAttribute('aria-pressed', el.classList.contains('on'));
}

function thFiltClear() {
  TFT = [];
  TFV = false;
  closeModal();
  TLIM = 20;
  render();
}

function thFiltApply() {
  TFT = [...document.querySelectorAll('.modal .tp.on')].map(b => b.dataset.v);
  TFV = $('#tfv').checked;
  closeModal();
  TLIM = 20;
  render();
}

function thRowClick(e, id) {
  if (!e.target.closest('button,a')) go('/app/thread/' + id);
}

function thRowKey(e, el, id) {
  if (e.key === 'Enter' && e.target === el) go('/app/thread/' + id);
}

function thTab(k) {
  TF2 = k;
  TLIM = 20;
  keepRender();
}

function thSort(v) {
  TSORT = v;
  keepRender();
}

function thCompact() {
  TCOMPACT = !TCOMPACT;
  keepRender();
}

function thClearQ() {
  TQ2 = '';
  Q = '';
  const i = document.querySelector('.topbar input');
  if (i) i.value = '';
  render();
}

function thMore() {
  TLIM += 20;
  keepRender();
}

function tdTab(k) {
  TDT = k;
  keepRender();
}

function tdCat(k) {
  TDC = k;
  keepRender();
}

function tdFilter(v) {
  TDF = v;
  keepRender();
}

function threadVcf(id) {
  const t = findThread(id);
  tapVcf({
    name: t.other.name,
    role: t.other.role,
    company: t.other.company,
    email: t.other.email,
    where: t.where
  });
  toast('Contact file downloaded');
}
