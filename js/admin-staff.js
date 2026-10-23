// Introthread - Admin Staff (v42, screen 9 of 9). Prefix sf / SFX.
// Moved out of index.html in v52 (code split step 4). Load order matters: see the <script> list at the end of index.html.

/* ==== Admin redesign v42: screen 9 of 9, Staff (prefix sf / SFX) ==== */
let SFX = { q: '', role: 'all', data: null, limited: false, flash: null, _t: null };
Object.assign(SV, {
  sfcrown: '<path d="M4 17.5h16M4.5 17.5 3.5 8l5 3.8L12 5.5l3.5 6.3 5-3.8-1 9.5"/>',
  sfhead:
    '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3.5" y="13.5" width="4" height="6" rx="1.5"/><rect x="16.5" y="13.5" width="4" height="6" rx="1.5"/>',
  sfbars: '<path d="M6 19V11M12 19V5M18 19v-6"/>',
  sfsend: '<path d="M20.5 3.5 10 14M20.5 3.5l-6.5 17-4-6.5-6.5-4z"/>',
  sfdots:
    '<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>',
  sfpause:
    '<rect x="6.5" y="5" width="3.5" height="14" rx="1"/><rect x="14" y="5" width="3.5" height="14" rx="1"/>'
});
const SF_ROLES = [
  [
    'owner',
    'Owner',
    'Full access',
    'sfcrown',
    'r',
    'Everything, including staff and billing settings.',
    [
      'Add, pause and remove staff',
      'Change roles and the two-step rule',
      'Edit plans and prices',
      'Every other admin screen'
    ]
  ],
  [
    'admin',
    'Admin',
    'Core access',
    'users',
    'b',
    'Users, moderation, Rooms and settings.',
    [
      'Manage users, suspend and delete accounts',
      'Act on reports, including bans',
      'Manage Rooms and app settings',
      'Privacy requests; view revenue'
    ]
  ],
  [
    'support',
    'Support',
    'Limited access',
    'sfhead',
    'g',
    'View users, export data, privacy requests.',
    [
      'Send login links and password resets',
      "Export a person's data",
      'Handle privacy requests (no deletions)',
      'Moderation is view only; no billing'
    ]
  ],
  [
    'moderator',
    'Moderator',
    'Moderation',
    'shield',
    'o',
    'Reports, suspensions and Rooms.',
    [
      'Review and act on reports',
      'Suspend accounts (no bans)',
      'Edit and delete Rooms',
      'Emails hidden; no billing or settings'
    ]
  ],
  [
    'finance',
    'Finance',
    'Billing',
    'sfbars',
    'p',
    'Revenue, plans and pricing.',
    [
      'View revenue and subscriptions',
      'Edit plans and prices',
      'Export subscriptions',
      'Emails hidden; no moderation'
    ]
  ]
];
const sfRoleName = r => (SF_ROLES.find(x => x[0] === r) || [r, r])[1];
const sfOwner = () => admOk(['owner']);
const sfMiss = e =>
  /admin_staff2|admin_staff_invite|admin_staff_role|admin_staff_suspend|admin_staff_remove|could not find|schema cache|does not exist/i.test(
    (e && e.message) || ''
  );
const sfEmailOk = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length <= 254;
const sfScreens = r =>
  (typeof ADM_TABS !== 'undefined' ? ADM_TABS : []).filter(t => !t[3] || t[3].includes(r)).map(t => t[1]);
const sfInvSt = i =>
  i.status === 'pending'
    ? i.expired
      ? ['Expired', 'm']
      : ['Pending', 'o']
    : i.status === 'failed'
      ? ['Failed', 'r']
      : i.status === 'accepted'
        ? ['Accepted', 'g']
        : ['Revoked', 'm'];
