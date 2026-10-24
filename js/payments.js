// Introthread - Server features and payments (v25-v26d): email notify, AI drafts, PostHog with consent,
// Paystack checkout/verify/manage/sync, Billing refresh from the server. Moved out of index.html in v50 (code split step 2).
// Loaded first of the /js files. Uses the main script's globals (render, DB, SB, bGet, bUpgrade, ...).

/* ===== v25 server features (each turns on only when its key is set in Vercel) ===== */
let IT_SRV = null;
function itStatus() {
  if (IT_SRV) return IT_SRV;
  IT_SRV = fetch('/api/status')
    .then(r => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  return IT_SRV;
}
async function itApi(path, body) {
  try {
    if (!cloud() || !SB) return null;
    const { data } = await SB.auth.getSession();
    const s = data && data.session;
    if (!s) return null;
    const r = await fetch('/api/' + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + s.access_token,
        apikey: CFG.supabaseAnonKey || ''
      },
      body: JSON.stringify(body || {})
    });
    let j = {};
    try {
      j = await r.json();
    } catch (e) {}
    return Object.assign({ status: r.status }, j);
  } catch (e) {
    return null;
  }
}
/* v123: "You matched" email. The server checks the answers really match and sends once per Thread. */
function itMatchGuest(tok) {
  try {
    fetch('/api/match-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tok })
    }).catch(() => {});
  } catch (e) {}
}
/* Analytics: PostHog, only after consent, only when a key is in config.js. No emails or names are sent. */
let IT_PH = false;
function itConsent() {
  try {
    return localStorage.getItem('it_consent');
  } catch (e) {
    return null;
  }
}
function itPHLoad() {
  if (IT_PH || !CFG.posthogKey || itConsent() !== 'yes') return;
  IT_PH = true;
  const host = CFG.posthogHost || 'https://eu.i.posthog.com';
  const sc = document.createElement('script');
  sc.async = true;
  sc.src = host.replace('.i.posthog.com', '-assets.i.posthog.com') + '/static/array.js';
  sc.onload = () => {
    try {
      window.posthog.init(CFG.posthogKey, {
        api_host: host,
        person_profiles: 'identified_only',
        capture_pageview: 'history_change',
        autocapture: false,
        disable_session_recording: true,
        persistence: 'localStorage'
      });
      if (DB && DB.session) window.posthog.identify(DB.session);
    } catch (e) {}
  };
  document.head.appendChild(sc);
}
function itTrack(ev, props) {
  try {
    if (ev && IT_PH && window.posthog && window.posthog.capture) window.posthog.capture(ev, props || {});
  } catch (e) {}
}
function itConsentSet(v) {
  try {
    localStorage.setItem('it_consent', v);
  } catch (e) {}
  const b = document.querySelector('.it-cons');
  if (b) b.remove();
  if (v === 'yes') itPHLoad();
}
function itConsentAsk() {
  if (
    !CFG.posthogKey ||
    itConsent() ||
    document.querySelector('.it-cons') ||
    /^\/admin/.test(location.pathname)
  )
    return;
  const d = document.createElement('div');
  d.className = 'it-cons';
  d.setAttribute('role', 'region');
  d.setAttribute('aria-label', 'Analytics choice');
  d.innerHTML =
    '<p>Can we count how people use Introthread, so we can improve it? No ads, no selling data. <a href="/privacy#cookies">Privacy</a></p><div><button type="button" class="n" data-on-click="itConsentSet(\'no\')">No thanks</button><button type="button" class="y" data-on-click="itConsentSet(\'yes\')">Allow</button></div>';
  document.body.appendChild(d);
}
/* Thread invitation email + funnel events */
const _addEv25 = addEvent;
addEvent = async function (t, k, text) {
  const r = await _addEv25.apply(this, arguments);
  try {
    if (k === 'tap' && cloud() && t && t.id) {
      itApi('notify', { thread_id: t.id }).then(x => {
        if (x && x.sent)
          toast('Confirm link emailed to ' + String((t.other && t.other.name) || 'them').split(' ')[0]);
      });
    }
    itTrack(
      {
        tap: 'thread_started',
        answer: 'thread_answered',
        resolved: 'thread_resolved',
        followup: 'followup_sent',
        confirm: 'thread_confirmed'
      }[k],
      { room: !!(t && t.roomId) }
    );
  } catch (e) {}
  return r;
};
/* AI follow-up: a "Rewrite with AI" button under the drafted follow-up */
function itThreadId() {
  const m = (location.pathname + location.hash).match(/thread\/([0-9a-f-]{36})/i);
  return m ? m[1] : null;
}
async function itAiRewrite(b) {
  const id = itThreadId(),
    d = document.getElementById('draft');
  if (!id || !d) return;
  b.disabled = true;
  const o = b.textContent;
  b.textContent = 'Writing...';
  const r = await itApi('ai-draft', { thread_id: id });
  b.disabled = false;
  b.textContent = o;
  if (r && r.draft) {
    d.value = r.draft;
    d.dispatchEvent(new Event('input', { bubbles: true }));
    toast('New draft ready. Edit before sending.');
    itTrack('ai_draft_used');
  } else
    toast(
      r && r.error === 'ai_off'
        ? 'AI drafts are off in Settings.'
        : 'Could not write a draft right now. Your original draft is unchanged.'
    );
}
function itAiBtn() {
  const d = document.getElementById('draft');
  if (!d || d.dataset.itai || !cloud() || !itThreadId()) return;
  const u = me();
  if (u && (u.prefs || {}).ai === false) return;
  d.dataset.itai = '1';
  itStatus().then(s => {
    if (!s || !s.ai || !document.body.contains(d) || d.parentNode.querySelector('.it-ai')) return;
    d.insertAdjacentHTML(
      'afterend',
      '<div class="it-ai"><button type="button" class="btn secondary sm" data-on-click="itAiRewrite(this)">Rewrite with AI</button><small>Uses this Thread only. Never sent without you.</small></div>'
    );
  });
}
const _render25s = render;
render = function () {
  const r = _render25s.apply(this, arguments);
  setTimeout(() => {
    try {
      itAiBtn();
      itConsentAsk();
      itPHLoad();
    } catch (e) {}
  }, 0);
  return r;
};

