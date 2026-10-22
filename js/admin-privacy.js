// Introthread - Admin Privacy requests (v41, screen 8 of 9). Prefix pq / PQX.
// Moved out of index.html in v52 (code split step 4). Load order matters: see the <script> list at the end of index.html.

/* ==== Admin redesign v41: screen 8 of 9, Privacy requests (prefix pq / PQX) ==== */
let PQX = { st: 'all', q: '', days: 0, page: 0, per: 25, data: null, limited: false, reopen: null, _t: null };
Object.assign(SV, {
  pqdoc:
    '<path d="M14 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3.5V8h4.5M9 12.5h6M9 16h6"/>',
  pqx: '<circle cx="12" cy="12" r="8.5"/><path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6"/>',
  pqok: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.2 2.4 2.4 4.6-4.8"/>',
  pqid: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 15.5c.6-1.2 1.7-1.8 3-1.8s2.4.6 3 1.8M14.5 10h3M14.5 13h2.5"/>',
  pqtrash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5"/>'
});
const PQ_KIND = {
  export: ['Copy of data', 'pqdoc', 'b'],
  delete: ['Delete account', 'pqtrash', 'r'],
  correct: ['Correct data', 'edit', 'p']
};
const PQ_ST = {
  open: ['Open', 'o'],
  in_progress: ['In progress', 'b'],
  done: ['Actioned', 'g'],
  rejected: ['Dismissed', 'm']
};
const pqMiss = e =>
  /admin_privacy2|admin_privacy_detail|admin_privacy_act|could not find|schema cache|does not exist/i.test(
    (e && e.message) || ''
  );
const pqRef = r =>
  'PR-' +
  (r.ref ||
    String(r.id || '')
      .replace(/-/g, '')
      .slice(0, 8)
      .toUpperCase());
