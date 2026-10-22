// Introthread - Billing (v40): reload billing from the server after every save (migration 018).
// Loaded by index.html after the main script, in this order: rooms-access, admin-idle, room-sessions, billing-sync.
// Uses the main script's globals (render, DB, SB, esc, ...). See ARCHITECTURE.md > Refactor plan.

/* v40 Billing: the database keeps the server's billing values (migration 018). After any Billing save on the live
   site, reload plan and receipts from the server so the page always shows the stored truth. */
const _bSave40 = bSave;
bSave = async function () {
  const r = await _bSave40.apply(this, arguments);
  try {
    if (cloud() && typeof itProfReload === 'function') await itProfReload();
  } catch (e) {}
  return r;
};