/* ===== v26 Paystack billing (on only when /api/status says pay:true) ===== */
let IT_SV = {};
try {
  itStatus().then(x => {
    IT_SV = x || {};
  });
} catch (e) {}
async function itPay(interval, b) {
  if (b) {
    b.disabled = true;
    b.textContent = 'Opening secure payment...';
  }
  const r = await itApi('pay-init', { interval });
  if (r && r.url) {
    itTrack('checkout_started', { interval });
    location.href = r.url;
    return;
  }
  if (b) {
    b.disabled = false;
    b.textContent = 'Continue to secure payment';
  }
  toast(
    r && r.error === 'auth'
      ? 'Please sign in again.'
      : 'Payment could not start. Nothing was charged. Try again in a moment.'
  );
}
const _bUp26 = bUpgrade;
bUpgrade = function (interval) {
  if (!(cloud() && IT_SV.pay)) return _bUp26.apply(this, arguments);
  interval = interval || BINT;
  if (isPro()) return toast('You already have Pro');
  modal(`<div class="bl-co"><div class="row between"><h3>Upgrade to Pro</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div>
 <ul class="bl-incl">${PLANS.pro.features
   .slice(1)
   .map(f => `<li>${sv('check', 13, 'currentColor', 2.6)}${f}</li>`)
   .join('')}</ul>
 <button type="button" class="x-btn lg block" data-on-click="itPay('${interval}',this)">Continue to secure payment</button>
 <p class="bl-fine c">${sv('lock', 12)} Card payment on Paystack's secure page. Charged in Kenyan shillings; your bank converts it. Renews ${interval === 'year' ? 'yearly' : 'monthly'} until you cancel.</p></div>`);
};
const _stMan26 = stManage;
stManage = async function () {
  if (!(cloud() && IT_SV.pay && isPro())) return _stMan26.apply(this, arguments);
  toast('Opening your subscription...');
  const r = await itApi('pay-manage', {});
  if (r && r.url) {
    location.href = r.url;
    return;
  }
  return _stMan26.apply(this, arguments);
};
(function () {
  const q = new URLSearchParams(location.search),
    pay = q.get('pay');
  if (!pay) return;
  const ref = q.get('reference') || q.get('trxref');
  const clean = () => {
    try {
      history.replaceState(null, '', location.pathname + location.hash);
    } catch (e) {}
  };
  if (pay === 'cancel') {
    clean();
    setTimeout(() => toast('Payment cancelled. Nothing was charged.'), 800);
    return;
  }
  if (pay !== 'done' || !ref) return;
  let n = 0;
  const go2 = async () => {
    if (!me() || !cloud()) {
      if (n++ < 40) return setTimeout(go2, 250);
      return;
    }
    const r = await itApi('pay-verify', { reference: ref });
    clean();
    if (r && r.ok && r.kind === 'rooms') {
      await raPasses();
      await itProfReload();
      toast('Room pass added. You can create another Room.');
      return;
    }
    if (r && r.ok) {
      const u = me();
      u.plan = 'Pro';
      try {
        save();
      } catch (e) {}
      await itProfReload();
      IT_SYNCED = true;
      toast('Welcome to Pro. Your receipt is in Billing.');
      itTrack('subscribed', { interval: r.interval });
    } else
      toast(
        r && r.status && r.status !== 'success'
          ? 'The payment did not go through. Nothing was charged.'
          : q.get('kind') === 'rooms'
            ? 'We are confirming your payment. Your Room pass will appear in a minute.'
            : 'We are confirming your payment. Pro will switch on in a minute.'
      );
  };
  go2();
})();

