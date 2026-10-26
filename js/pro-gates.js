// Introthread - Pro-only features from the published price card (v72). Prefix pg.
// Loaded last, after demo-mode.js, so it wraps the final versions of the functions below.

/* v72: Thread search is a Pro feature (price card: Pro, "Thread search"). */
FEATURES.search = 'Thread search';
const pgQuery = () => ((typeof TQ2 !== 'undefined' && TQ2) || Q || '').trim();
const _vThreads72 = vThreads;
vThreads = function () {
  if (has('search') || !pgQuery()) return _vThreads72.apply(this, arguments);
  const keepT = TQ2,
    keepQ = Q;
  TQ2 = '';
  Q = '';
  try {
    return (
      bLockCard('search', 'Upgrade to Pro to search your Threads by name, company, place, note or topic.') +
      _vThreads72.apply(this, arguments)
    );
  } finally {
    TQ2 = keepT;
    Q = keepQ;
  }
};
const _mbSearchRun72 = mbSearchRun;
mbSearchRun = function () {
  const q = (($('#mbsq') || {}).value || '').trim();
  const r = $('#mbsr');
  if (has('search') || !q || !r) return _mbSearchRun72.apply(this, arguments);
  r.innerHTML = bLockCard('search', 'Upgrade to Pro to search your Threads, people and Rooms.');
};

/* v73: Calendar booking from a match is a Pro feature (price card: Pro, "Calendar booking from a match").
   The "Add to calendar" file on a Thread is the booking step today. Some buttons call closeModal()
   right after dIcs(), so the upgrade dialog opens on the next tick. */
const _dIcs73 = dIcs;
dIcs = function () {
  if (has('booking')) return _dIcs73.apply(this, arguments);
  setTimeout(() => bLocked('booking'), 0);
};

/* v76: one free event a month for up to 20 people (owner's decision, 23 Oct 2026).
   Bigger or extra events still need a Room pass ($59). The database enforces the same rule
   (migration 021); until it runs, the database asks for a pass and the app opens Buy a Room pass. */
const FREE_ROOM_CAP = 20;
function pgRoomCap(r) {
  rm9(r);
  return +((r._m || {}).cap || 0);
}
function pgFreeRoomUsed() {
  const n = new Date();
  return myRooms().some(r => {
    const c = pgRoomCap(r),
      d = new Date(r.created || 0);
    return (
      c >= 1 && c <= FREE_ROOM_CAP && d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth()
    );
  });
}
function pgFreeNote() {
  const i = document.getElementById('rc');
  if (!i || document.getElementById('pgfree')) return;
  const s = document.createElement('small');
  s.id = 'pgfree';
  s.className = 'bl-fine';
  s.textContent = pgFreeRoomUsed()
    ? "You have used this month's free event. This Room needs a Room pass."
    : 'Free for up to 20 people, one event a month. Set a limit of 20 or less.';
  i.parentNode.appendChild(s);
}
const _newRoomModal76 = newRoomModal;
newRoomModal = function () {
  const r =
    !bRoomAllowed() && !pgFreeRoomUsed()
      ? _newRoomModal19.apply(this, arguments)
      : _newRoomModal76.apply(this, arguments);
  setTimeout(pgFreeNote, 0);
  return r;
};
const _newRoom76 = newRoom9;
newRoom9 = function (e) {
  const cap = +((document.getElementById('rc') || {}).value || 0);
  const small = cap >= 1 && cap <= FREE_ROOM_CAP;
  if (small && !pgFreeRoomUsed()) return _newRoom19.call(this, e);
  if (!bRoomAllowed() && !pgFreeRoomUsed()) {
    e && e.preventDefault && e.preventDefault();
    toast('Free events are for up to 20 people. Set a limit of 20 or less, or buy a Room pass.');
    return false;
  }
  return _newRoom76.call(this, e);
};
