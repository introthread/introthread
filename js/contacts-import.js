// Introthread - Contacts and file import, Free plan Thread limit, GBP prices for UK visitors (v32).
// Moved out of index.html in v53 (code split step 5). Load order matters: see the <script> list at the end of index.html.

/* ================= v32: Contacts + file import, free plan limit, GBP for UK ================= */
let CT_LOCAL = false,
  CT_LOADED = false,
  CTQ = '',
  CTF = 'all',
  CTIMP = null;
function ctList() {
  DB.contacts = DB.contacts || [];
  return DB.contacts.filter(c => c.ownerId === DB.session);
}
const ctFromRow = r => ({
  _c: true,
  id: r.id,
  ownerId: r.owner_id,
  name: r.name || '',
  email: r.email || '',
  phone: r.phone || '',
  company: r.company || '',
  role: r.role || '',
  linkedin: r.linkedin || '',
  source: r.source || '',
  notes: r.notes || '',
  createdAt: Date.parse(r.created_at) || Date.now()
});
const ctToRow = c => ({
  owner_id: DB.session,
  name: c.name || null,
  email: c.email || null,
  phone: c.phone || null,
  company: c.company || null,
  role: c.role || null,
  linkedin: c.linkedin || null,
  source: c.source || null,
  notes: c.notes || null
});
async function ctLoad() {
  if (CT_LOADED || !cloud()) return;
  CT_LOADED = true;
  const { data, error } = await SB.from('contacts').select('*').order('created_at', { ascending: false });
  if (error) {
    CT_LOCAL = true;
    return render();
  }
  const loc = ctList().filter(c => c._local);
  if (loc.length) {
    const up = await SB.from('contacts').insert(loc.map(ctToRow)).select();
    if (!up.error) {
      DB.contacts = DB.contacts.filter(c => !c._local);
      up.data.forEach(r => data.unshift(r));
    }
  }
  DB.contacts = (DB.contacts || []).filter(c => c.ownerId !== DB.session || c._local);
  data.forEach(r => DB.contacts.push(ctFromRow(r)));
  save();
  if (RH().replace(/^#/, '').startsWith('/app/contacts')) render();
}
/* ---- file parsing: Google CSV, Outlook CSV, LinkedIn Connections.csv, vCard ---- */
function csvParse(t) {
  t = String(t || '').replace(/^\ufeff/, '');
  const first = t.split('\n').find(l => l.trim()) || '';
  const d =
    (first.match(/\t/g) || []).length > (first.match(/,/g) || []).length
      ? '\t'
      : (first.match(/;/g) || []).length > (first.match(/,/g) || []).length
        ? ';'
        : ',';
  const rows = [];
  let row = [],
    f = '',
    q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"') {
        if (t[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += ch;
    } else if (ch === '"' && f === '') q = true;
    else if (ch === d) {
      row.push(f);
      f = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      row.push(f);
      rows.push(row);
      row = [];
      f = '';
    } else f += ch;
  }
  if (f || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows.filter(r => r.some(x => String(x).trim()));
}
function importParse(text) {
  const s = String(text || '');
  if (/BEGIN:VCARD/i.test(s))
    return {
      source: 'Phone contacts',
      rows: s
        .split(/(?=BEGIN:VCARD)/i)
        .filter(x => /BEGIN:VCARD/i.test(x))
        .map(parseVcard)
        .map(o => ({
          name: o.name,
          email: o.email,
          phone: o.phone,
          company: o.company,
          role: o.role,
          linkedin: o.linkedin,
          notes: ''
        }))
        .filter(r => r.name || r.email || r.phone)
    };
  const R = csvParse(s);
  const hi = R.slice(0, 15).findIndex(r =>
    r
      .map(x => x.trim().toLowerCase())
      .some(x =>
        [
          'first name',
          'name',
          'given name',
          'full name',
          'e-mail address',
          'email',
          'email address',
          'display name'
        ].includes(x)
      )
  );
  if (hi < 0) return { source: '', rows: [] };
  const h = R[hi].map(x => x.trim().toLowerCase());
  const find = (...n) => h.findIndex(x => n.includes(x));
  const src = h.includes('connected on')
    ? 'LinkedIn'
    : h.some(x => /^e-mail \d - value$|^organization 1 - name$|^given name$/.test(x)) ||
        h.includes('organization name')
      ? 'Google'
      : h.includes('e-mail address') && h.some(x => /business phone|mobile phone/.test(x))
        ? 'Outlook'
        : 'CSV file';
  const cF = find('first name', 'given name'),
    cM = find('middle name', 'additional name'),
    cL = find('last name', 'family name', 'surname'),
    cN = find('name', 'full name', 'display name');
  const cE = h
    .map((x, i) => (/e-?mail/.test(x) && !/type|label|display/.test(x) ? i : -1))
    .filter(i => i >= 0);
  const cP = h
    .map((x, i) => (/phone|mobile/.test(x) && !/type|label|fax|pager/.test(x) ? i : -1))
    .filter(i => i >= 0)
    .sort((a, b) => (/mobile/.test(h[b]) ? 1 : 0) - (/mobile/.test(h[a]) ? 1 : 0));
  const cC = find('company', 'organization name', 'organization 1 - name', 'organization', 'company name'),
    cR =
      src === 'Outlook'
        ? find('job title')
        : find('position', 'job title', 'organization title', 'organization 1 - title', 'title');
  const cU = find('url', 'profile url', 'linkedin', 'linkedin url'),
    cNo = find('notes');
  const g = (r, i) => (i >= 0 && r[i] != null ? String(r[i]).split(':::')[0].trim() : '');
  const rows = R.slice(hi + 1)
    .map(r => {
      const name = (g(r, cN) || [g(r, cF), g(r, cM), g(r, cL)].filter(Boolean).join(' '))
        .replace(/\s+/g, ' ')
        .trim();
      const email = (cE.map(i => g(r, i)).find(x => /@/.test(x)) || '').toLowerCase();
      const phone = cP.map(i => normPhone(g(r, i))).find(Boolean) || '';
      const li = liFromUrl(g(r, cU));
      return {
        name,
        email,
        phone,
        company: g(r, cC),
        role: g(r, cR),
        linkedin: li ? li.url : '',
        notes: g(r, cNo).slice(0, 200)
      };
    })
    .filter(r => r.name || r.email || r.phone);
  return { source: src, rows };
}
function ctKeys(c) {
  const k = [];
  if (c.email) k.push('e:' + c.email.toLowerCase());
  const d = String(c.phone || '').replace(/\D/g, '');
  if (d.length >= 7) k.push('p:' + d.slice(-9));
  if (c.linkedin) k.push('l:' + c.linkedin.toLowerCase().replace(/\/$/, ''));
  return k;
}
function ctKnown() {
  const s = new Set();
  ctList().forEach(c => ctKeys(c).forEach(k => s.add(k)));
  myThreads().forEach(t => {
    tMeta(t);
    ctKeys(t.other || {}).forEach(k => s.add(k));
  });
  return s;
}
/* ---- page ---- */
function ctBar(on) {
  const n = ctList().length;
  return `<div class="ct-seg" role="tablist"><button role="tab" class="${on === 't' ? 'on' : ''}" data-on-click="go('/app/threads')">Threads</button><button role="tab" class="${on === 'c' ? 'on' : ''}" data-on-click="go('/app/contacts')">Contacts${n ? ` <span>${n}</span>` : ''}</button></div>`;
}
const CT_SRC = [
  ['LinkedIn', 'li'],
  ['Google', 'mail'],
  ['Outlook', 'mail'],
  ['Phone contacts', 'contact'],
  ['CSV file', 'grid'],
  ['Saved from Tap', 'spark']
];
function ctRowHTML(c) {
  const sub = [c.role, c.company].filter(Boolean).join(' · ') || c.email || c.phone || '';
  return `<div class="ct-r"><span class="ct-av">${esc(initials(c.name || c.email || '?'))}</span><div class="ct-m"><b>${esc(c.name || c.email || c.phone)}</b><small>${esc(sub)}</small></div>${c.source ? `<span class="ct-src">${esc(c.source)}</span>` : ''}<button type="button" class="ct-inv" data-on-click="ctInvite('${c.id}')">Invite</button><button type="button" class="ct-dots" aria-label="More actions" data-on-click="ctMenu('${c.id}')">${sv('grid', 16)}</button></div>`;
}
function ctFiltered() {
  const q = CTQ.toLowerCase().trim();
  return ctList()
    .filter(
      c =>
        (CTF === 'all' || c.source === CTF) &&
        (!q || [c.name, c.email, c.phone, c.company, c.role].join(' ').toLowerCase().includes(q))
    )
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}
function ctRenderList() {
  const el = $('#ctlist');
  if (!el) return;
  const L = ctFiltered();
  const cap = 300;
  el.innerHTML = L.length
    ? L.slice(0, cap).map(ctRowHTML).join('') +
      (L.length > cap ? `<p class="ct-more">Showing ${cap} of ${L.length}. Search to find someone.</p>` : '')
    : `<p class="ct-none">No contacts match.</p>`;
  const c = $('#ctcount');
  if (c) c.textContent = L.length + ' of ' + ctList().length;
}
function ctGuides() {
  return `<div class="ct-g">${[
    [
      'li',
      'LinkedIn connections',
      'In LinkedIn: <b>Me</b> > <b>Settings & Privacy</b> > <b>Data privacy</b> > <b>Get a copy of your data</b> > tick <b>Connections</b> > <b>Request archive</b>. LinkedIn emails you a link within about 10 minutes. Download it and choose <b>Connections.csv</b>.'
    ],
    [
      'mail',
      'Gmail / Google Contacts',
      'Open <b>contacts.google.com</b> on a computer > <b>Export</b> > choose <b>Google CSV</b> > <b>Export</b>. Then choose that file here.'
    ],
    [
      'mail',
      'Outlook',
      'In Outlook on the web: <b>People</b> > <b>Manage contacts</b> > <b>Export contacts</b> > <b>All contacts</b> > <b>Export</b>. Choose the CSV file here.'
    ],
    [
      'contact',
      'iPhone or Android contacts',
      'iPhone: on iCloud.com open <b>Contacts</b>, select the people, then <b>Export vCard</b>. Android: <b>Contacts</b> app > <b>Manage contacts</b> > <b>Export to file</b> (.vcf).'
    ]
  ]
    .map(
      ([ic, t, b]) =>
        `<details class="ct-gi"><summary><span>${sv(ic, 16)}</span>${t}</summary><p>${b}</p></details>`
    )
    .join('')}</div>`;
}
function vContacts() {
  ctLoad();
  const all = ctList();
  const srcs = [...new Set(all.map(c => c.source).filter(Boolean))];
  const head = `<div class="ct-h"><div><h1>Contacts</h1><p>People you have imported or saved. Invite anyone to a Thread when you are ready. Nothing is sent until you choose.</p></div><button type="button" class="cap-btn ct-impb" data-on-click="ctImport()">${sv('plus', 16)} Import</button></div>`;
  const warn = CT_LOCAL
    ? `<div class="ct-warn">${sv('lock', 14)} Contacts are saved on this device for now. They move to your account automatically after the database update.</div>`
    : '';
  const body = all.length
    ? `<div class="ct-tools"><label class="ct-s">${sv('search', 16)}<input placeholder="Search contacts" value="${esc(CTQ)}" data-on-input="ctSearch(this.value)" aria-label="Search contacts"></label><div class="ct-chips"><button class="${CTF === 'all' ? 'on' : ''}" data-on-click="ctFilt('all')">All</button>${srcs.map(s => `<button class="${CTF === s ? 'on' : ''}" data-on-click="ctFilt('${esc(s)}')">${esc(s)}</button>`).join('')}</div><small class="ct-n" id="ctcount"></small></div><div class="ct-l" id="ctlist"></div>`
    : `<div class="ct-empty"><div class="ct-ei">${sv('users', 26)}</div><h2>Bring your contacts in</h2><p>Import from LinkedIn, Gmail, Outlook or your phone. They stay private to you until you invite someone to a Thread.</p><button type="button" class="cap-btn" data-on-click="ctImport()">${sv('plus', 16)} Import contacts</button></div>${ctGuides()}`;
  setTimeout(ctRenderList, 0);
  return `<div class="ct">${ctBar('c')}${head}${warn}${body}</div>`;
}
const _vToday32 = vToday;
vToday = function () {
  return RH().replace(/^#/, '').startsWith('/app/contacts') ? vContacts() : _vToday32.apply(this, arguments);
};
const _vThreads32 = vThreads;
vThreads = function () {
  ctLoad();
  return ctBar('t') + _vThreads32.apply(this, arguments);
};
/* ---- import flow ---- */
function ctImport() {
  modal(`<div class="cap-m ci"><div class="row between"><h3>Import contacts</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div>
 <p class="fu-sub">Choose a file from LinkedIn, Google, Outlook or your phone. We detect the format and show you everyone before anything is saved.</p>
 <label class="ci-drop" data-on-dragover="event.preventDefault();this.classList.add('on')" data-on-dragleave="this.classList.remove('on')" data-on-drop="ctDrop(event,this)"><span class="ci-di">${sv('arrow', 22)}</span><b>Choose a file</b><small>.csv or .vcf, up to 10 MB</small><input type="file" accept=".csv,.vcf,.txt,text/csv,text/vcard,text/x-vcard" hidden data-on-change="ctFileIn(this)"></label>
 <p class="ci-how">How to get the file</p>${ctGuides()}<p class="cc-pv">${sv('lock', 13)} Your file is read on this device. Contacts are private to you.</p></div>`);
}
function ctFile(f) {
  if (!f) return;
  if (f.size > 10 * 1024 * 1024)
    return toast('That file is over 10 MB. Export fewer contacts and try again.');
  const rd = new FileReader();
  rd.onload = () => {
    const r = importParse(rd.result);
    if (!r.rows.length) {
      toast('We could not find contacts in that file. Check it is a CSV or vCard export.');
      return;
    }
    const known = ctKnown(),
      seen = new Set();
    r.rows.forEach(x => {
      const k = ctKeys(x);
      x._dup = k.some(z => known.has(z)) || (k.length && k.every(z => seen.has(z)));
      k.forEach(z => seen.add(z));
    });
    CTIMP = {
      source: r.source,
      rows: r.rows,
      sel: new Set(r.rows.map((x, i) => (x._dup ? -1 : i)).filter(i => i >= 0)),
      name: f.name
    };
    ctPreview();
  };
  rd.readAsText(f);
}
function ctPreview() {
  const C = CTIMP;
  if (!C) return;
  const dup = C.rows.filter(r => r._dup).length;
  modal(`<div class="cap-m ci"><div class="row between"><h3>Import from ${esc(C.source)}</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div>
 <p class="fu-sub">${C.rows.length} contact${C.rows.length === 1 ? '' : 's'} found${dup ? `, ${dup} already saved` : ''}. Untick anyone you do not want.</p>
 <div class="ci-top"><label class="ci-all"><input type="checkbox" ${C.sel.size === C.rows.filter(r => !r._dup).length ? 'checked' : ''} data-on-change="ctAll(this.checked)"> Select all</label><span id="cisel">${C.sel.size} selected</span></div>
 <div class="ci-l">${C.rows
   .slice(0, 2000)
   .map(
     (r, i) =>
       `<label class="ci-r${r._dup ? ' dup' : ''}"><input type="checkbox" ${C.sel.has(i) ? 'checked' : ''} ${r._dup ? 'disabled' : ''} data-on-change="ctTog(${i},this.checked)"><span class="ct-av sm">${esc(initials(r.name || r.email || '?'))}</span><span class="ct-m"><b>${esc(r.name || r.email || r.phone)}</b><small>${esc([r.role, r.company].filter(Boolean).join(' · ') || r.email || r.phone)}</small></span>${r._dup ? '<em>Already saved</em>' : ''}</label>`
   )
   .join('')}</div>
 <button type="button" class="cap-btn" id="cigo" data-on-click="ctDoImport()" ${C.sel.size ? '' : 'disabled'}>${sv('check', 16, 'currentColor', 2.4)} Import ${C.sel.size} contact${C.sel.size === 1 ? '' : 's'}</button></div>`);
}
function ctSelUI() {
  const n = CTIMP.sel.size;
  const s = $('#cisel');
  if (s) s.textContent = n + ' selected';
  const b = $('#cigo');
  if (b) {
    b.disabled = !n;
    b.innerHTML = `${sv('check', 16, 'currentColor', 2.4)} Import ${n} contact${n === 1 ? '' : 's'}`;
  }
}
function ctTog(i, on) {
  if (on) CTIMP.sel.add(i);
  else CTIMP.sel.delete(i);
  ctSelUI();
}
function ctAll(on) {
  CTIMP.rows.forEach((r, i) => {
    if (r._dup) return;
    if (on) CTIMP.sel.add(i);
    else CTIMP.sel.delete(i);
  });
  document.querySelectorAll('.ci-r:not(.dup) input').forEach(x => (x.checked = on));
  ctSelUI();
}
async function ctSaveMany(list) {
  DB.contacts = DB.contacts || [];
  let saved = [];
  if (cloud() && !CT_LOCAL) {
    for (let i = 0; i < list.length; i += 500) {
      const { data, error } = await SB.from('contacts')
        .insert(list.slice(i, i + 500).map(ctToRow))
        .select();
      if (error) {
        CT_LOCAL = true;
        break;
      }
      saved = saved.concat(data.map(ctFromRow));
    }
  }
  const rest = list
    .slice(saved.length)
    .map(c =>
      Object.assign({}, c, { id: 'c_' + uid(), ownerId: DB.session, createdAt: Date.now(), _local: cloud() })
    );
  DB.contacts.push(...saved, ...rest);
  save();
  return saved.length + rest.length;
}
async function ctDoImport() {
  const C = CTIMP;
  if (!C || !C.sel.size) return;
  const b = $('#cigo');
  if (b) {
    b.disabled = true;
    b.textContent = 'Importing...';
  }
  const list = [...C.sel]
    .sort((a, b) => a - b)
    .map(i => {
      const r = C.rows[i];
      return {
        name: r.name,
        email: r.email,
        phone: r.phone,
        company: r.company,
        role: r.role,
        linkedin: r.linkedin,
        notes: r.notes,
        source: C.source
      };
    });
  const n = await ctSaveMany(list);
  CTIMP = null;
  closeModal();
  CTF = 'all';
  CTQ = '';
  toast(`Imported ${n} contact${n === 1 ? '' : 's'}`);
  go('/app/contacts');
}
/* ---- actions ---- */
function ctGet(id) {
  return ctList().find(c => c.id === id);
}
function ctInvite(id) {
  const c = ctGet(id);
  if (!c) return;
  closeModal();
  go('/app/tap');
  setTimeout(() => {
    capApply({
      name: c.name,
      email: c.email,
      phone: c.phone,
      linkedin: c.linkedin,
      role: c.role,
      company: c.company,
      source: 'your contacts'
    });
  }, 150);
}
function ctMenu(id) {
  const c = ctGet(id);
  if (!c) return;
  const a = (h, ic, t, x) => `<a class="ct-ma" href="${h}" ${x || ''}>${sv(ic, 18)}<span>${t}</span></a>`;
  modal(`<div class="cap-m"><div class="row between"><h3>${esc(c.name || c.email || c.phone)}</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div><p class="fu-sub">${esc([c.role, c.company].filter(Boolean).join(' · '))}</p>
 <div class="ct-mm"><button type="button" class="ct-ma" data-on-click="ctInvite('${c.id}')">${sv('spark', 18)}<span>Invite to a Thread</span></button>${c.email ? a('mailto:' + esc(c.email), 'mail', 'Email ' + esc(c.email)) : ''}${c.phone ? a('tel:' + esc(c.phone), 'phone', 'Call ' + esc(c.phone)) : ''}${c.linkedin ? a(esc(c.linkedin), 'li', 'Open LinkedIn profile', 'target="_blank" rel="noopener"') : ''}
 <button type="button" class="ct-ma bad" data-on-click="ctDel('${c.id}')">${sv('x', 18)}<span>Delete contact</span></button></div></div>`);
}
async function ctDel(id) {
  const c = ctGet(id);
  if (!c) return;
  if (cloud() && c._c) {
    const { error } = await SB.from('contacts').delete().eq('id', id);
    if (error) return fail(error);
  }
  DB.contacts = DB.contacts.filter(x => x.id !== id);
  save();
  closeModal();
  toast('Contact deleted');
  render();
}
/* ---- Free plan: 5 new Threads a month (real accounts) ---- */
const FREE_LIMIT = 5;
function isPro() {
  const u = me();
  return !!(u && u.plan === 'pro');
}
function threadsThisMonth() {
  const d = new Date(),
    s = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  return myThreads().filter(t => t.ownerId === DB.session && (t.createdAt || 0) >= s).length;
}
function freeLeft() {
  return Math.max(0, FREE_LIMIT - threadsThisMonth());
}
function limitOn() {
  return cloud() && !isPro();
}
const _nt32 = newThread;
newThread = function (e) {
  if (limitOn() && freeLeft() <= 0) {
    e.preventDefault();
    limitSheet();
    return false;
  }
  return _nt32.call(this, e);
};
function limitSheet() {
  modal(`<div class="cap-m"><div class="row between"><h3>You have used your ${freeLim()} free Threads this month</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div>
 <p class="fu-sub">Upgrade to Pro for unlimited Threads, or save this person as a contact now and invite them next month.</p>
 <button type="button" class="cap-btn" data-on-click="closeModal();go('/pricing')">${sv('spark', 16)} See Pro</button><button type="button" class="cap-btn2" data-on-click="ctSaveFromTap()">${sv('users', 16)} Save as a contact</button></div>`);
}
async function ctSaveFromTap() {
  const v = id => (($('#' + id) || {}).value || '').trim();
  const c = {
    name: v('tn'),
    email: v('te'),
    phone: normPhone(v('tph')),
    linkedin: (liFromUrl(v('tln')) || {}).url || '',
    role: v('tr'),
    company: v('tc'),
    notes: v('tx'),
    source: 'Saved from Tap'
  };
  if (!c.name && !c.email && !c.phone) {
    closeModal();
    return toast('Add a name first');
  }
  await ctSaveMany([c]);
  closeModal();
  toast('Saved to Contacts');
  go('/app/contacts');
}
const _vTap32 = vTap;
vTap = function () {
  let h = _vTap32();
  if (limitOn()) {
    const n = freeLeft();
    h = h.replace(
      '<div class="cap cap2">',
      `<div class="fl-note${n ? '' : ' out'}">${sv('spark', 14)}<span>${n ? `${n} of ${FREE_LIMIT} free Threads left this month` : 'No free Threads left this month'}</span><a href="/pricing" data-on-click="go('/pricing');return false">Go unlimited</a></div><div class="cap cap2">`
    );
  }
  return h;
};
/* ---- Pricing: Free = 5 Threads a month; pounds for UK visitors ---- */
function isUK() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const l = (navigator.languages || [navigator.language || '']).join(',');
    return tz === 'Europe/London' || /\ben-GB\b/i.test(l);
  } catch (_) {
    return false;
  }
}
/* v65 pricing: Pro $12 = £9 a month, Rooms $199 = £149 an event. Yearly Pro $120 = £90 (pending confirmation, see HANDOVER). */
const GBP = { 0: 0, 12: 9, 199: 149, 120: 90, 10: 8, 2: 2, 1: 1 };
function toGBP(h) {
  return h.replace(/\$(\d[\d,]*)(?![\d])/g, (m, n) => {
    const v = +n.replace(/,/g, '');
    return '£' + (GBP[v] != null ? GBP[v] : Math.round(v * 0.8));
  });
}
const _vPricing32 = vPricing;
vPricing = function () {
  let h = _vPricing32.apply(this, arguments);
  h = h
    .replace(/(\['Free',[\s\S]{0,200}?)Unlimited Threads/, (m, a) => a + ' ' + thrTxt(freeLim()))
    .replace(/'Everything in Free',/, () => "'Everything in Free','" + thrTxt(PLANS.pro.threads) + "',");
  h = h
    .replace(
      /Free includes unlimited Threads, so you can keep adding people/g,
      () => 'Free includes ' + thrTxt(freeLim()).replace(/^\d/, d => d) + ', so you can keep meeting people'
    )
    .replace(
      /The Free plan includes unlimited Threads/g,
      () => 'The Free plan includes ' + thrTxt(freeLim())
    );
  if (isUK()) {
    h = toGBP(h);
    h = h.replace(
      /(<section class="sec"[^>]*>)/,
      '$1<p class="gbp-note">Prices shown in pounds for the UK.</p>'
    );
  }
  return h;
};

/* v62: named handlers for contacts import (no inline JavaScript). */
function ctSearch(v) {
  CTQ = v;
  ctRenderList();
}
function ctFilt(k) {
  CTF = k;
  render();
}
function ctFileIn(el) {
  ctFile(el.files && el.files[0]);
}
function ctDrop(e, el) {
  e.preventDefault();
  el.classList.remove('on');
  ctFile(e.dataTransfer.files[0]);
}
