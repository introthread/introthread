// Introthread - Sign-up and login screens (v84): authSideBase, chkH, liveP, setPv, pickTheme, doSu3, vSignup,
// prevHTML, forgotPw, vLogin, authSide. Moved out of js/core.js unchanged (code cleanup step 2). Loads straight
// after site-pages.js; shares core.js globals. Later files wrap some of these (vSignup and vLogin in app-routing.js
// and capture.js; liveP is called from capture.js and admin-audit.js).

function authSideBase(s) {
  const top = `<div class="x-side-top">${logo(true)}${!s || s === 1 ? '<small>Built for professionals<br>around the world</small>' : ''}</div>`;
  const feats = a =>
    `<ul class="x-feats">${a.map(([i, b, t]) => `<li><span class="x-fic">${sv(i, 22)}</span><div><b>${b}</b><span>${t}</span></div></li>`).join('')}</ul>`;
  const note = (i, b, t) =>
    `<div class="x-note"><span class="x-fic" style="width:44px;height:44px">${sv(i, 19)}</span><div><b>${b}</b><span>${t}</span></div></div>`;
  if (s === 2)
    return `<aside class="x-side">${top}<div class="x-eye">Your professional identity<br>anywhere you network</div><h2 class="x-side-h">A profile that<br>works as hard as<br><em>your network.</em></h2><p class="x-side-p" style="max-width:340px">Create a professional identity that people trust, share it instantly and turn introductions into meaningful opportunities.</p>${feats(
      [
        ['user', 'Professional identity', 'Showcase who you are and what you do.'],
        ['link', 'Share anywhere', 'QR, NFC, link, email or SMS.'],
        ['users', 'Remember and follow up', 'Keep track of conversations and next steps.']
      ]
    )}
 <div class="x-side-art x-s2art"><div class="x-hand">This is what people see when you share${handArrow(44, 40, 1)}</div>${phone(bizCard(SARAH, { phone: 1 }))}</div>${note('lock', 'Private by default', 'Your card shows only what you add. A Thread is created only when both people confirm.')}</aside>`;
  if (s === 3)
    return `<aside class="x-side">${top}<div class="x-eye">Your identity. Everywhere<br>you network.</div><h2 class="x-side-h">Choose a card<br>that represents<br><em>you.</em></h2><p class="x-side-p" style="max-width:360px">Your Introthread card is a modern way to share your professional identity. You can change the style any time.</p>${feats(
      [
        ['palette', 'Modern, professional designs', 'A style for every industry.'],
        ['phone', 'Optimised for mobile and NFC', 'Looks great on any device.'],
        ['sync', 'Instant updates', 'Change your style anytime.']
      ]
    )}${note('sync', 'One card, always current', 'Your link, QR code and NFC tap all update the moment you change your style or details.')}</aside>`;
  return `<aside class="x-side">${top}<div class="x-eye">${s ? 'Join a more meaningful<br>professional network' : 'Welcome back to<br>your professional network'}</div><h2 class="x-side-h">Every handshake,<br><em>followed through.</em></h2><p class="x-side-p">Introthread helps you create your professional identity, capture connections and stay on top of the relationships that matter.</p>${feats(
    [
      ['users', 'Create your identity', 'A modern digital card in under 60 seconds.'],
      ['send', 'Share instantly', 'Tap, scan, send a link or save to contacts.'],
      ['chart', 'Turn introductions into opportunities', 'Capture context, get reminders and follow up.']
    ]
  )}
 <div class="x-side-art x-s1art">${phone(bizCard(SARAH, { phone: 1 }))}${phone(threadScreen(), 1)}</div><div class="x-hand" style="position:absolute;left:56px;bottom:46px">Tap, scan or share<br>&mdash; no app required <span style="position:absolute;left:190px;top:10px">${handArrow(46, 40, 1)}</span></div></aside>`;
}

