// Introthread - NFC cards (v133). One panel for the Tap screen's NFC option: what a tap does, how many times the
// member's card has been tapped, writing a card on Android (Pro), writing it with the free NFC Tools app on iPhone,
// and buying a print-ready card (KES 199, Paystack; emailed PDF since v141, nothing posted). The card link ends in ?src=nfc: the public card then
// counts the tap (/api/card-tap) and opens at "Start a Thread". Needs migration 022 for tap counts and orders.
const NFC_CARD_KES = 199;
function nfcLink(u) {
  return profileUrl(u) + '?src=nfc';
}
function nfcOpen() {
  const u = me();
  if (!u) return;
  const android = 'NDEFReader' in window;
  const opt = (fn, icon, b, s) =>
    `<button type="button" class="nfc-o" data-on-click="${fn}"><span class="nfc-oi">${sv(icon, 20)}</span><span><b>${b}</b><small>${s}</small></span>${sv('chev', 16)}</button>`;
  modal(
    `<div class="nfc-p"><div class="row between"><h3>Your Introthread NFC card</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div><p class="fu-sub">Tap your Introthread card on their phone. Their phone opens your card, where they can save your contact or start a Thread with you. They need no app.</p><p class="nfc-taps" id="nfcTaps" hidden></p><div id="nfcDl" hidden></div><div class="nfc-os">${opt('nfcOrder()', 'send', 'Get a print-ready card, KES ' + NFC_CARD_KES, 'We email you a PDF of your card with your QR code. Print it anywhere.')}${opt('closeModal();tapNFC()', 'nfc', 'Write my own card' + (android ? '' : ' (Android)'), android ? 'Pro. Hold a blank NFC card to the back of your phone.' : 'Pro. Works in Chrome on Android phones.')}${opt('nfcIphone()', 'phone', 'On iPhone: write it with NFC Tools', 'Free app, takes about a minute.')}</div><p class="small muted nfc-f">Any phone that reads NFC (most Android phones, iPhone XS and newer) opens your card when tapped. Phone-to-phone tapping is not possible from a web app.</p></div>`
  );
  nfcLoadTaps();
  nfcLoadOrders();
}
async function nfcLoadTaps() {
  if (!(typeof cloud === 'function' && cloud()) || typeof SB === 'undefined' || !SB) return;
  try {
    const { data, error } = await SB.rpc('my_card_taps');
    const el = document.getElementById('nfcTaps');
    if (error || !data || !el) return;
    el.hidden = false;
    el.textContent = data.total
      ? `Your card has been tapped ${data.total} ${data.total === 1 ? 'time' : 'times'} (${data.last30} in the last 30 days).`
      : 'No taps yet. Taps on your card show here.';
  } catch (e) {}
}
function nfcIphone() {
  const u = me();
  if (!u) return;
  const link = nfcLink(u);
  modal(
    `<div class="nfc-p"><div class="row between"><h3>Write your card on iPhone</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div><ol class="nfc-st"><li>Install <b>NFC Tools</b> (free) from the App Store.</li><li>Open it and choose <b>Write</b>, then <b>Add a record</b>, then <b>URL / URI</b>.</li><li>Paste your card link:<div class="nfc-l"><code>${esc(link)}</code><button type="button" class="t-how sm" data-on-click="copy('${esc(link)}','Card link copied')">Copy</button></div></li><li>Choose <b>Write</b> and hold a blank NFC card (NTAG213, 215 or 216) to the top of your iPhone.</li><li>Test it: tap the card on another phone. Your card should open.</li></ol><p class="small muted">iPhone XS or newer. Prefer not to? <button type="button" class="au-inl" data-on-click="nfcOrder()">Order a ready-programmed card</button>.</p></div>`
  );
}
function nfcOrder() {
  const u = me();
  if (!u) return;
  const f = (id, label, attr, val) =>
    `<label class="nfc-fl"><span>${label}</span><input id="${id}" ${attr} data-on-input="nfcPrev()" value="${esc(val || '')}"></label>`;
  const sub = [u.role, u.company].filter(Boolean).join(' \u00b7 ');
  // v142: live preview of the chip side of the printed card.
  const prev = `<div class="nfc-cp" aria-hidden="true"><div class="nfc-cv"><span class="nfc-cb">intro<b>thread</b></span><span class="nfc-cw"><i></i><i></i><i></i></span><span class="nfc-chip"><i></i></span><span class="nfc-cn" id="nfcPn">${esc(u.name || u.handle || 'Your name')}</span><span class="nfc-cs" id="nfcPs">${esc(sub)}</span></div><p class="small muted">Chip-card design: front with your name, back with your QR code. The chip is printed artwork; add an NFC sticker for real tapping.</p></div>`;
  modal(
    `<div class="nfc-p"><div class="row between"><h3>Get your print-ready card</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div><p class="fu-sub">A business card with your name and a QR code to your link (introthread.com/${esc(u.handle)}), emailed to you as a PDF to print at home or at any print shop. Nothing is posted, so it works wherever you are. <b>KES ${NFC_CARD_KES}</b>, paid securely through Paystack.</p>${prev}<form data-on-submit="return nfcPay(event)" class="nfc-form">${f('nfn', 'Name on the card', 'required maxlength="80" autocomplete="name"', u.name)}${f('nft', 'Title (optional)', 'maxlength="80"', u.role)}${f('nfc2', 'Company (optional)', 'maxlength="80" autocomplete="organization"', u.company)}<p class="err" id="nferr" role="alert"></p><button class="x-btn block">Pay KES ${NFC_CARD_KES}</button></form></div>`
  );
}
function nfcPrev() {
  const v = id => ((document.getElementById(id) || {}).value || '').trim();
  const n = document.getElementById('nfcPn'),
    s = document.getElementById('nfcPs');
  if (n) n.textContent = v('nfn') || 'Your name';
  if (s) s.textContent = [v('nft'), v('nfc2')].filter(Boolean).join(' \u00b7 ');
}
async function nfcPay(e) {
  e.preventDefault();
  const u = me(),
    v = id => (document.getElementById(id) || {}).value || '';
  const body = {
    kind: 'nfc_card',
    name: v('nfn').trim(),
    title: v('nft').trim(),
    company: v('nfc2').trim(),
    handle: u && u.handle
  };
  const err = document.getElementById('nferr');
  if (!body.name) {
    if (err) err.textContent = 'Enter the name to print on the card.';
    return false;
  }
  if (!(typeof cloud === 'function' && cloud())) {
    closeModal();
    nfcDownload({ name: body.name, title: body.title, company: body.company });
    toast('Demo account: card downloaded (no payment taken).');
    return false;
  }
  const b = e.target.querySelector('button');
  if (b) {
    b.disabled = true;
    b.textContent = 'Opening secure payment...';
  }
  const r = await itApi('pay-init', body);
  if (r && r.url) {
    location.href = r.url;
    return false;
  }
  if (b) {
    b.disabled = false;
    b.textContent = 'Pay KES ' + NFC_CARD_KES;
  }
  if (err)
    err.textContent =
      r && r.status === 503
        ? 'Card orders are not open yet. Email hello@introthread.com and we will arrange it.'
        : r && r.error === 'details'
          ? 'Please check the name on the card.'
          : 'Could not start the payment. Try again.';
  return false;
}
/* v141: printable card. Paid orders (card_orders, readable by their owner) unlock "Download your card" in the
   NFC panel. The PDF is built in the browser by js/card-pdf.js, the same file the server emails after payment. */
