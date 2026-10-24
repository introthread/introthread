// Introthread - Company logo on the card (v49). People upload their company logo in My card > Basic information.
// It is stored in profiles.links.logo (a small PNG/WebP data image, max 480 x 160) and shown on the card,
// the card preview and the public profile. Only png/jpeg/webp base64 data images are ever displayed.
// Since v117 the logo sits on a white (dark logo) or dark (light logo) backing so it never blends into the card;
// links.logoTone ('light' or 'dark') is set from the logo's brightness when it is uploaded.
// Loaded after install-prompt.js. Prefix cl.
const clOk = v =>
  typeof v === 'string' &&
  v.length < 700000 &&
  /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v);
function clOf(u) {
  let v = u && u.links && u.links.logo;
  if (!clOk(v)) {
    const m = typeof me === 'function' && me();
    if (m && u && (u.id === m.id || (u.handle && u.handle === m.handle))) v = m.links && m.links.logo;
  }
  return clOk(v) ? v : '';
}
/* v117: the logo sits on a small backing so it stays visible on every card style. Dark logos get a white backing,
   light logos (links.logoTone === 'light', worked out when the logo is uploaded) get a dark one. */
function clTone(u) {
  const m = typeof me === 'function' && me();
  const l = (u && u.links) || {};
  const t = l.logo
    ? l.logoTone
    : m && u && (u.id === m.id || (u.handle && u.handle === m.handle)) && m.links && m.links.logoTone;
  return t === 'light' ? 'light' : 'dark';
}
function clImg(u, cls) {
  const v = clOf(u);
  return v
    ? `<img class="${cls} cl-on-${clTone(u) === 'light' ? 'dk' : 'lt'}" src="${v}" alt="${esc((u.company || 'Company') + ' logo')}" decoding="async">`
    : '';
}
/* v117: average brightness of the logo's visible pixels, 0 (black) to 255 (white). */
function clBright(x, w, h) {
  try {
    const p = x.getImageData(0, 0, w, h).data;
    let s = 0,
      n = 0;
    for (let i = 0; i < p.length; i += 4) {
      if (p[i + 3] < 128) continue;
      s += 0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2];
      n++;
    }
    return n ? s / n : 0;
  } catch (e) {
    return 0;
  }
}
async function clPick(inp) {
  const f = inp && inp.files && inp.files[0];
  if (inp) inp.value = '';
  if (!f) return;
  if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return toast('Use a JPG, PNG or WebP image');
  if (f.size > 5 * 1024 * 1024) return toast('That image is over 5MB');
  const url = URL.createObjectURL(f);
  const im = new Image();
  im.onerror = () => {
    URL.revokeObjectURL(url);
    toast('Could not read that image');
  };
  im.onload = async () => {
    URL.revokeObjectURL(url);
    const k = Math.min(1, 480 / im.naturalWidth, 160 / im.naturalHeight);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(im.naturalWidth * k));
    c.height = Math.max(1, Math.round(im.naturalHeight * k));
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(im, 0, 0, c.width, c.height);
    let d = c.toDataURL('image/png');
    if (d.length > 300000) d = c.toDataURL('image/webp', 0.9);
    if (!clOk(d)) return toast('That image is too large. Try a smaller logo.');
    await clSave(d, clBright(x, c.width, c.height) > 200 ? 'light' : 'dark');
  };
  im.src = url;
}
async function clSave(d, tone) {
  const u = me();
  if (!u) return;
  const links = Object.assign({}, u.links || {});
  if (d) {
    links.logo = d;
    links.logoTone = tone === 'light' ? 'light' : 'dark';
  } else {
    delete links.logo;
    delete links.logoTone;
  }
  if (cloud() && !(await upd('profiles', u.id, { links }))) return;
  u.links = links;
  try {
    save();
  } catch (e) {}
  toast(d ? 'Company logo saved' : 'Company logo removed');
  window._keepScroll = true;
  render();
}
function clRemove() {
  clSave(null);
}
const _cdCard49 = cdCard;
cdCard = function (u) {
  let h = _cdCard49.apply(this, arguments);
  const img = clImg(u, 'cd-clogo');
  if (!img) return h;
  const i = h.indexOf('<div class="cd-id">');
  return i < 0 ? h : h.slice(0, i) + `<div class="cd-cl">${img}</div>` + h.slice(i);
};
/* vPublic step (v113): company-logo.js: company logo under the name. Called in order from vPublic in public-pages.js. */
function pcCompanyLogo(h, hd) {
  const u = DB.users.find(x => String(x.handle || '').toLowerCase() === String(hd || '').toLowerCase());
  if (!u || typeof h !== 'string') return h;
  const img = clImg(u, 'pc-clogo');
  if (!img) return h;
  const a = h.indexOf('<div class="pc-id">');
  if (a < 0) return h;
  const b = h.indexOf('</h1>', a);
  const c = b < 0 ? -1 : h.indexOf('</p>', b);
  if (c < 0) return h;
  return h.slice(0, c + 4) + `<div class="pc-cl">${img}</div>` + h.slice(c + 4);
}
const _vCard49 = vCard;
vCard = function () {
  let h = _vCard49.apply(this, arguments);
  const a = h.indexOf('<div class="cd-photo">');
  if (a < 0) return h;
  const end = '</div></div></div>';
  const b = h.indexOf(end, a);
  if (b < 0) return h;
  const u = me(),
    v = clOf(u);
  const blk = `<div class="cl-row"><div class="cl-prev">${v ? `<img class="cl-on-${clTone(u) === 'light' ? 'dk' : 'lt'}" src="${v}" alt="Your company logo">` : '<span>No logo</span>'}</div><div><b>Company logo</b><small>Shown on your card and public profile. A PNG with a transparent background works best (JPG, PNG or WebP, max 5MB).</small><div class="cd-pb"><label class="t-how sm">${sv('photo', 16)} ${v ? 'Change logo' : 'Upload logo'}<input type="file" hidden accept="image/png,image/jpeg,image/webp" data-on-change="clPick(this)"></label>${v ? `<button type="button" class="cd-rm" data-on-click="clRemove()">${sv('close', 15)} Remove</button>` : ''}</div></div></div>`;
  return h.slice(0, b + end.length) + blk + h.slice(b + end.length);
};