function chkH() {
  const el = $('#sh'),
    hh = $('#shh'),
    ok = $('#shok');
  if (!el) return;
  const h = el.value;
  clearTimeout(_hT);
  ok.innerHTML = '';
  hh.className = 'x-hint';
  if (!/^[a-z0-9]{2,20}$/.test(h)) {
    hh.textContent = 'Use 2 to 20 lowercase letters and numbers.';
    return;
  }
  hh.textContent = 'Checking availability...';
  _hT = setTimeout(async () => {
    let free = !DB.users.some(u => u.handle === h);
    if (free && typeof SB !== 'undefined' && SB) {
      const { data, error } = await SB.rpc('handle_available', { p_handle: h });
      if (!error) free = !!data;
    }
    if ($('#sh') && $('#sh').value === h) {
      hh.textContent = free ? 'introthread.com/' + h + ' is available.' : 'That link is taken. Try another.';
      hh.className = 'x-hint ' + (free ? 'ok' : 'bad');
      ok.innerHTML = free ? sv('check', 18, '#12a065', 2.6) : '';
    }
  }, 350);
}

function liveP() {
  const g = id => {
    const e = $('#' + id);
    return e ? e.value : null;
  };
  if ($('#sh')) {
    const v = g('sh')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 20);
    if (v !== g('sh')) $('#sh').value = v;
  }
  [
    ['name', 'sn2'],
    ['role', 'sr'],
    ['company', 'sc'],
    ['city', 'sct'],
    ['handle', 'sh'],
    ['bio', 'sb']
  ].forEach(([k, id]) => {
    const v = g(id);
    if (v != null) SU[k] = k === 'handle' ? v : v;
  });
  if ($('#sbc')) $('#sbc').textContent = (SU.bio || '').length;
  const lp = $('#lp');
  if (lp) lp.innerHTML = prevHTML();
}

