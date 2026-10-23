// Introthread - Admin Settings (v40, screen 7 of 9). Prefix sg / SGX.
// Moved out of index.html in v52 (code split step 4). Load order matters: see the <script> list at the end of index.html.

/* ==== Admin redesign v40: screen 7 of 9, Settings (prefix sg / SGX) ==== */
let SGX = { justSaved: null, hist: null };
Object.assign(SV, {
  sgmega:
    '<path d="M4 10v4a1 1 0 0 0 1 1h2l5 4V5L7 9H5a1 1 0 0 0-1 1z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  sgwrench:
    '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  sgcard:
    '<rect x="3" y="5.5" width="18" height="13" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 15.5c.6-1.3 1.7-2 3-2s2.4.7 3 2M14 10h4M14 13h3"/>',
  sgimport: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14"/>',
  sgmail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>'
});
const SG_FEAT = [
  [
    'card_scan',
    'Business card scan',
    'Let people photograph a business card to fill in a new Thread.',
    'sgcard'
  ],
  [
    'contact_import',
    'Contact import',
    'Let people import contacts from LinkedIn, Google, Outlook and phone (.vcf) files.',
    'sgimport'
  ],
  ['linkedin_import', 'LinkedIn import', 'Accept LinkedIn Connections.csv files in contact import.', 'li'],
  ['rooms', 'Rooms', 'Rooms for events, meetings and communities.', 'cal']
];
const sgOn = k => {
  const f = APPSET.features || {};
  return f[k] !== false;
};
const sgCan = () => admOk(['owner', 'admin']),
  sgOwner = () => admOk(['owner']);
/* make the feature switches real in the app (they were stored but not applied before v40) */
const sgOff = (k, msg) => {
  if (sgOn(k)) return false;
  toast(msg);
  return true;
};
if (typeof capCard === 'function') {
  const _f = capCard;
  capCard = function () {
    if (sgOff('card_scan', 'Business card scan is turned off for now.')) return;
    return _f.apply(this, arguments);
  };
}
if (typeof ctImport === 'function') {
  const _f = ctImport;
  ctImport = function () {
    if (sgOff('contact_import', 'Contact import is turned off for now.')) return;
    return _f.apply(this, arguments);
  };
}
if (typeof importParse === 'function') {
  const _f = importParse;
  importParse = function () {
    const r = _f.apply(this, arguments);
    if (r && r.source === 'LinkedIn' && !sgOn('linkedin_import')) {
      toast('LinkedIn import is turned off for now.');
      return { source: r.source, rows: [] };
    }
    return r;
  };
}
const sgRoomsOff = () => `<div class="card empty">Rooms are turned off for now. Your Threads are safe.</div>`;
if (typeof vRooms === 'function') {
  const _f = vRooms;
  vRooms = function () {
    if (!sgOn('rooms')) return shell('rooms', sgRoomsOff());
    return _f.apply(this, arguments);
  };
}
if (typeof vRoom === 'function') {
  const _f = vRoom;
  vRoom = function () {
    if (!sgOn('rooms')) return shell('rooms', sgRoomsOff());
    return _f.apply(this, arguments);
  };
}
/* maintenance screen shows the staff message when one is set */
if (typeof vMaint === 'function') {
  const _f = vMaint;
  vMaint = function () {
    const h = _f.apply(this, arguments),
      m = String(APPSET.maintenance_message || '').trim();
    return m ? h.replace(/<p>[\s\S]*?<\/p>/, `<p>${esc(m)}</p>`) : h;
  };
}
const _alt40 = admLoadTab;
admLoadTab = async function () {
  if (ADM.stage === 'ready' && ADM.tab === 'settings') return sgLoad(true);
  return _alt40.apply(this, arguments);
};
if (typeof admGo === 'function') {
  const _sgGo = admGo;
  admGo = function (t) {
    if (
      ADM.tab === 'settings' &&
      t !== 'settings' &&
      sgDirtyAny() &&
      !confirm('You have unsaved settings. Leave without saving?')
    )
      return;
    return _sgGo.apply(this, arguments);
  };
}
window.addEventListener('beforeunload', e => {
  if (ADM && ADM.tab === 'settings' && document.getElementById('sgwrap') && sgDirtyAny()) {
    e.preventDefault();
    e.returnValue = '';
  }
});
/* load */
async function sgLoad(keep) {
  const dr = {};
  if (keep && $('#sgwrap')) {
    if (SGX.justSaved !== 'ann' && sgAnnDirty()) dr.ann = sgAnnRead();
    if (SGX.justSaved !== 'maint' && sgMaintDirty()) dr.maint = sgMaintRead();
  }
  SGX.justSaved = null;
  if (!$('#sgwrap')) admBody(sgSkel());
  try {
    if (!SB) throw new Error('Database not connected');
    const { data, error } = await SB.from('app_settings').select('key,value,updated_at');
    if (error) throw error;
    APPSET = { _loaded: true };
    SGX.at = {};
    (data || []).forEach(r => {
      APPSET[r.key] = r.value;
      SGX.at[r.key] = r.updated_at;
    });
    if (ADM.tab !== 'settings') return;
    admBody(sgPage());
    if (dr.ann) {
      $('#sgatext').value = dr.ann.text;
      $('#sgatone').value = dr.ann.tone;
      $('#sgaon').checked = dr.ann.on;
    }
    if (dr.maint) {
      $('#sgmon').checked = dr.maint.on;
      $('#sgmmsg').value = dr.maint.msg;
    }
    sgAnnInput();
    sgMaintInput();
  } catch (e) {
    admBody(
      sgHead() +
        `<div class="ix-card ix-fail" role="alert">${sv('alert', 22)}<div><b>Settings could not load</b><p>${esc((e && e.message) || 'Unknown error')}</p></div><button type="button" class="ix-btn" data-on-click="sgLoad()">${sv('refresh', 16)} Try again</button></div>`
    );
  }
}
function sgHead() {
  return `<div class="ix-h"><div><h1>Settings</h1><p>Configure how Introthread works, manage features and control security.</p></div><div class="ix-hc"><button type="button" class="ix-btn" data-on-click="sgHist()">${sv('plhist', 17)} View changes log</button></div></div>`;
}
function sgSkel() {
  return (
    sgHead() +
    `<div class="sg-g"><div class="ix-card sk" style="height:340px"></div><div class="ix-card sk" style="height:340px"></div><div class="ix-card sk" style="height:320px"></div><div class="ix-card sk" style="height:320px"></div></div>`
  );
}
const sgWhen = k => (SGX.at && SGX.at[k] ? `Last changed ${fmtD(SGX.at[k])} ${fmtT(SGX.at[k])}` : '');
const sgSw = (id, on, fn, lab, dis) =>
  `<label class="sg-sw"><input type="checkbox" id="${id}" ${on ? 'checked' : ''} data-on-change="${fn}" ${dis ? 'disabled' : ''}><span class="pl-swt" aria-hidden="true"></span><span class="sr">${lab}</span></label>`;
