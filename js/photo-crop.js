// Introthread - Profile photo crop dialog sizing (v32): shrink the picture until Save photo / Cancel fit in the
// window and every clipping box. The buttons themselves are in pcOpen's template in index.html.
// Moved out of index.html in v51 (code split step 3). Loaded after a11y.js. Test: tests/app/photo_crop.py.

/* v32 photo crop: measure, don't guess. Shrink the picture until Save photo/Cancel sit inside the window AND inside every box that could clip them; plus a Save button in the header that can never be pushed off */
function pcFit() {
  const m = document.querySelector('.pc-m');
  if (!m) return;
  const st = m.querySelector('.pc-stage'),
    acts = m.querySelector('.pc-acts'),
    zm = m.querySelector('.pc-zoom');
  if (!st || !acts) return;
  const set = v => {
    [st, zm].forEach(e => {
      if (!e) return;
      e.style.setProperty('width', v + 'px', 'important');
      e.style.setProperty('max-width', v + 'px', 'important');
      e.style.setProperty('min-width', '0', 'important');
    });
  };
  if (!m.querySelector('.pc-hsave')) {
    const x = m.querySelector('.row.between .x');
    if (x) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pcb pri pc-hsave';
      b.textContent = 'Save';
      b.setAttribute('aria-label', 'Save photo');
      b.onclick = () => pcUse();
      b.style.cssText =
        'height:36px!important;padding:0 14px!important;margin-left:auto;margin-right:8px;flex:none';
      x.parentNode.insertBefore(b, x);
    }
  }
  set(320);
  m.scrollTop = 0;
  const k = st.getBoundingClientRect().width / (st.offsetWidth || 1) || 1;
  for (let i = 0, v = 320; i < 14; i++) {
    const r = acts.getBoundingClientRect();
    let lim = window.innerHeight - 8;
    for (let p = acts.parentElement; p && p !== document.body; p = p.parentElement) {
      const c = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(c.overflowY)) {
        lim = Math.min(lim, p.getBoundingClientRect().bottom - 4);
      }
    }
    if (r.bottom <= lim || v <= 120) break;
    v = Math.max(120, Math.floor(v - (r.bottom - lim) / k - 2));
    set(v);
  }
  try {
    if (typeof pcDraw === 'function') pcDraw();
  } catch (e) {}
}
const _pcOpen31 = pcOpen;
pcOpen = function () {
  const r = _pcOpen31.apply(this, arguments);
  try {
    pcFit();
    requestAnimationFrame(pcFit);
    setTimeout(pcFit, 250);
  } catch (e) {}
  return r;
};
window.addEventListener('resize', () => {
  try {
    pcFit();
  } catch (e) {}
});
