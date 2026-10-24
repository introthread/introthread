// Introthread - Profile photo upload (v101): upBox, shrinkImg, pickPhoto, removePhoto, _phBusy, applyPhoto and
// the sign-up su3 wrapper that keeps the chosen photo until the account exists. Moved out of js/app-core.js unchanged and
// in their original order (cleanup plan step 6). Sits next to photo-crop.js in the js folder, but loads straight after
// app-core.js: admin-audit.js replaces pickPhoto with the crop version while loading, so this file must load before it,
// and the su3 wrapper must still come after the sign-up versions of su3 in app-core.js. The render wrapper in
// app-core.js calls applyPhoto only at run time; auth-pages.js and admin-audit.js use upBox only at run time.

/* profile photo */
function upBox() {
  const has = !!SU.photo;
  return `<label class="x-up-in">${has ? `<img src="${SU.photo}" alt="">` : `<span class="x-up-ph">${sv('user', 26)}</span>`}<span class="x-up-t"><b>${has ? 'Change photo' : 'Upload a photo'}</b><small>JPG, PNG or WebP (max 5MB)</small></span><input type="file" accept="image/jpeg,image/png,image/webp" data-on-change="pickPhoto(this)"></label>${has ? `<button type="button" class="x-up-rm" data-on-click="suPhotoClear()">Remove</button>` : ''}`;
}
function shrinkImg(file) {
  return new Promise((res, rej) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return rej('Please choose a JPG, PNG or WebP image.');
    if (file.size > 5 * 1024 * 1024) return rej('That image is over 5MB. Please choose a smaller one.');
    const r = new FileReader();
    r.onerror = () => rej('Could not read that file.');
    r.onload = () => {
      const im = new Image();
      im.onerror = () => rej('Could not read that image.');
      im.onload = () => {
        const s = Math.min(im.width, im.height),
          S = 320,
          c = document.createElement('canvas');
        c.width = c.height = S;
        const x = c.getContext('2d');
        x.imageSmoothingQuality = 'high';
        x.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, S, S);
        let q = 0.85,
          d = c.toDataURL('image/jpeg', q);
        while (d.length > 70000 && q > 0.5) {
          q -= 0.1;
          d = c.toDataURL('image/jpeg', q);
        }
        res(d);
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  });
}
async function pickPhoto(inp, live) {
  const f = inp.files && inp.files[0];
  if (!f) return;
  try {
    const d = await shrinkImg(f);
    if (live) {
      const u = me();
      const links = Object.assign({}, u.links || {}, { photo: d });
      if (await upd('profiles', u.id, { links })) {
        u.links = links;
        u.photo = d;
        save();
        toast('Photo updated');
        window._keepScroll = true;
        render();
      }
    } else {
      SU.photo = d;
      $('#xup').innerHTML = upBox();
      liveP();
    }
  } catch (e) {
    toast(typeof e === 'string' ? e : 'Could not use that image.');
  }
}
async function removePhoto() {
  const u = me();
  const links = Object.assign({}, u.links || {});
  delete links.photo;
  if (await upd('profiles', u.id, { links })) {
    u.links = links;
    u.photo = null;
    save();
    toast('Photo removed');
    window._keepScroll = true;
    render();
  }
}
let _phBusy = false;
async function applyPhoto() {
  const ph = localStorage.getItem('it_photo');
  const u = me();
  if (!ph || !u || _phBusy || typeof cloud !== 'function' || !cloud()) return;
  if (u.photo === ph) {
    localStorage.removeItem('it_photo');
    return;
  }
  _phBusy = true;
  const links = Object.assign({}, u.links || {}, { photo: ph });
  if (await upd('profiles', u.id, { links })) {
    u.links = links;
    u.photo = ph;
    save();
    localStorage.removeItem('it_photo');
    render();
  }
  _phBusy = false;
}
const _su3x = su3;
su3 = async function () {
  try {
    if (SU.photo) localStorage.setItem('it_photo', SU.photo);
  } catch (e) {}
  return _su3x.apply(this, arguments);
};
