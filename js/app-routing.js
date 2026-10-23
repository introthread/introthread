// Introthread - Signed-in routing (v17), one-time code length (v28) and email codes on sign-up and password login (v18).
// Moved out of index.html in v53 (code split step 5). Load order matters: see the <script> list at the end of index.html.

/* ===== v17 Signed-in routing: stay inside the account ===== */
const IT_NEXT = 'it_next',
  IT_SITE = 'it_site';
function itSafeNext(n) {
  return typeof n === 'string' && /^\/app(\/[\w\-\/]*)?$/.test(n.split('?')[0]) ? n : null;
}
function itTakeNext() {
  try {
    const n = itSafeNext(sessionStorage.getItem(IT_NEXT));
    sessionStorage.removeItem(IT_NEXT);
    return n;
  } catch (_) {
    return null;
  }
}
function itSplash(msg) {
  return `<div class="it-splash" role="status" aria-live="polite"><span class="x-logo"><span class="x-lm"><i></i><i></i></span><span>intro<b>thread</b></span></span><span class="it-spin" aria-hidden="true"></span><p>${msg || 'Loading your account...'}</p></div>`;
}
/* show a branded loader (not the marketing page or login) while a saved session is restored */
try {
  if (SB && !AUTH_CB && /^\/app(\/|$)/.test(location.pathname) && !me()) {
    $('#root').innerHTML = itSplash();
  }
} catch (_) {}
try {
  if (/[?&]site=1/.test(location.search)) sessionStorage.setItem(IT_SITE, '1');
} catch (_) {}
const _go17 = go;
go = function (h) {
  let p = String(h).replace(/^#/, '') || '/';
  if (/^\/app\/?$/.test(p) && me()) {
    const n = itTakeNext();
    if (n) p = n;
  }
  if (p.startsWith('/app')) {
    try {
      sessionStorage.removeItem(IT_SITE);
    } catch (_) {}
  }
  return _go17(p);
};
const _render17 = render;
render = function () {
  const path = location.pathname || '/',
    p = path.split('/').filter(Boolean);
  const authed = !!me();
  if (p[0] === 'app' && !authed && !(typeof PENDING !== 'undefined' && PENDING)) {
    try {
      sessionStorage.setItem(IT_NEXT, path + location.search);
    } catch (_) {}
    history.replaceState(null, '', '/login');
    return _render17();
  }
  if (
    (p[0] === 'login' || p[0] === 'signup') &&
    authed &&
    !(
      p[0] === 'signup' &&
      typeof SU !== 'undefined' &&
      SU.step > 1 &&
      typeof PENDING !== 'undefined' &&
      PENDING
    )
  ) {
    history.replaceState(null, '', itTakeNext() || '/app');
    return _render17();
  }
  if (!p[0] && authed) {
    let site = false;
    try {
      site = sessionStorage.getItem(IT_SITE) === '1';
    } catch (_) {}
    if (!site) {
      history.replaceState(null, '', '/app');
      return _render17();
    }
  }
  return _render17();
};
/* sign out: return to the login page with a clear message; handle sessions ended elsewhere */
logout = async function () {
  try {
    if (cloud()) await SB.auth.signOut();
  } catch (_) {}
  clearCloud();
  DB.session = null;
  MODE = null;
  save();
  try {
    sessionStorage.removeItem(IT_NEXT);
    sessionStorage.removeItem(IT_SITE);
    sessionStorage.removeItem('it_gtok');
  } catch (_) {}
  history.replaceState(null, '', '/login');
  render();
  toast('You have been signed out');
};
if (SB) {
  SB.auth.onAuthStateChange(ev => {
    if (ev === 'SIGNED_OUT' && MODE === 'cloud') {
      clearCloud();
      DB.session = null;
      MODE = null;
      save();
      if (location.pathname.startsWith('/app')) {
        try {
          sessionStorage.setItem(IT_NEXT, location.pathname);
        } catch (_) {}
        history.replaceState(null, '', '/login');
        render();
        toast('Your session ended. Please log in again.');
      }
    }
  });
}
/* marketing pages when signed in: show the way back to the account instead of sign-up buttons */
const _mnav17 = mnav;
mnav = function (on) {
  let h = _mnav17(on);
  const u = me();
  if (!u) return h;
  const dash = `<a href="/app" class="x-btn it-dash">${avatarC(u, 26)}<span>Go to dashboard</span>${sv('arrow', 15)}</a>`;
  let done = false;
  h = h.replace(/<a href="#?\/signup" class="x-btn[^"]*"[^>]*>[\s\S]*?<\/a>/g, () => {
    if (done) return '';
    done = true;
    return dash;
  });
  if (!done) h = h.replace('</nav>', '</nav>' + dash);
  return h;
};
/* in-app logo goes to the dashboard, not the public home page */
const _shell17 = shell;
shell = function (on, inner) {
  let h = _shell17(on, inner);
  return h.replace(
    /(<aside class="sidebar">[\s\S]*?)href="#?\/"/,
    '$1href="/app" aria-label="Introthread dashboard"'
  );
};
/* account menu: link to the public website without being bounced back */
const _acct17 = acctMenu;
acctMenu = function (btn, dir) {
  _acct17(btn, dir);
  const m = document.getElementById('acm');
  if (!m) return;
  const g = [...m.querySelectorAll('.am-g')];
  const help = g[g.length - 2];
  if (help && !m.querySelector('[data-site]')) {
    help.insertAdjacentHTML(
      'beforeend',
      `<button type="button" role="menuitem" class="am-it" data-site data-on-click="amSiteHome('${IT_SITE}')">${sv('globe', 18)}<span>Introthread website</span></button>`
    );
  }
};