const pqGrp = s => (['open', 'in_progress'].includes(s) ? 'open' : s === 'done' ? 'actioned' : 'dismissed');
const pqCan = () => admOk(['owner', 'admin', 'support']);
function pqDue(r) {
  if (pqGrp(r.status) !== 'open')
    return `<span class="pq-due m">Closed${r.handled_at ? ' ' + fmtD(r.handled_at) : ''}</span>`;
  const d = Math.ceil((Date.parse(r.due_at) - Date.now()) / 864e5);
  return d < 0
    ? `<span class="pq-due r">${sv('alert', 13)} Overdue by ${-d} day${d === -1 ? '' : 's'}</span>`
    : d <= 7
      ? `<span class="pq-due a">${d === 0 ? 'Due today' : d + ' day' + (d === 1 ? '' : 's') + ' left'}</span>`
      : `<span class="pq-due m">${d} days left</span>`;
}
const pqStP = s => {
  const x = PQ_ST[s] || [s, 'm'];
  return `<span class="pq-st t-${x[1]}">${x[0]}</span>`;
};
const pqKindP = k => {
  const x = PQ_KIND[k] || [k, 'pqdoc', 'm'];
  return `<span class="pq-k k-${x[2]}">${sv(x[1], 14)} ${x[0]}</span>`;
};
const _alt41 = admLoadTab;
admLoadTab = async function () {
  if (ADM.stage === 'ready' && ADM.tab === 'privacy') return pqLoad(true);
  return _alt41.apply(this, arguments);
};
/* load */
async function pqLoad(keep) {
  if (!keep || !$('#pqwrap')) admBody(pqSkel());
  try {
    let d = null;
    if (!PQX.limited) {
      try {
        d = await arpc('admin_privacy2', {
          st: PQX.st,
          q: PQX.q,
          days: PQX.days,
          lim: PQX.per,
          off: PQX.page * PQX.per
        });
      } catch (e) {
        if (pqMiss(e)) PQX.limited = true;
        else throw e;
      }
    }
    if (PQX.limited) d = pqLocal((await arpc('admin_privacy')) || []);
    PQX.data = d;
    if (ADM.tab !== 'privacy') return;
    const f = document.activeElement && document.activeElement.id === 'pqq';
    admBody(pqPage());
    if (f) {
      const i = $('#pqq');
      if (i) {
        i.focus();
        i.setSelectionRange(i.value.length, i.value.length);
      }
    }
    if (typeof admNavBadges === 'function') admNavBadges();
    if (PQX.reopen) {
      const id = PQX.reopen;
      PQX.reopen = null;
      pqOpen(id);
    }
  } catch (e) {
    admBody(
      pqHead() +
        `<div class="ix-card ix-fail" role="alert">${sv('alert', 22)}<div><b>Privacy requests could not load</b><p>${esc((e && e.message) || 'Unknown error')}</p></div><button type="button" class="ix-btn" onclick="pqLoad()">${sv('refresh', 16)} Try again</button></div>`
    );
  }
}
/* before update 010: filter the full list in the browser */
function pqLocal(L) {
  const q = PQX.q
      .trim()
      .toLowerCase()
      .replace(/^pr-|^#/, ''),
    since = PQX.days ? Date.now() - PQX.days * 864e5 : 0;
  const hit = L.map(r =>
    Object.assign({}, r, { ref: String(r.id).replace(/-/g, '').slice(0, 8).toUpperCase() })
  ).filter(
    r =>
      Date.parse(r.created_at) >= since &&
      (!q ||
        [r.name, r.handle, r.account_email, r.email, r.ref, r.id].some(v =>
          String(v || '')
            .toLowerCase()
            .includes(q)
        ))
  );
  const c = g => hit.filter(r => pqGrp(r.status) === g).length;
  const sel = hit
    .filter(r => PQX.st === 'all' || pqGrp(r.status) === PQX.st)
    .sort((a, b) => {
      const ao = pqGrp(a.status) === 'open',
        bo = pqGrp(b.status) === 'open';
      if (ao !== bo) return ao ? -1 : 1;
      return ao
        ? Date.parse(a.due_at) - Date.parse(b.due_at)
        : Date.parse(b.created_at) - Date.parse(a.created_at);
    });
  return {
    counts: {
      all: hit.length,
      open: c('open'),
      actioned: c('actioned'),
      dismissed: c('dismissed'),
      overdue: hit.filter(r => pqGrp(r.status) === 'open' && Date.parse(r.due_at) < Date.now()).length,
      due_soon: hit.filter(r => {
        const t = Date.parse(r.due_at) - Date.now();
        return pqGrp(r.status) === 'open' && t >= 0 && t < 7 * 864e5;
      }).length
    },
    total: sel.length,
    rows: sel.slice(PQX.page * PQX.per, (PQX.page + 1) * PQX.per),
    _all: L
  };
}
/* header, cards, toolbar */
function pqHead() {
  return `<div class="ix-h"><div><h1>Privacy requests</h1><p>Copies of personal data and account deletions. Introthread aims to reply within 30 days; the legal deadline depends on the law that applies to the person.</p></div><div class="ix-hc"><button type="button" class="ix-btn" onclick="pqGuide()">${sv('info', 17)} Learn about GDPR &amp; CCPA</button></div></div>`;
}
function pqSkel() {
  return (
    pqHead() +
    `<div class="md-cs">${'<div class="md-c sk"><i></i><b></b></div>'.repeat(4)}</div><div class="ix-card sk" style="height:360px"></div>`
  );
}
function pqCards() {
  const c = (PQX.data || {}).counts || {};
  const card = (st, ic, tone, l, v, sub) =>
    `<button type="button" class="rm-c${PQX.st === st ? ' on' : ''}" onclick="pqFilter('st','${st}')" aria-pressed="${PQX.st === st}"><span class="md-wi t-${tone}w" aria-hidden="true">${sv(ic, 24)}</span><span><span class="rm-cl">${l}</span><b>${fmtN(v)}</b>${sub ? `<small class="rv-ch ${sub[1]}">${sub[0]}</small>` : ''}</span></button>`;
  return (
    card('all', 'pqdoc', 'b', 'Total requests', c.all, PQX.days ? ['In the chosen dates', 'm'] : null) +
    card(
      'open',
      'clock',
      'o',
      'Open',
      c.open,
      c.overdue
        ? [`${fmtN(c.overdue)} overdue`, 'r']
        : c.due_soon
          ? [`${fmtN(c.due_soon)} due within 7 days`, 'm']
          : null
    ) +
    card('actioned', 'pqok', 'g', 'Actioned', c.actioned) +
    card('dismissed', 'pqx', 'm', 'Dismissed', c.dismissed)
  );
}
function pqBar() {
  const c = (PQX.data || {}).counts || {};
  const tab = (k, l) =>
    `<button type="button" role="tab" aria-selected="${PQX.st === k}" class="${PQX.st === k ? 'on' : ''}" onclick="pqFilter('st','${k}')">${l} (${fmtN(c[k] || 0)})</button>`;
  return `<div class="pq-tb"><div class="pq-tabs" role="tablist" aria-label="Status">${tab('all', 'All')}${tab('open', 'Open')}${tab('actioned', 'Actioned')}${tab('dismissed', 'Dismissed')}</div>
 ${mdSel(
   'pqd',
   'Date',
   PQX.days,
   [
     ['0', 'Any date'],
     ['7', 'Last 7 days'],
     ['30', 'Last 30 days'],
     ['90', 'Last 90 days'],
     ['365', 'Last 12 months']
   ],
   "pqFilter('days',+this.value)",
   'cal'
 ).replace('<span class="md-sl">Date:</span>', '<span class="sr">Date</span>')}
 <label class="au-search pq-q">${sv('search', 17)}<input id="pqq" type="search" value="${esc(PQX.q)}" placeholder="Name, email or request ID" aria-label="Search by name, email or request ID" oninput="clearTimeout(PQX._t);const v=this.value;PQX._t=setTimeout(()=>pqFilter('q',v),300)"></label></div>`;
}
function pqFilter(k, v) {
  PQX[k] = v;
  PQX.page = 0;
  pqLoad(true);
}
/* table */
function pqTable() {
  const d = PQX.data || {},
    R = d.rows || [],
    pages = Math.max(1, Math.ceil((d.total || 0) / PQX.per));
  if (!R.length) return pqEmpty();
  return `<div class="pq-tw"><table class="au-t pq-t"><thead><tr><th scope="col">Request</th><th scope="col">Person</th><th scope="col">Type</th><th scope="col">Reason</th><th scope="col">Received</th><th scope="col" title="Introthread's 30-day target. Legal deadlines vary and can sometimes be extended.">Respond by</th><th scope="col">Status</th><th scope="col"><span class="sr">Actions</span></th></tr></thead><tbody>
 ${R.map(
   r => `<tr class="pq-r" onclick="if(!event.target.closest('button'))pqOpen('${esc(r.id)}')"><td data-l="Request"><b class="pq-ref">${pqRef(r)}</b></td><td data-l="Person"><b>${esc(r.name || 'Deleted account')}</b><small>${esc(r.account_email || r.email || '')}</small></td><td data-l="Type">${pqKindP(r.kind)}</td>
 <td data-l="Reason" class="pq-rs">${r.details ? esc(r.details) : '<span class="ix-mu">No note given</span>'}</td><td data-l="Received">${fmtD(r.created_at)}</td><td data-l="Respond by">${fmtD(r.due_at)}${pqDue(r)}</td><td data-l="Status">${pqStP(r.status)}</td>
 <td class="pq-ac"><button type="button" class="ix-btn" onclick="pqOpen('${esc(r.id)}')">${pqGrp(r.status) === 'open' && pqCan() ? 'Review' : 'View'}</button></td></tr>`
 ).join('')}</tbody></table></div>
 ${pages > 1 ? `<div class="pq-pg"><button type="button" class="ix-btn" ${PQX.page ? '' : 'disabled'} onclick="PQX.page--;pqLoad(true)">Previous</button><span>Page ${PQX.page + 1} of ${pages}</span><button type="button" class="ix-btn" ${PQX.page + 1 < pages ? '' : 'disabled'} onclick="PQX.page++;pqLoad(true)">Next</button></div>` : ''}`;
}
function pqEmpty() {
  const filt = PQX.q || PQX.days || PQX.st !== 'all';
  return `<div class="pq-empty"><div class="pq-ill" aria-hidden="true"><i></i><span>${sv('lock', 30)}</span><i></i></div><h2>${filt ? 'No requests match' : 'No requests yet'}</h2>
 <p>${filt ? 'Try another status, date or search.' : 'People ask for a copy of their data or for their account to be deleted from Settings, under "Your data and privacy", in the app. Each request appears here with a 30-day reminder.'}</p>
 ${filt ? `<button type="button" class="ix-btn" onclick="PQX.q='';PQX.days=0;PQX.st='all';PQX.page=0;pqLoad(true)">Clear filters</button>` : `<button type="button" class="ix-btn pri" onclick="pqGuide()">${sv('pqdoc', 17)} Data handling guide</button>`}</div>`;
}
function pqInfo() {
  return `<div class="ix-card pq-info"><div><span class="sg-ri" aria-hidden="true">${sv('shield', 20)}</span><div><b>What are privacy requests?</b><p>People can ask for a copy of the personal data Introthread holds about them, ask for it to be corrected, or ask for their account to be deleted. Every step you take here is recorded.</p><button type="button" class="au-inl" onclick="pqGuide()">Learn more</button></div></div>
 <div><span class="sg-ri" aria-hidden="true">${sv('clock', 20)}</span><div><b>Your checklist</b><ul><li>Check the request really comes from the account holder</li><li>Reply within the deadline that applies (30-day reminder here)</li><li>Send data securely, only to the account's email</li><li>Record what you did and when you told them</li></ul></div></div>
 <div><span class="sg-ri" aria-hidden="true">${sv('pqdoc', 20)}</span><div><b>What a data copy includes</b><ul><li>Account email and sign-up date</li><li>Profile and card details</li><li>Threads they started</li><li>Contacts they saved</li><li>Rooms they organise</li></ul></div></div></div>`;
}
function pqPage() {
  return `<div id="pqwrap" class="pq">${pqHead()}${PQX.limited ? `<p class="ix-upd">Run database update 010 for server-side search and paging, identity checks, people's notes and full request history. Until then the list is filtered in your browser.</p>` : ''}
 <div class="md-cs">${pqCards()}</div><section class="ix-card pq-main" aria-label="Requests">${pqBar()}${pqTable()}</section>${pqInfo()}</div>`;
}
/* request detail */
async function pqOpen(id) {
  modal(
    `<div class="cap-m pq-m"><div id="pqmb"><div class="ix-card sk" style="height:260px"></div></div></div>`
  );
  try {
    let r;
    if (!PQX.limited) {
      try {
        r = await arpc('admin_privacy_detail', { rid: id });
      } catch (e) {
        if (pqMiss(e)) PQX.limited = true;
        else throw e;
      }
    }
    if (PQX.limited) {
      const L = (PQX.data && PQX.data._all) || (await arpc('admin_privacy'));
      r = Object.assign(
        {},
        L.find(x => x.id === id)
      );
      if (!r.id) throw new Error('Request not found');
      const A = (await arpc('admin_audit', { lim: 1000 }).catch(() => [])) || [];
      r.history = A.filter(
        x =>
          (x.target_type === 'privacy' && x.target_id === id) ||
          (x.target_type === 'user' &&
            x.target_id === r.user_id &&
            /^user\.(export|delete)$/.test(x.action) &&
            Date.parse(x.created_at) >= Date.parse(r.created_at))
      ).reverse();
    }
    PQX.cur = r;
    const b = $('#pqmb');
    if (b) b.innerHTML = pqDetail(r);
  } catch (e) {
    const b = $('#pqmb');
    if (b)
      b.innerHTML = `<div class="row between"><h3>Request</h3><button class="x" aria-label="Close" onclick="closeModal()">&times;</button></div><p class="adm-err">${esc((e && e.message) || 'Could not load the request')}</p>`;
  }
}
function pqDetail(r) {
  const open = pqGrp(r.status) === 'open',
    can = pqCan(),
    H = r.history || [],
    J = x => esc(JSON.stringify(x));
  const exported = H.some(h => h.action === 'user.export'),
    deleted = !r.user_id || H.some(h => h.action === 'user.delete');
  const k = PQ_KIND[r.kind] || [r.kind];
  const step = (n, done, t, p, act) =>
    `<li class="${done ? 'ok' : ''}"><span class="pq-sn" aria-hidden="true">${done ? sv('check', 14, 'currentColor', 2.6) : n}</span><div><b>${t}</b><p>${p}</p>${act || ''}</div></li>`;
  const vfy = r.identity_checked_at
    ? `Checked ${fmtD(r.identity_checked_at)}${r.checked_by_name ? ' by ' + esc(r.checked_by_name) : ''}.`
    : 'The request was sent from a signed-in account. For deletions or anything unusual, confirm by replying to the account email before acting.';
  const s2 =
    r.kind === 'export'
      ? step(
          2,
          exported,
          'Prepare a copy of their data',
          exported
            ? 'A data export was downloaded for this request. Send it only to the account email, through a secure link.'
            : 'Download everything Introthread holds about this person as a file. Send it only to the account email, through a secure link.',
          open && can && r.user_id && !exported
            ? `<button type="button" class="ix-btn" onclick="PQX.reopen='${r.id}';admExportAsk(${J(r.user_id)},${J(r.handle || 'user')})">${sv('sgimport', 16)} Export data</button>`
            : ''
        )
      : r.kind === 'delete'
        ? step(
            2,
            deleted,
            'Delete the account',
            deleted
              ? 'The account has been deleted.'
              : r.is_staff
                ? 'This person is on the staff list. Remove their staff access first.'
                : 'Permanently deletes the account, card, Threads, contacts and Rooms. Export a copy first if they also asked for one.',
            open && r.user_id && !deleted && !r.is_staff
              ? admOk(['owner', 'admin'])
                ? `<button type="button" class="ix-btn bad" onclick="PQX.reopen='${r.id}';admDeleteAsk(${J(r.user_id)},${J(r.handle || 'user')})">${sv('pqtrash', 16)} Delete account</button>`
                : '<p class="ix-mu">Only owners and admins can delete accounts.</p>'
              : ''
          )
        : step(
            2,
            false,
            'Correct their details',
            'Open the person in Users to check what needs changing. Ask them what is wrong if their note does not say.',
            r.user_id && typeof mdToUser === 'function'
              ? `<button type="button" class="ix-btn" onclick="closeModal();mdToUser('${r.user_id}')">${sv('users', 16)} Open in Users</button>`
              : ''
          );
  return `<div class="row between pq-mh"><div><span class="pq-ref">${pqRef(r)}</span><h3>${esc(k[0])}</h3></div><button class="x" aria-label="Close" onclick="closeModal()">&times;</button></div>
 <div class="pq-pills">${pqStP(r.status)}${pqDue(r)}</div>
 <dl class="pq-dl"><div><dt>Person</dt><dd>${esc(r.name || 'Deleted account')}${r.handle ? ` <small>@${esc(r.handle)}</small>` : ''}</dd></div><div><dt>Email</dt><dd>${esc(r.account_email || r.email || dash)}</dd></div><div><dt>Received</dt><dd>${fmtD(r.created_at)} ${fmtT(r.created_at)}</dd></div><div><dt>Respond by</dt><dd>${fmtD(r.due_at)} <small>(30-day reminder)</small></dd></div>${r.account_created ? `<div><dt>Account created</dt><dd>${fmtD(r.account_created)}</dd></div>` : ''}${r.others ? `<div><dt>Other requests</dt><dd>${fmtN(r.others)}</dd></div>` : ''}</dl>
 <div class="pq-note"><b>Their note</b><p>${r.details ? esc(r.details) : '<span class="ix-mu">No note given.</span>'}</p></div>
 ${
   open
     ? `<ol class="pq-steps">${step(1, !!r.identity_checked_at, 'Check identity', vfy, can && !r.identity_checked_at && !PQX.limited ? `<button type="button" class="ix-btn" onclick="pqAct('${r.id}','verify')">${sv('pqid', 16)} Mark identity checked</button>` : '')}${s2}
 ${step(3, false, 'Close the request', 'Mark it actioned once you have done what they asked and told them. Dismiss it only when it is not valid, for example identity could not be confirmed, and tell them why.', can ? `<div class="pq-acts">${r.status === 'open' ? `<button type="button" class="ix-btn" onclick="pqAct('${r.id}','start')">Start working on it</button>` : ''}<button type="button" class="ix-btn pri" onclick="pqAct('${r.id}','done')">${sv('pqok', 16)} Mark actioned</button><button type="button" class="ix-btn" onclick="pqAct('${r.id}','reject')">Dismiss</button></div>` : '<p class="ix-mu">Only owners, admins and support can act on requests.</p>')}</ol>`
     : `<div class="pq-closed">${sv(r.status === 'done' ? 'pqok' : 'pqx', 18)}<div><b>${r.status === 'done' ? 'Actioned' : 'Dismissed'}${r.handled_at ? ' on ' + fmtD(r.handled_at) : ''}${r.handled_by_name ? ' by ' + esc(r.handled_by_name) : ''}</b>${r.resolution ? `<p>${esc(r.resolution)}</p>` : ''}</div></div>`
 }
 <h4 class="pq-hh">History</h4>${H.length ? `<ol class="pq-hist">${H.map(h => `<li><b>${esc(pqAction(h.action))}</b><span>${fmtD(h.created_at)} ${fmtT(h.created_at)} · ${esc(h.actor || 'Staff member')}</span>${h.reason ? `<p>${esc(h.reason)}</p>` : ''}</li>`).join('')}</ol>` : `<p class="ix-mu">Received ${fmtD(r.created_at)}. No staff actions yet.</p>`}`;
}
const pqAction = a =>
  ({
    'privacy.start': 'Started',
    'privacy.in_progress': 'Started',
    'privacy.verify': 'Identity checked',
    'privacy.done': 'Marked actioned',
    'privacy.reject': 'Dismissed',
    'privacy.rejected': 'Dismissed',
    'user.export': 'Data exported',
    'user.delete': 'Account deleted'
  })[a] || a;
function pqAct(id, act) {
  if (!pqCan()) return;
  const r = PQX.cur && PQX.cur.id === id ? PQX.cur : {};
  const H = r.history || [];
  let warn = '';
  if (act === 'done' && r.kind === 'export' && !H.some(h => h.action === 'user.export'))
    warn =
      'No data export is recorded for this request. Export their data first, or explain in the reason how it was handled.';
  if (act === 'done' && r.kind === 'delete' && r.user_id && !H.some(h => h.action === 'user.delete'))
    warn = 'The account still exists. Delete it first, or explain in the reason why it was not deleted.';
  if (act === 'done' && !r.identity_checked_at && !PQX.limited && !warn)
    warn = 'Identity is not marked as checked.';
  const T = {
    start: ['Start working on this request', 'Shows the team this request is being handled.', 'Start'],
    verify: [
      'Mark identity checked',
      'Note how you confirmed it, for example "Replied to the account email and they confirmed".',
      'Mark checked'
    ],
    done: [
      'Mark as actioned',
      'Note what you sent or deleted, and when you told the person. This closes the request.',
      'Mark actioned'
    ],
    reject: [
      'Dismiss this request',
      'Only when the request is not valid, for example identity could not be confirmed. Explain why, and tell the person. This closes the request.',
      'Dismiss'
    ]
  }[act];
  admAsk({
    title: T[0],
    body: T[1],
    danger: act === 'reject',
    extra: warn ? `<div class="sg-warn">${sv('alert', 16)}<span>${warn}</span></div>` : '',
    cta: T[2],
    run: async rs => {
      PQX.reopen = id;
      if (PQX.limited) {
        await arpc('admin_set_privacy', {
          rid: id,
          new_status: { start: 'in_progress', done: 'done', reject: 'rejected' }[act],
          reason: rs
        });
      } else await arpc('admin_privacy_act', { rid: id, act, reason: rs });
    }
  });
}
/* guide */
function pqGuide() {
  modal(`<div class="cap-m pq-m pq-g"><div class="row between"><h3>Privacy request guide</h3><button class="x" aria-label="Close" onclick="closeModal()">&times;</button></div>
 <p class="fu-sub">Practical steps for handling requests at Introthread. This is not legal advice. When unsure, check the regulator's guidance or ask a lawyer.</p>
 <h4>1. Check identity</h4><p>Requests come from a signed-in account, which is good evidence. Before deleting an account or sending data, reply to the account email and ask them to confirm. Do not send data to a different address. Ask for more proof only if something looks wrong, and only what you need.</p>
 <h4>2. Copy of data</h4><p>Use Export data on the request. It downloads their account email and sign-up date, profile, Threads they started, contacts and Rooms they organise. Share it through a secure link to the account email, never as a plain attachment to someone else, and delete your local copy afterwards.</p>
 <h4>3. Deletion</h4><p>Owners and admins can delete the account from the request. It removes the account, card, Threads, contacts and Rooms and cannot be undone. If they also asked for a copy, export first. Staff accounts must be removed from Staff before they can be deleted.</p>
 <h4>4. Correction</h4><p>Open the person in Users, check what is wrong and correct it, or ask them to update it themselves in the app.</p>
 <h4>5. Deadlines</h4><p>The 30-day date here is a reminder. Rules differ: for example, UK GDPR generally allows one month, which can be extended for complex requests, and the CCPA generally allows 45 days, which can be extended. Check what applies to the person, and tell them if you need more time.</p>
 <h4>6. Records</h4><p>Every action here asks for a reason and is saved in the audit log with who did it and when. Note what you sent or deleted and when you told the person. If you dismiss a request, say why.</p>
 <p class="pq-links"><a href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/" target="_blank" rel="noopener">${sv('ext', 14)} ICO: individual rights (UK)</a><a href="https://oag.ca.gov/privacy/ccpa" target="_blank" rel="noopener">${sv('ext', 14)} California Attorney General: CCPA</a></p></div>`);
}
/* people can add a short note when they make a request (stored once update 010 is run) */
if (typeof privReq === 'function') {
  const _f = privReq;
  privReq = function (kind) {
    _f.apply(this, arguments);
    const b = document.querySelector('#modal .cap-m > button.cap-btn');
    if (b && !$('#privnote'))
      b.insertAdjacentHTML(
        'beforebegin',
        `<label class="x-f"><span>Anything we should know? (optional)</span><textarea id="privnote" rows="3" maxlength="500" placeholder="${kind === 'delete' ? 'e.g. Please also delete the contacts I imported' : 'e.g. I need it for my records'}"></textarea></label>`
      );
  };
}
if (typeof privSend === 'function') {
  privSend = async function (kind) {
    const u = me();
    const note = (($('#privnote') || {}).value || '').trim().slice(0, 500);
    const row = { user_id: DB.session, email: (u && u.email) || null, kind };
    let { error } = await SB.from('privacy_requests').insert(
      note ? Object.assign({ details: note }, row) : row
    );
    if (error && note && /details/i.test(error.message || ''))
      ({ error } = await SB.from('privacy_requests').insert(row));
    if (error) return fail(error);
    closeModal();
    toast('Request received. We will reply by email within 30 days.');
  };
}
