// Introthread - Admin Audit log (v43). Prefix al / ALX.
// Moved out of index.html in v52 (code split step 4). Load order matters: see the <script> list at the end of index.html.

/* ==== Admin redesign v43: Audit log (prefix al / ALX) ==== */
let ALX = {
  q: '',
  cat: 'all',
  actor: '',
  days: 30,
  outcome: 'all',
  page: 0,
  per: 25,
  data: null,
  limited: false,
  _t: null
};
Object.assign(SV, {
  alact: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  aldl: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14"/>',
  almeg: '<path d="M4 10v4a1 1 0 0 0 1 1h2l5 4V5L7 9H5a1 1 0 0 0-1 1z"/><path d="M16 9a4 4 0 0 1 0 6"/>'
});
const AL_CAT = {
  users: ['Users', 'users', 'b'],
  moderation: ['Moderation', 'shield', 'o'],
  rooms: ['Rooms', 'cal', 'g'],
  billing: ['Billing', 'dollar', 'p'],
  privacy: ['Privacy', 'pqdoc', 'g'],
  settings: ['Settings', 'gear', 'p'],
  security: ['Security', 'lock', 'r'],
  export: ['Export', 'aldl', 'b'],
  other: ['Other', 'alact', 'm']
};
const AL_LAB = {
  'staff.invite': 'Staff invitation sent',
  'staff.invite_failed': 'Staff invitation email failed',
  'staff.invite_resend': 'Staff invitation resent',
  'staff.invite_revoke': 'Staff invitation revoked',
  'staff.invite_accepted': 'Staff invitation accepted',
  'staff.role': 'Staff role changed',
  'staff.suspend': 'Staff access paused',
  'staff.restore': 'Staff access restored',
  'staff.remove': 'Staff access removed',
  'setting.announcement': 'Announcement updated',
  'setting.maintenance': 'Maintenance mode changed',
  'setting.maintenance_message': 'Maintenance message changed',
  'setting.features': 'Feature switches changed',
  'setting.admin_require_mfa': 'Two-step requirement changed',
  'setting.free_threads_per_month': 'Free Thread limit changed',
  'plan.update': 'Plan updated',
  'user.plan': 'User plan changed',
  'user.delete': 'Account deleted',
  'user.export': 'User data exported',
  'users.export': 'Users list exported',
  'user.note': 'Staff note added',
  'user.note.delete': 'Staff note deleted',
  'user.login_link': 'Login link sent',
  'user.password_reset': 'Password reset sent',
  'user.invite': 'User invited',
  'user.status.suspended': 'Account suspended',
  'user.status.banned': 'Account banned',
  'user.status.active': 'Account reactivated',
  'subscriptions.export': 'Subscriptions exported',
  'audit.export': 'Audit log exported',
  'privacy.start': 'Privacy request started',
  'privacy.in_progress': 'Privacy request started',
  'privacy.verify': 'Requester identity checked',
  'privacy.done': 'Privacy request actioned',
  'privacy.reject': 'Privacy request dismissed',
  'privacy.rejected': 'Privacy request dismissed',
  'report.reviewing': 'Report taken for review',
  'room.create': 'Room created',
  'room.update': 'Room updated',
  'room.delete': 'Room deleted',
  'room.export': 'Room results exported'
};
const alLab = a =>
  AL_LAB[a] ||
  (/^report\./.test(a)
    ? 'Report ' + a.slice(7).replace(/[._]/g, ' ')
    : /^staff\./.test(a)
      ? 'Staff ' + a.slice(6).replace(/[._]/g, ' ')
      : String(a || '')
          .replace(/[._]/g, ' ')
          .replace(/^./, c => c.toUpperCase()));
function alCat(a) {
  a = String(a || '');
  return /export/.test(a)
    ? 'export'
    : /^staff\./.test(a) ||
        a === 'setting.admin_require_mfa' ||
        /^user\.status\./.test(a) ||
        ['user.delete', 'user.login_link', 'user.password_reset'].includes(a)
      ? 'security'
      : /^setting\./.test(a)
        ? 'settings'
        : /^plan\.|^subscription/.test(a) || a === 'user.plan'
          ? 'billing'
          : /^privacy\./.test(a)
            ? 'privacy'
            : /^report\./.test(a)
              ? 'moderation'
              : /^room\./.test(a)
                ? 'rooms'
                : /^user\./.test(a)
                  ? 'users'
                  : 'other';
}
const alOut = a => (/failed/.test(String(a || '')) ? 'failed' : 'completed');
const alMiss = e =>
  /admin_audit2|audit_category|could not find|schema cache|does not exist/i.test((e && e.message) || '');
