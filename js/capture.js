// Introthread - Smart capture (v30-v31): LinkedIn link, QR code, business card reader, contacts, capture UI.
// Moved out of index.html in v53 (code split step 5). Load order matters: see the <script> list at the end of index.html.

/* ===== v30 Smart capture: turn a LinkedIn link, QR code, business card, signature or contact into a filled form =====
   LinkedIn does not let apps read other people's profiles from a username, so a LinkedIn link gives us
   the profile link and a best-guess name; email, phone, role and company come from the other sources. */
const ROLE_WORDS =
  /\b(founder|co-?founder|ceo|cto|cfo|coo|cmo|cpo|chief|president|vice president|vp|director|head|manager|lead|engineer|developer|designer|partner|principal|associate|analyst|consultant|officer|advisor|adviser|investor|owner|executive|specialist|coordinator|marketing|sales|product|operations|recruiter|researcher|scientist|architect|attorney|lawyer|accountant|professor|lecturer|student|intern)\b/i;
const CO_WORDS =
  /\b(ltd|limited|inc|llc|llp|plc|gmbh|corp|corporation|company|co\.|group|holdings|technologies|technology|tech|capital|ventures|partners|labs|studio|studios|agency|bank|consulting|solutions|systems|foundation|university|school|institute|media|global|international)\b/i;
