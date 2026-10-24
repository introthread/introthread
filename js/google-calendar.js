// Introthread - Google sign-in and Calendar (v100): GSCOPE, the calendar version of oauth (asks for the read-only
// calendar scope when connecting the calendar), gTokSave, gTok, GCAL, GCAL_BUSY, gcalLoad, gcalPanel and the Supabase
// listener that saves the Google token after sign-in. Moved out of js/app-core.js unchanged and in their original order
// (cleanup plan step 5). Loads straight after app-core.js, so this oauth still replaces the earlier sign-in versions in
// app-core.js, and its token listener is still added before the ones in app-routing.js and admin-audit.js and before
// boot runs. today.js, settings.js and admin-audit.js use these only at run time; admin-audit.js wraps gcalPanel later.

/* ===== Google sign-in + Calendar ===== */
const GSCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
oauth = async function (p, withCal) {
  if (p !== 'Google') return toast(p + ' sign-in is coming soon. Please use Google or email for now.');
  if (typeof SB === 'undefined' || !SB)
    return toast('Sign-in is not available right now. Please try again shortly.');
  try {
    sessionStorage.setItem('it_oauth', '1');
  } catch (_) {}
  const { error } = await SB.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://www.introthread.com/',
      ...(withCal ? { scopes: GSCOPE } : {}),
      queryParams: { access_type: 'offline', prompt: 'select_account' }
    }
  });
  if (error) toast(error.message);
};
function gTokSave(s) {
  if (s && s.provider_token) {
    try {
      sessionStorage.setItem('it_gtok', JSON.stringify({ t: s.provider_token, exp: Date.now() + 50 * 6e4 }));
    } catch (_) {}
  }
}
function gTok() {
  try {
    const o = JSON.parse(sessionStorage.getItem('it_gtok') || 'null');
    return o && o.exp > Date.now() ? o.t : null;
  } catch (_) {
    return null;
  }
}
let GCAL = null,
  GCAL_BUSY = false;
async function gcalLoad() {
  const tok = gTok();
  if (!tok || GCAL_BUSY || GCAL) return;
  GCAL_BUSY = true;
  try {
    const a = new Date();
    a.setHours(0, 0, 0, 0);
    const b = new Date(a.getTime() + 7 * DAY);
    const r = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=8&timeMin=' +
        encodeURIComponent(new Date().toISOString()) +
        '&timeMax=' +
        encodeURIComponent(b.toISOString()),
      { headers: { Authorization: 'Bearer ' + tok } }
    );
    if (r.status === 401 || r.status === 403) {
      sessionStorage.removeItem('it_gtok');
      GCAL = [];
    } else {
      const j = await r.json();
      GCAL = (j.items || []).map(e => ({
        title: e.summary || 'Busy',
        where: e.location || '',
        start: Date.parse(e.start.dateTime || e.start.date),
        allDay: !e.start.dateTime,
        link: e.htmlLink
      }));
    }
  } catch (_) {
    GCAL = [];
  }
  GCAL_BUSY = false;
  if (/^#\/app\/?$/.test(RH())) {
    window._keepScroll = true;
    render();
  }
}
function gcalPanel() {
  const tok = gTok();
  if (!tok)
    return `<div class="g-conn"><span>${oG()}</span><div><b>Connect Google Calendar</b><small>See today&rsquo;s meetings here and start Threads from them.</small></div><button type="button" class="d-act ghost sm" data-on-click="oauth('Google',1)">Connect</button></div>`;
  if (!GCAL) {
    gcalLoad();
    return '<p class="d-muted">Loading your calendar...</p>';
  }
  if (!GCAL.length) return '<p class="d-muted">No meetings in the next 7 days.</p>';
  return GCAL.map(e => {
    const d = new Date(e.start);
    const today = new Date().toDateString() === d.toDateString();
    return `<a class="d-ev" href="${esc(e.link || '#')}" target="_blank" rel="noopener"><span class="d-evd">${today ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' })}<b>${e.allDay ? d.getDate() : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</b></span><span class="d-evl"><i></i></span><span class="d-evt"><b>${esc(e.title)}</b><small>${esc(e.where || (e.allDay ? 'All day' : 'Google Calendar'))}</small></span><em>${today ? 'Today' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</em></a>`;
  }).join('');
}
if (typeof SB !== 'undefined' && SB) {
  SB.auth.onAuthStateChange((ev, s) => {
    gTokSave(s);
  });
  SB.auth.getSession().then(({ data }) => gTokSave(data && data.session));
}