function setPv(v) {
  SU.pv = v;
  document.querySelectorAll('.x-seg button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  const lp = $('#lp');
  if (lp) lp.innerHTML = prevHTML();
}

function pickTheme(k) {
  SU.theme = k;
  window._keepScroll = true;
  render();
}

function doSu3(b) {
  b.disabled = true;
  b.innerHTML = 'Creating your card...';
  Promise.resolve(su3()).finally(() => {
    const x = $('#su3b');
    if (x) {
      x.disabled = false;
      x.innerHTML = 'Create my card ' + sv('arrow', 17);
    }
  });
}

function vSignup() {
  const s = SU.step || 1;
  document.body.classList.remove('x-open');
  const st = `<div class="x-stepper"><div class="x-st-line"><i style="width:${(s - 1) * 50}%"></i></div>${[
    'Create account',
    'Your identity',
    'Choose card'
  ]
    .map((l, i) => {
      const n = i + 1;
      return `<div class="x-st ${n < s ? 'done' : n === s ? 'on' : ''}"><span class="x-st-dot">${n < s ? sv('check', 14, '#fff', 2.8) : n}</span><span>${n}. ${l}</span></div>`;
    })
    .join('')}</div>`;
  const seg = lg =>
    `<div class="x-seg ${lg ? 'lg' : ''}"><button type="button" data-v="c" class="${SU.pv !== 'p' ? 'on' : ''}" data-on-click="setPv('c')">${lg ? 'Card view' : 'Card'}</button><button type="button" data-v="p" class="${SU.pv === 'p' ? 'on' : ''}" data-on-click="setPv('p')">${lg ? 'Profile view' : 'Profile'}</button></div>`;
  let body, mw;
  if (s === 1) {
    mw = 520;
    body = `<h1 class="x-ftitle">Create your account</h1><p class="x-fsub">Free forever for individuals. No card required.</p>
 <div class="x-oauth"><button type="button" class="x-obtn" data-on-click="oauth('Google')">${oG()} Continue with Google</button><button type="button" class="x-obtn" data-on-click="oauth('LinkedIn')">${oL()} Continue with LinkedIn</button></div><div class="x-or">or use your email</div>
 <form data-on-submit="return su1(event)" class="x-form" novalidate2><label class="x-f"><span>Full name</span><input id="sn" required autocomplete="name" value="${esc(SU.name || '')}" placeholder="Alex Morgan"></label>
 <label class="x-f"><span>Work email</span><input id="se" type="email" required autocomplete="email" value="${esc(SU.email || '')}" placeholder="alex@company.com"></label>
 <div class="x-f"><span>Password</span><div class="x-pw"><input id="sp" type="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters" aria-label="Password"><button type="button" aria-label="Show password" data-on-click="pwToggle('sp')">${sv('eye', 19)}</button></div></div>
 <div id="serr" class="x-err" role="alert"></div><button class="x-btn lg block" style="margin-top:6px">Continue ${sv('arrow', 17)}</button>
 <p class="x-legal">By creating an account you agree to our <a href="/terms" target="_blank" rel="noopener">Terms of Service</a><br>and <a href="/privacy#policy" target="_blank" rel="noopener">Privacy Policy</a>.</p></form><p class="x-alt">Already have an account? <a href="#/login">Log in</a></p>`;
  }
  if (s === 2) {
    mw = 1000;
    const h =
      SU.handle ||
      slug(SU.name || '')
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20);
    SU.handle = h;
    body = `<h1 class="x-ftitle">Your professional identity</h1><p class="x-fsub">This is what people see when you share your card. Keep it short, you can always update it later.</p>
 <div class="x-s2" style="margin-top:30px"><form data-on-submit="return su2(event)" class="x-form" style="margin-top:0" data-on-input="liveP()">
 ${SU.pwRaw ? '' : `<label class="x-f"><span>Full name <i>*</i></span><div class="x-in">${sv('user', 18)}<input id="sn2" required autocomplete="name" value="${esc(SU.name || '')}"></div></label>`}<div class="x-g2"><label class="x-f"><span>Job title <i>*</i></span><div class="x-in">${sv('brief', 18)}<input id="sr" required placeholder="Founder" value="${esc(SU.role || '')}"></div></label><label class="x-f"><span>Company <i>*</i></span><div class="x-in">${sv('building', 18)}<input id="sc" required placeholder="Company name" value="${esc(SU.company || '')}"></div></label></div>
 <label class="x-f"><span>City <i>*</i></span><div class="x-in">${sv('pin', 18)}<input id="sct" required placeholder="London, UK" autocomplete="address-level2" value="${esc(SU.city || '')}"></div></label>
 <label class="x-f"><span>Your Introthread link <i>*</i></span><div class="x-link"><span>introthread.com/</span><input id="sh" required maxlength="20" autocapitalize="none" spellcheck="false" value="${esc(h)}" data-on-input="chkH()"><i id="shok"></i></div><small class="x-hint" id="shh">Use lowercase letters and numbers.</small></label>
 <label class="x-f"><span>One-line bio <i>*</i></span><textarea id="sb" rows="3" maxlength="160" required placeholder="What you do and who you help">${esc(SU.bio || '')}</textarea><small class="x-count"><b id="sbc" style="font-weight:500">${(SU.bio || '').length}</b>/160</small></label>
 <div class="x-f"><span>Add a profile photo <em style="font-style:normal;font-weight:500;color:var(--xmu)">(optional)</em></span><div class="x-up" id="xup">${upBox()}</div></div>
 <div class="x-actions"><button type="button" class="x-btn ghost lg" data-on-click="suStep(1,true)">Back</button><button class="x-btn lg grow">Continue ${sv('arrow', 17)}</button></div></form>
 <aside class="x-prev"><div class="x-prev-h"><b>Live preview</b>${seg()}</div><div id="lp">${prevHTML()}</div></aside></div>`;
  }
  if (s === 3) {
    mw = 960;
    const cat = SU.cat || 'all';
    SU.theme = SU.theme || 'midnight';
    body = `<div class="x-s3-head"><div><h1 class="x-ftitle">Choose your card style</h1><p class="x-fsub">You can change this at any time. Your details will update automatically.</p></div>${seg(1)}</div>
 <div class="x-s3"><div><div class="x-chips" role="tablist">${[
   ['all', 'All styles'],
   ['professional', 'Professional'],
   ['creative', 'Creative'],
   ['executive', 'Executive'],
   ['minimal', 'Minimal']
 ]
   .map(
     ([k, l]) =>
       `<button type="button" class="${cat === k ? 'on' : ''}" data-on-click="suCat('${k}')">${l}</button>`
   )
   .join('')}</div>
 <div class="x-styles">${Object.entries(THEMES)
   .filter(([k, t]) => cat === 'all' || t.c.includes(cat))
   .map(
     ([k, t]) =>
       `<button type="button" class="x-sty ${SU.theme === k ? 'on' : ''}" aria-pressed="${SU.theme === k}" data-on-click="pickTheme('${k}')"><span class="x-sw" style="background:${t.bg}">${SU.theme === k ? `<i>${sv('check', 14, '#fff', 3)}</i>` : ''}</span><b>${t.n}</b><small>${t.d}</small></button>`
   )
   .join('')}</div></div>
 <div id="lp">${prevHTML()}</div></div>
 <div class="x-actions" style="margin-top:34px"><button type="button" class="x-btn ghost lg" data-on-click="suStep(2)">Back</button><button type="button" id="su3b" class="x-btn lg grow" data-on-click="doSu3(this)">Create my card ${sv('arrow', 17)}</button></div><p class="x-legal">You can always change your card style later in your settings.</p>`;
  }
  const sw = { 1: '47%', 2: '40%', 3: '35%' }[s];
  return `<div class="x-auth" style="--sw:${sw}">${authSide(s)}<main class="x-main"><div class="x-mi" style="--mw:${mw}px">${st}${body}</div></main></div>`;
}