const titleCase = s => s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
function liFromUrl(s) {
  const m = String(s || '').match(/linkedin\.com\/(?:mwlite\/)?in\/([A-Za-z0-9\-_%.]+)/i);
  if (!m) return null;
  const slug = decodeURIComponent(m[1]).replace(/\/$/, '');
  const parts = slug
    .split(/[-_]+/)
    .filter(p => p && !/^\d+$/.test(p) && !(/\d/.test(p) && p.length >= 5) && !/^[0-9a-f]{6,}$/i.test(p));
  return {
    url: 'https://www.linkedin.com/in/' + slug,
    user: slug,
    name:
      parts.length >= 2 && parts.length <= 4 && parts.every(p => /^[\p{L}'.]+$/u.test(p))
        ? titleCase(parts.join(' '))
        : ''
  };
}
function normPhone(p) {
  p = String(p || '').trim();
  const plus = /^\s*(\+|00)/.test(p);
  const d = p.replace(/[^\d]/g, '').replace(/^00/, '');
  if (d.length < 7 || d.length > 15) return '';
  return (plus ? '+' : '') + d;
}
function parseContact(raw) {
  const text = String(raw || '')
    .replace(/\r/g, '')
    .trim();
  const out = {
    name: '',
    email: '',
    phone: '',
    company: '',
    role: '',
    linkedin: '',
    website: '',
    source: ''
  };
  if (!text) return out;
  /* vCard */
  if (/BEGIN:VCARD/i.test(text)) {
    out.source = 'vCard';
    const L = text.replace(/\n[ \t]/g, '').split('\n');
    const get = k => {
      const l = L.find(x => new RegExp('^' + k + '[;:]', 'i').test(x));
      return l ? l.slice(l.indexOf(':') + 1).trim() : '';
    };
    out.name = get('FN') || get('N').split(';').filter(Boolean).reverse().join(' ');
    out.email = get('EMAIL');
    out.phone = normPhone(get('TEL'));
    out.company = get('ORG').split(';')[0];
    out.role = get('TITLE') || get('ROLE');
    L.filter(x => /^(URL|X-SOCIALPROFILE)/i.test(x)).forEach(x => {
      const u = x.slice(x.indexOf(':') + 1).trim();
      const li = liFromUrl(u);
      if (li) out.linkedin = li.url;
      else if (!out.website) out.website = u;
    });
    out.name = out.name.replace(/\\,/g, ',');
    return out;
  }
  /* MECARD (common in QR codes) */
  if (/^MECARD:/i.test(text)) {
    out.source = 'QR contact';
    const f = k => {
      const m = text.match(new RegExp('[:;]' + k + ':([^;]*)', 'i'));
      return m ? m[1].trim() : '';
    };
    const n = f('N');
    out.name = n.includes(',') ? n.split(',').reverse().join(' ').trim() : n;
    out.email = f('EMAIL');
    out.phone = normPhone(f('TEL'));
    out.company = f('ORG');
    const u = f('URL');
    const li = liFromUrl(u);
    if (li) out.linkedin = li.url;
    else out.website = u;
    return out;
  }
  /* LinkedIn link */
  const li = liFromUrl(text);
  if (li) {
    out.linkedin = li.url;
    out.name = li.name;
    out.source = 'LinkedIn link';
  }
  /* general text: email signature, WhatsApp contact, notes */
  const em = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (em) out.email = em[0];
  const ph = text.replace(/https?:\/\/\S+/g, ' ').match(/(?:\+|00)?\d[\d\s().-]{6,}\d/g);
  if (ph) {
    for (const c of ph) {
      const n = normPhone(c);
      if (n && !/^(19|20)\d{2}$/.test(n)) {
        out.phone = n;
        break;
      }
    }
  }
  const urls = (
    text.match(
      /(?:https?:\/\/|www\.)[^\s<>"]+|\b[a-z0-9-]+\.(?:com|co\.uk|io|ai|co|org|net|app|dev|co\.ke|ke)(?:\/[^\s]*)?\b/gi
    ) || []
  ).filter(
    u => !/linkedin\.com/i.test(u) && !(out.email && out.email.toLowerCase().endsWith(u.toLowerCase()))
  );
  if (urls.length) out.website = urls[0].replace(/[).,]+$/, '');
  if (li && !/\n/.test(text.trim())) return ((out.source = 'LinkedIn link'), out);
  const lines = text
    .split(/\n|\s{2,}/)
    .map(s => s.trim())
    .filter(Boolean);
  const clean = l => !/[@]|https?:|www\.|\d{4,}/.test(l) && l.length <= 60;
  for (const l of lines) {
    if (!clean(l)) continue;
    const at = l.match(/^(.{2,40}?)\s+(?:at|@)\s+(.{2,40})$/i);
    if (at && ROLE_WORDS.test(at[1])) {
      out.role = out.role || at[1].trim();
      out.company = out.company || at[2].trim();
      continue;
    }
    const sp = l.split(/\s*[,\u00b7|\u2013\u2014-]\s+/);
    if (sp.length === 2 && ROLE_WORDS.test(sp[0]) && !ROLE_WORDS.test(sp[1])) {
      out.role = out.role || sp[0];
      out.company = out.company || sp[1];
      continue;
    }
    if (
      !out.name &&
      /^[\p{Lu}][\p{L}'.-]+(?:\s+[\p{Lu}][\p{L}'.-]+){1,3}$/u.test(l) &&
      !ROLE_WORDS.test(l) &&
      !CO_WORDS.test(l)
    ) {
      out.name = l;
      continue;
    }
    if (!out.role && ROLE_WORDS.test(l)) {
      out.role = l;
      continue;
    }
    if (!out.company && CO_WORDS.test(l)) {
      out.company = l;
      continue;
    }
    if (out.role && !out.company && /^[\p{Lu}][\p{L}&'.\s-]{1,40}$/u.test(l) && l.split(/\s+/).length <= 4) {
      out.company = l;
      continue;
    }
  }
  if (!out.name && out.email) {
    const lp = out.email
      .split('@')[0]
      .split(/[._-]/)
      .filter(p => /^[a-z]{2,}$/i.test(p));
    if (lp.length >= 2 && lp.length <= 3) out.name = titleCase(lp.join(' '));
  }
  out.source = out.source || (lines.length > 2 ? 'signature' : 'text');
  return out;
}
/* ---------- where_met carries optional contact extras (phone, LinkedIn) without a schema change ---------- */
function tPack(where, meta) {
  const m = {};
  ['phone', 'linkedin', 'src', 'phone2', 'email2', 'website', 'address', 'social'].forEach(k => {
    if (meta && meta[k]) m[k] = meta[k];
  });
  return (where || 'In person') + (Object.keys(m).length ? ' @@' + JSON.stringify(m) : '');
}
function tMeta(t) {
  if (!t || t._mx) return;
  t._mx = 1;
  const w = t.where || '',
    mm = w.match(/\s*@@(\{.*\})\s*$/);
  if (!mm) return;
  const i = mm.index;
  try {
    const m = JSON.parse(mm[1]);
    t.other = t.other || {};
    ['phone', 'linkedin', 'phone2', 'email2', 'website', 'address', 'social'].forEach(k => {
      if (m[k]) t.other[k] = m[k];
    });
    if (m.src) t.src = m.src;
  } catch (_) {}
  t.where = w.slice(0, i) || 'In person';
}
const _render30 = render;
render = function () {
  try {
    (DB.threads || []).forEach(tMeta);
  } catch (_) {}
  return _render30.apply(this, arguments);
};
/* ---------- capture UI on the Tap form ---------- */
const CAP_FIELDS = { name: 'tn', email: 'te', phone: 'tph', linkedin: 'tln', role: 'tr', company: 'tc' };
let CAP_SRC = '';
function capApply(o, scope) {
  const map = scope || CAP_FIELDS;
  const filled = [];
  Object.entries(map).forEach(([k, id]) => {
    const el = $('#' + id);
    if (!el || !o[k]) return;
    if (el.value.trim() && el.value.trim() !== o[k] && k !== 'linkedin') return;
    el.value = o[k];
    filled.push(k);
    el.classList.remove('cap-fill');
    void el.offsetWidth;
    el.classList.add('cap-fill');
  });
  CAP_SRC = o.source || CAP_SRC;
  const lab = {
    name: 'name',
    email: 'email',
    phone: 'phone',
    linkedin: 'LinkedIn',
    role: 'job title',
    company: 'company'
  };
  const r = $('#capres');
  if (r) {
    const miss = ['email', 'phone'].filter(k => map[k] && !($('#' + map[k]) || {}).value);
    r.innerHTML = filled.length
      ? `<span class="ok">${sv('check', 13, 'currentColor', 2.6)} Filled ${filled.map(k => lab[k]).join(', ')}${o.source ? ' from ' + esc(o.source) : ''}</span>${miss.length === 2 && !(map === CAP_FIELDS && filled.includes('linkedin')) ? `<span>Add their email or phone so you can follow up.</span>` : ''}`
      : `<span>Nothing new found. Check the text and try again.</span>`;
    r.hidden = false;
    if (map === CAP_FIELDS && filled.includes('linkedin') && miss.length === 2) {
      capAsk();
      return filled;
    }
  }
  const first = Object.values(map)
    .map(id => $('#' + id))
    .find(el => el && !el.value);
  if (first && filled.length) first.focus({ preventScroll: true });
  return filled;
}
function capLooksRich(s) {
  return (
    /linkedin\.com\/in\/|BEGIN:VCARD|^MECARD:/i.test(s) ||
    (s.split('\n').length >= 2 && /@|\+?\d[\d\s().-]{7,}/.test(s))
  );
}
function capStrip() {
  const ct = 'contacts' in navigator && 'select' in (navigator.contacts || {});
  return `<div class="cap"><div class="cap-h"><b>${sv('spark', 15)} Capture in seconds</b><small>Paste a LinkedIn link, scan their QR or business card. We fill the form for you.</small></div>
 <div class="cap-b"><button type="button" onclick="capPaste()">${sv('link', 18)}<span>Paste link or text</span></button><button type="button" onclick="capScanQR()">${sv('qr', 18)}<span>Scan QR code</span></button><button type="button" onclick="capCard()">${sv('photo', 18)}<span>Scan business card</span></button>${ct ? `<button type="button" onclick="capContacts()">${sv('contact', 18)}<span>From contacts</span></button>` : ''}</div><div class="cap-res" id="capres" role="status" aria-live="polite" hidden></div></div>`;
}
function capPreview(o) {
  const lab = [
    ['name', 'Name'],
    ['email', 'Email'],
    ['phone', 'Phone'],
    ['linkedin', 'LinkedIn'],
    ['role', 'Job title'],
    ['company', 'Company'],
    ['website', 'Website']
  ];
  const rows = lab.filter(([k]) => o[k]);
  return rows.length
    ? `<dl class="cap-pv">${rows.map(([k, l]) => `<div><dt>${l}</dt><dd>${esc(o[k])}</dd></div>`).join('')}</dl>`
    : '<p class="cap-empty">Paste a LinkedIn link, an email signature or contact details. We will pick out the name, email, phone, job title and company.</p>';
}
function capPaste(prefill, title) {
  modal(`<div class="cap-m"><div class="row between"><h3>${title || 'Paste link or text'}</h3><button class="x" aria-label="Close" onclick="closeModal()">&times;</button></div>
 <textarea id="capt" rows="5" placeholder="linkedin.com/in/their-name\nor paste an email signature, WhatsApp contact or notes" oninput="$('#cappv').innerHTML=capPreview(parseContact(this.value))">${esc(prefill || '')}</textarea>
 <div class="cap-mb">${navigator.clipboard && navigator.clipboard.readText ? `<button type="button" class="t-how sm" onclick="navigator.clipboard.readText().then(v=>{$('#capt').value=v;$('#cappv').innerHTML=capPreview(parseContact(v))}).catch(()=>toast('Paste with your keyboard or long-press instead'))">${sv('copy', 15)} Paste from clipboard</button>` : ''}</div>
 <div id="cappv">${capPreview(parseContact(prefill || ''))}</div>
 <p class="bl-fine">LinkedIn does not share profile details with other apps, so from a LinkedIn link we save the profile link and the name in it. Ask for their email or phone, or scan their business card.</p>
 <div class="fu-b"><button type="button" class="t-how" onclick="closeModal()">Cancel</button><button type="button" class="x-btn" onclick="const o=parseContact($('#capt').value);closeModal();capApply(o)">Fill the form</button></div></div>`);
  setTimeout(() => {
    const t = $('#capt');
    if (t && !prefill) t.focus();
  }, 40);
}
function capLoad(src, check) {
  return new Promise((res, rej) => {
    if (check()) return res();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => res();
    s.onerror = () => rej(new Error('load'));
    document.head.appendChild(s);
  });
}
/* QR: BarcodeDetector when the browser has it, otherwise jsQR */
let CAPQ = null;
async function capScanQR() {
  modal(
    `<div class="cap-m"><div class="row between"><h3>Scan their QR code</h3><button class="x" aria-label="Close" onclick="capQRStop();closeModal()">&times;</button></div><p class="fu-sub">Point your camera at a LinkedIn QR, a contact QR or an Introthread card.</p><div class="cap-cam"><video id="capv" playsinline muted></video><span class="cap-frame"></span></div><p class="cap-st" id="capst">Starting camera...</p><div class="fu-b"><label class="t-how sm">${sv('photo', 15)} Use a photo instead<input type="file" accept="image/*" hidden onchange="capQRFile(this)"></label><button type="button" class="t-how" onclick="capQRStop();closeModal()">Cancel</button></div></div>`
  );
  try {
    const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const v = $('#capv');
    if (!v) {
      st.getTracks().forEach(t => t.stop());
      return;
    }
    CAPQ = { st, run: true };
    v.srcObject = st;
    await v.play();
    $('#capst').textContent = 'Looking for a QR code...';
    capQRLoop(v);
  } catch (e) {
    const s = $('#capst');
    if (s) s.textContent = 'Camera is not available. Allow camera access, or use a photo instead.';
  }
}
function capQRStop() {
  if (CAPQ) {
    CAPQ.run = false;
    CAPQ.st.getTracks().forEach(t => t.stop());
    CAPQ = null;
  }
}
async function capDecode(src) {
  if ('BarcodeDetector' in window) {
    try {
      const d = new BarcodeDetector({ formats: ['qr_code'] });
      const r = await d.detect(src);
      if (r[0]) return r[0].rawValue;
    } catch (_) {}
  }
  await capLoad('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js', () => window.jsQR);
  const c = document.createElement('canvas');
  const w = src.videoWidth || src.naturalWidth || src.width,
    h = src.videoHeight || src.naturalHeight || src.height;
  if (!w) return null;
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0, w, h);
  const r = jsQR(x.getImageData(0, 0, w, h).data, w, h);
  return r ? r.data : null;
}
async function capQRLoop(v) {
  while (CAPQ && CAPQ.run) {
    try {
      const t = await capDecode(v);
      if (t) {
        capQRStop();
        closeModal();
        capQRResult(t);
        return;
      }
    } catch (_) {}
    await new Promise(r => setTimeout(r, 280));
  }
}
function capQRFile(inp) {
  const f = inp.files && inp.files[0];
  if (!f) return;
  const img = new Image();
  img.onload = async () => {
    const t = await capDecode(img).catch(() => null);
    if (t) {
      capQRStop();
      closeModal();
      capQRResult(t);
    } else {
      const s = $('#capst');
      if (s) s.textContent = 'No QR code found in that photo. Try a closer, sharper photo.';
    }
  };
  img.src = URL.createObjectURL(f);
}
function capQRResult(t) {
  const o = parseContact(t);
  const it = String(t).match(/introthread\.com\/([a-z0-9]{2,30})(?:[/?#]|$)/i);
  if (it && !o.name) {
    o.website = 'introthread.com/' + it[1];
    o.source = 'Introthread card';
  }
  if (!o.source || o.source === 'text') o.source = 'QR code';
  const n = capApply(o);
  if (!n.length) capPaste(t, 'We read this from the QR code');
}
/* business card: on-device text recognition (Tesseract.js), then the same parser */
function capCard() {
  const i = document.createElement('input');
  i.type = 'file';
  i.accept = 'image/*';
  i.setAttribute('capture', 'environment');
  i.onchange = () => capCardRun(i.files && i.files[0]);
  i.click();
}
async function capCardRun(f) {
  if (!f) return;
  modal(
    `<div class="cap-m"><h3>Reading the business card</h3><div class="cap-prog"><i id="capbar"></i></div><p class="cap-st" id="capst">Preparing text recognition...</p></div>`
  );
  try {
    await capLoad(
      'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',
      () => window.Tesseract
    );
    const r = await Tesseract.recognize(f, 'eng', {
      logger: m => {
        const s = $('#capst'),
          b = $('#capbar');
        if (s)
          s.textContent =
            m.status === 'recognizing text' ? 'Reading text...' : 'Preparing text recognition...';
        if (b && m.progress) b.style.width = Math.round(m.progress * 100) + '%';
      }
    });
    const txt = ((r.data && r.data.text) || '').trim();
    closeModal();
    if (!txt) return toast('No text found. Try a brighter, closer photo.');
    const o = parseContact(txt);
    o.source = 'business card';
    capPaste(txt, 'Check what we read');
    setTimeout(() => {
      const p = $('#cappv');
      if (p) p.innerHTML = capPreview(o);
    }, 50);
  } catch (e) {
    closeModal();
    toast('Could not read the card. Check your connection and try again.');
  }
}
async function capContacts() {
  try {
    const r = await navigator.contacts.select(['name', 'email', 'tel'], { multiple: false });
    if (!r || !r[0]) return;
    const c = r[0];
    capApply({
      name: (c.name || [])[0] || '',
      email: (c.email || [])[0] || '',
      phone: normPhone((c.tel || [])[0] || ''),
      source: 'your contacts'
    });
  } catch (_) {
    toast('Could not open your contacts.');
  }
}
/* smart paste: paste a LinkedIn link or a signature into any field of a capture form */
document.addEventListener(
  'paste',
  e => {
    const f = e.target.closest && e.target.closest('.t-form,.pc-form');
    if (!f) return;
    const s = (e.clipboardData || window.clipboardData).getData('text');
    if (!s || !capLooksRich(s)) return;
    const o = parseContact(s);
    if (f.classList.contains('t-form')) {
      e.preventDefault();
      capApply(o);
    } else {
      e.preventDefault();
      capApply(o, { name: 'gn', email: 'ge', phone: 'gph', linkedin: 'gln', role: 'gr', company: 'gc' });
    }
  },
  true
);
/* Tap form: email, phone and LinkedIn as separate fields, capture strip above */
const _vTap30 = vTap;
vTap = function () {
  let h = _vTap30();
  h = h.replace(
    /<label class="x-f"><span>Email or phone <i>\*<\/i><\/span><input id="te"[^>]*><\/label>/,
    `<label class="x-f"><span>Email</span><input id="te" type="email" inputmode="email" autocomplete="off" placeholder="name@company.com"></label><label class="x-f"><span>Phone</span><input id="tph" type="tel" inputmode="tel" autocomplete="off" placeholder="+44 7700 900123"></label><label class="x-f t-li"><span>LinkedIn <em>(paste their profile link)</em></span><input id="tln" inputmode="url" autocomplete="off" placeholder="linkedin.com/in/their-name" onchange="const o=liFromUrl(this.value);if(o){this.value=o.url;if(o.name&&!$('#tn').value)capApply({name:o.name,source:'LinkedIn link'})}"></label>`
  );
  h = h.replace(
    /<label class="x-f"><span>LinkedIn <em>\(optional\)<\/em><\/span><input id="tli"[^>]*><\/label>/,
    ''
  );
  return h.replace('<div class="t-g2">', capStrip() + '<div class="t-g2">');
};
const _nt30 = newThread;
newThread = function (e) {
  const v = id => {
    const x = $('#' + id);
    return x ? x.value.trim() : '';
  };
  const em = v('te'),
    ph = normPhone(v('tph')),
    liR = v('tln');
  if (v('tn') && !em && !ph) {
    e.preventDefault();
    toast('Add their email or phone so you can follow up');
    const t = $('#te');
    if (t) t.focus();
    return false;
  }
  if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) {
    e.preventDefault();
    toast('Check the email address');
    return false;
  }
  if (v('tph') && !ph) {
    e.preventDefault();
    toast('Check the phone number');
    return false;
  }
  const li = liR ? (liFromUrl(liR) || {}).url || '' : '';
  if (liR && !li) {
    e.preventDefault();
    toast('Paste a LinkedIn profile link like linkedin.com/in/name');
    return false;
  }
  const meta = { phone: ph, linkedin: li, src: CAP_SRC };
  ['phone2', 'email2', 'website', 'address', 'social'].forEach(k => {
    const id = CAP_FIELDS[k];
    let x = id ? v(id) : '';
    if (k === 'phone2' && x) x = normPhone(x) || x;
    if (x) meta[k] = x;
  });
  const before = new Set(DB.threads.map(t => t.id));
  window._capLast = Object.assign({ name: v('tn'), email: em, role: v('tr'), company: v('tc') }, meta);
  const r = _nt30.call(this, e);
  CAP_SRC = '';
  let n = 0;
  const iv = setInterval(() => {
    const t = DB.threads.find(x => !before.has(x.id) && x.ownerId === DB.session);
    if (t) {
      clearInterval(iv);
      t._mx = 1;
      t.other.phone = meta.phone || t.other.phone;
      t.other.linkedin = meta.linkedin || t.other.linkedin;
      ['phone2', 'email2', 'website', 'address', 'social'].forEach(k => {
        if (meta[k]) t.other[k] = meta[k];
      });
      if (meta.src) t.src = meta.src;
      if (cloud() && Object.keys(meta).some(k => k !== 'src' && meta[k]))
        upd('threads', t.id, { where_met: tPack(t.where, meta) });
      save();
    } else if (++n > 40) clearInterval(iv);
  }, 150);
  return r;
};
tapVcf = function (o) {
  const x = Object.assign({}, o, window._capLast || {});
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:' + x.name,
    x.role ? 'TITLE:' + x.role : '',
    x.company ? 'ORG:' + x.company : '',
    x.email ? 'EMAIL:' + x.email : '',
    x.phone ? 'TEL;TYPE=CELL:' + x.phone : '',
    x.linkedin ? 'URL:' + x.linkedin : '',
    'NOTE:Met via Introthread' + (o.where ? ' at ' + o.where : ''),
    'END:VCARD'
  ]
    .filter(Boolean)
    .join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines], { type: 'text/vcard' }));
  a.download = (x.name || 'contact').replace(/\s+/g, '-') + '.vcf';
  document.body.appendChild(a);
  a.click();
  a.remove();
};
/* Thread page: phone and LinkedIn in The moment, and editable */
const _vThread30 = vThread;
vThread = function (id) {
  let h = _vThread30(id);
  const t = findThread(id);
  if (!t) return h;
  tMeta(t);
  const o = t.other || {};
  const add =
    (o.phone ? `<li>${sv('phone', 16)}<a href="tel:${esc(o.phone)}">${esc(o.phone)}</a></li>` : '') +
    (o.linkedin
      ? `<li>${sv('li', 16)}<a href="${esc(o.linkedin)}" target="_blank" rel="noopener">${esc(o.linkedin.replace(/^https:\/\/www\./, ''))}</a></li>`
      : '');
  return add ? h.replace('<ul class="td-facts">', '<ul class="td-facts">' + add) : h;
};
const _tdEdit30 = tdEdit;
tdEdit = function (id) {
  _tdEdit30(id);
  const t = findThread(id);
  if (!t) return;
  const g = document.querySelector('.modal .t-g2');
  if (g)
    g.insertAdjacentHTML(
      'beforeend',
      `<label class="x-f"><span>Phone</span><input id="tep" type="tel" value="${esc(t.other.phone || '')}" maxlength="30"></label><label class="x-f"><span>LinkedIn</span><input id="tel2" value="${esc(t.other.linkedin || '')}" placeholder="linkedin.com/in/name" maxlength="200"></label>`
    );
};
const _tdSave30 = tdEditSave;
tdEditSave = async function (e, id) {
  const t = findThread(id);
  const ph = normPhone(($('#tep') || {}).value || ''),
    lr = (($('#tel2') || {}).value || '').trim(),
    li = lr ? (liFromUrl(lr) || {}).url || '' : '';
  if ((($('#tep') || {}).value || '').trim() && !ph) {
    e.preventDefault();
    toast('Check the phone number');
    return false;
  }
  if (lr && !li) {
    e.preventDefault();
    toast('Paste a LinkedIn profile link like linkedin.com/in/name');
    return false;
  }
  const r = await _tdSave30.call(this, e, id);
  if (t) {
    t.other.phone = ph;
    t.other.linkedin = li;
    if (cloud())
      await upd('threads', id, { where_met: tPack(t.where, { phone: ph, linkedin: li, src: t.src }) });
    save();
    window._keepScroll = true;
    render();
  }
  return r;
};
/* exports include phone and LinkedIn */
const _bVcf30 = bExportVcf;
bExportVcf = function () {
  const T = myThreads();
  T.forEach(tMeta);
  const keep = T.map(t => t.other.email);
  T.forEach(t => {
    t.other._x = 1;
  });
  const orig = window.Blob;
  window.Blob = function (parts, opt) {
    if (opt && opt.type === 'text/vcard' && parts && typeof parts[0] === 'string') {
      let i = 0;
      parts = [
        parts[0]
          .split('END:VCARD')
          .map((c, k) => {
            const t = T[k];
            if (!t || !c.trim()) return c;
            return (
              c +
              (t.other.phone ? 'TEL;TYPE=CELL:' + t.other.phone + '\r\n' : '') +
              (t.other.linkedin ? 'URL:' + t.other.linkedin + '\r\n' : '')
            );
          })
          .join('END:VCARD')
      ];
    }
    return new orig(parts, opt);
  };
  try {
    _bVcf30();
  } finally {
    window.Blob = orig;
  }
};
const _bCsv30 = bExportThreads;
bExportThreads = function () {
  const T = myThreads();
  T.forEach(tMeta);
  const orig = window.Blob;
  window.Blob = function (parts, opt) {
    if (opt && opt.type === 'text/csv') {
      const rows = parts[0].replace(/^\ufeff/, '').split('\n');
      parts = [
        '\ufeff' +
          rows
            .map((r, i) => {
              if (i === 0) return r + ',"Phone","LinkedIn"';
              const t = T[i - 1];
              const q = v => `"${String(v || '').replace(/"/g, '""')}"`;
              return r + ',' + q(t && t.other.phone) + ',' + q(t && t.other.linkedin);
            })
            .join('\n')
      ];
    }
    return new orig(parts, opt);
  };
  try {
    _bCsv30();
  } finally {
    window.Blob = orig;
  }
};
/* public card: phone and LinkedIn for the visitor, with autofill */
const _vPub30 = vPublic;
vPublic = function (hd) {
  let h = _vPub30(hd);
  if (!h.includes('id="gc"')) return h;
  const fi = (id, ic, ph, o) =>
    `<label class="pc-in">${sv(ic, 18)}<input id="${id}" placeholder="${ph}" ${o}></label>`;
  h = h.replace(
    /(<label class="pc-in">[\s\S]{0,400}?id="gc"[^>]*><\/label>)/,
    `$1${fi('gph', 'phone', 'Phone (optional)', 'type="tel" inputmode="tel" autocomplete="tel" maxlength="30" aria-label="Phone"')}${fi('gln', 'li', 'LinkedIn profile link (optional)', 'inputmode="url" autocomplete="url" maxlength="200" aria-label="LinkedIn profile link" onchange="const o=liFromUrl(this.value);if(o)this.value=o.url"')}`
  );
  return h.replace(
    '<form class="pc-form"',
    '<p class="pc-fast">' +
      sv('spark', 14) +
      ' Tip: paste your LinkedIn link or email signature into any box and we fill in the rest.</p><form class="pc-form"'
  );
};
const _guest30 = guestThread;
guestThread = function (e, oid) {
  const gw = $('#gw');
  const ph = normPhone(($('#gph') || {}).value || ''),
    lr = (($('#gln') || {}).value || '').trim(),
    li = lr ? (liFromUrl(lr) || {}).url || '' : '';
  if ((($('#gph') || {}).value || '').trim() && !ph) {
    e.preventDefault();
    toast('Check the phone number');
    return false;
  }
  if (lr && !li) {
    e.preventDefault();
    toast('Paste a LinkedIn profile link like linkedin.com/in/name');
    return false;
  }
  if (!gw || (!ph && !li)) return _guest30(e, oid);
  const orig = gw.value;
  gw.value = tPack(orig.trim() || 'In person', { phone: ph, linkedin: li, src: 'card' });
  try {
    return _guest30(e, oid);
  } finally {
    gw.value = orig;
  }
};
/* sign-up: fill your own profile from your LinkedIn link or email signature */
function suQuickFill() {
  const o = parseContact(($('#suq') || {}).value || '');
  const m = { name: 'sn2', role: 'sr', company: 'sc' };
  const n = capApply(o, m);
  if (o.linkedin) {
    try {
      localStorage.setItem('it_su_li', o.linkedin);
    } catch (_) {}
  }
  const r = $('#suqr');
  if (r)
    r.innerHTML =
      n.length || o.linkedin
        ? `${sv('check', 13, 'currentColor', 2.6)} Filled ${n
            .concat(o.linkedin ? ['LinkedIn link'] : [])
            .join(', ')
            .replace('role', 'job title')}. Check the rest below.`
        : 'Nothing found. Paste your LinkedIn link or your email signature.';
  if (typeof liveP === 'function') liveP();
}
const _vSignup30 = vSignup;
vSignup = function () {
  const h = _vSignup30();
  if (!(SU && SU.step === 2)) return h;
  return h.replace(
    '<div class="x-s2" style="margin-top:30px">',
    `<div class="su-q"><b>${sv('spark', 15)} Fill this in seconds</b><small>Paste your LinkedIn profile link or your email signature.</small><div class="su-qr"><textarea id="suq" rows="2" placeholder="linkedin.com/in/your-name or your email signature" onpaste="setTimeout(suQuickFill,0)"></textarea><button type="button" class="x-btn" onclick="suQuickFill()">Fill</button></div><p id="suqr" role="status" aria-live="polite"></p></div><div class="x-s2" style="margin-top:22px">`
  );
};
/* save the LinkedIn link from sign-up onto the new profile */
const _render30b = render;
render = function () {
  const u = me();
  if (u) {
    let li = null;
    try {
      li = localStorage.getItem('it_su_li');
    } catch (_) {}
    if (li) {
      try {
        localStorage.removeItem('it_su_li');
      } catch (_) {}
      if (!(u.links || {}).linkedin) {
        const links = Object.assign({}, u.links || {}, { linkedin: li });
        upd('profiles', u.id, { links }).then(ok => {
          if (ok) {
            u.links = links;
            save();
          }
        });
      }
    }
  }
  return _render30b.apply(this, arguments);
};

