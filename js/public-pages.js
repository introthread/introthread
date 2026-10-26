// Introthread - Public card and guest pages (v99, vPublic merged in v113): the public card page (vPublic, built from
// pcBasic, pcFind and pcCard here plus one step each in billing.js, event-mode.js, capture.js, admin-core.js,
// late-fixes.js and company-logo.js), vcard, pcVcf, the guest Thread pages (guestThread, vGuest, guestConfirm,
// guestAnswer, each with its later version) and their state (PUB, GUEST). Loads straight after core.js. render in
// core.js calls vPublic and vGuest only at run time; the vPublic steps in later files are called only at run time.

/* pcBasic: the original card page, now used for unknown handles. Was the first version of vPublic. */
function pcBasic(h) {
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

const PUB = {},
  GUEST = {};

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
/* v128: threads are found by guest token (findThread only matches ids). Also compares the Thread owner's handle
   from the guest data with the signed-in profile, so it works before the owner's Threads have loaded. */
function gOwn(tok) {
  if (!(typeof cloud === 'function' && cloud())) return null;
  const t = DB.threads.find(x => x._c && x.token === tok);
  if (t) return t;
  const g = typeof GUEST !== 'undefined' ? GUEST[tok] : null,
    u = typeof me === 'function' ? me() : null;
  return g && g.owner && u && u.handle && g.owner.handle === u.handle ? { id: g.id || '' } : null;
}
const gPlace = w =>
  String(w || 'In person')
    .split(' @@')[0]
    .trim() || 'In person';

vGuest = function (tok) {
  if (findThread(tok) && !findThread(tok)._c) return _vGuest(tok);
  /* v126/v128: the owner opening their own guest link cannot confirm or answer for the other person. */
  const ownT = gOwn(tok);
  if (ownT)
    return `<div class="pub"><div class="pubcard card pad-lg center">${logo()}<h2>This is your own Thread link</h2><p class="muted">Send it to the person you met so they can confirm and answer. Your own answer goes on the Thread in the app.</p><button type="button" class="x-btn" data-on-click="go(${ownT.id ? `'/app/thread/${ownT.id}'` : `'/app/threads'`})">Open the Thread</button></div></div>`;
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
    body = `<h2 style="letter-spacing:-.8px;margin:0 0 6px">Did you meet ${esc(o.name)}?</h2><p class="muted">${esc(f)} started a Thread after meeting you at <b>${esc(gPlace(g.where_met))}</b>. Confirm it to keep a shared record and decide what happens next.</p><div class="row" style="margin-top:18px"><button class="btn primary" style="flex:1" data-on-click="guestConfirm('${esc(tok)}')">${ic('check', 16)} Yes, confirm</button><button class="btn secondary" data-on-click="toast('Thanks. ${esc(f)} will not be notified.')">Not me</button></div>`;
  else if (!g.theirs)
    body = `<div class="eyebrow">Verified Thread &middot; ${esc(gPlace(g.where_met))}</div><h2 style="letter-spacing:-.8px;margin:8px 0 6px">What's next with ${esc(f)}?</h2><p class="small muted">${ic('lock', 12)} Private until you both answer. A "Not now" is never shown.</p><div class="answer" style="margin-top:14px">${Object.entries(
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
  if (findThread(tok) && cloud())
    return toast('This is your own Thread. The other person confirms it from their link.');
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
  if (findThread(tok) && cloud())
    return toast('This is your own Thread. Answer it from the Thread in the app.');
  SB.rpc('guest_answer', { p_token: tok, p_answer: k }).then(({ error }) => {
    if (error) return fail(error);
    if (typeof itMatchGuest === 'function') itMatchGuest(tok);
    delete GUEST[tok];
    refreshOwned(tok);
    render();
  });
};

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

/* pcFind: the private-profile page, or the card owner looked up (from Supabase the first time for cloud accounts),
   drawn with pcBasic. Was the v12 private-profile and cloud-loading versions of vPublic. */
function pcFind(h) {
  const u = DB.users.find(x => x.handle === String(h).toLowerCase());
  const mine = me() && u && me().id === u.id;
  if (u && u.links && u.links.hidden && !mine)
    return (
      mnav() +
      `<section class="x-ph c x-nf"><div class="x-wrap"><div class="x-eye">Private profile</div><h1 class="x-h1 x-ph-h">This profile is <em>private.</em></h1><p class="x-lead" style="margin:0 auto">The owner has chosen not to show their card publicly right now.</p><div class="x-cta-row" style="justify-content:center"><a href="/signup" class="x-btn lg">Create your own card ${sv('arrow', 17)}</a></div></div></section>` +
      foot()
    );
  /* cloud accounts: load the card from Supabase the first time it is opened */
  h = String(h).toLowerCase();
  if (DB.users.some(u => u.handle === h) || !SB || PUB[h] === null) return pcBasic(h);
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
  return pcBasic(h);
}
/* pcCard: the public card page. Was the v14 card design version of vPublic, with the v11 page-meta step. */
function pcCard(hd) {
  const h = String(hd).toLowerCase();
  const u = DB.users.find(x => String(x.handle || '').toLowerCase() === h);
  const mine = me() && u && me().id === u.id;
  const prev = pcFind(hd);
  /* page title, description and robots tag for the card */
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
}
/* vPublic: one function since v113 (cleanup plan step 10). It used to be built from 11 layered versions across
   public-pages.js, billing.js, event-mode.js, capture.js, admin-core.js, late-fixes.js and company-logo.js. The card is
   drawn by pcCard, then each later feature's step changes it, in the same order the layers used to run. */
function vPublic(hd) {
  let h = pcCard(hd);
  h = pcNoNewThreads(h, hd);
  h = pcEventAt(h, hd);
  h = pcCaptureFields(h, hd);
  h = pcReportLink(h, hd);
  h = pcFlipCard(h, hd);
  h = pcCompanyLogo(h, hd);
  return h;
}