function prevHTML() {
  const u = {
    name: SU.name,
    role: SU.role,
    company: SU.company,
    city: SU.city,
    handle: SU.handle,
    bio: SU.bio,
    photo: SU.photo,
    theme: SU.theme || 'midnight'
  };
  return SU.pv === 'p'
    ? profileView(u).replace('class="x-pview"', 'class="x-pview cmp"')
    : bizCard(u).replace('class="x-card ', 'class="x-card cmp ');
}

async function forgotPw() {
  const em = ($('#le').value || '').trim().toLowerCase();
  const er = $('#lerr');
  if (!/^\S+@\S+\.\S+$/.test(em)) {
    er.textContent = 'Enter your email above, then tap Forgot password.';
    $('#le').focus();
    return;
  }
  er.textContent = '';
  if (typeof SB !== 'undefined' && SB) {
    const { error } = await SB.auth.resetPasswordForEmail(em, { redirectTo: 'https://www.introthread.com/' });
    if (error) {
      er.textContent = error.message;
      return;
    }
  }
  toast('If an account exists for ' + em + ', a reset link is on its way.');
}

function vLogin() {
  document.body.classList.remove('x-open');
  return `<div class="x-auth" style="--sw:47%">${authSide(0)}<main class="x-main"><div class="x-mi" style="--mw:460px">
<div class="x-eye" style="margin-bottom:10px">Welcome back</div><h1 class="x-ftitle">Log in to Introthread</h1><p class="x-fsub">Pick up every Thread where you left it.</p>
<div class="x-oauth"><button type="button" class="x-obtn" data-on-click="oauth('Google')">${oG()} Continue with Google</button><button type="button" class="x-obtn" data-on-click="oauth('LinkedIn')">${oL()} Continue with LinkedIn</button></div><div class="x-or">or use your email</div>
<form data-on-submit="return doLogin(event)" class="x-form"><label class="x-f"><span>Work email</span><input id="le" type="email" required autocomplete="email" placeholder="you@company.com"></label>
<div class="x-f"><span>Password <button type="button" class="x-forgot" data-on-click="forgotPw()">Forgot password?</button></span><div class="x-pw"><input id="lp" type="password" required autocomplete="current-password" placeholder="Your password" aria-label="Password"><button type="button" aria-label="Show password" data-on-click="pwToggle('lp')">${sv('eye', 19)}</button></div></div>
<div id="lerr" class="x-err" role="alert"></div><button class="x-btn lg block" style="margin-top:4px">Log in ${sv('arrow', 17)}</button></form>
<button type="button" class="x-demo" data-on-click="demoLogin()">${sv('spark', 16)} Explore the live demo account</button>
<p class="x-alt" style="margin-top:8px">New here? <a href="#/signup">Create your free card</a></p></div></main></div>`;
}