/* follow-up prompt: a LinkedIn capture has no email or phone, so ask for one right there */
function capAsk() {
  const r = $('#capres');
  if (!r || $('#capask')) return;
  const d = document.createElement('div');
  d.className = 'cap-ask';
  d.id = 'capask';
  d.setAttribute('role', 'group');
  d.setAttribute('aria-label', 'Add their email or phone');
  d.innerHTML = `<b>Ask for their email or phone now</b><small>LinkedIn codes don't include contact details. Add one so your follow-up reaches them.</small><div class="cap-ask-f"><input id="capae" type="email" inputmode="email" autocomplete="off" autocapitalize="off" placeholder="Email" aria-label="Their email" oninput="capAskSync()"><input id="capap" type="tel" inputmode="tel" autocomplete="off" placeholder="Phone" aria-label="Their phone" oninput="capAskSync()" onblur="capAskSync(1)"></div><div class="cap-ask-s" id="capasks" role="status" aria-live="polite"></div><button type="button" class="cap-ask-x" onclick="capAskClose()">Skip for now</button>`;
  r.appendChild(d);
  setTimeout(() => {
    const e = $('#capae');
    if (e) e.focus({ preventScroll: true });
    if (d.scrollIntoView) d.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, 60);
}
function capAskSync(blur) {
  const e = $('#capae'),
    p = $('#capap'),
    te = $('#te'),
    tp = $('#tph');
  if (!e || !p) return;
  if (te) te.value = e.value.trim();
  if (tp) {
    let v = p.value.trim();
    if (blur && v) {
      v = normPhone(v) || v;
      p.value = v;
    }
    tp.value = v;
  }
  const okE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.value.trim()),
    okP = p.value.replace(/\D/g, '').length >= 7;
  const s = $('#capasks');
  if (s)
    s.innerHTML =
      okE || okP
        ? `<span class="ok">${sv('check', 13, 'currentColor', 2.6)} Added to the form. You can save the Thread.</span>`
        : '';
}
function capAskClose() {
  const d = $('#capask');
  if (d) d.remove();
}
document.addEventListener('input', e => {
  const t = e.target;
  if (!t || !(t.id === 'te' || t.id === 'tph')) return;
  const d = $('#capask');
  if (!d) return;
  if (t.value.trim()) {
    const m = t.id === 'te' ? $('#capae') : $('#capap');
    if (m) m.value = t.value;
  }
});