let NFC_ORDER = null;
async function nfcLoadOrders() {
  const el = document.getElementById('nfcDl');
  if (!el) return;
  if (typeof cloud === 'function' && cloud() && typeof SB !== 'undefined' && SB) {
    try {
      const { data } = await SB.from('card_orders')
        .select('name_on_card,title_on_card,status,created_at')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(1);
      NFC_ORDER = data && data[0] ? data[0] : null;
    } catch (e) {}
  }
  if (!NFC_ORDER) return;
  el.hidden = false;
  el.innerHTML = `<button type="button" class="x-btn block nfc-dl" data-on-click="nfcDownloadOrder()">${sv('send', 16)} Download your print-ready card (PDF)</button>`;
}
function nfcDownloadOrder() {
  const o = NFC_ORDER || {},
    u = me() || {};
  const [title, company] = String(o.title_on_card || '').split(' \u00b7 ');
  nfcDownload({ name: o.name_on_card || u.name, title: title || '', company: company || '' });
}
function nfcDownload(d) {
  const u = me();
  if (!u || typeof cardPdf !== 'function' || !window.qrcode)
    return toast('Could not build the PDF. Try again.');
  const s = cardPdf(
    {
      name: d.name || u.name,
      title: d.title,
      company: d.company,
      handle: u.handle,
      url: profileUrl(u) + '?src=card'
    },
    window.qrcode
  );
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([b], { type: 'application/pdf' }));
  a.download = 'introthread-card-' + u.handle + '.pdf';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => (URL.revokeObjectURL(a.href), a.remove()), 1000);
}
/* Public card opened from an NFC tap (?src=nfc): count the tap once per visit and open at "Start a Thread". */
let NFC_LANDED = '';
function nfcLanding(hd) {
  const q = new URLSearchParams(location.search);
  if (q.get('src') !== 'nfc' || !hd || NFC_LANDED === hd) return;
  NFC_LANDED = hd;
  const u = typeof me === 'function' ? me() : null;
  const own = u && u.handle && String(u.handle).toLowerCase() === String(hd).toLowerCase();
  let seen = false;
  try {
    seen = sessionStorage.getItem('it_tap_' + hd) === '1';
    sessionStorage.setItem('it_tap_' + hd, '1');
  } catch (e) {}
  if (!own && !seen)
    fetch('/api/card-tap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: hd })
    }).catch(() => {});
  let n = 0;
  const jump = () => {
    const s = document.getElementById('start');
    if (!s) {
      if (n++ < 20) setTimeout(jump, 200);
      return;
    }
    s.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const i = document.getElementById('gn');
    if (i)
      try {
        i.focus({ preventScroll: true });
      } catch (e) {}
  };
  setTimeout(jump, 300);
}
const _vPublic133 = vPublic;
vPublic = function (hd) {
  const html = _vPublic133.apply(this, arguments);
  try {
    nfcLanding(hd);
  } catch (e) {}
  return html;
};