const _alt42 = admLoadTab;
admLoadTab = async function () {
  if (ADM.stage === 'ready' && ADM.tab === 'staff') return sfLoad(true);
  return _alt42.apply(this, arguments);
};
/* the invited person joins when they open the admin area signed in with the invited email */
if (typeof admBoot === 'function') {
  const _b = admBoot;
  admBoot = async function () {
    try {
      if (SB) {
        const {
          data: { session }
        } = await SB.auth.getSession();
        if (session) {
          const { data } = await SB.rpc('staff_accept_invite');
          if (data && data.role)
            setTimeout(() => toast('Invitation accepted. You joined as ' + sfRoleName(data.role) + '.'), 600);
        }
      }
    } catch (_) {}
    return _b.apply(this, arguments);
  };
}
/* load */
async function sfLoad(keep) {
  if (!keep || !$('#sfwrap')) admBody(sfSkel());
  try {
    let d = null;
    if (!SFX.limited) {
      try {
        d = await arpc('admin_staff2');
      } catch (e) {
        if (sfMiss(e)) SFX.limited = true;
        else throw e;
      }
    }
    if (SFX.limited) {
      const L = (await arpc('admin_staff')) || [];
      d = {
        me: null,
        staff: L,
        invites: [],
        counts: {
          total: L.length,
          active: L.length,
          suspended: 0,
          pending: 0,
          expired: 0,
          failed: 0,
          mfa_off: null,
          new_month: null
        }
      };
    }
    SFX.data = d;
    if (ADM.tab !== 'staff') return;
    const f = document.activeElement && document.activeElement.id,
      v = f === 'sfem' ? ($('#sfem') || {}).value : null,
      rv = ($('#sfrole2') || {}).value;
    admBody(sfPage());
    if (f === 'sfq') {
      const i = $('#sfq');
      i.focus();
      i.setSelectionRange(i.value.length, i.value.length);
    }
    if (v != null) {
      $('#sfem').value = v;
    }
    if (rv && $('#sfrole2')) $('#sfrole2').value = rv;
    sfInvInput();
    if (SFX.flash) {
      const m = SFX.flash;
      SFX.flash = null;
      setTimeout(() => toast(m), 50);
    }
  } catch (e) {
    admBody(
      sfHead() +
        `<div class="ix-card ix-fail" role="alert">${sv('alert', 22)}<div><b>Staff could not load</b><p>${esc((e && e.message) || 'Unknown error')}</p></div><button type="button" class="ix-btn" data-on-click="sfLoad()">${sv('refresh', 16)} Try again</button></div>`
    );
  }
}
function sfHead() {
  return `<div class="ix-h"><div><h1>Staff</h1><p>Manage admin access and permissions. Control who can open the admin area and what they can do.</p></div><div class="ix-hc"><button type="button" class="ix-btn" data-on-click="admGo('audit')">${sv('eye', 17)} View audit log</button></div></div>`;
}
function sfSkel() {
  return (
    sfHead() +
    `<div class="md-cs">${'<div class="md-c sk"><i></i><b></b></div>'.repeat(4)}</div><div class="sf-g"><div class="ix-card sk" style="height:320px"></div><div class="ix-card sk" style="height:320px"></div></div>`
  );
}
function sfCards() {
  const c = (SFX.data || {}).counts || {};
  const card = (ic, tone, l, v, sub) =>
    `<div class="rm-c"><span class="md-wi t-${tone}w" aria-hidden="true">${sv(ic, 24)}</span><span><span class="rm-cl">${l}</span><b>${isNum(+v) && v != null ? fmtN(v) : dash}</b>${sub ? `<small class="rv-ch ${sub[1]}">${sub[0]}</small>` : ''}</span></div>`;
  return (
    card(
      'users',
      'b',
      'Total staff',
      c.total,
      c.new_month ? [`${fmtN(c.new_month)} added this month`, 'm'] : null
    ) +
    card(
      'user',
      'g',
      'Active staff',
      c.active,
      c.mfa_off
        ? [`${fmtN(c.mfa_off)} without two-step`, 'r']
        : c.mfa_off === 0
          ? ['All use two-step', 'g']
          : null
    ) +
    card(
      'clock',
      'o',
      'Pending invites',
      SFX.limited ? null : c.pending,
      SFX.limited
        ? ['Needs update 011', 'm']
        : c.failed
          ? [`${fmtN(c.failed)} failed`, 'r']
          : c.expired
            ? [`${fmtN(c.expired)} expired`, 'm']
            : null
    ) +
    card(
      'sfpause',
      'p',
      'Suspended staff',
      SFX.limited ? null : c.suspended,
      SFX.limited ? ['Needs update 011', 'm'] : c.suspended ? ['Access paused', 'm'] : null
    )
  );
}
function sfPage() {
  return `<div id="sfwrap" class="sf">${sfHead()}${SFX.limited ? `<p class="ix-upd">Run database update 011 for invitations with pending, accepted and failed status, pausing access, two-step and last-active columns. Until then, people must have an Introthread account before you add them.</p>` : ''}
 <div class="md-cs">${sfCards()}</div><div class="sf-g">${sfList()}${sfInvite()}</div>${sfRolesCard()}</div>`;
}
/* directory */
function sfList() {
  const d = SFX.data || {},
    me = d.me || (typeof DB !== 'undefined' && DB.session) || null,
    q = SFX.q.trim().toLowerCase();
  const S = (d.staff || []).filter(
    s =>
      (SFX.role === 'all' || s.role === SFX.role) &&
      (!q ||
        [s.name, s.email, s.handle].some(v =>
          String(v || '')
            .toLowerCase()
            .includes(q)
        ))
  );
  const I = (d.invites || []).filter(
    i =>
      ['pending', 'failed'].includes(i.status) &&
      (SFX.role === 'all' || i.role === SFX.role) &&
      (!q || i.email.toLowerCase().includes(q))
  );
  const own = sfOwner();
  const row = s => {
    const mine = me && s.user_id === me,
      paused = !!s.suspended_at;
    return `<tr><td data-l="Name"><span class="sf-n"><span class="sf-av" aria-hidden="true">${esc(initials(s.name || s.email))}</span><span><b>${esc(s.name || s.email)}${mine ? ' <span class="sf-you">You</span>' : ''}</b><small class="sf-em">${esc(s.email)}</small></span></span></td>
 <td data-l="Role">${esc(sfRoleName(s.role))}</td><td data-l="Two-step">${s.mfa == null ? dash : s.mfa ? '<span class="sf-ok">On</span>' : '<span class="sf-warn">Not set up</span>'}</td>
 <td data-l="Status"><span class="pq-st ${paused ? 't-m' : 't-g'}">${paused ? 'Suspended' : 'Active'}</span></td><td data-l="Last active">${sfWhen(s.last_sign_in_at)}</td>
 <td class="sf-ac">${own && !mine ? `<button type="button" class="sf-more" aria-label="Manage ${esc(s.name || s.email)}" data-on-click="sfManage('${esc(s.user_id)}')">${sv('sfdots', 18)}</button>` : ''}</td></tr>`;
  };
  const irow = i => {
    const st = sfInvSt(i);
    return `<tr class="sf-inv"><td data-l="Name"><span class="sf-n"><span class="sf-av inv" aria-hidden="true">${sv('mail', 15)}</span><span><b class="sf-em">${esc(i.email)}</b><small>Invitation${i.invited_by_name ? ' from ' + esc(i.invited_by_name) : ''}</small></span></span></td>
 <td data-l="Role">${esc(sfRoleName(i.role))}</td><td data-l="Two-step">${dash}</td><td data-l="Status"><span class="pq-st t-${st[1]}" ${i.failure_reason ? `title="${esc(i.failure_reason)}"` : ''}>${st[0]}</span>${i.status === 'failed' && i.failure_reason ? `<small class="sf-fr">${esc(i.failure_reason)}</small>` : ''}</td>
 <td data-l="Sent">${i.sent_at ? `${fmtD(i.sent_at)}<small>Expires ${fmtD(i.expires_at)}</small>` : `${fmtD(i.created_at)}<small>Not sent</small>`}</td>
 <td class="sf-ac">${own ? `<button type="button" class="ix-btn sf-sm" data-on-click="sfResend('${i.id}')">Resend</button><button type="button" class="ix-btn sf-sm" data-on-click="sfRevoke('${i.id}')">Revoke</button>` : ''}</td></tr>`;
  };
  return `<section class="ix-card sf-main" aria-labelledby="sfmt"><div class="sf-mh"><div><h2 id="sfmt">Staff members</h2><p>Everyone with access to the admin area${I.length ? ', and open invitations' : ''}.</p></div>
 <div class="sf-tb"><label class="au-search">${sv('search', 17)}<input id="sfq" type="search" value="${esc(SFX.q)}" placeholder="Search by name or email" aria-label="Search staff by name or email" data-on-input="sfSearchIn(this.value)"></label>
 ${mdSel('sfrf', 'Role', SFX.role, [['all', 'All roles']].concat(SF_ROLES.map(r => [r[0], r[1]])), 'SFX.role=this.value;sfLoad(true)').replace('<span class="md-sl">Role:</span>', '<span class="sr">Role</span>')}</div></div>
 ${
   S.length || I.length
     ? `<div class="pq-tw"><table class="au-t pq-t sf-t${I.length && own ? ' has-inv' : ''}"><thead><tr><th scope="col">Staff member</th><th scope="col">Role</th><th scope="col">Two-step</th><th scope="col">Status</th><th scope="col">Last active</th><th scope="col"><span class="sr">Actions</span></th></tr></thead><tbody>${S.map(row).join('')}${I.map(irow).join('')}</tbody></table></div>`
     : `<div class="pq-empty"><h2>No staff match</h2><p>Try another role or search.</p><button type="button" class="ix-btn" data-on-click="sfClear()">Clear filters</button></div>`
 }</section>`;
}
/* invite panel */
function sfInvite() {
  const own = sfOwner();
  if (!own)
    return `<section class="ix-card sf-inv-p"><h2>Add new staff member</h2><p class="sf-sub">Only owners can invite staff or change roles.</p><div class="sg-box"><span class="sg-ic t-bw" aria-hidden="true">${sv('lock', 20)}</span><div><b>Need someone added?</b><p>Ask an owner. Every staff change is recorded in the audit log.</p></div></div></section>`;
  return `<section class="ix-card sf-inv-p" aria-labelledby="sfit"><h2 id="sfit">Add new staff member</h2><p class="sf-sub">${SFX.limited ? 'Give an existing Introthread account admin access.' : 'Send an invitation to give someone admin access.'}</p>
 <form data-on-submit="event.preventDefault();sfInviteGo()" novalidate><div class="pl-f"><label for="sfem">Email address</label><div class="pl-in np" id="sfemw"><input id="sfem" type="email" inputmode="email" autocomplete="off" maxlength="254" placeholder="name@company.com" data-on-input="sfInvInput()"></div><small class="pl-err" id="sfemerr" role="alert"></small></div>
 <div class="pl-f"><label for="sfrole2">Role</label><label class="md-sel sg-sel">${sv('users', 17)}<select id="sfrole2" data-on-change="sfInvInput()">${SF_ROLES.map(r => `<option value="${r[0]}" ${r[0] === 'support' ? 'selected' : ''}>${r[1]}</option>`).join('')}</select>${sv('chevd', 16)}</label><small class="ix-mu" id="sfrolehint"></small></div>
 <div class="sg-box sf-note"><span class="sg-ic t-bw" aria-hidden="true">${sv('mail', 20)}</span><div><p>${SFX.limited ? 'They must already have an Introthread account with this email. They get access straight away.' : 'They get a sign-in email from Introthread. When they sign in with this email and open the admin area within 7 days, they join with this role. They will need two-step verification.'}</p></div></div>
 <button type="submit" class="ix-btn pri sf-send" id="sfsend" disabled>${sv('sfsend', 17)} ${SFX.limited ? 'Add staff member' : 'Send invitation'}</button></form></section>`;
}
function sfInvInput() {
  const e = $('#sfem');
  if (!e) return;
  const v = e.value.trim().toLowerCase(),
    d = SFX.data || {};
  let er = '';
  if (v && !sfEmailOk(v)) er = 'Enter a valid email address';
  else if (v && (d.staff || []).some(s => String(s.email).toLowerCase() === v))
    er = 'Already on the staff list. Change their role instead.';
  else if (
    v &&
    (d.invites || []).some(i => i.status === 'pending' && !i.expired && i.email.toLowerCase() === v)
  )
    er = 'An invitation is already pending. Resend it instead.';
  $('#sfemerr').textContent = er;
  $('#sfemw').classList.toggle('bad', !!er);
  $('#sfsend').disabled = !v || !!er;
  const r = ($('#sfrole2') || {}).value;
  const h = $('#sfrolehint');
  if (h)
    h.textContent =
      r === 'owner'
        ? 'Owners have full access, including staff and billing. Give this role only to people who run Introthread.'
        : (SF_ROLES.find(x => x[0] === r) || [])[5] || '';
}
const sfOwnerWarn = `<div class="sg-warn">${sv('alert', 16)}<span>Owners can add and remove staff, change roles and turn off two-step verification. Only give this role to people who run Introthread.</span></div>`;
function sfInviteGo() {
  if (!sfOwner()) return;
  const em = $('#sfem').value.trim().toLowerCase(),
    role = $('#sfrole2').value;
  sfInvInput();
  if (!sfEmailOk(em) || $('#sfsend').disabled) return;
  if (SFX.limited)
    return admAsk({
      title: 'Add staff member',
      body: `${esc(em)} will get ${esc(sfRoleName(role))} access straight away.`,
      extra: role === 'owner' ? sfOwnerWarn : '',
      typed: role === 'owner' ? 'OWNER' : '',
      cta: 'Add',
      run: r => arpc('admin_set_staff', { em, new_role: role, reason: r })
    });
  admAsk({
    title: 'Send staff invitation',
    body: `Invite ${esc(em)} as ${esc(sfRoleName(role))}. The invitation expires after 7 days.`,
    extra: role === 'owner' ? sfOwnerWarn : '',
    typed: role === 'owner' ? 'OWNER' : '',
    cta: 'Send invitation',
    run: async r => {
      const inv = await arpc('admin_staff_invite', { em, new_role: role, reason: r });
      await sfSendMail(inv);
    }
  });
}
async function sfSendMail(inv) {
  let err = null;
  try {
    const { error } = await SB.auth.signInWithOtp({
      email: inv.email,
      options: { shouldCreateUser: true, emailRedirectTo: location.origin + '/admin' }
    });
    if (error) err = error.message || 'Email could not be sent';
  } catch (e) {
    err = (e && e.message) || 'Email could not be sent';
  }
  await arpc('admin_staff_invite_sent', { iid: inv.id, ok: !err, err }).catch(() => {});
  SFX.flash = err
    ? `Invitation saved, but the email failed: ${esc(err)}. Use Resend to try again.`
    : `Invitation sent to ${esc(inv.email)}.`;
}
function sfResend(id) {
  const i = ((SFX.data || {}).invites || []).find(x => x.id === id) || {};
  admAsk({
    title: 'Resend invitation',
    body: `Sends a new sign-in email to ${esc(i.email || '')} and gives them another 7 days.`,
    cta: 'Resend',
    run: async r => {
      const inv = await arpc('admin_staff_invite_resend', { iid: id, reason: r });
      await sfSendMail(inv);
    }
  });
}
function sfRevoke(id) {
  const i = ((SFX.data || {}).invites || []).find(x => x.id === id) || {};
  admAsk({
    title: 'Revoke invitation',
    danger: true,
    body: `${esc(i.email || '')} will no longer be able to join with this invitation.`,
    cta: 'Revoke',
    run: r => arpc('admin_staff_invite_revoke', { iid: id, reason: r })
  });
}
/* manage one staff member (owners only; not yourself) */
function sfManage(uid) {
  const s = ((SFX.data || {}).staff || []).find(x => x.user_id === uid);
  if (!s || !sfOwner()) return;
  const paused = !!s.suspended_at;
  const owners = ((SFX.data || {}).staff || []).filter(
    x => x.role === 'owner' && !x.suspended_at && x.user_id !== uid
  ).length;
  const lastOwner = s.role === 'owner' && !owners;
  modal(`<div class="cap-m sf-mm"><div class="row between"><h3>${esc(s.name || s.email)}</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div><p class="fu-sub">${esc(s.email)} · ${esc(sfRoleName(s.role))}${paused ? ' · Suspended' : ''}</p>
 ${lastOwner ? `<div class="sg-warn">${sv('lock', 16)}<span>This is the only active owner. Add another owner before changing, pausing or removing this account.</span></div>` : ''}
 <div class="pl-f"><label for="sfnr">Role</label><div class="sf-rr"><label class="md-sel sg-sel"><select id="sfnr" ${lastOwner ? 'disabled' : ''}>${SF_ROLES.map(r => `<option value="${r[0]}" ${r[0] === s.role ? 'selected' : ''}>${r[1]}</option>`).join('')}</select>${sv('chevd', 16)}</label><button type="button" class="ix-btn pri" ${lastOwner ? 'disabled' : ''} data-on-click="sfRoleSel('${uid}')">Change role</button></div></div>
 <div class="sf-mact">${SFX.limited ? '' : `<button type="button" class="ix-btn" ${lastOwner && !paused ? 'disabled' : ''} data-on-click="sfPause('${uid}',${!paused})">${sv(paused ? 'check' : 'sfpause', 16)} ${paused ? 'Restore access' : 'Pause access'}</button>`}<button type="button" class="ix-btn bad" ${lastOwner ? 'disabled' : ''} data-on-click="sfRemove('${uid}')">${sv('pqtrash', 16)} Remove access</button></div>
 <p class="ix-mu sf-fine">${s.invited_by_name ? 'Invited by ' + esc(s.invited_by_name) + '. ' : ''}On staff since ${fmtD(s.created_at)}. Changes ask for a reason and are recorded in the audit log.</p></div>`);
}
function sfRole(uid, role) {
  const s = ((SFX.data || {}).staff || []).find(x => x.user_id === uid) || {};
  if (role === s.role) return toast('That is already their role');
  const up = role === 'owner';
  admAsk({
    title: 'Change role',
    body: `${esc(s.name || s.email)} will change from ${esc(sfRoleName(s.role))} to ${esc(sfRoleName(role))}. Their access changes the next time they load the admin area.`,
    extra: up ? sfOwnerWarn : '',
    typed: up ? 'OWNER' : '',
    cta: 'Change role',
    run: r =>
      SFX.limited
        ? arpc('admin_set_staff', { em: s.email, new_role: role, reason: r })
        : arpc('admin_staff_role', { uid, new_role: role, reason: r })
  });
}
function sfPause(uid, pause) {
  const s = ((SFX.data || {}).staff || []).find(x => x.user_id === uid) || {};
  admAsk({
    title: pause ? 'Pause admin access' : 'Restore admin access',
    danger: pause,
    body: pause
      ? `${esc(s.name || s.email)} keeps their role but cannot open the admin area until you restore access. Their own Introthread account keeps working.`
      : `${esc(s.name || s.email)} can open the admin area again as ${esc(sfRoleName(s.role))}.`,
    cta: pause ? 'Pause access' : 'Restore access',
    run: r => arpc('admin_staff_suspend', { uid, pause, reason: r })
  });
}
function sfRemove(uid) {
  const s = ((SFX.data || {}).staff || []).find(x => x.user_id === uid) || {};
  admAsk({
    title: 'Remove staff access',
    danger: true,
    typed: 'REMOVE',
    body: `${esc(s.name || s.email)} loses admin access completely. Their own Introthread account is not deleted. To give access again, send a new invitation.`,
    cta: 'Remove access',
    run: r =>
      SFX.limited
        ? arpc('admin_set_staff', { em: s.email, new_role: 'none', reason: r })
        : arpc('admin_staff_remove', { uid, reason: r })
  });
}
/* roles and permissions, from the same rules the app uses */
function sfRolesCard() {
  const c = (SFX.data || {}).staff || [];
  return `<section class="ix-card sf-roles" aria-labelledby="sfrt"><h2 id="sfrt">Staff roles and permissions</h2><p class="sf-sub">Each role sees only the screens it needs. The server checks the role on every action, so hiding a button is never the only protection.</p>
 <div class="sf-rg">${SF_ROLES.map(([k, l, tag, ic, tone, d, B]) => {
   const n = c.filter(s => s.role === k).length;
   return `<div class="sf-rc"><div class="sf-rh"><span class="sg-ic t-${tone === 'r' ? 'o' : tone}w sf-ri-${tone}" aria-hidden="true">${sv(ic, 22)}</span><div><b>${l}</b><span class="sf-tag sf-tag-${tone}">${tag}</span></div><small class="sf-cnt">${fmtN(n)}</small></div><p>${d}</p><ul>${B.map(x => `<li>${esc(x)}</li>`).join('')}</ul><small class="sf-scr"><b>Screens:</b> ${esc(sfScreens(k).join(', '))}</small></div>`;
 }).join('')}</div></section>`;
}

