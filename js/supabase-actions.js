// Introthread - Supabase sign-in and Thread actions (v107): the cloud versions of sign-in (doLogin, demoLogin, oauth,
// logout, su1, su2, su3) and of the Thread actions (answer, sendFollow, resolve, saveNote, delThread, newThread), plus the
// two later newThread wrappers from app-core.js (Full details + save to contacts, then tags). Moved out of js/app-core.js
// unchanged and in their original order (cleanup plan step 8b). Loads straight after supabase-data.js, so each version
// still replaces the base version in app-core.js and is still wrapped later by photo-upload.js (su3),
// google-calendar.js (oauth), app-routing.js (logout, doLogin, demoLogin), capture.js, contacts-import.js and
// admin-audit.js (newThread) and demo-mode.js (demoLogin). Nothing in app-core.js uses these while loading.

/* auth */
doLogin = function (e) {
  e.preventDefault();
  const em = $('#le').value.trim().toLowerCase(),
    pw = $('#lp').value;
  if (em === 'demo@introthread.com') {
    demoLogin();
    return false;
  }
  if (!SB) {
    $('#lerr').textContent = 'Accounts are not available right now. Try the demo account.';
    return false;
  }
  const b = e.target.querySelector('button:not([type="button"])');
  b.disabled = true;
  b.textContent = 'Logging in...';
  SB.auth.signInWithPassword({ email: em, password: pw }).then(async ({ data, error }) => {
    b.disabled = false;
    b.textContent = 'Log in';
    if (error) {
      $('#lerr').textContent = /confirm/i.test(error.message)
        ? 'Please confirm your email first. Check your inbox for the link.'
        : 'That email and password do not match.';
      return;
    }
    const r = await loadCloud(data.user);
    if (r === 'needs-profile') {
      go('#/signup');
      SU = { step: 2, name: '', email: em };
      render();
      return;
    }
    if (r) {
      save();
      toast('Welcome back, ' + me().name.split(' ')[0]);
      go('#/app');
    }
  });
  return false;
};
const _demoLogin = demoLogin;
demoLogin = async function () {
  if (SB && MODE === 'cloud') {
    await SB.auth.signOut();
    clearCloud();
  }
  MODE = 'demo';
  _demoLogin();
};
oauth = function (p) {
  toast(p + ' sign-in is coming soon. Please use email for now.');
};
logout = async function () {
  if (cloud()) await SB.auth.signOut();
  clearCloud();
  DB.session = null;
  MODE = null;
  save();
  toast('Logged out');
  go('#/');
};
const _su1 = su1;
su1 = function (e) {
  e.preventDefault();
  const em = $('#se').value.trim().toLowerCase();
  if (em === 'demo@introthread.com') {
    $('#serr').textContent = 'That email is reserved for the demo.';
    return false;
  }
  Object.assign(SU, { name: $('#sn').value.trim(), email: em, pwRaw: $('#sp').value, step: 2 });
  render();
  return false;
};
su2 = function (e) {
  e.preventDefault();
  const h = slug($('#sh').value);
  const next = () => {
    Object.assign(SU, {
      role: $('#sr').value.trim(),
      company: $('#sc').value.trim(),
      city: $('#sct').value.trim(),
      handle: h,
      bio: $('#sb').value.trim(),
      step: 3,
      theme: SU.theme || 'midnight'
    });
    render();
  };
  const taken = () => {
    $('#shh').textContent = 'That link is taken. Try another.';
    $('#shh').style.color = 'var(--bad)';
  };
  if (DB.users.some(u => u.handle === h)) return (taken(), false);
  if (!SB) {
    next();
    return false;
  }
  SB.rpc('handle_available', { p_handle: h }).then(({ data, error }) => {
    if (error) return fail(error);
    data ? next() : taken();
  });
  return false;
};
su3 = async function () {
  const prof = {
    handle: SU.handle,
    name: SU.name,
    role: SU.role,
    company: SU.company,
    city: SU.city,
    bio: SU.bio,
    theme: SU.theme || 'midnight'
  }; /* the photo lives in links.photo; profiles has no photo column */
  if (!SB) {
    toast('Accounts are not available right now.');
    return;
  }
  if (PENDING) {
    const { error } = await SB.from('profiles').insert(
      Object.assign({ id: PENDING.id }, prof, SU.photo ? { links: { photo: SU.photo } } : {})
    );
    if (error) return fail(error);
    const u = PENDING;
    PENDING = null;
    await loadCloud(u);
    SU = { step: 1 };
    save();
    go('#/app');
    return;
  }
  const { data, error } = await SB.auth.signUp({
    email: SU.email,
    password: SU.pwRaw,
    options: { data: { profile: prof }, emailRedirectTo: 'https://www.introthread.com/' }
  });
  if (error) {
    SU.step = 1;
    render();
    setTimeout(() => {
      const el = $('#serr');
      if (el)
        el.textContent = /registered/i.test(error.message)
          ? 'An account with this email already exists. Log in instead.'
          : error.message;
    }, 0);
    return;
  }
  const email = SU.email,
    pwTmp = SU.pwRaw;
  SU = { step: 1 };
  if (data.session) {
    const r = await loadCloud(data.user);
    if (r) {
      save();
      go('#/app');
      modal(
        `<div class="center"><div style="width:64px;height:64px;border-radius:50%;background:#e8f8f0;display:grid;place-items:center;margin:auto">${ic('check', 30, '#12a065', 3)}</div><h2 style="letter-spacing:-.8px">Your card is live</h2><p class="muted">introthread.com/${esc(prof.handle)}</p><button class="btn primary" data-on-click="closeModal();go('#/app/tap')">Start sharing</button></div>`
      );
    }
  } else {
    OTP = {
      kind: 'signup',
      email,
      handle: prof.handle,
      sent: Date.now(),
      err: '',
      msg: 'We emailed you a verification code. Enter it below to finish creating your account.'
    };
    SU = { step: 'code' };
    render();
  }
};
answer = async function (id, k) {
  const t = findThread(id);
  if (!(await upd('threads', id, { mine: k }))) return;
  t.mine = k;
  if (k) await addEvent(t, 'answer', 'You answered "What\'s next?"');
  save();
  render();
  if (k) toast(t.theirs ? 'Answers revealed' : 'Answer locked in privately');
};
sendFollow = async function (id) {
  const t = findThread(id);
  await addEvent(t, 'followup', 'Follow-up sent to ' + t.other.name.split(' ')[0]);
  save();
  toast('Follow-up logged');
  render();
};
resolve = async function (id, how) {
  const t = findThread(id);
  const now = new Date();
  if (!(await upd('threads', id, { resolved_at: now.toISOString(), resolved_how: how }))) return;
  t.resolvedAt = now.getTime();
  await addEvent(t, 'resolved', 'Thread resolved: ' + how.toLowerCase());
  save();
  toast('Thread resolved');
  render();
};
saveNote = async function (id) {
  const v = $('#note').value;
  if (!(await upd('threads', id, { note: v }))) return;
  findThread(id).note = v;
  save();
  toast('Note saved');
};
delThread = async function (id) {
  if (!confirm('Delete your side of this Thread? This cannot be undone.')) return;
  if (cloud()) {
    const { error } = await SB.from('threads').delete().eq('id', id);
    if (error) return fail(error);
  }
  DB.threads = DB.threads.filter(t => t.id !== id);
  save();
  toast('Thread deleted');
  go('#/app/threads');
};
newThread = function (e) {
  e.preventDefault();
  const rid = $('#tw').value,
    room = DB.rooms.find(r => r.id === rid);
  const where = room ? room.name : $('#tw2').value.trim() || 'In person';
  const o = {
      name: $('#tn').value.trim(),
      role: $('#tr').value.trim() || 'Professional',
      company: $('#tc').value.trim(),
      email: $('#te').value.trim()
    },
    note = $('#tx').value.trim();
  if (!cloud()) {
    const t = {
      id: uid(),
      ownerId: DB.session,
      other: o,
      where,
      note,
      createdAt: Date.now(),
      confirmed: false,
      mine: null,
      theirs: null,
      resolvedAt: null,
      roomId: room ? room.id : null,
      events: [{ k: 'tap', at: Date.now(), text: 'Thread started at ' + where }]
    };
    DB.threads.push(t);
    save();
    toast('Thread started');
    go('#/app/thread/' + t.id);
    return false;
  }
  SB.from('threads')
    .insert({
      owner_id: DB.session,
      other_name: o.name,
      other_role: o.role,
      other_company: o.company,
      other_email: o.email,
      where_met: where,
      note,
      room_id: room ? room.id : null
    })
    .select()
    .single()
    .then(async ({ data, error }) => {
      if (error) return fail(error);
      const t = mapThread(data);
      DB.threads.push(t);
      await addEvent(t, 'tap', 'Thread started at ' + where);
      copy(threadLink(t), 'Thread started. Confirm link copied, send it to ' + o.name.split(' ')[0]);
      go('#/app/thread/' + t.id);
    });
  return false;
};

