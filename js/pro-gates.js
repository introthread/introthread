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