/* ================= v31: business card reader, richer QR/contacts, capture UI ================= */
SV.photo =
  '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.6-2.2h5.4L16.3 7h2.2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.8" r="3.4"/>';
SV.card =
  '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8" cy="11" r="2.2"/><path d="M4.8 16.2c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4M14 10h4.5M14 13.5h3"/>';
SV.paste =
  '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4.5V3.5h6v1M9 10h6M9 13.5h6M9 17h4"/>';
SV.chev = '<path d="M9 6l6 6-6 6"/>';
const CARD_ROLE =
  /\b(founder|co-?founder|ceo|cto|cfo|coo|cmo|cpo|cio|chief|president|chair(?:man|person|woman)?|vice president|vp|svp|evp|director|head|manager|lead|engineer|developer|designer|partner|principal|associate|analyst|consultant|officer|advisor|adviser|investor|owner|proprietor|executive|specialist|coordinator|marketing|sales|operations|recruiter|researcher|scientist|architect|attorney|lawyer|advocate|accountant|auditor|professor|lecturer|teacher|intern|secretary|administrator|representative|agent|broker|surveyor|pastor|bishop|reverend|nurse|pharmacist|dentist|surgeon|photographer|writer|editor|journalist|producer|trustee|treasurer|supervisor|technician|strategist|planner|assistant|chef|mechanic|physician)\b/i;
const CARD_CO =
  /\b(ltd|limited|inc|llc|llp|plc|gmbh|corp|corporation|company|co\.|group|holdings|technologies|technology|capital|ventures|partners|labs|studios?|agency|bank|consulting|consultants|solutions|systems|foundation|university|school|institute|media|global|international|logistics|enterprises?|industries|church|ministries|hospital|clinic|pharmacy|motors|spares|traders|trading|services|supplies|investments|properties|realty|insurance|sacco|hotel|academy|college|associates|fintech|analytics|networks|software|digital)\b/i;
const CARD_ADDR =
  /\b(p\.?\s?o\.?\s?box|box\s*\d|road|rd\.?|street|st\.?|avenue|ave\.?|lane|drive|boulevard|blvd|highway|floor|flr|suite|ste\.?|building|bldg|plaza|towers?|court|park|estate|centre|center|mall|square|close|crescent|nairobi|mombasa|kisumu|nakuru|eldoret|thika|kenya|london|manchester|birmingham|uk|united kingdom|usa|united states|new york)\b/i;
const CARD_PC = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b|\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/;
const FREE_MAIL = /^(gmail|yahoo|ymail|outlook|hotmail|live|icloud|me|aol|proton|protonmail|gmx|zoho|mail)$/i;
const TLD =
  '(?:com|co\\.ke|co\\.uk|or\\.ke|ac\\.ke|go\\.ke|org\\.uk|co\\.za|com\\.ng|co|org|net|io|ai|app|dev|info|biz|ke|uk|us|africa|tech|store|online|site|me|ng|tz|ug|rw|edu|gov)';
