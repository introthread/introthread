// Introthread - Tap and Card screens (v88): the Tap screen (vTap, tap*) and the My card editor (vCard, cd*).
// Moved out of js/core.js unchanged (code cleanup step 5). Loads straight after threads.js and shares core.js
// globals; its own state (TAPM, CTAB, SHT, CD, cdHref) is declared at the top of this file since v92. The v11 cdSave wrapper moved with cdSave and still runs right after it.
// Later files wrap some of these (vTap, tapMode, tapNFC, tapInsights, cdCard, vCard).

/* v92: the Tap and Card screens' own state (TAPM, CTAB, SHT, CD) and cdHref, moved unchanged from js/core.js.
   Nothing in the files loaded before this one uses them while loading; core.js (newThread, saveCard, vPublic),
   app-navigation.js, settings.js and billing.js use them only at run time. */
let TAPM = 'q';
let CTAB = 'basic',
  SHT = 'qr',
  CD = null;
const cdHref = v => (!v ? '' : /^https?:\/\//i.test(v) ? v : 'https://' + v);

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

function tapWhereKey(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    tapWhereCustom();
  }
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

const _cdSave11 = cdSave;
cdSave = async function (e) {
  const r = await _cdSave11.call(this, e);
  PP = null;
  return r;
};