/* v28 one-time codes: Supabase sends 8 digits by default; accept 6 to 10 and auto-submit at the configured length */
const OTP_LEN = (window.INTROTHREAD_CONFIG || {}).otpLength || 8;
/* ===== v18 Email codes: verify on sign-up, code on every password login, 20-minute idle sign-out ===== */
let OTP = null,
  LG = null;
const otpMask = e => {
  const [a, b] = String(e || '').split('@');
  return (a ? a[0] + '\u2022\u2022\u2022' : '') + '@' + (b || '');
};
function otpLeft() {
  return OTP ? Math.max(0, 60 - Math.floor((Date.now() - OTP.sent) / 1000)) : 0;
}
function otpTick() {
  const b = $('#otpres');
  if (!b) return;
  const s = otpLeft();
  b.disabled = s > 0;
  b.textContent = s > 0 ? `Resend code in ${s}s` : 'Resend code';
  if (s > 0) setTimeout(otpTick, 1000);
}
function otpView(o) {
  const signup = o.kind === 'signup';
  setTimeout(() => {
    const i = $('#otpin');
    if (i) i.focus();
    otpTick();
  }, 30);
  return `<div class="otp">${signup ? `<div class="x-stepper otp-st"><div class="x-st-line"><i style="width:100%"></i></div>${['Create account', 'Your identity', 'Choose card', 'Confirm email'].map((l, i) => `<div class="x-st ${i < 3 ? 'done' : 'on'}"><span>${i < 3 ? sv('check', 12, '#fff', 3) : i + 1}</span><small>${l}</small></div>`).join('')}</div>` : ''}
 <span class="otp-ic">${sv(signup ? 'mail' : 'shield', 26)}</span><h1 class="x-ftitle">${signup ? 'Confirm your email' : 'Enter your sign-in code'}</h1>
 <p class="x-fsub">${signup ? 'We&rsquo;ve sent a verification code to' : 'For extra security, we&rsquo;ve emailed a sign-in code to'} <b>${esc(otpMask(o.email))}</b>. Enter it below to ${signup ? 'finish creating your account' : 'continue'}.</p>
 ${o.msg ? `<div class="otp-note ok" role="status">${sv('check', 15)} ${o.msg}</div>` : ''}<div class="otp-note err" id="otperr" role="alert" ${o.err ? '' : 'hidden'}>${esc(o.err || '')}</div>
 <form class="x-form" data-on-submit="return otpVerify(event)"><label class="x-f"><span>${signup ? 'Verification code' : 'Sign-in code'}</span><input id="otpin" class="otp-in" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="10" placeholder="${'0'.repeat(OTP_LEN)}" aria-describedby="otphint" required data-on-input="otpInput(this)"></label>
 <button class="x-btn lg block" id="otpgo">${signup ? 'Verify &amp; create account' : 'Verify &amp; continue'} ${sv('arrow', 17)}</button></form>
 <button type="button" class="x-btn ghost lg block otp-res" id="otpres" data-on-click="otpResend()">Resend code</button>
 <p class="x-alt">${signup ? 'Wrong email?' : 'Not you?'} <a href="#" data-on-click="event.preventDefault();otpCancel()">${signup ? 'Start over' : 'Use a different account'}</a></p>
 <p class="otp-sec">${sv('lock', 13)} Codes expire after a short time and can be used once.</p></div>`;
}
function otpShell(o) {
  return `<div class="x-auth" style="--sw:47%">${authSide(o.kind === 'signup' ? 1 : 0)}<main class="x-main"><div class="x-mi" style="--mw:460px">${otpView(o)}</div></main></div>`;
}
function otpErr(m) {
  const e = $('#otperr');
  if (OTP) OTP.err = m;
  if (e) {
    e.textContent = m;
    e.hidden = !m;
  }
}
async function otpVerify(e) {
  e.preventDefault();
  if (!OTP || window._otpBusy) return false;
  const code = ($('#otpin').value || '').trim();
  if (!/^\d{6,10}$/.test(code)) {
    otpErr('Enter the code from your email.');
    return false;
  }
  const b = $('#otpgo');
  window._otpBusy = true;
  b.disabled = true;
  const lab = b.innerHTML;
  b.textContent = 'Verifying...';
  otpErr('');
  try {
    const { data, error } = await SB.auth.verifyOtp({
      email: OTP.email,
      token: code,
      type: OTP.kind === 'signup' ? 'signup' : 'email'
    });
    if (error || !data || !data.session) {
      otpErr(
        /expired/i.test((error || {}).message || '')
          ? 'That code has expired. Tap Resend code for a new one.'
          : 'That code is not valid. Check the latest email and try again.'
      );
      return false;
    }
    window._otpPending = false;
    const kind = OTP.kind;
    OTP = null;
    LG = null;
    const r = await loadCloud(data.user);
    if (r === 'needs-profile') {
      SU = { step: 2, name: (data.user.user_metadata || {}).full_name || '', email: data.user.email };
      go('/signup');
      return false;
    }
    if (r) {
      save();
      itIdleMark();
      go('/app');
      toast(
        kind === 'signup'
          ? 'Your account is verified. Welcome to Introthread.'
          : 'Welcome back, ' + ((me() || {}).name || '').split(' ')[0]
      );
    }
  } catch (_) {
    otpErr('Something went wrong. Check your connection and try again.');
  } finally {
    window._otpBusy = false;
    const bb = $('#otpgo');
    if (bb) {
      bb.disabled = false;
      bb.innerHTML = lab;
    }
  }
  return false;
}
async function otpResend() {
  if (!OTP || otpLeft() > 0) return;
  const b = $('#otpres');
  b.disabled = true;
  b.textContent = 'Sending...';
  const { error } =
    OTP.kind === 'signup'
      ? await SB.auth.resend({
          type: 'signup',
          email: OTP.email,
          options: { emailRedirectTo: 'https://www.introthread.com/' }
        })
      : await SB.auth.signInWithOtp({ email: OTP.email, options: { shouldCreateUser: false } });
  if (error) {
    otpErr(
      /rate|seconds|many/i.test(error.message)
        ? 'Please wait a moment before requesting another code.'
        : error.message
    );
    b.disabled = false;
    b.textContent = 'Resend code';
    return;
  }
  OTP.sent = Date.now();
  OTP.msg = 'A new code is on its way. Use the latest email.';
  otpErr('');
  toast('New code sent');
  otpTick();
}
function otpCancel() {
  const k = OTP && OTP.kind;
  OTP = null;
  LG = null;
  window._otpPending = false;
  if (k === 'signup') {
    SU = { step: 1 };
    go('/signup');
  } else go('/login');
  render();
}
/* sign-up: stay on the sign-up screen and enter the code */
const _vSignup18 = vSignup;
vSignup = function () {
  if (SU && SU.step === 'code' && OTP && OTP.kind === 'signup') {
    document.body.classList.remove('x-open');
    return otpShell(OTP);
  }
  return _vSignup18();
};
/* login: password first, then a one-time code sent to the email */
const _vLogin18 = vLogin;
vLogin = function () {
  if (LG && OTP && OTP.kind === 'login') {
    document.body.classList.remove('x-open');
    return otpShell(OTP);
  }
  return _vLogin18();
};
const _loadCloud18 = loadCloud;
loadCloud = async function (user) {
  if (window._otpPending) return null;
  return _loadCloud18(user);
};
doLogin = function (e) {
  e.preventDefault();
  const em = $('#le').value.trim().toLowerCase(),
    pw = $('#lp').value;
  const er = $('#lerr');
  if (em === 'demo@introthread.com') {
    demoLogin();
    return false;
  }
  if (!SB) {
    er.textContent = 'Accounts are not available right now. Try the demo account.';
    return false;
  }
  const b = e.target.querySelector('button:not([type="button"])');
  b.disabled = true;
  const lab = b.innerHTML;
  b.textContent = 'Checking...';
  er.textContent = '';
  window._otpPending = true;
  (async () => {
    try {
      const { error } = await SB.auth.signInWithPassword({ email: em, password: pw });
      if (error) {
        window._otpPending = false;
        if (/confirm/i.test(error.message)) {
          OTP = {
            kind: 'signup',
            email: em,
            sent: 0,
            err: '',
            msg: 'Your email is not verified yet. Tap Resend code to get a new verification code.'
          };
          SU = { step: 'code' };
          go('/signup');
          return;
        }
        er.textContent = 'That email and password do not match.';
        return;
      }
      await SB.auth.signOut({ scope: 'local' });
      const r = await SB.auth.signInWithOtp({ email: em, options: { shouldCreateUser: false } });
      if (r.error) {
        window._otpPending = false;
        er.textContent = /rate|seconds|many/i.test(r.error.message)
          ? 'Too many code requests. Please wait a minute and try again.'
          : 'We could not send your sign-in code. Please try again.';
        return;
      }
      OTP = {
        kind: 'login',
        email: em,
        sent: Date.now(),
        err: '',
        msg: 'We&rsquo;ve emailed you a sign-in code. Please check your inbox.'
      };
      LG = { step: 'code' };
      render();
    } catch (_) {
      window._otpPending = false;
      er.textContent = 'Something went wrong. Check your connection and try again.';
    } finally {
      const bb = e.target.querySelector('button:not([type="button"])');
      if (bb) {
        bb.disabled = false;
        bb.innerHTML = lab;
      }
    }
  })();
  return false;
};
/* idle sign-out after 20 minutes, with a 2-minute warning */
const IT_IDLE = 20 * 60 * 1000,
  IT_WARN = 2 * 60 * 1000,
  IT_LAST = 'it_last';
