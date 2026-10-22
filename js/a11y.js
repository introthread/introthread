// Introthread - Accessibility helpers (v28, WCAG 2.2 AA): accessible names match visible text, no aria-label on
// <label>, clickable non-buttons reachable by keyboard. Runs after every render and on DOM changes.
// Moved out of index.html in v51 (code split step 3). Loaded after payments.js.

/* v28 WCAG: accessible names match visible text; no aria-label on <label>; clickable non-buttons reachable by keyboard */
function itA11y() {
  try {
    document
      .querySelectorAll(
        '[role=link][aria-label^="Open Thread with"],a.ro-img[aria-label],a.ro-up[aria-label],a.ro-card[aria-label]'
      )
      .forEach(e => e.removeAttribute('aria-label'));
    document.querySelectorAll('#root button:not([aria-label])').forEach(b => {
      if (!b.innerText.trim() && b.textContent.trim())
        b.setAttribute('aria-label', b.textContent.trim().replace(/\s+/g, ' ').slice(0, 60));
    });
    document.querySelectorAll('label[aria-label]').forEach(l => {
      const i = l.querySelector('input,select,textarea');
      if (i && !i.getAttribute('aria-label')) i.setAttribute('aria-label', l.getAttribute('aria-label'));
      l.removeAttribute('aria-label');
    });
    document
      .querySelectorAll(
        '#root [onclick]:not(a):not(button):not(input):not(select):not(textarea):not(label):not([tabindex])'
      )
      .forEach(e => {
        if (e.closest('button,a')) return;
        if (e.querySelector('button,a[href],input,select,textarea,[role=button],[role=link]')) return;
        e.setAttribute('tabindex', '0');
        if (!e.getAttribute('role')) e.setAttribute('role', 'button');
      });
  } catch (e) {}
}
document.addEventListener('keydown', e => {
  const t = e.target;
  if (
    (e.key === 'Enter' || e.key === ' ') &&
    t &&
    t.matches &&
    t.matches('[role=button][tabindex]:not(button),[role=link][tabindex]:not(a)') &&
    t.hasAttribute('onclick')
  ) {
    e.preventDefault();
    t.click();
  }
});
const _render28 = render;
render = function () {
  const r = _render28.apply(this, arguments);
  setTimeout(itA11y, 0);
  return r;
};
new MutationObserver(() => {
  clearTimeout(window._a11yT);
  window._a11yT = setTimeout(itA11y, 60);
}).observe(document.documentElement, { childList: true, subtree: true });