/* ==== Plans: one source of truth. The app reads prices, names, descriptions and Thread limits from the plans table that staff edit in Admin > Plans and pricing ==== */
let PLANDB = null;
function thrTxt(n) {
  return n == null ? 'Unlimited Threads' : `${fmtN(n)} new Thread${+n === 1 ? '' : 's'} a month`;
}
function proM() {
  return +PLANS.pro.price.month || 0;
}
function proY() {
  return +PLANS.pro.price.year || 0;
}
function usd0(n) {
  n = +n || 0;
  return '$' + (Math.round(n * 100) % 100 ? n.toFixed(2) : String(Math.round(n)));
}
function planApply(rows) {
  if (!Array.isArray(rows) || !rows.length) return;
  PLANDB = rows;
  rows.forEach(r => {
    const P = PLANS[r.id];
    if (!P) return;
    if (r.name) P.name = r.name;
    if (r.description) P.tag = r.description;
    P.active = r.active !== false;
    P.threads = r.threads_per_month == null ? null : +r.threads_per_month;
    if (r.id !== 'free' && P.price) {
      if (r.price_usd_month != null) P.price.month = +r.price_usd_month;
      if (r.price_usd_year != null) P.price.year = +r.price_usd_year;
    }
    if (typeof GBP === 'object') {
      if (r.price_usd_month != null && r.price_gbp_month != null)
        GBP[+r.price_usd_month] = +r.price_gbp_month;
      if (r.price_usd_year != null && r.price_gbp_year != null) {
        GBP[+r.price_usd_year] = +r.price_gbp_year;
        GBP[Math.round(r.price_usd_year / 12)] = Math.round(r.price_gbp_year / 12);
      }
    }
  });
  const ff = PLANS.free.features,
    i = ff.findIndex(x => /Threads/.test(x) && !/reveal/.test(x));
  const ft = thrTxt(PLANS.free.threads != null ? PLANS.free.threads : freeLim());
  if (i >= 0) ff[i] = ft;
  const pf = PLANS.pro.features,
    j = pf.findIndex(x => /^(Unlimited Threads|[\d,]+ new Threads? a month)$/.test(x));
  const pt = thrTxt(PLANS.pro.threads);
  if (j >= 0) pf[j] = pt;
  else pf.splice(1, 0, pt);
}
async function planSync() {
  try {
    if (!SB) return;
    const { data, error } = await SB.from('plans').select('*').order('sort');
    if (error || !data) return;
    planApply(data);
    const pa = location.pathname || '';
    if (!pa.startsWith('/admin') && (pa.startsWith('/app') || pa.startsWith('/pricing'))) render();
  } catch (_) {}
}
(async () => {
  for (let i = 0; i < 40 && !SB; i++) await new Promise(r => setTimeout(r, 150));
  await planSync();
})();

/* v59: named handlers for the Staff screen (no inline JavaScript). */
function sfSearchIn(v) {
  clearTimeout(SFX._t);
  SFX._t = setTimeout(() => {
    SFX.q = v;
    sfLoad(true);
  }, 250);
}
function sfClear() {
  SFX.q = '';
  SFX.role = 'all';
  sfLoad(true);
}
function sfRoleSel(uid) {
  sfRole(uid, $('#sfnr').value);
}