/* wrap newThread: Full details + save to contacts */
const _ntX = newThread;
newThread = function (e) {
  const v = id => {
    const x = $('#' + id);
    return x ? x.value.trim() : '';
  };
  const o = { name: v('tn'), email: v('te'), role: v('tr'), company: v('tc'), where: v('tw2') };
  if (!o.name) {
    e.preventDefault();
    toast('Add their name to start a Thread');
    return false;
  }
  if (TAPM === 'f') {
    const extra = [v('tli') ? 'LinkedIn: ' + v('tli') : '', v('tfu') ? 'Follow up in ' + v('tfu') : '']
      .filter(Boolean)
      .join(' · ');
    if (extra && $('#tx'))
      $('#tx').value = ($('#tx').value.trim() ? $('#tx').value.trim() + ' · ' : '') + extra;
  }
  if ($('#tsave') && $('#tsave').checked) {
    try {
      tapVcf(o);
    } catch (_) {}
  }
  return _ntX.call(this, e);
};

/* tags: save the chosen tags once the new Thread exists (saveTags stays in app-core.js) */
const _ntT = newThread;
newThread = function (e) {
  const tags = TSEL.slice();
  const before = new Set(DB.threads.map(t => t.id));
  const r = _ntT.call(this, e);
  if (tags.length) {
    let n = 0;
    const iv = setInterval(() => {
      const t = DB.threads.find(x => !before.has(x.id) && x.ownerId === DB.session);
      if (t) {
        clearInterval(iv);
        saveTags(t, tags).then(() => {
          window._keepScroll = true;
          render();
        });
      } else if (++n > 50) clearInterval(iv);
    }, 200);
  }
  TSEL = [];
  return r;
};
