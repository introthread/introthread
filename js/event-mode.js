// Introthread - Event mode (v24), bottom bar icons (v26) and scroll to top on page change (v29).
// Moved out of index.html in v53 (code split step 5). Load order matters: see the <script> list at the end of index.html.

/* ===== v24 Event mode: one tap to a full-screen QR that is fast to scan ===== */
let SCAN = { room: '', wl: null, dark: false };
function scanUrl(u) {
  const r = SCAN.room && DB.rooms.find(x => x.id === SCAN.room);
  return profileUrl(u) + (r ? '?at=' + encodeURIComponent(r.name) : '');
}
function scanRooms() {
  const t = ymdL(new Date());
  return myRooms()
    .filter(r => {
      const y = rYmd(r);
      return y >= ymdL(new Date(Date.now() - DAY)) && y <= ymdL(new Date(Date.now() + 7 * DAY));
    })
    .sort((a, b) => a.date - b.date);
}
async function scanWake(on) {
  try {
    if (on && 'wakeLock' in navigator && !SCAN.wl) {
      SCAN.wl = await navigator.wakeLock.request('screen');
      SCAN.wl.addEventListener('release', () => {
        SCAN.wl = null;
      });
    }
    if (!on && SCAN.wl) {
      await SCAN.wl.release();
      SCAN.wl = null;
    }
  } catch (_) {}
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && location.pathname === '/app/scan') scanWake(true);
});
function scanClose() {
  scanWake(false);
  try {
    if (document.fullscreenElement) document.exitFullscreen();
  } catch (_) {}
  if (history.length > 1 && window._scanFrom) history.back();
  else go('/app');
}
function scanFull() {
  const el = document.documentElement;
  try {
    document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen && el.requestFullscreen();
  } catch (_) {}
}
function scanToday() {
  const s = new Date();
  s.setHours(0, 0, 0, 0);
  return myThreads().filter(t => t.createdAt >= s.getTime()).length;
}
function vScan() {
  const u = me();
  const R = scanRooms();
  const room = SCAN.room && DB.rooms.find(x => x.id === SCAN.room);
  const n = scanToday();
  setTimeout(() => {
    const q = $('#scanqr');
    if (q) {
      const sz = Math.max(200, Math.min(innerWidth - 72, innerHeight - (innerHeight < 800 ? 470 : 430), 460));
      qr(q, scanUrl(u), sz);
    }
    scanWake(true);
  }, 20);
  return `<div class="scan ${SCAN.dark ? 'dk' : ''}"><header class="scan-h"><button type="button" class="scan-ib" aria-label="Close" data-on-click="scanClose()">${sv('close', 20)}</button><span class="scan-live"><i></i>Event mode</span><button type="button" class="scan-ib" aria-label="Full screen" data-on-click="scanFull()">${sv('grid', 18)}</button></header>
 <main class="scan-m"><div class="scan-who">${avatarC(u, 56)}<div><b>${esc(u.name || '')}</b><small>${esc([u.role, u.company].filter(Boolean).join(' · '))}</small></div></div>
 <button type="button" class="scan-qr" aria-label="QR code for introthread.com/${esc(u.handle)}. Tap to switch light or dark" data-on-click="scanDark()"><div id="scanqr"></div><span class="t-qrlogo"><span class="x-lm"><i></i><i></i></span></span></button>
 <p class="scan-cta">Scan to connect with ${esc((u.name || '').split(' ')[0])}</p><p class="scan-url">introthread.com/${esc(u.handle)}</p>
 ${room ? `<p class="scan-room">${sv('pin', 14)} New Threads are tagged <b>${esc(room.name)}</b></p>` : ''}
 <div class="scan-ev" role="radiogroup" aria-label="Event"><button type="button" role="radio" aria-checked="${!room}" class="${room ? '' : 'on'}" data-on-click="scanRoom('')">No event</button>${R.map(r => `<button type="button" role="radio" aria-checked="${SCAN.room === r.id}" class="${SCAN.room === r.id ? 'on' : ''}" data-on-click="scanRoom('${r.id}')">${esc(r.name)}</button>`).join('')}</div>
 <div class="scan-acts"><button type="button" data-on-click="shareNative()">${sv('send', 18)}<span>Share link</span></button><button type="button" data-on-click="tapNFC()">${sv('nfc', 18)}<span>NFC</span></button><button type="button" data-on-click="scanWallpaper()">${sv('photo', 18)}<span>Save as wallpaper</span></button><a href="/app/tap">${sv('user', 18)}<span>Add manually</span></a></div>
 <p class="scan-tip">${sv('spark', 13)} ${n ? `${n} Thread${n > 1 ? 's' : ''} started today. ` : ''}Turn up your brightness for faster scanning. Your screen stays on in event mode.</p></main></div>`;
}
function scanWallpaper() {
  const u = me();
  const d = document.createElement('div');
  qr(d, scanUrl(u), 900);
  const img = d.querySelector('img');
  if (!img) return toast('QR code is not available right now.');
  const draw = () => {
    const W = 1170,
      H = 2532,
      c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#0b1430');
    g.addColorStop(1, '#16224a');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    x.fillStyle = '#fff';
    const qs = 780,
      qx = (W - qs) / 2,
      qy = 1020;
    x.beginPath();
    x.roundRect
      ? x.roundRect(qx - 50, qy - 50, qs + 100, qs + 100, 56)
      : x.rect(qx - 50, qy - 50, qs + 100, qs + 100);
    x.fill();
    x.imageSmoothingEnabled = false;
    x.drawImage(img, qx, qy, qs, qs);
    x.textAlign = 'center';
    x.fillStyle = '#fff';
    x.font = '600 76px sans-serif';
    x.fillText(u.name || '', W / 2, 820);
    x.font = '400 44px sans-serif';
    x.fillStyle = 'rgba(255,255,255,.75)';
    x.fillText([u.role, u.company].filter(Boolean).join(' · '), W / 2, 890);
    x.fillStyle = '#fff';
    x.font = '600 54px sans-serif';
    x.fillText('Scan to connect', W / 2, qy + qs + 170);
    x.font = '400 42px sans-serif';
    x.fillStyle = 'rgba(255,255,255,.7)';
    x.fillText('introthread.com/' + u.handle, W / 2, qy + qs + 240);
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = 'introthread-qr-wallpaper.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast('Wallpaper saved. Set it as your lock screen for instant scanning.');
  };
  img.complete ? draw() : (img.onload = draw);
}
tapQR = function () {
  go('/app/scan');
};
const _render24 = render;
render = function () {
  if (location.pathname === '/app/scan' && me()) {
    $('#root').innerHTML = vScan();
    document.title = 'Event mode | Introthread';
    return;
  }
  if (location.pathname !== '/app/scan') scanWake(false);
  return _render24();
};
const _go24 = go;
go = function (h) {
  const p = String(h).replace(/^#/, '');
  if (p === '/app/scan') window._scanFrom = location.pathname;
  return _go24(h);
};
/* Tap to Thread page: big event-mode button; mobile bottom bar Tap opens event mode */
const _vTap24 = vTap;
vTap = function () {
  return _vTap24().replace(
    '<div class="t-grid">',
    `<a href="/app/scan" class="t-event"><span>${sv('qr', 26)}</span><div><b>Event mode</b><small>Full-screen QR, screen stays on. Fastest way to connect at events.</small></div>${sv('chev', 18)}</a><div class="t-grid">`
  );
};
const _shell24 = shell;
shell = function (on, inner) {
  return _shell24(on, inner).replace('<a href="/app/tap" class="mb-tap', '<a href="/app/scan" class="mb-tap');
};
/* public card: prefill where you met from an event QR (?at=) */
/* vPublic step (v113): event-mode.js: prefill where you met from an event QR (?at=). Called in order from vPublic in public-pages.js. */
function pcEventAt(h, hd) {
  const at = new URLSearchParams(location.search).get('at');
  if (at && h.includes('id="gw"')) {
    const v = esc(at.slice(0, 120));
    h = h
      .replace(
        'id="gw" placeholder="Where did you meet?"',
        `id="gw" placeholder="Where did you meet?" value="${v}"`
      )
      .replace(
        '<form class="pc-form"',
        `<p class="pc-at">${sv('pin', 14)} Met at <b>${v}</b></p><form class="pc-form"`
      );
  }
  return h;
}

/* v26 bottom bar icons: add the missing Today and Threads icons */
SV.home = '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v11h13V9"/><path d="M10 20v-5.5h4V20"/>';
SV.thread = '<circle cx="6.5" cy="12" r="3.5"/><circle cx="17.5" cy="12" r="3.5"/><path d="M10 12h4"/>';

/* v29 page changes start at the top (scroll position no longer carries over between pages) */
window.addEventListener('itroute', () => setTimeout(() => window.scrollTo(0, 0), 0));

/* v62: scanDark and scanRoom (defined in admin-audit.js) handle the event-mode buttons. */