const _alt43 = admLoadTab;
admLoadTab = async function () {
  if (ADM.stage === 'ready' && ADM.tab === 'audit') return alLoad(true);
  return _alt43.apply(this, arguments);
};
async function alLoad(keep) {
  if (!keep || !$('#alwrap')) admBody(alSkel());
  try {
    let d = null;
    if (!ALX.limited) {
      try {
        d = await arpc('admin_audit2', {
          q: ALX.q,
          cat: ALX.cat,
          actor: ALX.actor || null,
          days: ALX.days,
          outcome: ALX.outcome,
          lim: ALX.per,
          off: ALX.page * ALX.per
        });
      } catch (e) {
        if (alMiss(e)) ALX.limited = true;
        else throw e;
      }
    }
    if (ALX.limited) d = alLocal((await arpc('admin_audit', { lim: 1000 })) || []);
    ALX.data = d;
    ADM.cache.audit = d._all || d.rows;
    if (ADM.tab !== 'audit') return;
    const f = document.activeElement && document.activeElement.id === 'alq';
    admBody(alPage());
    if (f) {
      const i = $('#alq');
      i.focus();
      i.setSelectionRange(i.value.length, i.value.length);
    }
  } catch (e) {
    admBody(
      alHead() +
        `<div class="ix-card ix-fail" role="alert">${sv('alert', 22)}<div><b>The audit log could not load</b><p>${esc((e && e.message) || 'Unknown error')}</p></div><button type="button" class="ix-btn" onclick="alLoad()">${sv('refresh', 16)} Try again</button></div>`
    );
  }
}
/* before update 012: filter the newest 1,000 entries in the browser */
function alLocal(L) {
  const q = ALX.q.trim().toLowerCase(),
    since = ALX.days ? Date.now() - ALX.days * 864e5 : 0,
    d0 = new Date();
  d0.setHours(0, 0, 0, 0);
  const t0 = d0.getTime(),
    t1 = t0 - 864e5;
  const R = L.map(a =>
    Object.assign({}, a, {
      category: alCat(a.action),
      outcome: alOut(a.action),
      target_label:
        a.target_type === 'staff_invite'
          ? (a.details || {}).email
          : a.target_type === 'privacy'
            ? 'PR-' +
              String(a.target_id || '')
                .replace(/-/g, '')
                .slice(0, 8)
                .toUpperCase()
            : a.target_type === 'setting'
              ? a.target_id
              : null
    })
  );
  const hit = R.filter(
    a =>
      Date.parse(a.created_at) >= since &&
      (ALX.cat === 'all' || a.category === ALX.cat) &&
      (!ALX.actor || a.actor_id === ALX.actor) &&
      (ALX.outcome === 'all' || a.outcome === ALX.outcome) &&
      (!q ||
        [
          a.action,
          alLab(a.action),
          a.actor,
          a.reason,
          a.target_label,
          a.target_id,
          JSON.stringify(a.details || {})
        ]
          .join(' ')
          .toLowerCase()
          .includes(q))
  );
  const c = (f, a, b) =>
      R.filter(x => {
        const t = Date.parse(x.created_at);
        return t >= a && (b == null || t < b) && f(x);
      }).length,
    all = () => true,
    sec = x => x.category === 'security',
    ex = x => x.category === 'export',
    fl = x => x.outcome === 'failed';
  const act = {};
  R.forEach(a => {
    if (a.actor_id && !act[a.actor_id]) act[a.actor_id] = { id: a.actor_id, name: a.actor || 'Staff member' };
  });
  return {
    total: hit.length,
    rows: hit.slice(ALX.page * ALX.per, (ALX.page + 1) * ALX.per),
    _all: hit,
    counts: {
      today: c(all, t0),
      yesterday: c(all, t1, t0),
      security_today: c(sec, t0),
      security_yesterday: c(sec, t1, t0),
      exports_today: c(ex, t0),
      exports_yesterday: c(ex, t1, t0),
      failed_today: c(fl, t0),
      staff_today: new Set(R.filter(x => Date.parse(x.created_at) >= t0).map(x => x.actor_id)).size,
      all_time: L.length
    },
    actors: Object.values(act)
  };
}
function alHead() {
  return `<div class="ix-h"><div><h1>Audit log</h1><p>A read-only record of administrative actions, newest first.</p></div><div class="ix-hc"><button type="button" class="ix-btn" onclick="alExport()">${sv('aldl', 17)} Export CSV</button></div></div>`;
}
function alSkel() {
  return (
    alHead() +
    `<div class="md-cs">${'<div class="md-c sk"><i></i><b></b></div>'.repeat(4)}</div><div class="ix-card sk" style="height:420px"></div>`
  );
}
function alCards() {
  const c = (ALX.data || {}).counts || {};
  const vs = (a, b) => {
    if (!isNum(+a) || !isNum(+b)) return null;
    const d = a - b;
    return d === 0
      ? ['Same as yesterday', 'm']
      : [(d > 0 ? '+' : '') + fmtN(d) + ' vs yesterday', d > 0 ? 'b' : 'm'];
  };
  const card = (ic, tone, l, v, sub) =>
    `<div class="rm-c"><span class="md-wi t-${tone}w" aria-hidden="true">${sv(ic, 24)}</span><span><span class="rm-cl">${l}</span><b>${isNum(+v) && v != null ? fmtN(v) : dash}</b>${sub ? `<small class="rv-ch ${sub[1]}">${sub[0]}</small>` : ''}</span></div>`;
  return (
    card('pqdoc', 'b', 'Events today', c.today, vs(c.today, c.yesterday)) +
    card(
      'users',
      'g',
      'Staff active today',
      c.staff_today,
      c.all_time != null ? [`${fmtN(c.all_time)} events in total`, 'm'] : null
    ) +
    card(
      'shield',
      'r',
      'Security events today',
      c.security_today,
      vs(c.security_today, c.security_yesterday)
    ) +
    card(
      'aldl',
      'p',
      'Exports today',
      c.exports_today,
      c.failed_today
        ? [`${fmtN(c.failed_today)} failed actions today`, 'r']
        : vs(c.exports_today, c.exports_yesterday)
    )
  );
}
function alBar() {
  const A = (ALX.data || {}).actors || [];
  const filt = ALX.q || ALX.cat !== 'all' || ALX.actor || ALX.outcome !== 'all' || ALX.days !== 30;
  const sel = (id, lab, val, opts, fn, ic) =>
    mdSel(id, lab, val, opts, fn, ic).replace(
      `<span class="md-sl">${lab}:</span>`,
      `<span class="sr">${lab}</span>`
    );
  return `<div class="al-tb"><label class="au-search al-q">${sv('search', 17)}<input id="alq" type="search" value="${esc(ALX.q)}" placeholder="Search action, staff member, target or reason" aria-label="Search the audit log" oninput="clearTimeout(ALX._t);const v=this.value;ALX._t=setTimeout(()=>alFilter('q',v),300)"></label>
 ${sel('alc', 'Action type', ALX.cat, [['all', 'All actions']].concat(Object.entries(AL_CAT).map(([k, v]) => [k, v[0]])), "alFilter('cat',this.value)")}
 ${sel('ala', 'Staff member', ALX.actor, [['', 'All staff']].concat(A.map(a => [a.id, esc(a.name || 'Staff member')])), "alFilter('actor',this.value)")}
 ${sel(
   'ald',
   'Date range',
   ALX.days,
   [
     ['1', 'Last 24 hours'],
     ['7', 'Last 7 days'],
     ['30', 'Last 30 days'],
     ['90', 'Last 90 days'],
     ['365', 'Last 12 months'],
     ['0', 'All time']
   ],
   "alFilter('days',+this.value)",
   'cal'
 )}
 ${sel(
   'alo',
   'Outcome',
   ALX.outcome,
   [
     ['all', 'All outcomes'],
     ['completed', 'Completed'],
     ['failed', 'Failed']
   ],
   "alFilter('outcome',this.value)"
 )}
 ${filt ? `<button type="button" class="al-clr" onclick="ALX.q='';ALX.cat='all';ALX.actor='';ALX.days=30;ALX.outcome='all';ALX.page=0;alLoad(true)">Clear filters</button>` : ''}</div>`;
}
function alFilter(k, v) {
  ALX[k] = v;
  ALX.page = 0;
  alLoad(true);
}
const alTgt = a => {
  const t = a.target_type || '',
    lab = a.target_label;
  const typ =
    {
      user: 'User',
      plan: 'Plan',
      room: 'Room',
      privacy: 'Privacy request',
      staff_invite: 'Staff invitation',
      setting: 'Setting',
      report: 'Report',
      audit: 'Audit log'
    }[t] || (t ? t.replace(/_/g, ' ') : '');
  return {
    label: lab || (t === 'audit' ? 'Audit log' : a.target_id ? String(a.target_id).slice(0, 8) : dash),
    type: typ
  };
};
function alRows() {
  const d = ALX.data || {},
    R = d.rows || [];
  if (!R.length) return alEmpty();
  const n = d.total || 0,
    from = ALX.page * ALX.per + 1,
    to = Math.min(n, from + R.length - 1),
    pages = Math.max(1, Math.ceil(n / ALX.per));
  const pg = [];
  for (let i = Math.max(0, ALX.page - 2); i < Math.min(pages, ALX.page + 3); i++) pg.push(i);
  return `<div class="pq-tw"><table class="au-t pq-t al-t"><thead><tr><th scope="col">Event</th><th scope="col">Staff member</th><th scope="col">Date and time</th><th scope="col">Target</th><th scope="col">Reason</th><th scope="col"><span class="sr">Details</span></th></tr></thead><tbody>
 ${R.map((a, i) => {
   const c = AL_CAT[a.category || alCat(a.action)] || AL_CAT.other,
     t = alTgt(a),
     fail = (a.outcome || alOut(a.action)) === 'failed';
   return `<tr class="pq-r" onclick="if(!event.target.closest('button'))alOpen(${i})"><td data-l="Event"><span class="al-ev"><span class="al-ic t-${c[2] === 'r' ? 'o' : c[2]}w" aria-hidden="true">${sv(c[1], 18)}</span><span><b>${esc(alLab(a.action))}</b><span class="al-pills"><span class="sf-tag sf-tag-${c[2]}">${c[0]}</span>${fail ? '<span class="sf-tag sf-tag-r">Failed</span>' : ''}</span></span></span></td>
 <td data-l="Staff member"><span class="sf-n"><span class="sf-av sm" aria-hidden="true">${esc(initials(a.actor || '?'))}</span><span><b>${esc(a.actor || 'Former staff member')}</b>${a.actor_role ? `<small>${esc(sfRoleName ? sfRoleName(a.actor_role) : a.actor_role)}</small>` : ''}</span></span></td>
 <td data-l="Date and time">${fmtD(a.created_at)}<small>${fmtT(a.created_at)}</small></td><td data-l="Target"><span class="al-tg">${esc(t.label)}</span><small>${esc(t.type)}</small></td>
 <td data-l="Reason" class="pq-rs">${a.reason ? esc(a.reason) : '<span class="ix-mu">No reason recorded</span>'}</td><td class="pq-ac"><button type="button" class="sf-more" aria-label="Details for ${esc(alLab(a.action))}" onclick="alOpen(${i})">${sv('eye', 18)}</button></td></tr>`;
 }).join('')}</tbody></table></div>
 <div class="al-pg"><span>Showing ${fmtN(from)}&ndash;${fmtN(to)} of ${fmtN(n)} event${n === 1 ? '' : 's'}</span>${pages > 1 ? `<div class="al-pn"><button type="button" aria-label="Previous page" ${ALX.page ? '' : 'disabled'} onclick="ALX.page--;alLoad(true)">${sv('chev', 16).replace('<svg', '<svg style="transform:rotate(180deg)"')}</button>${pg.map(i => `<button type="button" class="${i === ALX.page ? 'on' : ''}" aria-current="${i === ALX.page ? 'page' : 'false'}" onclick="ALX.page=${i};alLoad(true)">${i + 1}</button>`).join('')}<button type="button" aria-label="Next page" ${ALX.page + 1 < pages ? '' : 'disabled'} onclick="ALX.page++;alLoad(true)">${sv('chev', 16)}</button></div>` : ''}</div>`;
}
function alEmpty() {
  const any = ((ALX.data || {}).counts || {}).all_time;
  const filt = ALX.q || ALX.cat !== 'all' || ALX.actor || ALX.outcome !== 'all' || ALX.days !== 30;
  return any === 0 || (!filt && !any)
    ? `<div class="pq-empty"><span class="al-eic" aria-hidden="true">${sv('alact', 30)}</span><h2>No activity recorded yet</h2><p>Administrative actions, such as role changes, setting updates, exports and moderation decisions, appear here automatically with who made them, when and why.</p></div>`
    : `<div class="pq-empty"><span class="al-eic" aria-hidden="true">${sv('search', 28)}</span><h2>No matching activity</h2><p>Nothing matches these filters${ALX.days ? ' in the chosen date range' : ''}.</p><button type="button" class="ix-btn" onclick="ALX.q='';ALX.cat='all';ALX.actor='';ALX.days=30;ALX.outcome='all';ALX.page=0;alLoad(true)">Clear filters</button></div>`;
}
function alPage() {
  return `<div id="alwrap" class="al">${alHead()}${ALX.limited ? `<p class="ix-upd">Run database update 012 to lock the log against edits at the database level, record audit exports, and search the full history on the server. Until then the newest 1,000 entries are filtered in your browser.</p>` : ''}
 <div class="md-cs">${alCards()}</div><section class="ix-card pq-main" aria-label="Audit events">${alBar()}${alRows()}</section>
 <div class="pl-info al-note" role="note">${sv('info', 22)}<div><b>Audit log is immutable</b><p>Entries are written automatically by the server when staff take an action. They cannot be edited or deleted by anyone in the admin area${ALX.limited ? '' : ' or through the database API'}.</p></div></div></div>`;
}
/* details panel */
function alVal(v) {
  if (v == null) return dash;
  if (typeof v === 'boolean') return v ? 'On' : 'Off';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
function alOpen(i) {
  const a = ((ALX.data || {}).rows || [])[i];
  if (!a) return;
  const c = AL_CAT[a.category || alCat(a.action)] || AL_CAT.other,
    t = alTgt(a),
    D = a.details || {},
    fail = (a.outcome || alOut(a.action)) === 'failed';
  const ch = D.changes && typeof D.changes === 'object' ? Object.entries(D.changes) : null;
  const kv = Object.entries(D).filter(([k]) => k !== 'changes');
  const link =
    a.target_type === 'user' && a.target_id && typeof mdToUser === 'function' && a.action !== 'user.delete'
      ? `<button type="button" class="ix-btn" onclick="closeModal();mdToUser('${esc(a.target_id)}')">${sv('users', 16)} Open user</button>`
      : a.target_type === 'privacy'
        ? `<button type="button" class="ix-btn" onclick="closeModal();admGo('privacy')">${sv('pqdoc', 16)} Privacy requests</button>`
        : a.target_type === 'plan'
          ? `<button type="button" class="ix-btn" onclick="closeModal();admGo('plans')">${sv('grid', 16)} Plans and pricing</button>`
          : a.target_type === 'setting'
            ? `<button type="button" class="ix-btn" onclick="closeModal();admGo('settings')">${sv('gear', 16)} Settings</button>`
            : /^staff/.test(a.action)
              ? `<button type="button" class="ix-btn" onclick="closeModal();admGo('staff')">${sv('user', 16)} Staff</button>`
              : '';
  modal(`<div class="cap-m pq-m al-m"><div class="row between pq-mh"><div><span class="pq-ref">${esc(a.action)}</span><h3>${esc(alLab(a.action))}</h3></div><button class="x" aria-label="Close" onclick="closeModal()">&times;</button></div>
 <div class="pq-pills"><span class="sf-tag sf-tag-${c[2]}">${c[0]}</span><span class="pq-st ${fail ? 't-o' : 't-g'}">${fail ? 'Failed' : 'Completed'}</span></div>
 <dl class="pq-dl"><div><dt>Staff member</dt><dd>${esc(a.actor || 'Former staff member')}${a.actor_role ? ` <small>${esc(a.actor_role)}</small>` : ''}</dd></div><div><dt>Date and time</dt><dd>${new Date(a.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</dd></div>
 <div><dt>Target</dt><dd>${esc(t.label)} <small>${esc(t.type)}</small></dd></div><div><dt>Target ID</dt><dd class="al-id">${esc(a.target_id || dash)}</dd></div></dl>
 <div class="pq-note"><b>Reason</b><p>${a.reason ? esc(a.reason) : '<span class="ix-mu">No reason recorded.</span>'}</p></div>
 ${ch && ch.length ? `<h4 class="pq-hh">Changes</h4><div class="pl-diff"><table><thead><tr><th scope="col">Field</th><th scope="col">Before</th><th scope="col">After</th></tr></thead><tbody>${ch.map(([k, v]) => `<tr><th scope="row">${esc(k.replace(/_/g, ' '))}</th><td>${esc(alVal(v && v.from))}</td><td>${esc(alVal(v && v.to))}</td></tr>`).join('')}</tbody></table></div>` : ''}
 ${kv.length ? `<h4 class="pq-hh">Details</h4><dl class="al-kv">${kv.map(([k, v]) => `<div><dt>${esc(k.replace(/_/g, ' '))}</dt><dd>${esc(alVal(v))}</dd></div>`).join('')}</dl>` : ''}
 <div class="al-ma">${link}<button type="button" class="ix-btn" onclick="copy(${esc(JSON.stringify(String(a.id)))},'Entry ID copied')">Copy entry ID</button></div>
 <p class="ix-mu al-fine">${sv('lock', 13)} Entry #${esc(String(a.id))}. This record cannot be edited or deleted.</p></div>`);
}
/* export: the filtered list, recorded in the log */
function alExport() {
  const n = (ALX.data || {}).total || 0;
  if (!n) return toast('Nothing to export with these filters');
  admAsk({
    title: 'Export audit log',
    body: `Downloads ${fmtN(n)} event${n === 1 ? '' : 's'} matching the current filters as a CSV file. Store it securely.${ALX.limited ? '' : ' The export is recorded in the audit log.'}`,
    cta: 'Download CSV',
    run: async r => {
      let R = [];
      if (ALX.limited) R = ALX.data._all || [];
      else {
        for (let off = 0; off < Math.min(n, 5000); off += 200) {
          const d = await arpc('admin_audit2', {
            q: ALX.q,
            cat: ALX.cat,
            actor: ALX.actor || null,
            days: ALX.days,
            outcome: ALX.outcome,
            lim: 200,
            off
          });
          R = R.concat(d.rows || []);
          if (!(d.rows || []).length) break;
        }
        await arpc('admin_log', {
          act: 'audit.export',
          uid: null,
          reason: r,
          details: {
            count: R.length,
            filters: {
              q: ALX.q,
              category: ALX.cat,
              actor: ALX.actor || null,
              days: ALX.days,
              outcome: ALX.outcome
            }
          }
        });
      }
      admDownload(
        'introthread-audit-log-' + new Date().toISOString().slice(0, 10) + '.csv',
        admCsv(
          R.map(a =>
            Object.assign({}, a, {
              label: alLab(a.action),
              cat: (AL_CAT[a.category || alCat(a.action)] || AL_CAT.other)[0],
              out: a.outcome || alOut(a.action),
              det: JSON.stringify(a.details || {})
            })
          ),
          [
            ['created_at', 'When'],
            ['actor', 'Staff member'],
            ['actor_role', 'Role'],
            ['label', 'Event'],
            ['action', 'Action code'],
            ['cat', 'Category'],
            ['out', 'Outcome'],
            ['target_type', 'Target type'],
            ['target_id', 'Target ID'],
            ['target_label', 'Target'],
            ['reason', 'Reason'],
            ['det', 'Details'],
            ['id', 'Entry ID']
          ]
        ),
        'text/csv'
      );
    }
  });
}

/* ==== Profile photo: choose the part of the picture to use (drag to move, zoom) before saving ==== */
let PCROP = null;
pickPhoto = async function (inp, live) {
  const f = inp.files && inp.files[0];
  inp.value = '';
  if (!f) return;
  if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return toast('Please choose a JPG, PNG or WebP image.');
  if (f.size > 5 * 1024 * 1024) return toast('That image is over 5MB. Please choose a smaller one.');
  const url = URL.createObjectURL(f);
  const im = new Image();
  im.onerror = () => {
    URL.revokeObjectURL(url);
    toast('Could not read that image.');
  };
  im.onload = () => {
    PCROP = { im, url, live: !!live, z: 1, x: 0, y: 0 };
    pcOpen();
  };
  im.src = url;
};
function pcOpen() {
  modal(`<div class="cap-m pc-m"><div class="row between"><h3>Adjust your photo</h3><button type="button" class="pcb pri pc-hsave" aria-label="Save photo" onclick="pcUse()" style="display:inline-flex!important;visibility:visible!important;opacity:1!important;height:36px!important;padding:0 14px!important;margin-left:auto;margin-right:8px;flex:none;background:#1f5eff!important;color:#fff!important;border:0!important;border-radius:10px;font-weight:700;cursor:pointer">Save</button><button class="x" aria-label="Close" onclick="pcCancel()">&times;</button></div>
 <p class="fu-sub">Drag to choose the part to show and use the slider to zoom. Then tap Save photo.</p>
 <div class="pc-stage" id="pcst" tabindex="0" aria-label="Photo position. Use the arrow keys to move and plus or minus to zoom."><canvas id="pccv" width="560" height="560"></canvas><span class="pc-ring" aria-hidden="true"></span></div>
 <label class="pc-zoom"><span>${sv('search', 16)}</span><input type="range" id="pcz" min="1" max="4" step="0.01" value="1" aria-label="Zoom" oninput="pcZoom(+this.value)"></label>
 <div class="pc-acts" style="display:flex!important;visibility:visible!important;opacity:1!important;position:sticky!important;bottom:0;z-index:5;background:#fff"><button type="button" class="pcb" onclick="pcCancel()" style="visibility:visible!important;opacity:1!important">Cancel</button><button type="button" class="pcb pri" id="pcuse" onclick="pcUse()" style="visibility:visible!important;opacity:1!important">Save photo</button></div></div>`);
  setTimeout(() => {
    try {
      if (typeof pcFit === 'function') pcFit();
    } catch (e) {}
  }, 0);
  setTimeout(() => {
    try {
      if (typeof pcFit === 'function') pcFit();
    } catch (e) {}
  }, 300);
  const st = $('#pcst');
  let drag = null;
  st.addEventListener('pointerdown', e => {
    drag = { x: e.clientX, y: e.clientY, ox: PCROP.x, oy: PCROP.y };
    st.setPointerCapture(e.pointerId);
  });
  st.addEventListener('pointermove', e => {
    if (!drag) return;
    const k = 560 / st.clientWidth;
    PCROP.x = drag.ox + (e.clientX - drag.x) * k;
    PCROP.y = drag.oy + (e.clientY - drag.y) * k;
    pcDraw();
  });
  const end = () => {
    drag = null;
  };
  st.addEventListener('pointerup', end);
  st.addEventListener('pointercancel', end);
  st.addEventListener(
    'wheel',
    e => {
      e.preventDefault();
      pcZoom(PCROP.z * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
    },
    { passive: false }
  );
  st.addEventListener('keydown', e => {
    const m = { ArrowLeft: [20, 0], ArrowRight: [-20, 0], ArrowUp: [0, 20], ArrowDown: [0, -20] }[e.key];
    if (m) {
      e.preventDefault();
      PCROP.x += m[0];
      PCROP.y += m[1];
      pcDraw();
    } else if (e.key === '+' || e.key === '=') {
      pcZoom(PCROP.z * 1.1);
    } else if (e.key === '-') {
      pcZoom(PCROP.z / 1.1);
    }
  });
  const mh = $('#modal');
  if (mh) mh.classList.add('pc-host');
  pcDraw();
}
/* the image always covers the square; position is clamped so no empty edges show */
function pcGeom() {
  const { im, z } = PCROP,
    S = 560,
    base = S / Math.min(im.width, im.height),
    sc = base * z,
    w = im.width * sc,
    h = im.height * sc;
  const mx = (w - S) / 2,
    my = (h - S) / 2;
  PCROP.x = Math.max(-mx, Math.min(mx, PCROP.x));
  PCROP.y = Math.max(-my, Math.min(my, PCROP.y));
  return { S, sc, w, h, dx: (S - w) / 2 + PCROP.x, dy: (S - h) / 2 + PCROP.y };
}
function pcDraw() {
  const c = $('#pccv');
  if (!c || !PCROP) return;
  const g = pcGeom(),
    x = c.getContext('2d');
  x.clearRect(0, 0, g.S, g.S);
  x.imageSmoothingQuality = 'high';
  x.drawImage(PCROP.im, g.dx, g.dy, g.w, g.h);
}
function pcZoom(z) {
  if (!PCROP) return;
  PCROP.z = Math.max(1, Math.min(4, z));
  const r = $('#pcz');
  if (r) r.value = PCROP.z;
  pcDraw();
}
function pcCancel() {
  if (PCROP) {
    URL.revokeObjectURL(PCROP.url);
    PCROP = null;
  }
  closeModal();
}
async function pcUse() {
  if (!PCROP) return;
  const b = $('#pcuse');
  if (b) b.disabled = true;
  const g = pcGeom(),
    O = 480,
    k = O / g.S,
    c = document.createElement('canvas');
  c.width = c.height = O;
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.fillRect(0, 0, O, O);
  x.imageSmoothingQuality = 'high';
  x.drawImage(PCROP.im, g.dx * k, g.dy * k, g.w * k, g.h * k);
  let q = 0.88,
    d = c.toDataURL('image/jpeg', q);
  while (d.length > 90000 && q > 0.5) {
    q -= 0.08;
    d = c.toDataURL('image/jpeg', q);
  }
  if (d.length > 90000) {
    const c2 = document.createElement('canvas');
    c2.width = c2.height = 320;
    c2.getContext('2d').drawImage(c, 0, 0, 320, 320);
    d = c2.toDataURL('image/jpeg', 0.82);
  }
  const live = PCROP.live;
  URL.revokeObjectURL(PCROP.url);
  PCROP = null;
  closeModal();
  try {
    if (live) {
      const u = me();
      const links = Object.assign({}, u.links || {}, { photo: d });
      if (await upd('profiles', u.id, { links })) {
        u.links = links;
        u.photo = d;
        save();
        toast('Photo updated');
        window._keepScroll = true;
        render();
      }
    } else {
      SU.photo = d;
      const el = $('#xup');
      if (el) el.innerHTML = upBox();
      if (typeof liveP === 'function') liveP();
    }
  } catch (e) {
    toast('Could not save that photo.');
  }
}

/* Staff: last active as a short, readable time on one line, with the exact time on hover */
function sfWhen(t) {
  if (!t) return `<span class="sf-la none">Never signed in</span>`;
  const d = new Date(t),
    now = new Date(),
    ms = now - d,
    min = Math.round(ms / 6e4);
  const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(),
    dd = Math.round((day(now) - day(d)) / 864e5),
    tm = fmtT(t);
  const rel =
    min < 2
      ? 'Just now'
      : min < 60
        ? `${min} min ago`
        : dd === 0
          ? `Today, ${tm}`
          : dd === 1
            ? `Yesterday, ${tm}`
            : dd < 7
              ? `${dd} days ago`
              : fmtD(t);
  const full = d.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const fresh = ms < 15 * 6e4;
  return `<span class="sf-la${fresh ? ' on' : ''}" title="Last sign-in: ${esc(full)}">${fresh ? '<i aria-hidden="true"></i>' : ''}${esc(rel)}</span>${dd >= 1 && dd < 7 ? `<small>${esc(fmtD(t))}</small>` : ''}`;
}

if (typeof closeModal === 'function') {
  const _cmPc = closeModal;
  closeModal = function () {
    const m = document.getElementById('modal');
    if (m) m.classList.remove('pc-host');
    return _cmPc.apply(this, arguments);
  };
}

/* ==== Where and when you met: exact time and (with permission) location on every new Thread ==== */
const geoOn = () => {
  const u = me();
  return (
    !(u && u.prefs && u.prefs.geo === false) && typeof navigator !== 'undefined' && 'geolocation' in navigator
  );
};
function geoGet() {
  return new Promise(res => {
    if (!geoOn()) return res(null);
    let done = false;
    const fin = v => {
      if (!done) {
        done = true;
        res(v);
      }
    };
    setTimeout(() => fin(null), 12000);
    try {
      navigator.geolocation.getCurrentPosition(
        p =>
          fin({
            lat: +p.coords.latitude.toFixed(6),
            lng: +p.coords.longitude.toFixed(6),
            acc: Math.round(p.coords.accuracy || 0),
            fix: new Date(p.timestamp || Date.now()).toISOString()
          }),
        () => fin(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    } catch (_) {
      fin(null);
    }
  });
}
async function geoPlace(g) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${g.lat}&lon=${g.lng}`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (!r.ok) return null;
    const d = await r.json(),
      a = d.address || {};
    const parts = [
      d.name || a.amenity || a.building || a.shop || a.office || a.tourism || a.leisure,
      a.road,
      a.suburb || a.neighbourhood || a.quarter,
      a.city || a.town || a.village || a.county,
      a.country
    ].filter(Boolean);
    return [...new Set(parts)].slice(0, 4).join(', ') || d.display_name || null;
  } catch (_) {
    return null;
  }
}
/* geo and exact time travel inside where_met with the other extras */
const _tPackG = tPack;
tPack = function (where, meta) {
  const base = _tPackG(where, meta);
  const m = {};
  if (meta && meta.geo) m.geo = meta.geo;
  if (meta && meta.at) m.at = meta.at;
  if (!Object.keys(m).length) return base;
  const mm = base.match(/\s*@@(\{.*\})\s*$/);
  if (mm) {
    let o = {};
    try {
      o = JSON.parse(mm[1]);
    } catch (_) {}
    return base.slice(0, mm.index) + ' @@' + JSON.stringify(Object.assign(o, m));
  }
  return base + ' @@' + JSON.stringify(m);
};
const _tMetaG = tMeta;
tMeta = function (t) {
  if (t && !t._mx) {
    const mm = String(t.where || '').match(/\s*@@(\{.*\})\s*$/);
    if (mm) {
      try {
        const o = JSON.parse(mm[1]);
        t.other = t.other || {};
        if (o.geo) t.other.geo = o.geo;
        if (o.at) t.other.at = o.at;
      } catch (_) {}
    }
  }
  return _tMetaG.apply(this, arguments);
};
const _ntGeo = newThread;
newThread = function (e) {
  const at = new Date().toISOString();
  const gp = geoGet();
  const before = new Set((DB.threads || []).map(t => t.id));
  const r = _ntGeo.apply(this, arguments);
  let n = 0;
  const iv = setInterval(async () => {
    const t = (DB.threads || []).find(x => !before.has(x.id) && x.ownerId === DB.session);
    if (!t) {
      if (++n > 60) clearInterval(iv);
      return;
    }
    clearInterval(iv);
    t.other = t.other || {};
    t.other.at = at;
    const g = await gp;
    await new Promise(z => setTimeout(z, 1500));
    if (g) {
      t.other.geo = g;
      const pl = await geoPlace(g);
      if (pl) t.other.geo.place = pl;
    }
    if (cloud())
      await upd('threads', t.id, { where_met: tPack(t.where, Object.assign({}, t.other, { src: t.src })) });
    save();
    if (String(location.pathname).includes(t.id)) render();
  }, 150);
  return r;
};
function geoWhenTxt(iso) {
  const d = new Date(iso);
  return (
    d.toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) +
    ' ' +
    (() => {
      try {
        return new Intl.DateTimeFormat('en-GB', { timeZoneName: 'short' })
          .formatToParts(d)
          .find(x => x.type === 'timeZoneName').value;
      } catch (_) {
        return '';
      }
    })()
  );
}
function geoBlock(t) {
  const o = t.other || {},
    g = o.geo,
    at = o.at || (t.createdAt ? new Date(t.createdAt).toISOString() : null);
  if (!at && !g) return '';
  const maps = g ? `https://www.google.com/maps/search/?api=1&query=${g.lat},${g.lng}` : '';
  return `<section class="geo-b" aria-label="Where and when you met"><div class="geo-h">${sv('pin', 18)}<b>Where and when you met</b></div>
 <dl>${at ? `<div><dt>Time</dt><dd>${esc(geoWhenTxt(at))}</dd></div>` : ''}${t.where && t.where !== 'In person' ? `<div><dt>Event or place you entered</dt><dd>${esc(t.where)}</dd></div>` : ''}
 ${g ? `<div><dt>Location</dt><dd>${g.place ? esc(g.place) + '<br>' : ''}<span class="geo-c">${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}</span> <small>(accurate to about ${fmtN(g.acc)} m)</small></dd></div>` : `<div><dt>Location</dt><dd class="geo-no">Not recorded${geoOn() ? '. Allow location when your phone asks, next time you save a Thread.' : '. Turned off in Settings.'}</dd></div>`}</dl>
 ${g ? `<a class="geo-l" href="${maps}" target="_blank" rel="noopener">${sv('ext', 14)} Open in Maps</a>` : ''}</section>`;
}
const _vThreadGeo = vThread;
vThread = function (id) {
  const h = _vThreadGeo.apply(this, arguments);
  const t = findThread(id);
  if (!t) return h;
  try {
    tMeta(t);
  } catch (_) {}
  const b = geoBlock(t);
  if (!b) return h;
  let i = h.indexOf('<ul class="td-facts">');
  if (i >= 0) {
    const j = h.indexOf('</ul>', i);
    if (j > 0) return h.slice(0, j + 5) + b.replace('class="geo-b"', 'class="geo-b geo-in"') + h.slice(j + 5);
  }
  i = h.indexOf('<div class="rep-l">');
  if (i >= 0) return h.slice(0, i) + b + h.slice(i);
  i = h.lastIndexOf('</div></main>');
  return i >= 0 ? h.slice(0, i) + b + h.slice(i) : h;
};
/* exports: add exact time and location columns */
if (typeof bExportThreads === 'function') {
  const _bx = bExportThreads;
  bExportThreads = function () {
    const T = typeof myThreads === 'function' ? myThreads() : [];
    T.forEach(t => {
      try {
        tMeta(t);
      } catch (_) {}
    });
    const origNote = T.map(t => t.note);
    T.forEach(t => {
      const o = t.other || {},
        g = o.geo;
      const extra = [
        o.at ? 'Met at ' + geoWhenTxt(o.at) : '',
        g ? `Location: ${g.place ? g.place + ' ' : ''}(${g.lat}, ${g.lng}, about ${g.acc} m)` : ''
      ]
        .filter(Boolean)
        .join(' | ');
      if (extra) t.note = (t.note ? t.note + ' | ' : '') + extra;
    });
    try {
      return _bx.apply(this, arguments);
    } finally {
      T.forEach((t, i) => (t.note = origNote[i]));
    }
  };
}
/* setting: Settings > privacy card gets a switch */
const _vSetGeo = vSettings;
vSettings = function () {
  const h = _vSetGeo.apply(this, arguments);
  const u = me();
  if (!u) return h;
  const on = !(u.prefs && u.prefs.geo === false);
  const row = `<label class="t-tog st-row geo-set"><input type="checkbox" ${on ? 'checked' : ''} onchange="setPref('geo',this.checked)"><span class="t-sw"></span><span><b>Save where I meet people</b><small>When you save a new Thread, record the exact time and your phone's location (with your permission). Only your own location, never the other person's. The place name is looked up with OpenStreetMap.</small></span></label>`;
  return h.replace('<div class="priv-acts">', row + '<div class="priv-acts">');
};

/* ==== Settings > Security: real password change, two-step verification for every user, sign out other devices / everywhere ==== */
let SECX = { u: null, f: null, aal: null, enroll: null, busy: false, err: '' };
async function secLoad() {
  if (!(typeof cloud === 'function' && cloud()) || !SB) return;
  try {
    const [{ data: ud }, { data: fd }, { data: ad }] = await Promise.all([
      SB.auth.getUser(),
      SB.auth.mfa.listFactors(),
      SB.auth.mfa.getAuthenticatorAssuranceLevel()
    ]);
    SECX.u = (ud && ud.user) || null;
    SECX.f = ((fd && fd.totp) || []).find(x => x.status === 'verified') || null;
    SECX.aal = ad || null;
  } catch (e) {
    SECX.err = (e && e.message) || '';
  }
  if (STAB === 'security') {
    window._keepScroll = true;
    render();
  }
}
function secView(u) {
  const live = typeof cloud === 'function' && cloud();
  if (live && !SECX.u && !SECX._req) {
    SECX._req = 1;
    secLoad();
  }
  const U = SECX.u || {},
    prov = (U.app_metadata || {}).providers || [],
    hasPw = !live || prov.includes('email');
  const when = x =>
    x
      ? new Date(x).toLocaleString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : dash;
  const row = (t, d, r) =>
    `<div class="st-row st-data sec-row"><div><b>${t}</b><small>${d}</small></div>${r || ''}</div>`;
  const acct = stCard(
    sv('user', 22),
    'Your account',
    'Where you sign in and when you last did.',
    row('Email', esc(U.email || u.email || '')) +
      row('Last sign-in', live ? when(U.last_sign_in_at) : 'Demo account') +
      row(
        'Sign-in methods',
        live
          ? esc(
              prov
                .map(
                  x =>
                    ({
                      email: 'Email and password',
                      google: 'Google',
                      azure: 'Microsoft',
                      linkedin_oidc: 'LinkedIn'
                    })[x] || x
                )
                .join(', ') || dash
            )
          : 'Demo account'
      )
  );
  const pw = stCard(
    sv('lock', 22),
    hasPw ? 'Change password' : 'Set a password',
    hasPw
      ? 'Use at least 10 characters with letters and numbers.'
      : 'You sign in with ' + esc(prov.join(', ')) + '. Add a password to also sign in with your email.',
    `<form class="sec-f" onsubmit="event.preventDefault();secPw(${hasPw ? 1 : 0})" novalidate>${hasPw ? `<label class="x-f"><span>Current password</span><input id="secpc" type="password" autocomplete="current-password"></label>` : ''}<label class="x-f"><span>New password</span><input id="secpn" type="password" autocomplete="new-password" minlength="10"></label><label class="x-f"><span>Repeat new password</span><input id="secpr" type="password" autocomplete="new-password"></label><p class="sec-err" id="secperr" role="alert"></p>
  <div class="sec-acts"><button type="submit" class="x-btn">${hasPw ? 'Change password' : 'Set password'}</button>${live ? `<button type="button" class="pf-btn" onclick="secReset()">Email me a reset link</button>` : ''}</div></form>`
  );
  const f = SECX.f,
    en = SECX.enroll;
  const mfa = stCard(
    sv('shield', 22),
    'Two-step verification',
    f
      ? 'On. You enter a 6-digit code from your authenticator app when you sign in.'
      : 'Add a second step at sign-in with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password).',
    !live
      ? '<p class="st-p">Available on real accounts, not the demo.</p>'
      : f
        ? `<div class="sec-on">${sv('check', 16, 'currentColor', 2.4)} Two-step verification is on</div><div class="sec-acts"><button type="button" class="pf-btn bad" onclick="secMfaOff()">Turn off</button></div>`
        : en
          ? `<div class="sec-qr"><img src="${en.qr}" alt="QR code to add Introthread to your authenticator app" width="180" height="180"><div><b>1. Scan this QR code</b><small>Or enter this key: <code>${esc(en.secret)}</code></small><b>2. Enter the 6-digit code</b><input id="secmc" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456"><p class="sec-err" id="secmerr" role="alert"></p><div class="sec-acts"><button type="button" class="x-btn" onclick="secMfaVerify()">Turn on</button><button type="button" class="pf-btn" onclick="secMfaCancel()">Cancel</button></div></div></div>`
          : `<div class="sec-acts"><button type="button" class="x-btn" onclick="secMfaStart()">${sv('shield', 16)} Set up two-step verification</button></div>`
  );
  const ses = stCard(
    sv('sync', 22),
    'Signed-in devices',
    'If you lost a phone or used a shared computer, sign out there.',
    row(
      'This device',
      'You are signed in here.',
      `<button type="button" class="pf-btn" onclick="logout()">Sign out</button>`
    ) +
      (live
        ? row(
            'All other devices',
            'Signs out every other phone, tablet and browser. This one stays signed in.',
            `<button type="button" class="pf-btn" onclick="secOut('others')">Sign out others</button>`
          ) +
          row(
            'Everywhere',
            'Signs out every device, including this one.',
            `<button type="button" class="pf-btn bad" onclick="secOut('global')">Sign out everywhere</button>`
          )
        : '')
  );
  return `<div class="sec-g">${acct}${pw}${mfa}${ses}</div>`;
}
async function secPw(hasPw) {
  const g = id => ($('#' + id) || {}).value || '',
    er = $('#secperr');
  const cur = g('secpc'),
    n = g('secpn'),
    r = g('secpr');
  er.textContent = '';
  if (hasPw && !cur) return (er.textContent = 'Enter your current password');
  if (n.length < 10 || !/[A-Za-z]/.test(n) || !/\d/.test(n))
    return (er.textContent = 'Use at least 10 characters with letters and numbers');
  if (n !== r) return (er.textContent = 'The new passwords do not match');
  if (hasPw && n === cur) return (er.textContent = 'Choose a password you have not used here');
  if (!(typeof cloud === 'function' && cloud())) {
    toast('Password changes work on real accounts');
    return;
  }
  try {
    const em = (SECX.u && SECX.u.email) || me().email;
    if (hasPw) {
      const { error: e1 } = await SB.auth.signInWithPassword({ email: em, password: cur });
      if (e1) return (er.textContent = 'Your current password is not right');
    }
    const { error } = await SB.auth.updateUser({ password: n });
    if (error)
      return (er.textContent = /aal2|mfa|assurance/i.test(error.message)
        ? 'Enter your two-step code first: sign out and sign in again with your code'
        : error.message);
    ['secpc', 'secpn', 'secpr'].forEach(i => {
      const x = $('#' + i);
      if (x) x.value = '';
    });
    toast(hasPw ? 'Password changed' : 'Password set');
    secLoad();
  } catch (e) {
    er.textContent = (e && e.message) || 'Could not change the password';
  }
}
async function secReset() {
  try {
    const em = (SECX.u && SECX.u.email) || me().email;
    const { error } = await SB.auth.resetPasswordForEmail(em, { redirectTo: location.origin + '/login' });
    if (error) throw error;
    toast('Reset link sent to ' + em);
  } catch (e) {
    toast((e && e.message) || 'Could not send the email');
  }
}
async function secMfaStart() {
  try {
    const { data: l } = await SB.auth.mfa.listFactors();
    for (const x of (l && l.all) || [])
      if (x.status !== 'verified') await SB.auth.mfa.unenroll({ factorId: x.id });
    const { data, error } = await SB.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Introthread ' + Date.now()
    });
    if (error) throw error;
    SECX.enroll = { id: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
    window._keepScroll = true;
    render();
    setTimeout(() => {
      const i = $('#secmc');
      if (i) i.focus();
    }, 50);
  } catch (e) {
    toast((e && e.message) || 'Could not start set-up');
  }
}
async function secMfaVerify() {
  const c = (($('#secmc') || {}).value || '').trim(),
    er = $('#secmerr');
  if (!/^\d{6}$/.test(c)) return (er.textContent = 'Enter the 6-digit code from your app');
  try {
    const { error } = await SB.auth.mfa.challengeAndVerify({ factorId: SECX.enroll.id, code: c });
    if (error)
      return (er.textContent =
        'That code did not work. Check the time on your phone and try the newest code.');
    SECX.enroll = null;
    toast('Two-step verification is on');
    await secLoad();
  } catch (e) {
    er.textContent = (e && e.message) || 'Could not verify';
  }
}
async function secMfaCancel() {
  try {
    if (SECX.enroll) await SB.auth.mfa.unenroll({ factorId: SECX.enroll.id });
  } catch (_) {}
  SECX.enroll = null;
  window._keepScroll = true;
  render();
}
function secMfaOff() {
  modal(
    `<div class="cap-m"><div class="row between"><h3>Turn off two-step verification</h3><button class="x" aria-label="Close" onclick="closeModal()">&times;</button></div><p class="fu-sub">Enter a current code from your authenticator app to confirm. Your account will then only need your password.</p><label class="x-f"><span>6-digit code</span><input id="secoc" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></label><p class="sec-err" id="secoerr"></p><button class="cap-btn bad" onclick="secMfaOffGo()">Turn off</button></div>`
  );
}
async function secMfaOffGo() {
  const c = (($('#secoc') || {}).value || '').trim(),
    er = $('#secoerr');
  if (!/^\d{6}$/.test(c)) return (er.textContent = 'Enter the 6-digit code');
  try {
    const id = SECX.f.id;
    const { error: e1 } = await SB.auth.mfa.challengeAndVerify({ factorId: id, code: c });
    if (e1) return (er.textContent = 'That code did not work');
    const { error } = await SB.auth.mfa.unenroll({ factorId: id });
    if (error) throw error;
    closeModal();
    toast('Two-step verification is off');
    await secLoad();
  } catch (e) {
    er.textContent = (e && e.message) || 'Could not turn it off';
  }
}
function secOut(scope) {
  const all = scope === 'global';
  if (
    !confirm(
      all
        ? 'Sign out of Introthread on every device, including this one?'
        : 'Sign out of Introthread on every other device? This one stays signed in.'
    )
  )
    return;
  SB.auth.signOut({ scope }).then(({ error }) => {
    if (error) return toast(error.message);
    if (all) {
      toast('Signed out everywhere');
      logout();
    } else toast('Signed out of all other devices');
  });
}
/* sign-in with two-step on: ask for the code before the app opens */
let MFAG = null;
async function mfaCheck() {
  if (!SB || !(typeof cloud === 'function' && cloud())) return;
  try {
    const { data } = await SB.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
      const { data: l } = await SB.auth.mfa.listFactors();
      const f = ((l && l.totp) || []).find(x => x.status === 'verified');
      if (f) {
        MFAG = { id: f.id };
        render();
      }
    }
  } catch (_) {}
}
function mfaGate() {
  return `<div class="adm-gate"><div class="adm-gc"><div class="adm-gi">${sv('shield', 24)}</div><h1>Enter your code</h1><p>Two-step verification is on for this account. Open your authenticator app and enter the 6-digit code for Introthread.</p><label class="x-f"><span>6-digit code</span><input id="mfagc" inputmode="numeric" autocomplete="one-time-code" maxlength="6" onkeydown="if(event.key==='Enter')mfaGo()"></label><p class="sec-err" id="mfagerr"></p><button class="cap-btn" onclick="mfaGo()">Continue</button><button class="cap-btn2" style="margin-top:8px" onclick="MFAG=null;logout()">Use another account</button></div></div>`;
}
async function mfaGo() {
  const c = (($('#mfagc') || {}).value || '').trim(),
    er = $('#mfagerr');
  if (!/^\d{6}$/.test(c)) return (er.textContent = 'Enter the 6-digit code');
  const { error } = await SB.auth.mfa.challengeAndVerify({ factorId: MFAG.id, code: c });
  if (error) return (er.textContent = 'That code did not work. Try the newest code.');
  MFAG = null;
  render();
}
const _renderSec = render;
render = function () {
  const pa = location.pathname || '';
  if (MFAG && pa.startsWith('/app')) {
    $('#root').innerHTML = mfaGate();
    setTimeout(() => {
      const i = $('#mfagc');
      if (i) i.focus();
    }, 30);
    return;
  }
  return _renderSec.apply(this, arguments);
};
(async () => {
  for (let i = 0; i < 60 && !(typeof cloud === 'function' && cloud()); i++)
    await new Promise(r => setTimeout(r, 250));
  mfaCheck();
})();
if (SB && SB.auth && SB.auth.onAuthStateChange)
  SB.auth.onAuthStateChange(ev => {
    if (ev === 'SIGNED_IN') setTimeout(mfaCheck, 300);
  });
const _stOtherSec = stOther;
stOther = function (u, t) {
  if (t === 'security') return secView(u);
  return _stOtherSec.apply(this, arguments);
};

/* ==== Notifications: a real in-app feed in the bell (confirmed, they answered, matched, follow-up due, fading) with unread count ==== */
const nfKey = () => 'it_nf_read_' + (DB.session || 'x');
function nfRead() {
  try {
    const v = localStorage.getItem(nfKey());
    if (v == null) {
      const n = Date.now() - 6e4;
      localStorage.setItem(nfKey(), String(n));
      return n;
    }
    return +v || 0;
  } catch (_) {
    return 0;
  }
}
function nfFeed() {
  const u = me();
  if (!u) return [];
  const P = u.prefs || {},
    on = k => P[k] !== false,
    out = [],
    now = Date.now();
  myThreads().forEach(t => {
    const nm = (t.other && t.other.name) || 'Someone',
      f = esc(nm.split(' ')[0]),
      st = threadState(t),
      E = t.events || [];
    if (on('inappConfirm'))
      E.filter(e => e.k === 'confirm' && !/Verified by both/.test(e.text || '')).forEach(e =>
        out.push({ at: e.at, t, ic: 'check', tone: 'g', txt: `<b>${f}</b> confirmed your Thread.` })
      );
    if (on('inappAnswer'))
      E.filter(e => e.k === 'answer' && !/^You /.test(e.text || '')).forEach(e =>
        out.push({
          at: e.at,
          t,
          ic: 'thread',
          tone: 'b',
          txt: t.mine
            ? `<b>${f}</b> answered. Your answers are revealed.`
            : `<b>${f}</b> answered &ldquo;What&rsquo;s next?&rdquo;. Answer to see both.`
        })
      );
    if (on('inappMatch') && st === 'matched') {
      const a = Math.max(...E.filter(e => e.k === 'answer').map(e => e.at || 0), t.createdAt || 0);
      out.push({ at: a, t, ic: 'spark', tone: 'g', txt: `You and <b>${f}</b> matched. Send the follow-up.` });
      const fu = E.some(e => e.k === 'followup');
      if (!fu && now - a > DAY)
        out.push({
          at: a + DAY,
          t,
          ic: 'clock',
          tone: 'o',
          txt: `Follow-up due with <b>${f}</b>. It has been a day since you matched.`
        });
    }
    if (on('inappNudge') && st === 'open' && !t.mine && pulse(t) < 0.35)
      out.push({
        at: (t.createdAt || 0) + Math.round(7 * DAY * 0.65),
        t,
        ic: 'clock',
        tone: 'o',
        txt: `Your Thread with <b>${f}</b> is fading. Answer &ldquo;What&rsquo;s next?&rdquo;.`
      });
    if (on('inappNudge') && st === 'pending' && now - (t.createdAt || 0) > DAY)
      out.push({
        at: (t.createdAt || 0) + DAY,
        t,
        ic: 'mail',
        tone: 'm',
        txt: `<b>${f}</b> has not confirmed yet. Share your link again.`
      });
  });
  return out
    .filter(x => x.at && x.at <= now + 6e4)
    .sort((a, b) => b.at - a.at)
    .slice(0, 40);
}
const nfUnread = () => {
  const r = nfRead();
  return nfFeed().filter(x => x.at > r).length;
};
showNudges = function () {
  const L = nfFeed(),
    r = nfRead();
  try {
    localStorage.setItem(nfKey(), String(Date.now()));
  } catch (_) {}
  modal(`<div class="cap-m nf-m"><div class="row between"><h3>Notifications</h3><button class="x" aria-label="Close" onclick="closeModal();nfBadge()">&times;</button></div>
 ${L.length ? `<ul class="nf-l">${L.map(x => `<li class="${x.at > r ? 'new' : ''}"><button type="button" onclick="closeModal();nfBadge();go('/app/thread/${x.t.id}')"><span class="nf-i t-${x.tone}w" aria-hidden="true">${sv(x.ic, 16)}</span><span class="nf-tx">${x.txt}<small>${ago(x.at)}</small></span>${x.at > r ? '<i class="nf-dot" aria-label="New"></i>' : ''}</button></li>`).join('')}</ul>` : `<div class="nf-empty">${sv('bell', 22)}<b>You're all caught up</b><small>Confirmations, answers, matches and follow-ups appear here.</small></div>`}
 <a class="nf-set" href="/app/settings?tab=notifications" onclick="closeModal()">Notification settings</a></div>`);
  nfBadge();
};
function nfBadge() {
  const n = nfUnread();
  document.querySelectorAll('.t-bell').forEach(b => {
    b.querySelectorAll('i,em').forEach(x => x.remove());
    b.setAttribute('aria-label', n ? `Notifications, ${n} new` : 'Notifications');
    if (n) b.insertAdjacentHTML('beforeend', `<em class="nf-n">${n > 9 ? '9+' : n}</em>`);
  });
}
const _renderNf = render;
render = function () {
  const r = _renderNf.apply(this, arguments);
  try {
    if (me() && (location.pathname || '').startsWith('/app')) nfBadge();
  } catch (_) {}
  return r;
};
/* settings: in-app switches per event, honest email note */
const _bNotifsNf = bNotifs;
bNotifs = function (u) {
  const P = u.prefs || {};
  const t = (k, l, d) => bTog(P[k] !== false, l, d, `setPref('${k}',this.checked)`);
  let h = _bNotifsNf.apply(this, arguments);
  h = h.replace(
    /(\$\{bSec\('bell')|<button type="button" class="t-how sm" onclick="showNudges\(\)">Open notifications<\/button>/,
    m => m
  );
  const extra =
    t('inappConfirm', 'When someone confirms a Thread', 'Shown in the bell.') +
    t(
      'inappAnswer',
      'When they answer &ldquo;What&rsquo;s next?&rdquo;',
      'Shown in the bell. Their answer stays private until you answer too.'
    ) +
    t('inappMatch', 'When you match, and when a follow-up is due', 'Shown in the bell.');
  const i = h.indexOf('<div class="bl-data"><div><b>Preview</b>');
  return i >= 0 ? h.slice(0, i) + extra + h.slice(i) : h;
};

/* ==== Settings > Integrations: link and unlink Google, Microsoft and LinkedIn sign-in to your account (Supabase identity linking) ==== */
const INT_P = [
  ['google', 'Google', 'g', 'Sign in with Google and keep your Google account linked.'],
  ['azure', 'Microsoft', 'ms', 'Sign in with Microsoft (Outlook, Microsoft 365) and keep it linked.'],
  ['linkedin_oidc', 'LinkedIn', 'li', 'Sign in with LinkedIn and link your LinkedIn profile.']
];
let INTX = { ids: null, on: null, loading: false, err: '' };
async function intLoad(force) {
  if (INTX.loading || (!force && INTX.ids)) return;
  if (!(typeof cloud === 'function' && cloud()) || !SB) return;
  INTX.loading = true;
  try {
    const [{ data, error }, st] = await Promise.all([
      SB.auth.getUserIdentities(),
      fetch((window.INTROTHREAD_CONFIG || {}).supabaseUrl + '/auth/v1/settings', {
        headers: { apikey: (window.INTROTHREAD_CONFIG || {}).supabaseAnonKey }
      })
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null)
    ]);
    if (error) throw error;
    INTX.ids = (data && data.identities) || [];
    INTX.on = st && st.external ? st.external : null;
    INTX.err = '';
  } catch (e) {
    INTX.err = (e && e.message) || 'Could not load your connections';
  }
  INTX.loading = false;
  if (STAB === 'integrations') {
    window._keepScroll = true;
    render();
  }
}
function intIcon(c) {
  return c === 'li'
    ? sv('li', 20)
    : c === 'ms'
      ? typeof stMs === 'function'
        ? stMs()
        : sv('grid', 20)
      : typeof oG === 'function'
        ? oG()
        : sv('globe', 20);
}
function intView() {
  const live = typeof cloud === 'function' && cloud();
  if (live && !INTX.ids && !INTX.loading) setTimeout(() => intLoad(), 0);
  const ids = INTX.ids || [],
    n = ids.length;
  const row = ([k, name, c, d]) => {
    const id = ids.find(x => x.provider === k);
    const avail = INTX.on ? INTX.on[k] === true : null;
    const em = id && id.identity_data && (id.identity_data.email || id.identity_data.name);
    let btn, sub;
    if (!live) {
      btn = `<button type="button" class="st12-cb" disabled>Real accounts only</button>`;
      sub = d;
    } else if (!INTX.ids) {
      btn = `<button type="button" class="st12-cb" disabled>Checking...</button>`;
      sub = d;
    } else if (id) {
      const only = n < 2;
      btn = `<button type="button" class="st12-cb on" ${only ? 'disabled title="This is your only way to sign in. Set a password in Security first."' : ''} onclick="intDisconnect('${k}')">Disconnect</button>`;
      sub = `Connected${em ? ' as ' + esc(em) : ''}.${only ? ' This is your only way to sign in, so set a password in Security before disconnecting.' : ''}`;
    } else if (avail === false) {
      btn = `<button type="button" class="st12-cb" disabled>Not set up yet</button>`;
      sub = `${name} sign-in is not switched on for Introthread yet.`;
    } else {
      btn = `<button type="button" class="st12-cb" onclick="intConnect('${k}')">Connect</button>`;
      sub = d;
    }
    return `<div class="st12-conn"><span class="st12-ci ${c}">${intIcon(c)}</span><div><b>${name}</b><small>${sub}</small></div>${btn}</div>`;
  };
  const cal =
    typeof stGConnect === 'function' && typeof gTok === 'function'
      ? (() => {
          const g = gTok();
          return `<div class="st12-conn"><span class="st12-ci g">${intIcon('g')}</span><div><b>Google Calendar</b><small>${g ? 'Connected. Today&rsquo;s meetings show on your dashboard.' : 'Show today&rsquo;s meetings on your dashboard.'}</small></div>${g ? `<button type="button" class="st12-cb on" onclick="stGDisc()">Disconnect</button>` : `<button type="button" class="st12-cb" onclick="stGConnect()">Connect</button>`}</div>`;
        })()
      : '';
  return `<section class="d-box st12-box"><div class="cd-bh"><span class="cd-bi">${sv('link', 20)}</span><div><b>Connected accounts</b><small>Link the accounts you use to sign in. You can sign in with any linked account.</small></div></div>
 ${INTX.err ? `<p class="sec-err">${esc(INTX.err)} <button type="button" class="au-inl" onclick="intLoad(true)">Try again</button></p>` : ''}${INT_P.map(row).join('')}${cal}
 <p class="st12-sec">${sv('lock', 13)} Connections use the provider&rsquo;s secure sign-in. Introthread never sees your password. LinkedIn does not share your connections list with any app; to import contacts, use the LinkedIn export file in Contacts.</p></section>`;
}
async function intConnect(k) {
  const p = INT_P.find(x => x[0] === k);
  try {
    const opts = { redirectTo: location.origin + '/app/settings?tab=integrations' };
    if (k === 'azure') opts.scopes = 'email';
    const { error } = await SB.auth.linkIdentity({ provider: k, options: opts });
    if (error) throw error;
  } catch (e) {
    const m = (e && e.message) || '';
    toast(
      /manual linking|disabled|not enabled|unsupported provider|provider is not enabled/i.test(m)
        ? `${p[1]} is not set up yet for Introthread.`
        : /already/i.test(m)
          ? `That ${p[1]} account is already linked to another Introthread account.`
          : m || 'Could not connect'
    );
  }
}
async function intDisconnect(k) {
  const p = INT_P.find(x => x[0] === k),
    id = (INTX.ids || []).find(x => x.provider === k);
  if (!id) return;
  if ((INTX.ids || []).length < 2)
    return toast('Set a password in Security before disconnecting your only sign-in.');
  if (!confirm(`Disconnect ${p[1]}? You will no longer be able to sign in with it.`)) return;
  try {
    const { error } = await SB.auth.unlinkIdentity(id);
    if (error) throw error;
    toast(p[1] + ' disconnected');
    await intLoad(true);
  } catch (e) {
    toast((e && e.message) || 'Could not disconnect');
  }
}
/* after returning from a provider, refresh the list; show a clear message if linking failed */
(function () {
  try {
    const q = new URLSearchParams(location.search + '&' + location.hash.replace(/^#/, ''));
    const er = q.get('error_description');
    if (er && location.pathname === '/app/settings')
      setTimeout(
        () =>
          toast(/already/i.test(er) ? 'That account is already linked to another Introthread account.' : er),
        800
      );
  } catch (_) {}
})();
if (SB && SB.auth && SB.auth.onAuthStateChange)
  SB.auth.onAuthStateChange(ev => {
    if (ev === 'USER_UPDATED' || ev === 'SIGNED_IN') {
      INTX.ids = null;
      if (STAB === 'integrations') setTimeout(() => intLoad(true), 300);
    }
  });
const _stOtherInt = stOther;
stOther = function (u, t) {
  if (t === 'integrations') {
    const h = _stOtherInt.apply(this, arguments);
    const i = h.indexOf('<section class="d-box st12-box">');
    const j = i >= 0 ? h.indexOf('</section>', i) : -1;
    return i >= 0 && j >= 0 ? h.slice(0, i) + intView() + h.slice(j + 10) : intView() + h;
  }
  return _stOtherInt.apply(this, arguments);
};

/* ==== Integrations page polish: grouped, status pills, summary ==== */
intView = function () {
  const live = typeof cloud === 'function' && cloud();
  if (live && !INTX.ids && !INTX.loading) setTimeout(() => intLoad(), 0);
  const ids = INTX.ids || [],
    n = ids.length;
  let linked = 0;
  const pill = (c, t) =>
    `<span class="in-pill ${c}">${c === 'on' ? sv('check', 12, 'currentColor', 2.6) : ''}${t}</span>`;
  const row = ([k, name, c, d]) => {
    const id = ids.find(x => x.provider === k);
    const avail = INTX.on ? INTX.on[k] === true : null;
    const em = id && id.identity_data && (id.identity_data.email || id.identity_data.name);
    let btn, sub, st;
    if (!live) {
      st = pill('off', 'Real accounts only');
      btn = '';
      sub = d;
    } else if (!INTX.ids) {
      st = pill('off', 'Checking');
      btn = '';
      sub = d;
    } else if (id) {
      linked++;
      const only = n < 2;
      st = pill('on', 'Connected');
      sub = em ? `Signed in as <b>${esc(em)}</b>` : 'Linked to your account';
      if (only)
        sub +=
          '<br><span class="in-warn">Your only sign-in method. Set a password in Security before disconnecting.</span>';
      btn = `<button type="button" class="in-btn ghost" ${only ? 'disabled' : ''} onclick="intDisconnect('${k}')">Disconnect</button>`;
    } else if (avail === false) {
      st = pill('wait', 'Not set up yet');
      sub = `${name} sign-in has not been switched on for Introthread yet.`;
      btn = `<button type="button" class="in-btn" disabled>Connect</button>`;
    } else {
      st = pill('av', 'Available');
      sub = d;
      btn = `<button type="button" class="in-btn" onclick="intConnect('${k}')">Connect</button>`;
    }
    return `<li class="in-row"><span class="in-ic ${c}" aria-hidden="true">${intIcon(c)}</span><div class="in-tx"><div class="in-t"><b>${name}</b>${st}</div><small>${sub}</small></div>${btn}</li>`;
  };
  const rows = INT_P.map(row).join('');
  const cal =
    typeof stGConnect === 'function' && typeof gTok === 'function'
      ? (() => {
          const g = gTok();
          return `<li class="in-row"><span class="in-ic g" aria-hidden="true">${intIcon('g')}</span><div class="in-tx"><div class="in-t"><b>Google Calendar</b>${g ? pill('on', 'Connected') : pill('av', 'Available')}</div><small>${g ? 'Today&rsquo;s meetings show on your dashboard.' : 'Show today&rsquo;s meetings on your dashboard, so you know who you will meet.'}</small></div>${g ? `<button type="button" class="in-btn ghost" onclick="stGDisc()">Disconnect</button>` : `<button type="button" class="in-btn" onclick="stGConnect()">Connect</button>`}</li>`;
        })()
      : '';
  return `<div class="in-wrap"><section class="d-box st12-box in-card"><div class="in-h"><span class="cd-bi">${sv('link', 20)}</span><div><b>Sign-in accounts</b><small>Link the accounts you use, then sign in with any of them.</small></div>${live && INTX.ids ? `<span class="in-sum">${linked} of ${INT_P.length} connected</span>` : ''}</div>
 ${INTX.err ? `<p class="sec-err">${esc(INTX.err)} <button type="button" class="au-inl" onclick="intLoad(true)">Try again</button></p>` : ''}<ul class="in-list">${rows}</ul></section>
 ${cal ? `<section class="d-box st12-box in-card"><div class="in-h"><span class="cd-bi">${sv('cal', 20)}</span><div><b>Calendar</b><small>See your meetings next to your Threads.</small></div></div><ul class="in-list">${cal}</ul></section>` : ''}
 <div class="in-note">${sv('lock', 15)}<p>Every connection uses the provider&rsquo;s own secure sign-in. Introthread never sees or stores your passwords, and you can disconnect at any time. LinkedIn does not share anyone&rsquo;s connections list with apps; to bring in contacts, use your LinkedIn export file in Contacts.</p></div></div>`;
};

/* ==== Event mode redesign: one clean screen, big QR, clear event tagging, toolbar ==== */
Object.assign(SV, {
  evfs: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  evsun:
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  evmoon: '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>'
});
const _vScanEv2 = vScan;
vScan = function () {
  const u = me();
  if (!u) return _vScanEv2.apply(this, arguments);
  const R = scanRooms();
  const room = SCAN.room && DB.rooms.find(x => x.id === SCAN.room);
  const n = scanToday(),
    first = esc((u.name || '').split(' ')[0]);
  setTimeout(() => {
    const q = $('#scanqr');
    if (q) {
      const sz = Math.max(190, Math.min(innerWidth - 96, innerHeight - (innerHeight < 760 ? 430 : 400), 420));
      qr(q, scanUrl(u), sz);
    }
    scanWake(true);
  }, 20);
  const sub = [u.role, u.company].filter(Boolean).join(' · ');
  return `<div class="ev2 ${SCAN.dark ? 'dk' : ''}"><header class="ev2-h"><button type="button" class="ev2-ib" aria-label="Close event mode" onclick="scanClose()">${sv('close', 20)}</button>
 <span class="ev2-live" role="status"><i aria-hidden="true"></i>Live<span class="ev2-sep">·</span>Screen stays on</span>
 <div class="ev2-hr"><button type="button" class="ev2-ib" aria-label="${SCAN.dark ? 'Light' : 'Dark'} QR background" onclick="SCAN.dark=!SCAN.dark;render()">${sv(SCAN.dark ? 'evsun' : 'evmoon', 18)}</button><button type="button" class="ev2-ib" aria-label="Full screen" onclick="scanFull()">${sv('evfs', 18)}</button></div></header>
 <main class="ev2-m"><div class="ev2-card"><div class="ev2-who">${avatarC(u, 52)}<div><b>${esc(u.name || '')}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div></div>
 <div class="ev2-qrw"><span class="ev2-c tl"></span><span class="ev2-c tr"></span><span class="ev2-c bl"></span><span class="ev2-c br"></span><div id="scanqr" role="img" aria-label="QR code for introthread.com/${esc(u.handle)}"></div><span class="t-qrlogo"><span class="x-lm"><i></i><i></i></span></span></div>
 <p class="ev2-cta">Scan to connect with ${first}</p><button type="button" class="ev2-url" onclick="copy('https://introthread.com/${esc(u.handle)}','Link copied')" title="Copy link">introthread.com/${esc(u.handle)} ${sv('copy', 14)}</button></div>
 <section class="ev2-tag" aria-label="Event tagging"><span class="ev2-lab">${sv('pin', 14)} Tag new Threads to</span><div class="ev2-chips" role="radiogroup" aria-label="Event"><button type="button" role="radio" aria-checked="${!room}" class="${room ? '' : 'on'}" onclick="SCAN.room='';render()">No event</button>${R.map(r => `<button type="button" role="radio" aria-checked="${SCAN.room === r.id}" class="${SCAN.room === r.id ? 'on' : ''}" onclick="SCAN.room='${r.id}';render()">${esc(r.name)}</button>`).join('')}<a class="ev2-new" href="/app/rooms">${sv('plus', 14)} New event</a></div></section>
 <nav class="ev2-bar" aria-label="More ways to connect"><button type="button" onclick="shareNative()">${sv('send', 20)}<span>Share</span></button><button type="button" onclick="tapNFC()">${sv('nfc', 20)}<span>NFC</span></button><button type="button" onclick="scanWallpaper()">${sv('photo', 20)}<span>Wallpaper</span></button><a href="/app/tap">${sv('user', 20)}<span>Add manually</span></a></nav>
 <p class="ev2-tip">${n ? `<b>${n} Thread${n > 1 ? 's' : ''} today.</b> ` : ''}Tip: turn your brightness up for faster scanning.</p></main></div>`;
};

/* ==== Invoice v2: professional international layout with the Introthread logo ==== */
const invLogo = (h = 30) =>
  `<svg class="iv-logo" height="${h}" viewBox="0 0 196 40" role="img" aria-label="Introthread"><defs><linearGradient id="itiv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1f5eff"/><stop offset="1" stop-color="#ff5a1f"/></linearGradient></defs><path d="M8 27C19 39 23 5 34 15" fill="none" stroke="url(#itiv)" stroke-width="3.4" stroke-linecap="round"/><circle cx="8" cy="27" r="6" fill="#1f5eff"/><circle cx="34" cy="15" r="6" fill="#ff5a1f"/><text x="52" y="28" font-family="sans-serif" font-size="24" font-weight="600" fill="#0f1b3d" textLength="140" lengthAdjust="spacingAndGlyphs">intro<tspan fill="#1f5eff">thread</tspan></text></svg>`;
bInvHTML = function (i) {
  const b = bGet(),
    d = b.details || {},
    u = me() || {};
  const cur = i.currency || 'USD';
  const paid = i.status === 'paid',
    overdue = i.status === 'open' && Date.now() > i.due,
    voided = i.status !== 'paid' && i.status !== 'open';
  const st = paid ? ['Paid', 'g'] : voided ? ['Void', 'n'] : overdue ? ['Overdue', 'r'] : ['Due', 'o'];
  const rate = (String(i.taxLabel || '').match(/([\d.]+)%/) || [])[1];
  const due = paid ? 0 : i.total;
  const ctry =
    (typeof COUNTRIES !== 'undefined' ? (COUNTRIES.find(c => c[0] === d.country) || [])[1] : '') || '';
  return `<article class="iv" aria-label="Invoice ${esc(i.number)}">
 <header class="iv-top"><div>${invLogo(34)}<address class="iv-from"><b>Introthread Ltd</b>London &middot; New York<br>billing@introthread.com<br>www.introthread.com</address></div>
 <div class="iv-title"><h2>Invoice</h2><dl><div><dt>Invoice number</dt><dd>${esc(i.number)}</dd></div><div><dt>Issue date</dt><dd>${bDate(i.date)}</dd></div><div><dt>${paid ? 'Paid on' : 'Due date'}</dt><dd>${bDate(paid ? i.paidAt : i.due)}</dd></div>${i.period ? `<div><dt>Service period</dt><dd>${bDate(i.period[0])} &ndash; ${bDate(i.period[1])}</dd></div>` : ''}</dl><span class="iv-st ${st[1]}">${st[0]}</span></div></header>
 <section class="iv-parties"><div><h3>Bill to</h3><b>${esc(d.name || u.name || '')}</b>${d.company ? `<span>${esc(d.company)}</span>` : ''}${d.address ? `<span>${esc(d.address)}</span>` : ''}${ctry ? `<span>${esc(ctry)}</span>` : ''}<span>${esc(d.email || u.email || '')}</span>${d.vat ? `<span>Tax ID: ${esc(d.vat)}</span>` : ''}</div>
 <div class="iv-amt"><h3>${paid ? 'Amount paid' : 'Amount due'}</h3><strong>${money(paid ? i.total : due)}</strong><span>${cur}${paid ? '' : ' &middot; due ' + bDate(i.due)}</span></div></section>
 <table class="iv-t"><thead><tr><th scope="col">Description</th><th scope="col" class="n">Qty</th><th scope="col" class="n">Unit price</th>${rate ? `<th scope="col" class="n">Tax</th>` : ''}<th scope="col" class="n">Amount (${cur})</th></tr></thead>
 <tbody>${(i.lines || []).map(l => `<tr><td><b>${esc(l.d)}</b>${i.period ? `<small>${bDate(i.period[0])} &ndash; ${bDate(i.period[1])}</small>` : ''}</td><td class="n">1</td><td class="n">${money(l.amount, i.currency || 'USD')}</td>${rate ? `<td class="n">${rate}%</td>` : ''}<td class="n">${money(l.amount, i.currency || 'USD')}</td></tr>`).join('')}</tbody></table>
 <div class="iv-sum"><dl><div><dt>Subtotal</dt><dd>${money(i.subtotal, i.currency || 'USD')}</dd></div><div><dt>${esc(i.taxLabel || 'Tax')}${rate ? ` on ${money(i.subtotal, i.currency || 'USD')}` : ''}</dt><dd>${money(i.tax, i.currency || 'USD')}</dd></div><div class="tot"><dt>Total (${cur})</dt><dd>${money(i.total, i.currency || 'USD')}</dd></div>${paid ? `<div><dt>Amount paid</dt><dd>&minus;${money(i.total, i.currency || 'USD')}</dd></div>` : ''}<div class="due"><dt>Balance due</dt><dd>${money(due)}</dd></div></dl></div>
 <footer class="iv-foot"><div><h3>Payment</h3><p>${paid ? `Paid ${bDate(i.paidAt)}${i.method ? ' with ' + esc(i.method) : ''}${MODE === 'demo' ? ' (demo, simulated)' : ''}.` : `Pay online in Introthread under Settings &gt; Billing by ${bDate(i.due)}.`}</p></div>
 <div><h3>Notes</h3><p>Prices are in ${cur}. ${i.tax ? 'Tax is shown as charged at the rate for your billing country.' : 'No tax was charged on this invoice.'} Questions: billing@introthread.com, quoting ${esc(i.number)}.</p></div>
 <p class="iv-thanks">Thank you for using Introthread.</p></footer></article>`;
};
bInvPrint = function (id) {
  const i = bGet().invoices.find(x => x.id === id);
  if (!i) return;
  const w = window.open('', '_blank');
  if (!w) return toast('Allow pop-ups to download the invoice.');
  const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
  w.document.write(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${i.number} - Introthread invoice</title><style>${css}@page{size:A4;margin:14mm}html,body{background:#fff!important;overflow:visible!important}body{padding:0;margin:0}.iv{box-shadow:none;border:0;max-width:none;padding:0}</style></head><body>${bInvHTML(i)}<scr` +
      `ipt>setTimeout(()=>print(),400)</scr` +
      `ipt></body></html>`
  );
  w.document.close();
};

const _vThreads8 = vThreads;
vThreads = function () {
  let h = _vThreads8.apply(this, arguments);
  const b = ctBar('t');
  if (h.startsWith(b)) {
    h = h.slice(b.length);
    h = h.replace(/(<div class="content"[^>]*>)/, '$1' + b);
  }
  return h;
};

const _vTap34 = vTap;
vTap = function () {
  let h = _vTap34();
  h = h.replace(/<a href="\/app\/scan" class="t-event">[\s\S]*?<\/a>/, '');
  if (h.includes('<a href="/how" class="t-how">') && !h.includes('t-hacts')) {
    h = h
      .replace(
        '<a href="/how" class="t-how">',
        `<div class="t-hacts"><a href="/app/scan" class="t-evbtn"><span>${sv('qr', 18)}</span><span><b>Event mode</b><small>Full-screen QR</small></span></a><a href="/how" class="t-how">`
      )
      .replace(/(How it works<\/a>)/, '$1</div>');
  }
  return h;
};

const _vTap35 = vTap;
vTap = function () {
  let h = _vTap35();
  h = h.replace('<form class="t-form"', `<form class="t-form${TAPM === 'q' ? ' q' : ''}"`);
  h = h.replace(
    /<label class="x-f"><span>Email<\/span>(<input id="te")[^>]*>/,
    '<label class="x-f"><span><b class="te-f" style="font-weight:inherit">Email</b><b class="te-q" style="font-weight:inherit">Email or phone <i>*</i></b></span>$1 type="text" autocomplete="off" placeholder="name@company.com or +254 7XX XXX XXX">'
  );
  return h;
};
const _tapMode35 = tapMode;
tapMode = function (m) {
  _tapMode35(m);
  const f = document.querySelector('.t-form');
  if (f) f.classList.toggle('q', m === 'q');
};
const _nt35 = newThread;
newThread = function (e) {
  const f = document.querySelector('.t-form');
  if (f && f.classList.contains('q')) {
    const te = $('#te'),
      tp = $('#tph');
    const v = ((te && te.value) || '').trim();
    if (v && !v.includes('@') && /^[+\d][\d\s()-]{5,}$/.test(v) && tp) {
      tp.value = v;
      te.value = '';
    }
  }
  return _nt35.call(this, e);
};

const _gcal11 = gcalPanel;
gcalPanel = function () {
  return _gcal11
    .apply(this, arguments)
    .replace("oauth('Google',1)\">Connect</button>", "oauth('Google',1)\">Connect calendar</button>");
};

const _vProfile13 = vProfile;
vProfile = function () {
  return _vProfile13.apply(this, arguments).replace(/Suggest with AI/g, 'Generate with AI');
};

const _vContacts18 = vContacts;
vContacts = function () {
  const h = _vContacts18.apply(this, arguments);
  return /class="app[ "]/.test(h) ? h : shell('threads', h);
};
