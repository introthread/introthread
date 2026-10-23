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

/* v64: each browser tab keeps its own demo copy, so two tabs never overwrite each other.
   - The tab's full demo (with its sign-in) lives in sessionStorage under DEMO_TAB_KEY
     and survives reloads of that tab.
   - localStorage keeps only a signed-out copy of the demo data, so pages opened in a
     new tab (e.g. "View as visitor") can still show the demo card.
   Real accounts are unaffected: their data lives in Supabase. */
const DEMO_TAB_KEY = KEY + '_demo_tab';
const demoLocal = () => ({
  users: DB.users.filter(x => !x._c),
  threads: DB.threads.filter(x => !x._c),
  rooms: DB.rooms.filter(x => !x._c)
});
(function demoTabRestore() {
  try {
    const snap = JSON.parse(sessionStorage.getItem(DEMO_TAB_KEY) || 'null');
    if (snap && snap.session && !(typeof cloud === 'function' && cloud())) {
      DB.users = DB.users.filter(x => x._c).concat(snap.users || []);
      DB.threads = DB.threads.filter(x => x._c).concat(snap.threads || []);
      DB.rooms = DB.rooms.filter(x => x._c).concat(snap.rooms || []);
      DB.session = snap.session;
      MODE = 'demo';
    } else if (DB.session && !snap) {
      /* a sign-in left in shared storage by an older version or another tab: not this tab's */
      DB.session = null;
      MODE = null;
    }
  } catch (e) {}
})();
const _saveV64 = save;
save = function () {
  if (!isDemo()) {
    try {
      sessionStorage.removeItem(DEMO_TAB_KEY);
    } catch (e) {}
    return _saveV64.apply(this, arguments);
  }
  try {
    const d = demoLocal();
    sessionStorage.setItem(DEMO_TAB_KEY, JSON.stringify(Object.assign({ session: DB.session }, d)));
    localStorage.setItem(KEY, JSON.stringify(Object.assign({ session: null }, d)));
  } catch (e) {}
};