function smartCase(s) {
  s = String(s || '').trim();
  if (!s || /[a-z]/.test(s)) return s;
  return s
    .split(/(\s+)/)
    .map(w => {
      if (/^\s+$/.test(w)) return w;
      const b = w.replace(/[^A-Za-z]/g, '');
      if (/^(INC|LTD|CO)$/.test(b)) return w.charAt(0) + w.slice(1).toLowerCase();
      if (b.length <= 3 && !/^(MR|MRS|MS|DR)$/.test(b)) return w;
      return w
        .toLowerCase()
        .replace(/(^|[\s'’-]|Mc|Mac)([a-z])/g, (m, a, c) => a + c.toUpperCase())
        .replace(/^([a-z])/, c => c.toUpperCase());
    })
    .join('');
}
function ocrFix(t) {
  let L = String(t || '')
    .replace(/\r/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .split('\n')
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const fix = l =>
    l
      .replace(/([a-z0-9._-])\s?[©®]\s?([a-z0-9-]+\.)/gi, '$1@$2')
      .replace(/\s*(?:\(at\)|\[at\])\s*/gi, '@')
      .replace(/([a-z0-9._-])\s*@\s*([a-z0-9])/gi, '$1@$2')
      .replace(/linked\s*in\s*\.?\s*com\s*[\/y|lI1]?\s*in\s*[\/|]\s*/gi, 'linkedin.com/in/')
      .replace(/\b(www)\s*\.\s*/gi, 'www.')
      .replace(new RegExp('([a-z0-9-])\\s*\\.\\s+(' + TLD + ')\\b', 'gi'), '$1.$2')
      .replace(/(@[a-z0-9-]+)\s(com|org|net|io|co\.[a-z]{2})\b/gi, '$1.$2')
      .replace(/\bWWW\./g, 'www.');
  L = L.map(fix);
  const out = [];
  for (let i = 0; i < L.length; i++) {
    let cur = L[i];
    while (i + 1 < L.length) {
      const nx = L[i + 1],
        last = cur.split(' ').pop();
      const open =
        /[^\s@]@|^www\.|^https?:/i.test(last) &&
        !new RegExp('\\.' + TLD + '(?:/\\S*)?$', 'i').test(last) &&
        /^[a-z0-9][a-z0-9.\-/]*$/i.test(nx) &&
        /[a-z]/i.test(nx);
      const box = /box/i.test(cur) && /[\d-]$/.test(cur) && /^\d/.test(nx);
      if (open) {
        cur = cur + nx;
        i++;
        continue;
      }
      if (box) {
        cur = cur + nx;
        i++;
        continue;
      }
      break;
    }
    cur = cur.replace(/(box\s*)(\d[\d\s]*\d)/i, (m, a, b) => a + b.replace(/\s/g, ''));
    out.push(cur);
  }
  return out;
}
function parseCard(raw) {
  const o = {
    name: '',
    role: '',
    company: '',
    email: '',
    email2: '',
    phone: '',
    phone2: '',
    website: '',
    linkedin: '',
    address: '',
    social: '',
    notes: '',
    source: 'business card'
  };
  const lines = ocrFix(raw);
  const emails = [],
    phones = [],
    webs = [],
    socials = [],
    cands = [],
    addr = [];
  let li = '';
  const PL =
    /^(?:(e-?mail|mail|email|e)|(tel|telephone|phone|ph|t|o|off|office|d|dir|direct|p)|(m|mob|mobile|cell|cel|c|gsm|whatsapp|wa)|(f|fax)|(w|web|website|site|url|www)|(a|add|addr|address|loc|location)|(in|linkedin|li)|(x|twitter|ig|instagram|fb|facebook))\s*[:.\-]?\s+(?=\S)/i;
  lines.forEach((line, idx) => {
    let l = line,
      kind = '',
      lab = null;
    const m = l.match(PL);
    if (m) {
      const rest = l.slice(m[0].length);
      const single = m[0].trim().replace(/[:.\-]$/, '').length <= 1;
      if (!single || /^[+\d(@]|^(www|http)|@|\.\w{2,}/i.test(rest)) {
        lab = m;
        l = rest;
        kind = m[2] ? 'tel' : m[3] ? 'mob' : m[4] ? 'fax' : m[6] ? 'addr' : '';
      }
    }
    (l.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || []).forEach(e => {
      emails.push(e.toLowerCase().replace(/\.$/, ''));
      l = l.replace(e, ' ');
    });
    const lm =
      l.match(/linkedin\.com\/(?:in|company)\/[A-Za-z0-9\-_%.]+/i) ||
      (lab && lab[7] ? l.match(/(?:^|\/)?in\/([A-Za-z0-9\-_]+)|^([A-Za-z0-9\-_]{3,})$/) : null);
    if (lm) {
      const u = /linkedin/i.test(lm[0]) ? lm[0] : 'linkedin.com/in/' + (lm[1] || lm[2]);
      const r = liFromUrl(u);
      if (r && !li) li = r.url;
      l = l.replace(lm[0], ' ');
    }
    const sm =
      l.match(/\b(?:twitter\.com|x\.com|instagram\.com|facebook\.com|tiktok\.com)\/[\w.]+/i) ||
      l.trim().match(/^@[A-Za-z0-9_.]{2,30}$/) ||
      (lab && lab[8] ? l.trim().match(/^@?[A-Za-z0-9_.]{2,30}$/) : null);
    if (sm) {
      socials.push(sm[0]);
      l = l.replace(sm[0], ' ');
    }
    const wre = new RegExp(
      '(?:https?:\\/\\/)?(?:www\\.)?[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.' + TLD + '(?:\\/[^\\s,]*)?(?![a-z0-9@])',
      'gi'
    );
    (l.match(wre) || []).forEach(u => {
      if (/^\d/.test(u)) return;
      webs.push(u.replace(/[).,;]+$/, '').toLowerCase());
      l = l.replace(u, ' ');
    });
    const isBox = /box\s*\d/i.test(l) || kind === 'addr';
    if (!isBox || kind === 'tel' || kind === 'mob') {
      let pl = l;
      for (let k = 0; k < 2; k++)
        pl = pl
          .replace(/([\d+(\s-])[Oo](?=[\d\s)-])/g, '$10')
          .replace(/([\d+(\s-])[lI|](?=[\d\s)-])/g, '$11');
      (pl.match(/(?:\+|00)?\s?\(?\d[\d\s().\-\/]{5,}\d/g) || []).forEach(c => {
        const n = normPhone(c.replace(/\/.*/, ''));
        if (!n || /^(19|20)\d{2}$/.test(n)) return;
        const t = kind || (/^(\+?254|0)(7|1)\d{8}$/.test(n) || /^(\+?44|0)7\d{9}$/.test(n) ? 'mob' : '');
        phones.push({ n, t });
        pl = pl.replace(c, ' ');
        l = l.replace(c, ' ');
      });
      l = pl;
    }
    l = l
      .replace(/\s*[|·•,;]\s*$/, '')
      .replace(/^\s*[|·•,;:-]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (kind === 'addr' && l) {
      addr.push(l);
      return;
    }
    if (l.length > 1 && /[A-Za-z]{2}/.test(l)) cands.push({ l, idx, lab: !!lab });
  });
  const fx = phones.filter(p => p.t !== 'fax');
  const mob = fx.find(p => p.t === 'mob');
  const pr = mob || fx[0];
  if (pr) {
    o.phone = pr.n;
    const s = fx.find(p => p !== pr && p.n !== pr.n);
    if (s) o.phone2 = s.n;
  }
  const em = [...new Set(emails)];
  o.email = em[0] || '';
  o.email2 = em[1] || '';
  o.linkedin = li;
  o.social = socials[0] || '';
  const wb = [...new Set(webs)].filter(
    u =>
      !/linkedin\.com/.test(u) &&
      !em.some(e => e.endsWith('@' + u.replace(/^https?:\/\/|^www\./g, '')) && false)
  );
  o.website = (wb[0] || '').replace(/\/$/, '');
  const roots = new Set();
  em.concat(wb).forEach(x => {
    const h = x.includes('@')
      ? x.split('@')[1]
      : x
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .split('/')[0];
    const r = h
      .replace(new RegExp('\\.' + TLD + '$', 'i'), '')
      .split('.')
      .pop();
    if (r && r.length >= 3 && !FREE_MAIL.test(r)) roots.add(r.toLowerCase());
  });
  const locals = em.map(e => e.split('@')[0].toLowerCase());
  const nrm = s => s.toLowerCase().replace(/[^a-z]/g, '');
  const dom = l => {
    const n = nrm(l);
    if (n.length < 4) return false;
    for (const r of roots) {
      if (n.includes(r) || r.includes(n) || (n.length >= 6 && r.startsWith(n.slice(0, 6)))) return true;
    }
    return false;
  };
  const isAddr = l =>
    (CARD_ADDR.test(l) && (/\d/.test(l) || /,/.test(l) || /^(p\.?\s?o|box)/i.test(l))) || CARD_PC.test(l);
  let rest = [];
  cands.forEach(c => {
    if (isAddr(c.l) && !CARD_ROLE.test(c.l)) addr.push(c.l);
    else rest.push(c);
  });
  o.address = addr.join(', ').replace(/,\s*,/g, ',');
  const core = l =>
    l
      .replace(/^(dr|mr|mrs|ms|miss|prof|eng|rev|hon|sir|dame|cpa|adv)\.?\s+/i, '')
      .replace(/\s*,?\s*\b(phd|mba|cpa|esq|jr|sr|md|msc|bsc|ma|ba|frcs|ceng|acca|cfa|pmp)\b\.?/gi, '')
      .replace(/[,.]$/, '')
      .trim();
  const nameScore = (c, i) => {
    const s = core(c.l);
    const w = s.split(/\s+/);
    if (w.length < 2 || w.length > 4 || !w.every(x => /^[\p{L}][\p{L}'.-]*$/u.test(x))) return -99;
    let sc = 3;
    if (CARD_ROLE.test(c.l)) sc -= 8;
    if (CARD_CO.test(c.l)) sc -= 6;
    if (dom(c.l)) sc -= 6;
    if (locals.some(lp => w.some(x => x.length >= 3 && lp.includes(x.toLowerCase().replace(/[^a-z]/g, '')))))
      sc += 4;
    if (w.every(x => /^[\p{Lu}]/u.test(x))) sc += 1;
    if (i === 0) sc += 2;
    else if (i === 1) sc += 1;
    const nx = rest[i + 1];
    if (nx && CARD_ROLE.test(nx.l)) sc += 2;
    return sc;
  };
  let bi = -1,
    bs = 2;
  rest.forEach((c, i) => {
    const s = nameScore(c, i);
    if (s > bs) {
      bs = s;
      bi = i;
    }
  });
  if (bi >= 0) {
    o.name = smartCase(core(rest[bi].l));
    rest.splice(bi, 1);
  }
  const ri = rest.findIndex(
    c => CARD_ROLE.test(c.l) && !dom(c.l) && !/\b(ltd|limited|inc|llc|plc)\b/i.test(c.l)
  );
  if (ri >= 0) {
    let r = rest[ri].l;
    const at = r.match(/^(.{2,60}?)\s+(?:at|@|\||-|,)\s+(.{2,60})$/i);
    if (at && CARD_ROLE.test(at[1]) && !CARD_ROLE.test(at[2])) {
      r = at[1];
      o.company = smartCase(at[2]);
    }
    o.role = smartCase(r);
    rest.splice(ri, 1);
  }
  if (!o.company) {
    let ci = -1,
      cs = 3.5;
    rest.forEach((c, i) => {
      let s = 0;
      if (dom(c.l)) s += 6;
      if (CARD_CO.test(c.l)) s += 4;
      if (!/[a-z]/.test(c.l)) s += 1;
      if (c.l.split(' ').length > 6) s -= 3;
      s -= i * 0.2;
      if (s > cs) {
        cs = s;
        ci = i;
      }
    });
    if (ci >= 0) {
      o.company = smartCase(rest[ci].l.replace(/[,.]$/, ''));
      o.company = o.company.charAt(0).toUpperCase() + o.company.slice(1);
      rest.splice(ci, 1);
    } else if (roots.size && em.length && !FREE_MAIL.test((em[0].split('@')[1] || '').split('.')[0])) {
      const r = [...roots][0];
      o.company = r.charAt(0).toUpperCase() + r.slice(1);
    }
  }
  if (!o.name && locals[0]) {
    const lp = locals[0].split(/[._-]/).filter(p => /^[a-z]{2,}$/.test(p));
    if (lp.length >= 2 && lp.length <= 3) o.name = titleCase(lp.join(' '));
  }
  o.notes = rest
    .filter(c => c.l.length >= 3 && c.l.length <= 80 && /[a-z]{3}/i.test(c.l))
    .map(c => c.l)
    .slice(0, 3)
    .join(' · ');
  o.raw = lines.join('\n');
  return o;
}
/* richer QR / file formats */
function vUnesc(v) {
  return String(v || '')
    .replace(/\\n/gi, ', ')
    .replace(/\\([,;:\\])/g, '$1')
    .trim();
}
function vQP(v) {
  try {
    return decodeURIComponent(
      v
        .replace(/=\r?\n/g, '')
        .replace(/%/g, '%25')
        .replace(/=([0-9A-F]{2})/gi, '%$1')
    );
  } catch (_) {
    return v;
  }
}
function parseVcard(text) {
  const o = {
    name: '',
    role: '',
    company: '',
    email: '',
    email2: '',
    phone: '',
    phone2: '',
    website: '',
    linkedin: '',
    address: '',
    social: '',
    notes: '',
    source: 'vCard'
  };
  const L = text
    .replace(/\r/g, '')
    .replace(/=\n/g, '=\n')
    .replace(/\n[ \t]/g, '')
    .split('\n');
  const P = [];
  L.forEach(x => {
    const i = x.indexOf(':');
    if (i < 1) return;
    const head = x.slice(0, i),
      key = head
        .split(';')[0]
        .replace(/^item\d+\./i, '')
        .toUpperCase(),
      par = head.toUpperCase();
    let v = x.slice(i + 1);
    if (/QUOTED-PRINTABLE/.test(par)) v = vQP(v);
    P.push({ key, par, v });
  });
  const g = k => (P.find(p => p.key === k) || {}).v || '';
  const n = g('N').split(';');
  o.name = vUnesc(g('FN')) || [n[3], n[1], n[2], n[0]].filter(Boolean).map(vUnesc).join(' ');
  o.role = vUnesc(g('TITLE') || g('ROLE'));
  o.company = vUnesc(g('ORG').split(';')[0]);
  const tels = P.filter(p => p.key === 'TEL')
    .map(p => ({
      n: normPhone(p.v.replace(/^tel:/i, '')),
      c: /CELL|MOBILE|IPHONE/.test(p.par),
      f: /FAX/.test(p.par)
    }))
    .filter(t => t.n && !t.f);
  const m = tels.find(t => t.c) || tels[0];
  if (m) {
    o.phone = m.n;
    const s = tels.find(t => t !== m && t.n !== m.n);
    if (s) o.phone2 = s.n;
  }
  const ems = P.filter(p => p.key === 'EMAIL')
    .map(p => p.v.trim())
    .filter(Boolean);
  o.email = ems[0] || '';
  o.email2 = ems[1] || '';
  const a = P.find(p => p.key === 'ADR');
  if (a) o.address = a.v.split(';').map(vUnesc).filter(Boolean).join(', ');
  P.filter(p => /^(URL|X-SOCIALPROFILE)$/.test(p.key)).forEach(p => {
    const u = p.v.trim();
    const r = liFromUrl(u);
    if (r) {
      if (!o.linkedin) o.linkedin = r.url;
    } else if (/twitter|x\.com|instagram|facebook|tiktok/i.test(u) || /X-SOCIAL/.test(p.par)) {
      if (!o.social) o.social = u;
    } else if (!o.website) o.website = u;
  });
  o.notes = vUnesc(g('NOTE')).slice(0, 200);
  return o;
}
function capSpecial(s) {
  if (/BEGIN:VCARD/i.test(s)) return parseVcard(s.slice(s.search(/BEGIN:VCARD/i)));
  const base = {
    name: '',
    role: '',
    company: '',
    email: '',
    email2: '',
    phone: '',
    phone2: '',
    website: '',
    linkedin: '',
    address: '',
    social: '',
    notes: '',
    source: 'QR code'
  };
  if (/^MECARD:/i.test(s)) {
    const o = Object.assign({}, base, { source: 'QR contact' });
    const all = k =>
      [...s.matchAll(new RegExp('[:;]' + k + ':((?:\\\\;|[^;])*)', 'gi'))]
        .map(m => m[1].replace(/\\;/g, ';').trim())
        .filter(Boolean);
    const n = all('N')[0] || '';
    o.name = n.includes(',') ? n.split(',').reverse().join(' ').trim() : n;
    const t = all('TEL').map(normPhone).filter(Boolean);
    o.phone = t[0] || '';
    o.phone2 = t[1] || '';
    const e = all('EMAIL');
    o.email = e[0] || '';
    o.email2 = e[1] || '';
    o.company = all('ORG')[0] || '';
    o.role = all('TITLE')[0] || '';
    o.address = all('ADR')[0] || '';
    o.notes = all('NOTE')[0] || '';
    all('URL').forEach(u => {
      const r = liFromUrl(u);
      if (r) o.linkedin = r.url;
      else if (!o.website) o.website = u;
    });
    return o;
  }
  if (/^BIZCARD:/i.test(s)) {
    const o = Object.assign({}, base, { source: 'QR contact' });
    const f = k => {
      const m = s.match(new RegExp('[:;]' + k + ':([^;]*)', 'i'));
      return m ? m[1].trim() : '';
    };
    o.name = [f('N'), f('X')].filter(Boolean).join(' ');
    o.role = f('T');
    o.company = f('C');
    o.address = f('A');
    o.phone = normPhone(f('M') || f('B'));
    o.phone2 = f('M') && f('B') ? normPhone(f('B')) : '';
    o.email = f('E');
    return o;
  }
  let m = s.match(/^tel:\s*([+\d\s().-]+)/i);
  if (m) return Object.assign({}, base, { phone: normPhone(m[1]) });
  m = s.match(/^(?:sms|smsto):\s*([+\d\s().-]+)/i);
  if (m) return Object.assign({}, base, { phone: normPhone(m[1]) });
  m = s.match(/^mailto:\s*([^?\s]+)/i) || s.match(/^MATMSG:TO:([^;]+)/i);
  if (m) return Object.assign({}, base, { email: decodeURIComponent(m[1]) });
  m = s.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=|whatsapp\.com\/send\?phone=)\+?(\d{7,15})/i);
  if (m) return Object.assign({}, base, { phone: '+' + m[1], source: 'WhatsApp QR' });
  return null;
}
const _pc31 = parseContact;
parseContact = function (raw) {
  const s = String(raw || '').trim();
  const sp = capSpecial(s);
  if (sp) return sp;
  const o = _pc31(s);
  ['email2', 'phone2', 'address', 'social', 'notes'].forEach(k => {
    if (o[k] === undefined) o[k] = '';
  });
  if (/\n/.test(s)) {
    const c = parseCard(s);
    ['email2', 'phone2', 'address', 'social'].forEach(k => {
      if (c[k] && !o[k]) o[k] = c[k];
    });
    ['phone', 'website', 'company', 'role', 'name', 'linkedin'].forEach(k => {
      if (!o[k] && c[k]) o[k] = c[k];
    });
  }
  return o;
};
/* ---- Tap form: extra fields, smarter apply ---- */
Object.assign(CAP_FIELDS, { phone2: 'tp2', email2: 'te2', website: 'tws', address: 'tad', social: 'tso' });
const CAP_X = ['phone2', 'email2', 'website', 'address', 'social'];
const CAP_LAB = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  linkedin: 'LinkedIn',
  role: 'job title',
  company: 'company',
  phone2: 'second phone',
  email2: 'second email',
  website: 'website',
  address: 'address',
  social: 'social',
  notes: 'note'
};
capApply = function (o, scope) {
  const map = scope || CAP_FIELDS;
  const filled = [];
  Object.entries(map).forEach(([k, id]) => {
    const el = $('#' + id);
    if (!el || !o[k]) return;
    if (el.value.trim() && el.value.trim() !== o[k] && k !== 'linkedin') return;
    el.value = o[k];
    filled.push(k);
    el.classList.remove('cap-fill');
    void el.offsetWidth;
    el.classList.add('cap-fill');
  });
  if (map === CAP_FIELDS && o.notes) {
    const x = $('#tx');
    if (x && !x.value.trim()) {
      x.value = o.notes.slice(0, 140);
      filled.push('notes');
    }
  }
  if (map === CAP_FIELDS && filled.some(k => CAP_X.includes(k))) {
    const d = $('#capmore');
    if (d) d.open = true;
  }
  CAP_SRC = o.source || CAP_SRC;
  const r = $('#capres');
  if (r) {
    const miss = ['email', 'phone'].filter(k => map[k] && !($('#' + map[k]) || {}).value);
    r.innerHTML = filled.length
      ? `<div class="cap-done"><span class="ok">${sv('check', 13, 'currentColor', 2.6)} Filled ${filled.map(k => CAP_LAB[k] || k).join(', ')}${o.source ? ' from ' + esc(o.source) : ''}</span>${miss.length === 2 && !(map === CAP_FIELDS && filled.includes('linkedin')) ? `<span>Add their email or phone so you can follow up.</span>` : ''}</div>`
      : `<span>Nothing new found. Check the text and try again.</span>`;
    r.hidden = false;
    if (map === CAP_FIELDS && filled.includes('linkedin') && miss.length === 2) {
      capAsk();
      return filled;
    }
  }
  const first = ['name', 'email', 'phone'].map(k => map[k] && $('#' + map[k])).find(el => el && !el.value);
  if (first && filled.length) first.focus({ preventScroll: true });
  return filled;
};
capPreview = function (o) {
  const lab = [
    ['name', 'Name', 'user'],
    ['role', 'Job title', 'brief'],
    ['company', 'Company', 'building'],
    ['email', 'Email', 'mail'],
    ['email2', 'Email 2', 'mail'],
    ['phone', 'Phone', 'phone'],
    ['phone2', 'Phone 2', 'phone'],
    ['website', 'Website', 'globe'],
    ['linkedin', 'LinkedIn', 'li'],
    ['address', 'Address', 'pin'],
    ['social', 'Social', 'link']
  ];
  const rows = lab.filter(([k]) => o[k]);
  return rows.length
    ? `<div class="cap-pv">${rows.map(([k, l, ic]) => `<div>${sv(ic, 14)}<span>${l}</span><b>${esc(o[k])}</b></div>`).join('')}</div>`
    : '<p class="cap-empty">Paste a LinkedIn link, an email signature or contact details. We will pick out the name, email, phone, job title, company, website and address.</p>';
};
function capMoreHTML() {
  const f = (id, l, ph, t) =>
    `<label class="x-f"><span>${l}</span><input id="${id}" ${t || ''} autocomplete="off" placeholder="${ph}"></label>`;
  return `<details class="cap-more" id="capmore"><summary>${sv('plus', 14)}<span>More details</span><small>Second phone, website, address</small></summary><div class="cap-more-g">${f('tp2', 'Second phone', 'Office or other number', 'type="tel" inputmode="tel"')}${f('te2', 'Second email', 'Other email', 'type="email" inputmode="email"')}${f('tws', 'Website', 'company.com', 'inputmode="url"')}${f('tso', 'Social', '@handle or profile link', '')}</div>${f('tad', 'Address', 'Office address', '')}</details>`;
}
capStrip = function () {
  const ct = 'contacts' in navigator && 'select' in (navigator.contacts || {});
  return `<div class="cap cap2"><div class="cap2-h"><span class="cap2-badge">${sv('spark', 14)}</span><div><b>Capture in seconds</b><small>Scan or paste. We fill the form for you.</small></div></div>
 <button type="button" class="cap2-hero" onclick="capCard()"><span class="cap2-hi">${sv('photo', 22)}</span><span class="cap2-ht"><b>Scan a business card</b><small>Name, job title, company, phones, email, website and address</small></span><span class="cap2-ch">${sv('chev', 18)}</span></button>
 <div class="cap2-row"><button type="button" onclick="capScanQR()"><span>${sv('qr', 20)}</span>Scan QR</button><button type="button" onclick="capPaste()"><span>${sv('link', 20)}</span>Paste link</button><button type="button" onclick="${ct ? 'capContacts()' : 'capContactsHelp()'}"><span>${sv('contact', 20)}</span>Contacts</button></div>
 <div class="cap-res" id="capres" role="status" aria-live="polite" hidden></div></div>`;
};
const _vTap31 = vTap;
vTap = function () {
  let h = _vTap31();
  if (h.includes('id="tln"') && !h.includes('id="capmore"')) {
    h = h.replace(/(<label class="x-f t-li">[\s\S]*?<\/label>)/, '$1' + capMoreHTML());
  }
  return h;
};
/* ---- business card flow ---- */
let CAPW = null,
  CAPCARD = null;
async function capWorker() {
  await capLoad(
    'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',
    () => window.Tesseract
  );
  if (!CAPW)
    CAPW = Tesseract.createWorker('eng', 1, {
      logger: m => {
        if (window._capLog) window._capLog(m);
      }
    })
      .then(async w => {
        await w.setParameters({ tessedit_pageseg_mode: '11', preserve_interword_spaces: '1' });
        return w;
      })
      .catch(e => {
        CAPW = null;
        throw e;
      });
  return CAPW;
}
capCard = function (side) {
  const back = side === 'back';
  modal(`<div class="cap-m cc"><div class="row between"><h3>${back ? 'Scan the back of the card' : 'Scan a business card'}</h3><button class="x" aria-label="Close" onclick="closeModal()">&times;</button></div>
 <div class="cc-ill" aria-hidden="true"><div class="cc-card"><i></i><b></b><b></b><b></b><s></s></div><span class="cc-c tl"></span><span class="cc-c tr"></span><span class="cc-c bl"></span><span class="cc-c br"></span></div>
 <ul class="cc-tips"><li>${sv('check', 14, 'currentColor', 2.4)}Lay the card flat in good light</li><li>${sv('check', 14, 'currentColor', 2.4)}Fill most of the photo with the card</li><li>${sv('check', 14, 'currentColor', 2.4)}Hold steady so the text is sharp</li></ul>
 <label class="cap-btn">${sv('photo', 18)} Take a photo<input type="file" accept="image/*" capture="environment" hidden onchange="capCardRun(this.files&&this.files[0],${back})"></label>
 <label class="cap-btn2">${sv('grid', 16)} Choose from gallery<input type="file" accept="image/*" hidden onchange="capCardRun(this.files&&this.files[0],${back})"></label>
 <p class="cc-pv">${sv('lock', 13)} Read on your device. The photo is not uploaded or kept.</p></div>`);
  capWorker().catch(() => {});
};
function capPrepCanvas(src, rot) {
  const w0 = src.naturalWidth || src.width,
    h0 = src.naturalHeight || src.height;
  const s = Math.min(2.5, 1800 / Math.max(w0, h0));
  const w = Math.round(w0 * s),
    h = Math.round(h0 * s);
  const c = document.createElement('canvas');
  const rt = rot % 180 !== 0;
  c.width = rt ? h : w;
  c.height = rt ? w : h;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.translate(c.width / 2, c.height / 2);
  x.rotate((rot * Math.PI) / 180);
  x.drawImage(src, -w / 2, -h / 2, w, h);
  x.setTransform(1, 0, 0, 1, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height),
    p = d.data,
    n = p.length / 4,
    hist = new Uint32Array(256),
    g = new Uint8ClampedArray(n);
  let cs = 0,
    cn = 0;
  const W = c.width,
    H = c.height;
  for (let i = 0; i < n; i++) {
    const v = ((p[i * 4] * 299 + p[i * 4 + 1] * 587 + p[i * 4 + 2] * 114) / 1000) | 0;
    g[i] = v;
    hist[v]++;
    const xx = i % W,
      yy = (i / W) | 0;
    if (xx > W * 0.2 && xx < W * 0.8 && yy > H * 0.2 && yy < H * 0.8) {
      cs += v;
      cn++;
    }
  }
  const pct = q => {
    let a = 0,
      t = n * q;
    for (let v = 0; v < 256; v++) {
      a += hist[v];
      if (a >= t) return v;
    }
    return 255;
  };
  const lo = pct(0.02),
    hi = pct(0.98),
    sc = 255 / Math.max(1, hi - lo),
    inv = cn && cs / cn < 110;
  for (let i = 0; i < n; i++) {
    let v = (g[i] - lo) * sc;
    v = v < 0 ? 0 : v > 255 ? 255 : v;
    if (inv) v = 255 - v;
    p[i * 4] = p[i * 4 + 1] = p[i * 4 + 2] = v;
  }
  x.putImageData(d, 0, 0);
  return c;
}
async function capLoadImg(f) {
  try {
    if (window.createImageBitmap) return await createImageBitmap(f, { imageOrientation: 'from-image' });
  } catch (_) {}
  return await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = URL.createObjectURL(f);
  });
}
function capStep(n, pct) {
  const s = $('#ccsteps');
  if (!s) return;
  [...s.children].forEach((li, i) => {
    li.className = i < n ? 'done' : i === n ? 'on' : '';
  });
  const b = $('#capbar');
  if (b && pct != null) b.style.width = Math.max(4, Math.min(100, pct)) + '%';
}
async function capCardRun(f, back) {
  if (!f) return;
  const url = URL.createObjectURL(f);
  modal(`<div class="cap-m cc"><h3>Reading the card</h3><div class="cc-scan"><img src="${url}" alt=""><i></i></div><div class="cap-prog"><i id="capbar"></i></div>
 <ol class="cc-steps" id="ccsteps"><li class="on">Preparing the photo</li><li>Loading the reader <small>(first time only)</small></li><li>Reading the text</li><li>Sorting the details</li></ol></div>`);
  const t0 = Date.now();
  try {
    capStep(0, 6);
    const img = await capLoadImg(f);
    let cv = capPrepCanvas(img, 0);
    capStep(1, 14);
    window._capLog = m => {
      if (m.status === 'recognizing text') {
        capStep(2, 30 + Math.round((m.progress || 0) * 60));
      } else {
        const b = $('#capbar');
        if (b) b.style.width = Math.max(14, Math.round((m.progress || 0) * 28)) + '%';
      }
    };
    const w = await capWorker();
    capStep(2, 30);
    let r = await w.recognize(cv);
    let best = { t: r.data.text || '', c: r.data.confidence || 0 };
    const letters = s => (s.match(/[A-Za-z]/g) || []).length;
    if (best.c < 55 || letters(best.t) < 15) {
      for (const rot of [90, 270, 180]) {
        const s = $('#ccsteps li.on');
        if (s) s.innerHTML = 'Trying another angle...';
        const r2 = await w.recognize(capPrepCanvas(img, rot));
        const c2 = r2.data.confidence || 0;
        if (c2 > best.c + 5 && letters(r2.data.text || '') >= letters(best.t)) {
          best = { t: r2.data.text, c: c2 };
        }
        if (best.c >= 60) break;
      }
    }
    window._capLog = null;
    capStep(3, 96);
    const txt = (best.t || '').trim();
    if (letters(txt) < 4) {
      closeModal();
      return capCardFail(url);
    }
    const prev = back && CAPCARD ? CAPCARD : null;
    const raw = prev ? prev.raw + '\n' + txt : txt;
    const o = parseCard(raw);
    if (prev) {
      Object.keys(prev.o).forEach(k => {
        if (prev.o[k] && !['raw', 'source'].includes(k)) o[k] = prev.o[k];
      });
    }
    CAPCARD = {
      raw,
      o,
      img: prev ? prev.img : url,
      back: prev ? url : '',
      secs: Math.round((Date.now() - t0) / 100) / 10,
      conf: Math.round(best.c)
    };
    capStep(4, 100);
    setTimeout(capReview, 180);
  } catch (e) {
    window._capLog = null;
    closeModal();
    toast('Could not read the card. Check your connection and try again.');
  }
}
function capCardFail(url) {
  modal(
    `<div class="cap-m cc"><div class="row between"><h3>We could not read that photo</h3><button class="x" aria-label="Close" onclick="closeModal()">&times;</button></div><div class="cc-scan off"><img src="${url}" alt=""></div><p class="fu-sub">Try again closer, with more light and the card filling the photo. Glossy cards read best without a flash.</p><div class="cc-b"><button type="button" class="cap-btn" onclick="capCard()">${sv('photo', 18)} Try again</button><button type="button" class="cap-btn2" onclick="closeModal();capPaste()">Type or paste instead</button></div></div>`
  );
}
const CR_F = [
  ['name', 'Name', 'user', 'text'],
  ['role', 'Job title', 'brief', 'text'],
  ['company', 'Company', 'building', 'text'],
  ['email', 'Email', 'mail', 'email'],
  ['phone', 'Mobile / phone', 'phone', 'tel'],
  ['phone2', 'Second phone', 'phone', 'tel'],
  ['email2', 'Second email', 'mail', 'email'],
  ['website', 'Website', 'globe', 'url'],
  ['linkedin', 'LinkedIn', 'li', 'url'],
  ['address', 'Address', 'pin', 'text'],
  ['social', 'Social', 'link', 'text'],
  ['notes', 'Note', 'spark', 'text']
];
function capReview() {
  const C = CAPCARD;
  if (!C) return;
  const o = C.o;
  const found = CR_F.filter(([k]) => o[k]).length;
  const main = ['name', 'role', 'company', 'email', 'phone'];
  const row = ([k, l, ic, t]) =>
    `<label class="cr-r${o[k] ? '' : ' empty'}"><span class="cr-l">${sv(ic, 15)}${l}</span><input id="cr_${k}" type="${t === 'email' ? 'email' : t === 'tel' ? 'tel' : 'text'}" ${t === 'email' ? 'inputmode="email" autocapitalize="off"' : t === 'tel' ? 'inputmode="tel"' : t === 'url' ? 'inputmode="url" autocapitalize="off"' : ''} value="${esc(o[k] || '')}" placeholder="${o[k] ? '' : 'Not found - add it'}" autocomplete="off"></label>`;
  const shown = CR_F.filter(([k]) => main.includes(k) || o[k]),
    hidden = CR_F.filter(([k]) => !main.includes(k) && !o[k]);
  modal(`<div class="cap-m cr"><div class="cr-top"><div class="cr-imgs"><img src="${C.img}" alt="Front of card">${C.back ? `<img src="${C.back}" alt="Back of card">` : ''}</div><div class="cr-tt"><h3>Check the details</h3><p>${found} detail${found === 1 ? '' : 's'} found. Tap any field to fix it.</p></div><button class="x" aria-label="Close" onclick="closeModal()">&times;</button></div>
 <div class="cr-f">${shown.map(row).join('')}${hidden.length ? `<details class="cr-more"><summary>${sv('plus', 14)} Add more fields</summary>${hidden.map(row).join('')}</details>` : ''}</div>
 <details class="cr-raw"><summary>Show the text we read</summary><pre>${esc(C.raw)}</pre></details>
 <div class="cr-b"><button type="button" class="cap-btn" onclick="capReviewUse()">${sv('check', 16, 'currentColor', 2.4)} Use these details</button><div class="cr-b2">${C.back ? '' : `<button type="button" class="cap-btn2" onclick="capReviewKeep();capCard('back')">${sv('card', 16)} Add the back</button>`}<button type="button" class="cap-btn2" onclick="CAPCARD=null;capCard()">${sv('photo', 16)} Retake</button></div></div></div>`);
}
function capReviewKeep() {
  if (!CAPCARD) return;
  CR_F.forEach(([k]) => {
    const e = $('#cr_' + k);
    if (e) CAPCARD.o[k] = e.value.trim();
  });
}
function capReviewUse() {
  capReviewKeep();
  const o = Object.assign({}, CAPCARD.o, { source: 'business card' });
  ['phone', 'phone2'].forEach(k => {
    if (o[k]) o[k] = normPhone(o[k]) || o[k];
  });
  if (o.linkedin) {
    const r = liFromUrl(o.linkedin);
    o.linkedin = r ? r.url : '';
  }
  closeModal();
  CAPCARD = null;
  const fm = $('.t-form') || $('#tn');
  capApply(o);
  const r = $('#capres');
  if (r && r.scrollIntoView) r.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
/* ---- contacts: every field the phone shares, and a .vcf fallback ---- */
capContacts = async function () {
  try {
    let props = ['name', 'email', 'tel', 'address'];
    try {
      const sup = await navigator.contacts.getProperties();
      props = props.filter(p => sup.includes(p));
    } catch (_) {
      props = ['name', 'email', 'tel'];
    }
    const r = await navigator.contacts.select(props, { multiple: false });
    if (!r || !r[0]) return;
    const c = r[0];
    const tels = [...new Set((c.tel || []).map(normPhone).filter(Boolean))];
    const ems = [...new Set((c.email || []).filter(Boolean))];
    const a = (c.address || [])[0];
    const addr = a
      ? [...(a.addressLine || []), a.city, a.region, a.postalCode, a.country].filter(Boolean).join(', ')
      : '';
    capApply({
      name: (c.name || [])[0] || '',
      email: ems[0] || '',
      email2: ems[1] || '',
      phone: tels[0] || '',
      phone2: tels[1] || '',
      address: addr,
      source: 'your contacts'
    });
  } catch (e) {
    toast('Could not open your contacts.');
  }
};
function capContactsHelp() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  modal(`<div class="cap-m cc"><div class="row between"><h3>Add from your contacts</h3><button class="x" aria-label="Close" onclick="closeModal()">&times;</button></div>
 <p class="fu-sub">${ios ? 'Safari does not let websites open your contacts directly, so share the contact card here instead. It takes a few seconds.' : 'This browser does not let websites open your contacts directly. Share the contact card here instead.'}</p>
 <ol class="cc-how"><li>Open the person in your <b>Contacts</b> app</li><li>Tap <b>Share contact</b>${ios ? ' and choose <b>Save to Files</b>' : ' and save the .vcf file'}</li><li>Come back and tap the button below</li></ol>
 <label class="cap-btn">${sv('contact', 18)} Choose a contact card (.vcf)<input type="file" accept=".vcf,text/vcard,text/x-vcard,text/directory" hidden onchange="capVcfFile(this)"></label>
 <button type="button" class="cap-btn2" onclick="closeModal();capPaste()">Paste their details instead</button>${ios ? `<p class="cc-pv">Tip: on iPhone you can also turn on Contact Picker in Settings, Apps, Safari, Advanced, Feature Flags.</p>` : ''}</div>`);
}
function capVcfFile(inp) {
  const f = inp.files && inp.files[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    const t = String(rd.result || '');
    const o = parseContact(t);
    closeModal();
    if (!o.name && !o.email && !o.phone) {
      toast('That file has no contact details');
      return;
    }
    o.source = 'contact card';
    capApply(o);
  };
  rd.readAsText(f);
}
/* QR results: show extra fields too */
const _qrRes31 = capQRResult;
capQRResult = function (t) {
  return _qrRes31(t);
};

/* extras on Threads: second phone/email, website, address, social */
const _vThread31 = vThread;
vThread = function (id) {
  let h = _vThread31(id);
  const t = findThread(id);
  if (!t) return h;
  tMeta(t);
  const o = t.other || {};
  const add =
    (o.phone2 ? `<li>${sv('phone', 16)}<a href="tel:${esc(o.phone2)}">${esc(o.phone2)}</a></li>` : '') +
    (o.email2 ? `<li>${sv('mail', 16)}<a href="mailto:${esc(o.email2)}">${esc(o.email2)}</a></li>` : '') +
    (o.website
      ? `<li>${sv('globe', 16)}<a href="${esc(/^https?:/.test(o.website) ? o.website : 'https://' + o.website)}" target="_blank" rel="noopener">${esc(o.website.replace(/^https?:\/\/(www\.)?/, ''))}</a></li>`
      : '') +
    (o.address
      ? `<li>${sv('pin', 16)}<a href="https://maps.google.com/?q=${encodeURIComponent(o.address)}" target="_blank" rel="noopener">${esc(o.address)}</a></li>`
      : '') +
    (o.social ? `<li>${sv('link', 16)}<span>${esc(o.social)}</span></li>` : '');
  return add ? h.replace('<ul class="td-facts">', '<ul class="td-facts">' + add) : h;
};
tapVcf = function (o) {
  const x = Object.assign({}, o, window._capLast || {});
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:' + x.name,
    x.role ? 'TITLE:' + x.role : '',
    x.company ? 'ORG:' + x.company : '',
    x.email ? 'EMAIL:' + x.email : '',
    x.email2 ? 'EMAIL:' + x.email2 : '',
    x.phone ? 'TEL;TYPE=CELL:' + x.phone : '',
    x.phone2 ? 'TEL;TYPE=WORK:' + x.phone2 : '',
    x.linkedin ? 'URL:' + x.linkedin : '',
    x.website ? 'URL:' + x.website : '',
    x.address ? 'ADR;TYPE=WORK:;;' + x.address.replace(/;/g, ',') + ';;;;' : '',
    'NOTE:Met via Introthread' + (o.where ? ' at ' + o.where : ''),
    'END:VCARD'
  ]
    .filter(Boolean)
    .join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines], { type: 'text/vcard' }));
  a.download = (x.name || 'contact').replace(/\s+/g, '-') + '.vcf';
  document.body.appendChild(a);
  a.click();
  a.remove();
};
const _bVcf31 = bExportVcf;
bExportVcf = function () {
  const T = myThreads();
  T.forEach(tMeta);
  const orig = window.Blob;
  window.Blob = function (parts, opt) {
    if (opt && opt.type === 'text/vcard' && parts && typeof parts[0] === 'string') {
      parts = [
        parts[0]
          .split('END:VCARD')
          .map((c, k) => {
            const t = T[k];
            if (!t || !c.trim()) return c;
            const o = t.other || {};
            return (
              c +
              (o.phone2 ? 'TEL;TYPE=WORK:' + o.phone2 + '\r\n' : '') +
              (o.email2 ? 'EMAIL:' + o.email2 + '\r\n' : '') +
              (o.website ? 'URL:' + o.website + '\r\n' : '') +
              (o.address ? 'ADR;TYPE=WORK:;;' + o.address.replace(/;/g, ',') + ';;;;\r\n' : '')
            );
          })
          .join('END:VCARD')
      ];
    }
    return new orig(parts, opt);
  };
  try {
    _bVcf31();
  } finally {
    window.Blob = orig;
  }
};
const _bCsv31 = bExportThreads;
bExportThreads = function () {
  const T = myThreads();
  T.forEach(tMeta);
  const orig = window.Blob;
  window.Blob = function (parts, opt) {
    if (opt && opt.type === 'text/csv') {
      const rows = parts[0].replace(/^\ufeff/, '').split('\n');
      const q = v => `"${String(v || '').replace(/"/g, '""')}"`;
      parts = [
        '\ufeff' +
          rows
            .map((r, i) => {
              if (i === 0) return r + ',"Phone 2","Email 2","Website","Address","Social"';
              const o = (T[i - 1] || {}).other || {};
              return r + ',' + [o.phone2, o.email2, o.website, o.address, o.social].map(q).join(',');
            })
            .join('\n')
      ];
    }
    return new orig(parts, opt);
  };
  try {
    _bCsv31();
  } finally {
    window.Blob = orig;
  }
};
const _tdEdit31 = tdEdit;
tdEdit = function (id) {
  _tdEdit31(id);
  const t = findThread(id);
  if (!t) return;
  const g = document.querySelector('.modal .t-g2');
  const o = t.other || {};
  if (g)
    g.insertAdjacentHTML(
      'beforeend',
      `<label class="x-f"><span>Second phone</span><input id="tep2" type="tel" value="${esc(o.phone2 || '')}" maxlength="30"></label><label class="x-f"><span>Website</span><input id="tews" value="${esc(o.website || '')}" maxlength="200"></label><label class="x-f"><span>Address</span><input id="tead" value="${esc(o.address || '')}" maxlength="200"></label>`
    );
};
const _tdSave31 = tdEditSave;
tdEditSave = async function (e, id) {
  const t = findThread(id);
  const g = k => (($('#' + k) || {}).value || '').trim();
  const x = { phone2: normPhone(g('tep2')) || g('tep2'), website: g('tews'), address: g('tead') };
  const r = await _tdSave31.call(this, e, id);
  if (t && $('#tep2') !== undefined) {
    Object.assign(t.other, x);
    if (cloud())
      await upd('threads', id, { where_met: tPack(t.where, Object.assign({}, t.other, { src: t.src })) });
    save();
    window._keepScroll = true;
    render();
  }
  return r;
};
