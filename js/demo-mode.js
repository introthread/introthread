/*
 * demo-mode.js - keeps the shared "Explore the live demo" account safe (v60).
 *
 * The demo never touches the server: it runs in MODE 'demo', data lives only in
 * the visitor's own browser, itApi() and the admin area require a real (cloud)
 * session, and payments are simulated. On top of that:
 *   - every demo start loads fresh demo data, so one visitor's edits never carry
 *     over to the next visit and the showcase always looks right;
 *   - account-level actions (delete, deactivate, reactivate, change password)
 *     are blocked with a short explanation instead of running.
 * The demo keeps the Pro plan so visitors can try every feature.
 * Loads last, after every file that defines these functions.
 */
const DEMO_BLOCK_MSG = 'Not available in the demo. Create your free card to manage a real account.';
const isDemo = () => typeof MODE !== 'undefined' && MODE === 'demo';

/* Fresh demo data on every start (only local demo data is cleared, never a real account). */
const _demoLoginV60 = demoLogin;
demoLogin = async function () {
  ['users', 'threads', 'rooms'].forEach(k => {
    if (Array.isArray(DB[k])) DB[k] = DB[k].filter(x => x._c);
  });
  DB.session = null;
  const r = await _demoLoginV60.apply(this, arguments);
  toast('Demo account: try anything. Changes stay on this device and reset next time.');
  return r;
};

/* Block account-level changes while in the demo. */
function demoGuard(name) {
  const fn = window[name];
  if (typeof fn !== 'function') return;
  window[name] = function () {
    if (isDemo()) {
      toast(DEMO_BLOCK_MSG);
      return false;
    }
    return fn.apply(this, arguments);
  };
}
['delAccount', 'stPw', 'stPwDo', 'stConfirm', 'stConfirmDo', 'stDeactivate', 'stReactivate'].forEach(
  demoGuard
);