const sgSecH = (ic, tone, t, p, right) =>
  `<div class="sg-sh"><span class="sg-ic t-${tone}w" aria-hidden="true">${sv(ic, 22)}</span><div><h2>${t}</h2><p>${p}</p></div>${right || ''}</div>`;
function sgPage() {
  const ed = sgCan();
  return `<div id="sgwrap" class="sg">${sgHead()}${ed ? '' : `<div class="pl-ro">${sv('lock', 16)} You can view settings. Only owners and admins can change them.</div>`}
 <div class="sg-g">${sgAnn()}${sgMaint()}${sgFeat()}${sgSec()}</div>
 <p class="sg-foot">${sv('info', 15)} Every change asks for a reason and is recorded in the audit log. Settings apply to everyone the next time the app loads.</p></div>`;
}
/* announcement */
function sgAnn() {
  const a = APPSET.announcement || {},
    ed = sgCan(),
    dis = ed ? '' : ' disabled';
  return `<section class="ix-card sg-sec" aria-labelledby="sgat">${sgSecH('sgmega', 'b', '<span id="sgat">Announcement banner</span>', 'Show a message at the top of the app until each person closes it.', `<span class="sg-pill" id="sgast"></span>`)}
 <div class="pl-f"><label for="sgatext">Message</label><div class="pl-in np sg-ta" id="sgaw"><textarea id="sgatext" rows="3" maxlength="160" placeholder="e.g. New: import your LinkedIn connections" data-on-input="sgAnnInput()"${dis}>${esc(a.text || '')}</textarea></div><div class="sg-cnt"><small class="pl-err" id="sgaerr" role="alert"></small><small id="sgacnt">0 / 160</small></div></div>
 <div class="pl-2"><div class="pl-f"><label for="sgatone">Banner style</label><label class="md-sel sg-sel">${sv('info', 17)}<select id="sgatone" data-on-change="sgAnnInput()"${dis}><option value="info" ${a.tone !== 'warn' ? 'selected' : ''}>Information</option><option value="warn" ${a.tone === 'warn' ? 'selected' : ''}>Warning</option></select>${sv('chevd', 16)}</label></div>
 <div class="pl-f"><span class="sg-lab" id="sgaonl">Show banner</span><div class="sg-swr">${sgSw('sgaon', a.on, 'sgAnnInput()', 'Show banner', !ed)}<span id="sgaonx" class="ix-mu"></span></div></div></div>
 <div class="sg-pv"><span class="sg-lab">Preview</span><div class="sg-pvb"><div class="ann sg-ann" id="sgapv" aria-hidden="true"><span></span><button type="button" tabindex="-1">&times;</button></div></div></div>
 <small class="ix-mu sg-when">${sgWhen('announcement')}</small>
 ${ed ? `<div class="pl-ft"><button type="button" class="ix-btn pri" id="sgasv" data-on-click="sgAnnSave()" disabled>${sv('plsave', 17)} Save announcement</button><button type="button" class="ix-btn" id="sgars" hidden data-on-click="sgAnnReset()">${sv('plundo', 16)} Undo</button><span class="pl-st ok" id="sgasst" role="status"></span></div>` : ''}</section>`;
}
const sgAnnRead = () => ({
  text: ($('#sgatext') || {}).value != null ? $('#sgatext').value.trim() : '',
  tone: ($('#sgatone') || {}).value || 'info',
  on: !!($('#sgaon') || {}).checked
});
const sgAnnOrig = () => {
  const a = APPSET.announcement || {};
  return { text: String(a.text || '').trim(), tone: a.tone === 'warn' ? 'warn' : 'info', on: !!a.on };
};
const sgAnnDirty = () => {
  if (!$('#sgatext')) return false;
  const a = sgAnnRead(),
    o = sgAnnOrig();
  return a.text !== o.text || a.tone !== o.tone || a.on !== o.on;
};
function sgAnnErr(a) {
  return a.on && !a.text
    ? 'Write a message before showing the banner'
    : a.text.length > 160
      ? 'Use 160 characters or fewer'
      : '';
}
function sgAnnInput() {
  if (!$('#sgatext')) return;
  const a = sgAnnRead(),
    o = sgAnnOrig(),
    er = sgAnnErr(a),
    d = sgAnnDirty();
  $('#sgacnt').textContent = a.text.length + ' / 160';
  $('#sgaerr').textContent = er;
  $('#sgaw').classList.toggle('bad', !!er);
  const pv = $('#sgapv');
  pv.className = 'ann sg-ann' + (a.tone === 'warn' ? ' warn' : '');
  pv.querySelector('span').textContent = a.text || 'Your message appears here';
  pv.classList.toggle('mt', !a.text);
  $('#sgaonx').textContent = a.on ? 'Visible to all users' : 'Hidden';
  const st = $('#sgast');
  const live = o.on && o.text;
  st.className = 'sg-pill ' + (live ? 'on' : 'off');
  st.innerHTML = live ? `${sv('dot', 12)} Live` : 'Not showing';
  const b = $('#sgasv'),
    r = $('#sgars'),
    ss = $('#sgasst');
  if (b) b.disabled = !d || !!er;
  if (r) r.hidden = !d;
  if (ss) {
    ss.className = 'pl-st ' + (!d ? 'ok' : er ? 'bad' : 'dirty');
    ss.innerHTML = !d
      ? `${sv('check', 16, 'currentColor', 2.2)} No changes to save`
      : er
        ? `${sv('alert', 15)} Fix the message`
        : `${sv('dot', 14)} Unsaved changes`;
  }
}
function sgAnnReset() {
  const o = sgAnnOrig();
  $('#sgatext').value = o.text;
  $('#sgatone').value = o.tone;
  $('#sgaon').checked = o.on;
  sgAnnInput();
}
function sgAnnSave() {
  if (!sgCan()) return;
  const a = sgAnnRead(),
    o = sgAnnOrig(),
    er = sgAnnErr(a);
  if (er || !sgAnnDirty()) return sgAnnInput();
  const what = !a.on
    ? o.on
      ? 'The banner will be hidden for everyone.'
      : 'The banner stays hidden; the message is saved as a draft.'
    : a.text !== o.text || !o.on
      ? 'Everyone will see this banner the next time they open the app, including people who closed the old one.'
      : 'The banner style changes for everyone.';
  admAsk({
    title: a.on ? 'Publish announcement' : 'Save announcement',
    body: what,
    extra: a.text
      ? `<div class="sg-pvb sg-pvm"><div class="ann sg-ann${a.tone === 'warn' ? ' warn' : ''}"><span>${esc(a.text)}</span><button type="button" tabindex="-1" aria-hidden="true">&times;</button></div></div>`
      : '',
    cta: a.on ? 'Publish' : 'Save',
    run: async r => {
      SGX.justSaved = 'ann';
      await arpc('admin_set_setting', {
        k: 'announcement',
        v: { on: a.on, text: a.text, tone: a.tone },
        reason: r
      });
      await appSetLoad(true);
    }
  });
}
/* maintenance */
function sgMaint() {
  const on = APPSET.maintenance === true,
    ed = sgCan(),
    dis = ed ? '' : ' disabled';
  return `<section class="ix-card sg-sec" aria-labelledby="sgmt">${sgSecH('sgwrench', 'o', '<span id="sgmt">Maintenance mode</span>', 'Pause the app for everyone except staff. Public cards stay visible.', `<span class="sg-pill ${on ? 'warn' : 'off'}">${on ? sv('alert', 13) + ' On: app paused' : 'Off'}</span>`)}
 <div class="sg-box"><span class="sg-ic t-bw" aria-hidden="true">${sv('lock', 22)}</span><div><b>When maintenance mode is on</b><p>Signed-in people see a "Back shortly" screen with your message and cannot use the app. Public cards and Thread guest pages stay open. Staff can still use the app and the admin area.</p></div></div>
 <div class="sg-swr">${sgSw('sgmon', on, 'sgMaintInput()', 'Enable maintenance mode', !ed)}<label for="sgmon" class="sg-swl">Enable maintenance mode</label></div>
 <div class="pl-f"><label for="sgmmsg">Message <span>(optional)</span></label><div class="pl-in np" id="sgmw"><input id="sgmmsg" type="text" maxlength="200" autocomplete="off" placeholder="e.g. Back at 6 pm Nairobi time." value="${esc(APPSET.maintenance_message || '')}" data-on-input="sgMaintInput()"${dis}></div><div class="sg-cnt"><small class="ix-mu">Shown on the maintenance screen. Leave empty for the standard message.</small><small id="sgmcnt">0 / 200</small></div></div>
 <small class="ix-mu sg-when">${sgWhen('maintenance')}</small>
 ${ed ? `<div class="pl-ft"><button type="button" class="ix-btn pri" id="sgmsv" data-on-click="sgMaintSave()" disabled>${sv('plsave', 17)} Save changes</button><button type="button" class="ix-btn" id="sgmrs" hidden data-on-click="sgMaintReset()">${sv('plundo', 16)} Undo</button><span class="pl-st ok" id="sgmst" role="status"></span></div>` : ''}</section>`;
}
const sgMaintRead = () => ({
  on: !!($('#sgmon') || {}).checked,
  msg: (($('#sgmmsg') || {}).value || '').trim()
});
const sgMaintOrig = () => ({
  on: APPSET.maintenance === true,
  msg: String(APPSET.maintenance_message || '').trim()
});
const sgMaintDirty = () => {
  if (!$('#sgmon')) return false;
  const a = sgMaintRead(),
    o = sgMaintOrig();
  return a.on !== o.on || a.msg !== o.msg;
};
const sgDirtyAny = () => sgAnnDirty() || sgMaintDirty();
function sgMaintInput() {
  if (!$('#sgmon')) return;
  const a = sgMaintRead(),
    d = sgMaintDirty();
  $('#sgmcnt').textContent = a.msg.length + ' / 200';
  const b = $('#sgmsv'),
    r = $('#sgmrs'),
    ss = $('#sgmst');
  if (b) {
    b.disabled = !d;
    b.classList.toggle('bad', d && a.on && !sgMaintOrig().on);
    b.innerHTML =
      d && a.on && !sgMaintOrig().on
        ? `${sv('alert', 17)} Turn on maintenance`
        : `${sv('plsave', 17)} Save changes`;
  }
  if (r) r.hidden = !d;
  if (ss) {
    ss.className = 'pl-st ' + (d ? 'dirty' : 'ok');
    ss.innerHTML = d
      ? `${sv('dot', 14)} Unsaved changes`
      : `${sv('check', 16, 'currentColor', 2.2)} No changes to save`;
  }
}
function sgMaintReset() {
  const o = sgMaintOrig();
  $('#sgmon').checked = o.on;
  $('#sgmmsg').value = o.msg;
  sgMaintInput();
}
function sgMaintSave() {
  if (!sgCan() || !sgMaintDirty()) return;
  const a = sgMaintRead(),
    o = sgMaintOrig(),
    turnOn = a.on && !o.on,
    turnOff = !a.on && o.on;
  const run = async r => {
    SGX.justSaved = 'maint';
    if (a.msg !== o.msg) await arpc('admin_set_setting', { k: 'maintenance_message', v: a.msg, reason: r });
    if (a.on !== o.on) await arpc('admin_set_setting', { k: 'maintenance', v: a.on, reason: r });
    await appSetLoad(true);
  };
  if (turnOn)
    return admAsk({
      title: 'Turn on maintenance mode',
      danger: true,
      typed: 'MAINTENANCE',
      body: 'Everyone except staff will be locked out of the app straight away until you turn this off. Public cards stay visible.',
      extra: `<div class="sg-warn">${sv('alert', 16)}<span>Message people will see: "${esc(a.msg || 'We are making Introthread better. Your Threads and card are safe. Please try again in a few minutes.')}"</span></div>`,
      cta: 'Turn on maintenance',
      run
    });
  admAsk({
    title: turnOff ? 'Turn off maintenance mode' : 'Save maintenance message',
    body: turnOff
      ? 'Everyone can use the app again straight away.'
      : 'The new message is used whenever maintenance mode is on.',
    cta: turnOff ? 'Turn off maintenance' : 'Save',
    run
  });
}
/* features */
function sgFeat() {
  const ed = sgCan();
  return `<section class="ix-card sg-sec" aria-labelledby="sgft">${sgSecH('grid', 'b', '<span id="sgft">Features</span>', 'Turn features on or off for everyone. Turning one off hides nothing that people have already saved.')}
 <ul class="sg-list">${SG_FEAT.map(([k, l, d, ic]) => {
   const on = sgOn(k),
     dep = k === 'linkedin_import' && !sgOn('contact_import');
   return `<li class="sw"><span class="sg-ri" aria-hidden="true">${ic === 'li' ? sv('li', 20, 'none').replace('fill="none" stroke="none"', 'fill="currentColor" stroke="none"') : sv(ic, 20)}</span><div><b id="sgfl_${k}">${l}</b><p>${d}${dep ? ' <span class="sg-dep">Has no effect while Contact import is off.</span>' : ''}</p></div><span class="sg-state ${on ? 'on' : 'off'}">${on ? 'On' : 'Off'}</span>${sgSw('sgf_' + k, on, `sgFeatSw('${k}',this)`, l, !ed)}</li>`;
 }).join('')}</ul>
 <small class="ix-mu sg-when">${sgWhen('features')}</small></section>`;
}
function sgFeatAsk(k, on) {
  if (!sgCan()) return;
  const f = SG_FEAT.find(x => x[0] === k) || [k, k];
  admAsk({
    title: (on ? 'Turn on ' : 'Turn off ') + f[1],
    danger: !on,
    body: on
      ? `${f[1]} becomes available to everyone the next time they open the app.`
      : `${f[1]} stops working for everyone the next time they open the app. Data already saved is kept.`,
    cta: on ? 'Turn on' : 'Turn off',
    run: async r => {
      await arpc('admin_set_setting', {
        k: 'features',
        v: Object.assign({}, APPSET.features || {}, { [k]: on }),
        reason: r
      });
      await appSetLoad(true);
    }
  });
}
/* security */
function sgSec() {
  const mfa = APPSET.admin_require_mfa !== false,
    own = sgOwner();
  const row = (ic, t, p, right, c) =>
    `<li class="${c || 'inf'}"><span class="sg-ri" aria-hidden="true">${sv(ic, 20)}</span><div><b>${t}</b><p>${p}</p></div>${right}</li>`;
  const fixed = '<span class="sg-state fx">Built in</span>';
  return `<section class="ix-card sg-sec" aria-labelledby="sgst">${sgSecH('shield', 'b', '<span id="sgst">Security</span>', 'Protection for staff and the admin area.')}
 <ul class="sg-list">${row('lock', 'Require two-step verification for staff', `Staff must use an authenticator app to open the admin area. Recommended on.${own ? '' : ' Only owners can change this.'}`, `<span class="sg-state ${mfa ? 'on' : 'off'}">${mfa ? 'On' : 'Off'}</span>${sgSw('sgmfa', mfa, 'sgMfaSw(this)', 'Require two-step verification for staff', !own)}`, 'sw')}
 ${row('users', 'Staff roles', 'Owner, admin, moderator, support and finance. Each role only sees the screens it needs.', `<button type="button" class="au-inl" data-on-click="admGo('staff')">Manage staff</button>`)}
 ${row('sgimport', 'Data exports', 'Only owners and admins can export user data, and finance can export subscriptions. Every export is recorded.', fixed)}
 ${row('sgmail', 'Email addresses in admin', 'Hidden from moderator and finance roles. Shown in full only for email actions by owners, admins and support.', fixed)}</ul>
 <small class="ix-mu sg-when">${sgWhen('admin_require_mfa')}</small></section>`;
}
function sgMfaAsk(on) {
  if (!sgOwner()) return toast('Only owners can change this');
  admAsk({
    title: on ? 'Require two-step verification' : 'Stop requiring two-step verification',
    danger: !on,
    typed: on ? '' : 'TURN OFF',
    body: on
      ? 'Staff without two-step verification will be asked to set it up before they can open the admin area.'
      : 'Staff will be able to open the admin area with a password only. This lowers protection for every user account. Not recommended.',
    cta: on ? 'Require it' : 'Turn off',
    run: async r => {
      await arpc('admin_set_setting', { k: 'admin_require_mfa', v: on, reason: r });
      await appSetLoad(true);
    }
  });
}
/* changes log */
const SG_LAB = {
  announcement: 'Announcement banner',
  maintenance: 'Maintenance mode',
  maintenance_message: 'Maintenance message',
  features: 'Features',
  admin_require_mfa: 'Two-step verification for staff',
  free_threads_per_month: 'Free Threads per month'
};
function sgVal(k, v) {
  if (v == null) return dash;
  if (k === 'announcement')
    return (
      (v.on ? 'Showing' : 'Hidden') +
      (v.text ? `: "${esc(v.text)}"` : '') +
      (v.tone === 'warn' ? ' (warning)' : '')
    );
  if (k === 'maintenance' || k === 'admin_require_mfa') return v === true ? 'On' : 'Off';
  if (k === 'features')
    return Object.keys(v)
      .map(x => (SG_FEAT.find(f => f[0] === x) || [x, x])[1] + ' ' + (v[x] === false ? 'off' : 'on'))
      .join(', ');
  return typeof v === 'string' ? (v ? `"${v}"` : 'Empty (standard message)') : JSON.stringify(v);
}
async function sgHist() {
  modal(
    `<div class="cap-m pl-hm"><div class="row between"><h3>Settings changes log</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div><div id="sghb"><div class="ix-card sk" style="height:180px"></div></div></div>`
  );
  try {
    const L = ((await arpc('admin_audit', { lim: 1000 })) || []).filter(
      x => x.target_type === 'setting' || /^setting\./.test(x.action || '')
    );
    const b = $('#sghb');
    if (!b) return;
    b.innerHTML = L.length
      ? `<p class="ix-mu">${fmtN(L.length)} change${L.length === 1 ? '' : 's'}</p><ol class="pl-hl">${L.map(
          x => {
            const k = x.target_id || String(x.action).replace(/^setting\./, '');
            return `<li><div class="pl-hh"><b>${esc(SG_LAB[k] || k)}</b><span>${fmtD(x.created_at)} ${fmtT(x.created_at)}</span></div><small>${esc(x.actor || 'Unknown staff member')}${x.reason ? ' · ' + esc(x.reason) : ''}</small><ul><li>Set to <b>${esc(sgVal(k, (x.details || {}).value))}</b></li></ul></li>`;
          }
        ).join('')}</ol>`
      : `<div class="adm-empty">${sv('plhist', 22)}<b>No settings changes yet</b><p>Changes appear here with who made them and why.</p></div>`;
  } catch (e) {
    const b = $('#sghb');
    if (b) b.innerHTML = `<p class="adm-err">${esc((e && e.message) || 'Could not load the log')}</p>`;
  }
}

/* v59: named handlers for the Settings screen (no inline JavaScript).
   The switch flips back until the change is confirmed in the dialog. */
function sgFeatSw(k, el) {
  sgFeatAsk(k, el.checked);
  el.checked = !el.checked;
}
function sgMfaSw(el) {
  sgMfaAsk(el.checked);
  el.checked = !el.checked;
}
