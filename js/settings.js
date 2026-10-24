// Introthread - Settings and profile screens (v91): the profile editor (pf*), the public profile page editor
// (vProfile, pp*) and Settings (vSettings, st*, st12*). Moved out of js/core.js unchanged and in their original
// order (code cleanup step 7). Nothing at the top level of core.js or earlier files uses them while loading.
// Loads straight after rooms.js; shares core.js globals; its own state is declared at the top of this file since v93. Later files
// wrap some of these.

/* v93: the Settings and profile screens' own state (PF, PFT, STAB, CC, stCard, stTog, PTAB, PP, PPT, ST12, ST_TABS),
   moved unchanged from js/core.js. Nothing in the files loaded before this one uses them while loading;
   tap-card.js (cdSave wrapper), app-navigation.js, billing.js and the admin files use them only at run time. */
let PF = null,
  PFT = 'qr';
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
const stCard = (ic, t, s, body, right, cls) =>
  `<section class="st-box ${cls || ''}"><div class="st-h"><span class="st-hic">${ic}</span><div><b>${t}</b><small>${s}</small></div>${right || ''}</div>${body}</section>`;
const stTog = (k, l, d, on, fn) =>
  `<label class="t-tog st-row"><input type="checkbox" ${on ? 'checked' : ''} data-on-change="${fn || `setPref('${k}',this.checked)`}"><span class="t-sw"></span><span><b>${l}</b><small>${d}</small></span></label>`;
let PTAB = 'info',
  PP = null,
  PPT = null;
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

function stTab(t) {
  STAB = t;
  window._keepScroll = true;
  render();
}

function stCount() {
  const b = $('#stb');
  if (b && $('#stbc')) $('#stbc').textContent = b.value.length;
}

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
    noindex: !!L.noindex,
    theme: null
  };
}

function ppUser() {
  const u = me();
  return Object.assign({}, u, {
    theme: PP.theme || u.theme,
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

/* v119: picking a style here only previews it, like My card since v118. PP.theme holds the previewed style (null means
   the saved one); Save changes under the styles saves it (ppThemeSave) and Cancel drops the preview (ppThemeCancel).
   Before v119 a click saved the style straight away through setTheme. */
function ppTheme(k) {
  if (!PP || !THEMES[k]) return;
  PP.theme = k === (me().theme || 'midnight') ? null : k;
  window._keepScroll = true;
  render();
}
async function ppThemeSave(b) {
  const k = PP && PP.theme;
  if (!k || !THEMES[k]) return;
  if (b) b.disabled = true;
  PP.theme = null;
  const u = me(),
    before = u.theme;
  window._keepScroll = true;
  await setTheme(k);
  if ((PP.theme || u.theme) === k && u.theme !== before) {
    CD = null;
    toast(THEMES[k].n + ' style saved');
  } else {
    PP.theme = k;
    if (b) b.disabled = false;
    render();
  }
}
function ppThemeCancel() {
  if (!PP) return;
  PP.theme = null;
  window._keepScroll = true;
  render();
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
          `<button type="button" class="cd-sty ${(PP.theme || u.theme) === k ? 'on' : ''}" aria-pressed="${(PP.theme || u.theme) === k}" data-on-click="ppTheme('${k}')"><span style="background:${v.bg}">${(PP.theme || u.theme) === k ? `<i>${sv('check', 12, '#fff', 3.2)}</i>` : ''}</span><b>${v.n}</b><small>${esc(v.d || '')}</small></button>`
      )
      .join(
        ''
      )}</div>${PP.theme && THEMES[PP.theme] ? `<div class="pp-thbar" role="status"><span>Previewing <b>${esc(THEMES[PP.theme].n)}</b>. It is not saved yet.</span><span class="pp-thbtn"><button type="button" class="t-how sm" data-on-click="ppThemeCancel()">Cancel</button><button type="button" class="x-btn" data-on-click="ppThemeSave(this)">${sv('lock', 15)} Save changes</button></span></div>` : ''}</section>
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

function pfLinkDel(i) {
  pfSync();
  PF.links.splice(i, 1);
  if (!PF.links.length) PF.links.push('');
  $('#pflinks').innerHTML = pfLinks();
  pfSync();
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