function authSide(s) {
  if (s === 2 || s === 3) return authSideBase(s);
  return `<aside class="x-side v2"><div class="x-side-top">${logo(true)}<small>Built for professionals<br>around the world</small></div>
 <div class="x-eye">${s ? 'Join a more meaningful<br>professional network' : 'Welcome back to<br>your professional network'}</div><h2 class="x-side-h">Every handshake,<br><em>followed through.</em></h2>
 <p class="x-side-p">Introthread helps you create your professional identity, capture connections and stay on top of the relationships that matter.</p>
 <div class="x-chips2">${[
   ['user', 'Create your identity'],
   ['send', 'Share instantly'],
   ['bell', 'Follow up on time']
 ]
   .map(([i, t]) => `<span><i>${sv(i, 14)}</i>${t}</span>`)
   .join('')}</div>
 <div class="x-scene" aria-hidden="true"><span class="x-orb a"></span><span class="x-orb b"></span>
  <svg class="x-sc-path" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="xpg" x1="0" x2="1"><stop offset="0" stop-color="#ff6a3d"/><stop offset="1" stop-color="#4f86ff"/></linearGradient></defs><path d="M17 78 C 28 70, 34 58, 47 52" fill="none" stroke="url(#xpg)" stroke-width="2" stroke-dasharray="5 5" vector-effect="non-scaling-stroke"/></svg>
  <span class="x-sc-ring"></span><span class="x-sc-ring r2"></span>
  <div class="x-sc-card"><div class="x-sc-row"><img src="/img/sarah.jpg" alt=""><div><b>Sarah Williams</b><small>Marketing Director<br>Acme Technologies</small></div>${sv('nfc', 18)}</div><div class="x-sc-ic">${['li', 'x', 'cal', 'link', 'mail'].map(k => `<span>${sv(k, 14)}</span>`).join('')}</div><div class="x-sc-save">Save Contact</div></div>
  <div class="x-sc-toast"><span class="ok">${sv('check', 13, '#fff', 3)}</span><div><b>Thread confirmed</b><small>You and Sarah &middot; London Tech Week</small></div></div>
  <div class="x-sc-j"><img src="/img/uc-professionals.jpg" alt="" loading="lazy" decoding="async"><div><b>James Carter</b><small>Partner, Lattice Ventures</small></div></div>
  <div class="x-sc-m"><small>What's next?</small><span>${sv('cal', 13)} Meet again ${sv('check', 13, 'currentColor', 2.6)}</span></div>
 </div></aside>`;
}

/* v96: named handlers for this screen, moved unchanged from js/core.js (code cleanup). */
function suSample() {
  seed(me());
  save();
  closeModal();
  render();
  toast('Sample Threads added');
}
function pwToggle(id) {
  const i = $('#' + id);
  if (i) i.type = i.type === 'password' ? 'text' : 'password';
}
function suStep(n, live) {
  if (live) liveP();
  SU.step = n;
  render();
}
function suCat(k) {
  SU.cat = k;
  window._keepScroll = true;
  render();
}
function suPhotoClear() {
  SU.photo = null;
  $('#xup').innerHTML = upBox();
  liveP();
}
