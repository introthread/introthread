// Introthread - Small app fixes kept in their original order: v18 keep the loading screen on hard refresh, v20 invoice layout and A4 print, v23 public card shape and taps.
// Moved out of index.html in v52 (code split step 4). Load order matters: see the <script> list at the end of index.html.

/* v18 hard refresh while signed in: keep the loading screen until the saved session is restored, never flash the login page */
const itHasSess = () => {
  try {
    return Object.keys(localStorage).some(k => /^sb-.*-auth-token$/.test(k));
  } catch (_) {
    return false;
  }
};
var IT_BOOTED =
  !(typeof SB !== 'undefined' && SB) || !itHasSess() || (typeof MODE !== 'undefined' && MODE === 'demo');
if (!IT_BOOTED) {
  const fin = () => {
    if (IT_BOOTED) return;
    IT_BOOTED = true;
    render();
  };
  setTimeout(fin, 8000);
  SB.auth
    .getSession()
    .then(async ({ data }) => {
      const s = data && data.session;
      if (s) {
        let n = 0;
        while (!me() && n++ < 70) await new Promise(r => setTimeout(r, 100));
      }
      fin();
    })
    .catch(fin);
}
const _renderBoot = render;
render = function () {
  if (!IT_BOOTED && !me() && /^\/app(\/|$)/.test(location.pathname)) {
    try {
      $('#root').innerHTML = itSplash();
    } catch (_) {}
    return;
  }
  return _renderBoot.apply(this, arguments);
};

const _mnav19 = mnav;
mnav = function () {
  let h = _mnav19.apply(this, arguments);
  return me() ? h.replace('class="x-nav-r"', 'class="x-nav-r it-in"') : h;
};

/* v20 invoice: international layout details + clean A4 print (no browser header/footer) */
const INV_SELLER = { legal: 'Introthread Ltd', address: '', companyNo: '', vatNo: '' };
const _bInvHTML20 = bInvHTML;
bInvHTML = function (i) {
  let h = _bInvHTML20.apply(this, arguments);
  const u = me() || {};
  const paid = i.status === 'paid',
    cur = i.currency || 'USD';
  const extra = `<div><dt>Payment terms</dt><dd>${paid ? 'Paid in full' : 'Due on receipt'}</dd></div><div><dt>Currency</dt><dd>${esc(cur)}</dd></div>${u.handle ? `<div><dt>Customer ID</dt><dd>${esc(u.handle)}</dd></div>` : ''}`;
  h = h.replace(/(<div class="iv-title"><h2>Invoice<\/h2><dl>[\s\S]*?)(<\/dl>)/, '$1' + extra + '$2');
  if (INV_SELLER.address) h = h.replace('London &middot; New York<br>', esc(INV_SELLER.address) + '<br>');
  if (INV_SELLER.vatNo)
    h = h.replace(
      'www.introthread.com</address>',
      'www.introthread.com<br>VAT no. ' + esc(INV_SELLER.vatNo) + '</address>'
    );
  const legal = [
    INV_SELLER.legal,
    INV_SELLER.companyNo ? 'Company no. ' + INV_SELLER.companyNo : '',
    INV_SELLER.vatNo ? 'VAT no. ' + INV_SELLER.vatNo : '',
    'billing@introthread.com',
    'www.introthread.com'
  ]
    .filter(Boolean)
    .map(esc)
    .join(' &middot; ');
  const fin = `<div class="iv-legal"><span>${legal}</span><span>${esc(i.number)} &middot; Page 1 of 1</span></div>`;
  const k = h.lastIndexOf('</article>');
  return k > 0 ? h.slice(0, k) + fin + h.slice(k) : h + fin;
};
const _bInvPrint20 = bInvPrint;
bInvPrint = function (id) {
  const o = window.open;
  window.open = function () {
    const w = o.apply(window, arguments);
    if (!w) return w;
    const dw = w.document.write.bind(w.document);
    w.document.write = function (x) {
      return dw(
        String(x)
          .replace('@page{size:A4;margin:14mm}', '@page{size:A4;margin:0}')
          .replace(
            'body{padding:0;margin:0}',
            'body{padding:16mm 17mm 14mm;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.iv{min-height:calc(297mm - 30mm);display:flex;flex-direction:column}.iv .iv-legal{margin-top:auto}'
          )
      );
    };
    return w;
  };
  try {
    return _bInvPrint20.apply(this, arguments);
  } finally {
    window.open = o;
  }
};

