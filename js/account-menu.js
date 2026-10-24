// Introthread - Account menu (v102): the account dropdown for the top bar and the sidebar footer (amClose, amOut,
// amKey, amGo, acctMenu), its resize/itroute/popstate listeners, the shell wrapper that adds the menu buttons, and the
// shell search and help handlers (setQ, searchKey, amHelp). Moved out of js/core.js unchanged and in their original
// order (cleanup plan step 7). Loads straight after core.js: app-routing.js, billing.js and app-navigation.js wrap
// acctMenu, amGo, amClose and shell while loading, so this file must load before them, and this shell wrapper must stay
// after the base shell in core.js and before the app-routing.js, app-navigation.js and event-mode.js wrappers.

/* ===== v16 Account menu: one professional dropdown for the top bar and the sidebar footer ===== */
function amClose() {
  const m = document.getElementById('acm');
  if (m) m.remove();
  document.querySelectorAll('[data-am]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  document.removeEventListener('keydown', amKey, true);
  document.removeEventListener('mousedown', amOut, true);
}
function amOut(e) {
  const m = document.getElementById('acm');
  if (m && !m.contains(e.target) && !e.target.closest('[data-am]')) amClose();
}
function amKey(e) {
  const m = document.getElementById('acm');
  if (!m) return;
  const it = [...m.querySelectorAll('[role="menuitem"]')];
  const i = it.indexOf(document.activeElement);
  if (e.key === 'Escape') {
    e.preventDefault();
    const t = document.querySelector('[data-am][aria-expanded="true"]');
    amClose();
    if (t) t.focus();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    (it[(i + 1) % it.length] || it[0]).focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    (it[(i - 1 + it.length) % it.length] || it[0]).focus();
  } else if (e.key === 'Tab') {
    amClose();
  }
}
function amGo(path, tab) {
  amClose();
  if (tab) {
    STAB = tab;
  }
  go(path);
}
function acctMenu(btn, dir) {
  const open = document.getElementById('acm');
  if (open) {
    const same = btn && btn.getAttribute('aria-expanded') === 'true';
    amClose();
    if (same) return;
  }
  const u = me();
  if (!u) return;
  btn = btn || document.querySelector('.t-user');
  const pro = u.plan && u.plan !== 'Free';
  const pub = !(u.links && u.links.hidden);
  const it = (ic, l, act, o = {}) =>
    `<button type="button" role="menuitem" class="am-it ${o.cls || ''}" data-on-click="${act}">${sv(ic, 18)}<span>${l}</span>${o.badge ? `<em class="${o.bc || ''}">${o.badge}</em>` : ''}${o.ext ? sv('arrow', 14) : ''}</button>`;
  const m = document.createElement('div');
  m.id = 'acm';
  m.className = 'am';
  m.setAttribute('role', 'menu');
  m.setAttribute('aria-label', 'Account menu');
  m.innerHTML = `<div class="am-h">${avatarC(u, 48)}<div class="am-hi"><b>${esc(u.name || '')}</b><small>${esc(u.email || 'introthread.com/' + u.handle)}</small><span class="am-tags"><span class="am-plan ${pro ? 'pro' : ''}">${pro ? sv('spark', 11) + ' ' + esc(u.plan) : 'Free plan'}</span><span class="am-vis ${pub ? '' : 'off'}"><i></i>${pub ? 'Profile live' : 'Profile private'}</span></span></div></div>
 <div class="am-link"><span>introthread.com/${esc(u.handle)}</span><button type="button" role="menuitem" aria-label="Copy my link" data-on-click="copy('${profileUrl(u)}','Link copied')">${sv('copy', 15)}</button></div>
 <div class="am-g">${it('user', 'My card', "amGo('/app/card')")}${it('globe', 'Public profile', "amGo('/app/profile')")}${it('eye', 'View as visitor', `amClose();window.open('/${esc(u.handle)}','_blank','noopener')`, { ext: 1 })}</div>
 <div class="am-g">${it('gear', 'Account settings', "amGo('/app/settings','account')")}${it('shield', 'Privacy &amp; visibility', "amGo('/app/settings','privacy')")}${it('bell', 'Notifications', "amGo('/app/settings','notifications')")}${it('brief', 'Plan &amp; billing', "amGo('/app/settings','billing')", { badge: pro ? '' : 'Upgrade', bc: 'up' })}</div>
 <div class="am-g">${it('mail', 'Help &amp; support', 'amHelp()')}${it('play', 'How Introthread works', "amClose();go('/how')")}</div>
 <div class="am-g">${it('out', 'Log out', 'amClose();logout()', { cls: 'am-out' })}</div>`;
  document.body.appendChild(m);
  btn.setAttribute('aria-expanded', 'true');
  const r = btn.getBoundingClientRect(),
    W = m.offsetWidth,
    H = m.offsetHeight,
    vw = innerWidth,
    vh = innerHeight;
  let left, top;
  if (dir === 'up') {
    left = Math.max(8, Math.min(r.left, vw - W - 8));
    top = Math.max(8, r.top - H - 8);
  } else {
    left = Math.max(8, Math.min(r.right - W, vw - W - 8));
    top = Math.min(r.bottom + 8, vh - H - 8);
    if (top < 8) top = 8;
  }
  m.style.left = left + 'px';
  m.style.top = top + 'px';
  m.classList.add(dir === 'up' ? 'up' : 'down');
  document.addEventListener('keydown', amKey, true);
  setTimeout(() => document.addEventListener('mousedown', amOut, true), 0);
  const f = m.querySelector('[role="menuitem"]');
  if (f) f.focus({ preventScroll: true });
}
window.addEventListener('resize', amClose);
window.addEventListener('itroute', amClose);
window.addEventListener('popstate', amClose);
const _shell16 = shell;
shell = function (on, inner) {
  let h = _shell16(on, inner);
  const u = me();
  if (!u) return h;
  const pro = u.plan && u.plan !== 'Free';
  h = h.replace(
    /<div class="row" style="margin-top:14px;padding:8px">[\s\S]*?<\/button><\/div><\/aside>/,
    `<button type="button" class="sb-user" data-am aria-haspopup="menu" aria-expanded="false" data-on-click="acctMenu(this,'up')">${avatarC(u, 40)}<span class="sb-ui"><b>${esc(u.name || '')}</b><small>${pro ? esc(u.plan) + ' plan' : 'Free plan'}</small></span><span class="sb-chev">${sv('chevd', 16)}</span></button></aside>`
  );
  h = h.replace(
    'class="t-user" data-on-click="acctMenu()"',
    'class="t-user" data-am aria-haspopup="menu" aria-expanded="false" data-on-click="acctMenu(this,\'down\')"'
  );
  return h;
};

/* v61: named handlers for the app shell search and the account menu (no inline JavaScript). */
function setQ(v) {
  Q = v;
}
function searchKey(e) {
  if (e.key === 'Enter') go('#/app/threads');
}
function amHelp() {
  amClose();
  location.href = 'mailto:hello@introthread.com?subject=Introthread%20support';
}