let _idleW = null,
  _idleMarkAt = 0;
function itIdleMark(force) {
  const n = Date.now();
  if (!force && n - _idleMarkAt < 10000) return;
  _idleMarkAt = n;
  try {
    localStorage.setItem(IT_LAST, String(n));
  } catch (_) {}
  if (_idleW) {
    _idleW = null;
    const m = $('#idlem');
    if (m) closeModal();
  }
}
function itIdleLast() {
  try {
    return +localStorage.getItem(IT_LAST) || 0;
  } catch (_) {
    return 0;
  }
}
async function itIdleOut() {
  _idleW = null;
  try {
    closeModal();
  } catch (_) {}
  await logout();
  try {
    localStorage.removeItem(IT_LAST);
  } catch (_) {}
  toast('You were signed out after 20 minutes of inactivity');
}
function itIdleCheck() {
  if (!me()) return;
  const last = itIdleLast();
  if (!last) {
    itIdleMark(true);
    return;
  }
  const idle = Date.now() - last;
  if (idle >= IT_IDLE) {
    itIdleOut();
    return;
  }
  if (idle >= IT_IDLE - IT_WARN) {
    const left = Math.ceil((IT_IDLE - idle) / 1000);
    if (!_idleW) {
      _idleW = 1;
      modal(
        `<div class="idle-m" id="idlem"><span class="otp-ic">${sv('lock', 24)}</span><h3>Are you still there?</h3><p>For your security, you will be signed out in <b id="idles">${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</b> because of inactivity.</p><div class="fu-b"><button type="button" class="t-how" data-on-click="itIdleOut()">Sign out now</button><button type="button" class="x-btn" data-on-click="itIdleMark(true);closeModal()">Stay signed in</button></div></div>`
      );
    } else {
      const s = $('#idles');
      if (s) s.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    }
  }
}
['mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'].forEach(ev =>
  document.addEventListener(
    ev,
    () => {
      if (me() && !_idleW) itIdleMark();
    },
    { passive: true, capture: true }
  )
);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) itIdleCheck();
});
window.addEventListener('storage', e => {
  if (e.key === IT_LAST && _idleW) {
    _idleW = null;
    try {
      closeModal();
    } catch (_) {}
  }
});
setInterval(itIdleCheck, 1000);
const _render18 = render;
render = function () {
  if (me()) {
    const last = itIdleLast();
    if (last && Date.now() - last >= IT_IDLE) {
      itIdleOut();
      return;
    }
    if (!last) itIdleMark(true);
  }
  return _render18();
};
const _demo18 = demoLogin;
demoLogin = async function () {
  itIdleMark(true);
  return _demo18.apply(this, arguments);
};

/* v62: named handlers for sign-in codes and the site link (no inline JavaScript). */
function amSiteHome(key) {
  amClose();
  try {
    sessionStorage.setItem(key, '1');
  } catch (_) {}
  go('/');
}
function otpInput(el) {
  el.value = el.value.replace(/\D/g, '');
  if (el.value.length >= OTP_LEN && !window._otpBusy) el.form.requestSubmit();
}