/* v23 public card: business-card shape on laptops + accessible tap-to-flip (back shows a large QR and the link) */
let PCF = false;
function pcFlip(on) {
  const f = document.getElementById('pcflip');
  if (!f) return;
  PCF = typeof on === 'boolean' ? on : !PCF;
  f.classList.toggle('on', PCF);
  const fr = f.querySelector('.pc-front'),
    bk = f.querySelector('.pc-back');
  if (fr) {
    fr.inert = PCF;
    fr.setAttribute('aria-hidden', PCF ? 'true' : 'false');
  }
  if (bk) {
    bk.inert = !PCF;
    bk.setAttribute('aria-hidden', PCF ? 'false' : 'true');
  }
  f.querySelectorAll('.pc-flipbtn').forEach(b => b.setAttribute('aria-pressed', PCF ? 'true' : 'false'));
  const t = f.querySelector(PCF ? '.pc-back .pc-flipbtn' : '.pc-front .pc-flipbtn');
  if (t && typeof on !== 'boolean') t.focus({ preventScroll: true });
}
function pcTap(e) {
  if (e.target.closest('a,button,input,textarea,select,label')) return;
  if (window.getSelection && String(window.getSelection()).length) return;
  pcFlip();
}
const _vPub23 = vPublic;
vPublic = function (hd) {
  let h = _vPub23.apply(this, arguments);
  const a = h.indexOf('<article class="pc-card');
  if (a < 0) return h;
  const b = h.indexOf('</article>', a);
  if (b < 0) return h;
  const u = DB.users.find(x => String(x.handle || '').toLowerCase() === String(hd).toLowerCase());
  if (!u) return h;
  PCF = false;
  const url = profileUrl(u),
    short = 'introthread.com/' + esc(u.handle),
    f = esc((u.name || '').split(' ')[0] || 'me');
  const open = h.slice(a, h.indexOf('>', a) + 1),
    style = (open.match(/style="([^"]*)"/) || [])[1] || '',
    lt = /\blt\b/.test(open) ? ' lt' : '';
  let front = h
    .slice(a, b + 10)
    .replace(
      '<article class="pc-card',
      '<article class="pc-card pc-front" data-on-click="pcTap(event)" aria-hidden="false"'
    );
  const flipBtn = k =>
    `<button type="button" class="pc-flipbtn" data-on-click="pcFlip()" aria-pressed="false" aria-controls="pcflip" title="${k ? 'Show the front' : 'Show the QR code'}">${sv(k ? 'user' : 'qr', 15)}<span>${k ? 'Front' : 'Flip for QR'}</span></button>`;
  front = front.replace(
    '</article>',
    `<div class="pc-fqr" aria-hidden="true"><div class="pc-fqr-b"><div id="pcqr1"></div><span class="t-qrlogo"><span class="x-lm"><i></i><i></i></span></span></div><small>Scan to connect</small></div>${flipBtn(0)}</article>`
  );
  const back = `<article class="pc-card pc-back${lt}" style="${style}" data-on-click="pcTap(event)" aria-hidden="true" aria-label="Card back with QR code"><div class="pc-top"><span class="x-logo${lt ? '' : ' dk'}"><span class="x-lm"><i></i><i></i></span><span>intro<b>thread</b></span></span>${flipBtn(1)}</div>
  <div class="pc-bq"><div class="pc-bq-b"><div id="pcqr2"></div><span class="t-qrlogo"><span class="x-lm"><i></i><i></i></span></span></div></div>
  <p class="pc-bt">Scan to connect with ${f}</p><button type="button" class="pc-blink" data-on-click="copy('${url}','Link copied')">${short} ${sv('copy', 15)}</button><p class="pc-bh2">Point a phone camera at the code. No app needed.</p></article>`;
  h =
    h.slice(0, a) +
    `<div class="pc-flip" id="pcflip"><div class="pc-flip-in">${front}${back}</div></div>` +
    h.slice(b + 10);
  setTimeout(() => {
    const e1 = document.getElementById('pcqr1'),
      e2 = document.getElementById('pcqr2');
    try {
      if (e1 && !e1.childNodes.length) qr(e1, url, 150);
      if (e2 && !e2.childNodes.length) qr(e2, url, 240);
    } catch (_) {}
    const bk = document.querySelector('#pcflip .pc-back');
    if (bk) bk.inert = true;
  }, 0);
  return h;
};
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && PCF && document.getElementById('pcflip')) pcFlip(false);
});