/* ===== v26b Paystack: refresh plan and receipts from the server (Billing reads prefs.billing) ===== */
async function itProfReload() {
  try {
    const u = me();
    if (!u || !cloud()) return false;
    let { data, error } = await SB.rpc('my_profile');
    if (error || !data || !data.id)
      ({ data } = await SB.from('profiles').select('plan,prefs').eq('id', u.id).single());
    if (!data) return false;
    u.plan = data.plan || u.plan;
    u.prefs = data.prefs || u.prefs;
    try {
      save();
    } catch (e) {}
    window._keepScroll = true;
    render();
    return true;
  } catch (e) {
    return false;
  }
}
let IT_SYNCED = false;
async function itPaySync(force) {
  if (IT_SYNCED && !force) return;
  IT_SYNCED = true;
  const s = await itStatus();
  if (!s || !s.pay || !cloud()) return null;
  const r = await itApi('pay-sync', {});
  if (r && r.synced) await itProfReload();
  return r;
}
(function () {
  let n = 0;
  const t = () => {
    if (me() && cloud()) return itPaySync();
    if (n++ < 60) setTimeout(t, 500);
  };
  setTimeout(t, 1500);
})();

/* v26c: "Check for payments" in Billing, with a clear result */
async function itPayCheck(b) {
  if (b) {
    b.disabled = true;
    b.textContent = 'Checking...';
  }
  const r = await itPaySync(true);
  if (b) {
    b.disabled = false;
    b.textContent = 'Check for payments';
  }
  if (!r) return toast('Card payments are not switched on yet.');
  if (r.synced) return toast('Payment found. Pro is on and your receipt is below.');
  toast(
    r.reason === 'no_customer'
      ? 'No Paystack payments found for this email yet.'
      : r.reason === 'none'
        ? 'Paystack knows this email but shows no completed payments for it yet.'
        : r.error
          ? 'Could not check payments (' + r.error + '). Try again in a minute.'
          : 'No completed payments found yet.'
  );
}
const _bInvBox26 = bInvoicesBox;
bInvoicesBox = function (b) {
  const h = _bInvBox26.apply(this, arguments);
  if (!(cloud() && IT_SV.pay)) return h;
  return (
    h +
    '<div class="it-ai" style="margin-top:12px"><button type="button" class="btn secondary sm" data-on-click="itPayCheck(this)">Check for payments</button><small>Paid but no receipt? This checks Paystack again.</small></div>'
  );
};

/* v26d: one source of truth for the plan in Billing. If the server has switched the account to Pro (profiles.plan),
   Billing shows Pro even before the receipt details arrive. Demo accounts are unchanged. */
const _bGet26 = bGet;
bGet = function (u) {
  const b = _bGet26.apply(this, arguments);
  try {
    u = u || me();
    if (
      cloud() &&
      u &&
      String(u.plan || '').toLowerCase() === 'pro' &&
      !(b.plan === 'pro' && ['active', 'trialing', 'past_due'].includes(b.status))
    ) {
      b.plan = 'pro';
      b.status = 'active';
    }
    if (
      cloud() &&
      u &&
      String(u.plan || '').toLowerCase() !== 'pro' &&
      b.plan === 'pro' &&
      b.provider === 'paystack' &&
      b.status === 'canceled'
    ) {
      b.plan = 'free';
    }
  } catch (e) {}
  return b;
};
