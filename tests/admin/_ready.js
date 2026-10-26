// v139: wait for the jsdom page to be ready instead of sleeping for a fixed time.
// sl(ms) keeps its old call sites, but now waits until the page has loaded, the app's globals exist and
// the DOM has stopped changing for a short quiet window. Under a slow or busy machine it simply waits
// longer (up to a ceiling) instead of reading the page too early, which is what made the tests flaky.
// getW returns the jsdom window, or null before it exists.
module.exports = function mkSettle(getW, opts = {}) {
  const tick = ms => new Promise(r => setTimeout(r, ms));
  const CEIL = opts.ceiling || 8000;
  return async function settle(ms = 100) {
    let w = null;
    try {
      w = getW();
    } catch (e) {
      w = null;
    }
    const t0 = Date.now();
    if (!w || !w.document) return tick(ms);
    // 1. page parsed and scripts run
    while (w.document.readyState !== 'complete' || typeof w.render !== 'function') {
      if (Date.now() - t0 > CEIL) throw new Error('page not ready after ' + CEIL + 'ms');
      await tick(10);
    }
    // 2. DOM quiet: no mutations for a short window (pending mock calls and app timers finish first)
    const quiet = Math.min(Math.max(ms / 3, 25), 80);
    let last = Date.now();
    const mo = new w.MutationObserver(() => {
      last = Date.now();
    });
    mo.observe(w.document, { subtree: true, childList: true, attributes: true, characterData: true });
    try {
      await tick(Math.min(ms, 20));
      while (Date.now() - last < quiet) {
        if (Date.now() - t0 > CEIL) break; // something keeps animating; stop waiting rather than hang
        await tick(5);
      }
    } finally {
      mo.disconnect();
    }
  };
};
