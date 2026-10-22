// Introthread - Admin Moderation (v36, screen 3 of 9). Prefix md / ADMM.
// Moved out of index.html in v52 (code split step 4). Load order matters: see the <script> list at the end of index.html.

/* ================= v36: Admin screen 3 of 9 - Moderation ================= */
Object.assign(SV, {
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  img: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8 8.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  ban: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>'
});
const MODR = {
  'Spam or scam': 'spam',
  'Fake or impersonating someone': 'fake',
  'Harassment or hate': 'hate',
  'Inappropriate content': 'inap',
  'Something else': 'other'
};
let ADMM = {
  q: '',
  st: 'open',
  typ: 'all',
  sev: 'all',
  days: 30,
  sort: 'new',
  per: 25,
  page: 0,
  data: null,
  limited: false,
  open: null,
  det: {},
  all: null
};
try {
  const v = +localStorage.getItem('it_mod_days');
  if ([7, 30, 90, 0].includes(v)) ADMM.days = v;
} catch (_) {}
const canMod = () => admOk(['owner', 'admin', 'moderator']);
const _alt36 = admLoadTab;
admLoadTab = async function () {
  if (ADM.stage === 'ready' && ADM.tab === 'reports') return mdLoad();
  return _alt36.apply(this, arguments);
};
const mdMiss = e =>
  /admin_reports2|admin_report_detail|admin_report_take|admin_moderate|could not find|schema cache|does not exist/i.test(
    (e && e.message) || ''
  );
/* severity, used for the fallback (before update 006) and for the panel */
function mdSev(reason, n) {
  if (reason === 'Harassment or hate' || reason === 'Fake or impersonating someone' || n >= 3) return 'high';
  if (reason === 'Spam or scam' || reason === 'Inappropriate content' || n >= 2) return 'medium';
  return 'low';
}
/* load */
async function mdLoad(keep) {
  if (!keep || !$('#mdwrap')) admBody(mdSkel());
  else {
    const t = $('#mdlist');
    if (t) t.classList.add('busy');
  }
  const wasLim = ADMM.limited;
  try {
    let d = null;
    if (!ADMM.limited) {
      try {
        d = await arpc('admin_reports2', {
          q: ADMM.q,
          st: ADMM.st,
          typ: ADMM.typ,
          sev: ADMM.sev,
          days: ADMM.days,
          sort: ADMM.sort,
          lim: (ADMM.page + 1) * ADMM.per,
          off: 0
        });
      } catch (e) {
        if (mdMiss(e)) ADMM.limited = true;
        else throw e;
      }
    }
    if (ADMM.limited) d = mdLocal(await arpc('admin_reports', { st: 'all' }));
    ADMM.data = d;
    if (ADM.tab !== 'reports') return;
    if (ADM.cache && ADM.cache.dash && d.counts) {
      ADM.cache.dash.reports_open = d.counts.open;
      try {
        admNavBadges();
      } catch (_) {}
    }
    if (keep && $('#mdwrap') && wasLim === ADMM.limited) {
      mdPaintList();
      mdPaintCounts();
    } else admBody(mdPage());
  } catch (e) {
    admBody(
      mdHead() +
        `<div class="ix-card ix-fail" role="alert">${sv('alert', 22)}<div><b>Reports could not load</b><p>${esc((e && e.message) || 'Unknown error')}</p></div><button type="button" class="ix-btn" onclick="mdLoad()">${sv('refresh', 16)} Try again</button></div>`
    );
  }
}
/* without update 006: same filters, done in the browser on the newest 300 reports */
function mdLocal(L) {
  const since = ADMM.days > 0 ? Date.now() - ADMM.days * 864e5 : 0;
  const key = r => r.target_type + ':' + r.target_id;
  const n = {};
  L.forEach(r => (n[key(r)] = (n[key(r)] || 0) + 1));
  const base = L.filter(r => Date.parse(r.created_at) >= since).map(r =>
    Object.assign({}, r, { same: n[key(r)], severity: mdSev(r.reason, n[key(r)]) })
  );
  const op = r => r.status === 'open' || r.status === 'reviewing';
  const q = ADMM.q.toLowerCase();
  let f = base.filter(
    r =>
      (ADMM.st === 'all' || r.status === ADMM.st || (ADMM.st === 'open' && op(r))) &&
      (ADMM.typ === 'all' || r.target_type === ADMM.typ) &&
      (ADMM.sev === 'all' || r.severity === ADMM.sev) &&
      (!q ||
        [
          r.reason,
          r.details,
          (r.reporter || {}).name,
          (r.reporter || {}).handle,
          (r.target || {}).name,
          (r.target || {}).handle
        ]
          .join(' ')
          .toLowerCase()
          .includes(q))
  );
  const rk = { high: 0, medium: 1, low: 2 };
  f.sort((a, b) =>
    ADMM.sort === 'sev'
      ? rk[a.severity] - rk[b.severity] || Date.parse(a.created_at) - Date.parse(b.created_at)
      : ADMM.sort === 'old'
        ? Date.parse(a.created_at) - Date.parse(b.created_at)
        : Date.parse(b.created_at) - Date.parse(a.created_at)
  );
  return {
    total: f.length,
    rows: f.slice(0, (ADMM.page + 1) * ADMM.per),
    counts: {
      open: base.filter(op).length,
      overdue: base.filter(r => op(r) && Date.now() - Date.parse(r.created_at) > 864e5).length,
      high_open: base.filter(r => op(r) && r.severity === 'high').length,
      actioned: base.filter(r => r.status === 'actioned').length,
      dismissed: base.filter(r => r.status === 'dismissed').length,
      all: base.length
    }
  };
}
/* header + cards */
function mdHead() {
  return `<div class="ix-h"><div><h1>Moderation</h1><p>Review reports from people using Introthread. Aim to respond within 24 hours.</p></div><div class="ix-hc"><button type="button" class="ix-btn md-gl" onclick="mdGuide()">Moderation guidelines ${sv('ext', 16)}</button></div></div>`;
}
const mdRange = () => (ADMM.days ? `in ${ADMM.days} days` : 'all time');
function mdCounts() {
  const c = (ADMM.data && ADMM.data.counts) || {};
  const v = k => (isNum(c[k]) ? fmtN(c[k]) : dash);
  const card = (st, l, k, ic, tone, sub, flag) =>
    `<button type="button" class="md-c${ADMM.st === st ? ' on' : ''}" onclick="mdFilter('st','${st}')" aria-pressed="${ADMM.st === st}"><span class="md-cl">${l}${flag || ''}</span><b>${v(k)}</b><small class="t-${tone}x">${sv(ic, 15)}<span>${sub}</span></small></button>`;
  return (
    card(
      'open',
      'Open reports',
      'open',
      'alert',
      'o',
      c.overdue ? `${fmtN(c.overdue)} over 24 hours old` : 'Need review',
      `<span class="md-flag" aria-hidden="true">${sv('spark', 15)}</span>`
    ) +
    card('actioned', 'Actioned', 'actioned', 'check', 'g', 'Resolved') +
    card('dismissed', 'Dismissed', 'dismissed', 'ban', 'm', 'Not a violation') +
    card('all', 'All reports', 'all', 'bars', 'b', 'Total ' + mdRange())
  );
}
function mdPaintCounts() {
  const e = $('#mdcounts');
  if (e) e.innerHTML = mdCounts();
}
/* toolbar */
function mdSel(id, lab, val, opts, fn, ic) {
  return `<label class="md-sel">${ic ? sv(ic, 17) : ''}<span class="md-sl">${lab}:</span><select id="${id}" aria-label="${lab}" onchange="${fn}">${opts.map(([v, l]) => `<option value="${v}" ${String(val) === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select>${sv('chevd', 16)}</label>`;
}
function mdToolbar() {
  return `<div class="md-tb"><label class="au-search md-q">${sv('search', 17)}<input id="mdq" type="search" placeholder="Search reports by user, reason, or content..." value="${esc(ADMM.q)}" oninput="mdSearch(this.value)" aria-label="Search reports"></label>
 ${mdSel(
   'mdst',
   'Status',
   ADMM.st,
   [
     ['open', 'Open'],
     ['reviewing', 'In review'],
     ['actioned', 'Actioned'],
     ['dismissed', 'Dismissed'],
     ['all', 'All']
   ],
   "mdFilter('st',this.value)"
 )}
 ${mdSel(
   'mdtyp',
   'Type',
   ADMM.typ,
   [
     ['all', 'All'],
     ['profile', 'Profile or card'],
     ['thread', 'Thread'],
     ['room', 'Room']
   ],
   "mdFilter('typ',this.value)"
 )}
 ${mdSel(
   'mdsev',
   'Severity',
   ADMM.sev,
   [
     ['all', 'All'],
     ['high', 'High'],
     ['medium', 'Medium'],
     ['low', 'Low']
   ],
   "mdFilter('sev',this.value)"
 )}
 ${mdSel(
   'mddays',
   'Date',
   ADMM.days,
   [
     ['7', 'Last 7 days'],
     ['30', 'Last 30 days'],
     ['90', 'Last 90 days'],
     ['0', 'All time']
   ],
   "mdFilter('days',+this.value)",
   'cal'
 )}</div>`;
}
let _mdT = null;
function mdSearch(v) {
  clearTimeout(_mdT);
  _mdT = setTimeout(() => {
    ADMM.q = v.trim();
    ADMM.page = 0;
    mdLoad(true);
  }, 300);
}
function mdFilter(k, v) {
  ADMM[k] = v;
  ADMM.page = 0;
  if (k === 'days')
    try {
      localStorage.setItem('it_mod_days', v);
    } catch (_) {}
  const t = $('#mdtbw');
  if (t) t.innerHTML = mdToolbar();
  mdLoad(true);
}
/* list */
const mdSevP = s =>
  `<span class="md-sev ${s}">${s === 'high' ? 'High' : s === 'medium' ? 'Medium' : 'Low'}</span>`;
const mdStP = s =>
  `<span class="md-st ${s}">${{ open: 'Open', reviewing: 'In review', actioned: 'Actioned', dismissed: 'Dismissed' }[s] || esc(s)}</span>`;
const mdType = t => ({ profile: 'Profile', thread: 'Thread', room: 'Room' })[t] || esc(t);
function mdItem(r) {
  const t = r.target || {},
    op = r.status === 'open' || r.status === 'reviewing',
    late = op && Date.now() - Date.parse(r.created_at) > 864e5;
  return `<li><button type="button" class="md-i${ADMM.open === r.id ? ' on' : ''}" data-id="${r.id}" onclick="mdOpen('${r.id}')" aria-current="${ADMM.open === r.id}"><span class="md-ii ${MODR[r.reason] || 'other'}" aria-hidden="true">${sv('flag', 16)}</span>
 <span class="md-it"><span class="md-ir">${mdSevP(r.severity || 'low')}<b>${esc(r.reason)}</b></span><span class="md-is">${mdType(r.target_type)}: ${esc(t.name || '(deleted)')}${t.handle ? ' · @' + esc(t.handle) : ''}</span>
 <span class="md-im">By ${esc((r.reporter || {}).name || 'a deleted account')} · <time datetime="${esc(r.created_at)}">${ago(r.created_at)}</time>${r.same > 1 ? ` · ${r.same} reports on this` : ''}</span></span>
 <span class="md-ie">${mdStP(r.status)}${late ? `<em class="md-late">Over 24h</em>` : ''}</span></button></li>`;
}
function mdList() {
  const d = ADMM.data,
    R = d.rows || [];
  const filt = ADMM.q || ADMM.typ !== 'all' || ADMM.sev !== 'all';
  if (!R.length)
    return `<div class="md-empty"><span class="md-eic" aria-hidden="true">${sv('shield', 26)}</span><b>${filt ? 'No reports match these filters' : ADMM.st === 'open' ? 'No reports to review' : 'No reports here'}</b><p>${filt ? 'Try a different search, or clear the filters.' : 'Reports will appear here when someone uses the Report feature on a card or Thread.'}</p>${filt ? `<button type="button" class="ix-btn" onclick="ADMM.q='';ADMM.typ='all';ADMM.sev='all';ADMM.page=0;admBody(mdPage());mdLoad(true)">Clear filters</button>` : `<button type="button" class="ix-btn pri md-ref" onclick="mdLoad(true)">Refresh</button>`}</div>`;
  const more = d.total > R.length;
  return `<ul class="md-l">${R.map(mdItem).join('')}</ul>${more ? `<div class="md-more"><button type="button" class="ix-btn" onclick="ADMM.page++;mdLoad(true)">Show more (${fmtN(d.total - R.length)} left)</button></div>` : ''}`;
}
function mdListHead() {
  const d = ADMM.data || {};
  return `<div class="md-lh"><h2>Reports (${isNum(d.total) ? fmtN(d.total) : 0})</h2>${mdSel(
    'mdsort',
    'Sort',
    ADMM.sort,
    [
      ['new', 'Newest first'],
      ['old', 'Oldest first'],
      ['sev', 'Most serious first']
    ],
    'ADMM.sort=this.value;ADMM.page=0;mdLoad(true)',
    'sort'
  ).replace('<span class="md-sl">Sort:</span>', '<span class="sr">Sort</span>')}</div>`;
}
function mdPaintList() {
  const l = $('#mdlist');
  if (l) {
    l.classList.remove('busy');
    l.innerHTML = mdList();
  }
  const h = $('#mdlh');
  if (h) h.innerHTML = mdListHead();
}
/* page */
function mdSkel() {
  return (
    mdHead() +
    `<div class="md-cs">${'<div class="md-c sk"><i></i><b></b></div>'.repeat(4)}</div><div class="ix-card sk" style="height:64px;margin-bottom:16px"></div><div class="md-g"><div class="ix-card sk" style="height:520px"></div><div class="ix-card sk" style="height:520px"></div></div>`
  );
}
function mdPage() {
  return `<div id="mdwrap" class="md${ADMM.open ? ' po' : ''}">${mdHead()}${ADMM.limited ? `<p class="ix-upd">Run database update 006 for severity, reporter and account history, and one-step decisions. Until then this page shows the newest 300 reports.</p>` : ''}
 <div class="md-cs" id="mdcounts">${mdCounts()}</div><div class="ix-card md-tbc" id="mdtbw">${mdToolbar()}</div>
 <div class="md-g"><section class="ix-card md-lc" aria-label="Reports"><div id="mdlh">${mdListHead()}</div><div id="mdlist">${mdList()}</div></section>
 <aside class="ix-card md-p" id="mdpanel" aria-label="Report details">${ADMM.open ? mdPanel() : mdIntro()}</aside></div><div class="md-scrim" onclick="mdClose()" aria-hidden="true"></div></div>`;
}
function mdIntro() {
  const it = [
    ['doc', 'b', 'Reported content', 'The card, Thread or profile that was reported.'],
    ['user', 'o', 'Reported user', 'Details about the person or profile.'],
    ['user', 'p', 'Reporter details', 'Who reported it and their reason.'],
    ['bulb', 'b', 'Recommended action', 'Suggested next steps based on the report type.'],
    ['img', 'g', 'Context and evidence', 'Relevant content and any additional information.'],
    ['clock', 'm', 'Moderation history', 'All actions taken and who took them.']
  ];
  return `<div class="md-in"><span class="md-inic" aria-hidden="true">${sv('doc', 28)}</span><h2>Select a report</h2><p>Choose a report from the list to see full details and take action.</p></div>
 <h3 class="md-wy">What you'll see</h3><ul class="md-wl">${it.map(([ic, t, h, p]) => `<li><span class="md-wi t-${t}w" aria-hidden="true">${sv(ic, 22)}</span><div><b>${h}</b><p>${p}</p></div></li>`).join('')}</ul>${mdSafe()}`;
}
function mdSafe() {
  return `<div class="md-safe"><span aria-hidden="true">${sv('shield', 22)}</span><div><b>Keep Introthread safe and professional</b><p>Review reports fairly, follow the moderation guidelines, and record your decisions to maintain a clear audit trail.</p></div><button type="button" class="ix-btn sm" onclick="mdGuide()">View guidelines ${sv('ext', 14)}</button></div>`;
}
/* detail */
async function mdOpen(id) {
  ADMM.open = id;
  const w = $('#mdwrap');
  if (w) w.classList.add('po');
  document.querySelectorAll('.md-i').forEach(b => {
    const on = b.dataset.id === id;
    b.classList.toggle('on', on);
    b.setAttribute('aria-current', on);
  });
  const p = $('#mdpanel');
  if (p) p.innerHTML = `<div class="md-pp">${admLoading()}</div>`;
  try {
    let d = null;
    if (!ADMM.limited) {
      try {
        d = await arpc('admin_report_detail', { rid: id });
      } catch (e) {
        if (mdMiss(e)) ADMM.limited = true;
        else throw e;
      }
    }
    const row = ((ADMM.data || {}).rows || []).find(r => r.id === id) || {};
    if (!d) {
      d = {
        report: row,
        reporter: row.reporter || null,
        subject:
          row.target_type === 'profile' ? Object.assign({ id: row.target_id }, row.target || {}) : null,
        content: null,
        same: [],
        history: null,
        lite: true
      };
      if (row.target_type === 'profile') {
        const u = await arpc('admin_user', { uid: row.target_id }).catch(() => null);
        if (u) {
          d.subject = Object.assign(d.subject, u.profile || {}, {
            status: u.status,
            plan: u.plan,
            joined: u.created_at
          });
          d.content = Object.assign({ kind: 'profile' }, u.profile || {});
        }
      }
    }
    d.report = Object.assign({}, row, d.report);
    ADMM.det[id] = d;
    if (ADMM.open === id && p) {
      p.innerHTML = mdPanel();
      const c = p.querySelector('.md-x');
      if (c && window.innerWidth < 1180) c.focus();
    }
  } catch (e) {
    if (p)
      p.innerHTML = `<div class="md-pp"><p class="adm-err">${esc((e && e.message) || 'Could not load')}</p><button class="ix-btn sm" onclick="mdOpen('${id}')">Try again</button></div>`;
  }
}
function mdClose() {
  ADMM.open = null;
  const w = $('#mdwrap');
  if (w) w.classList.remove('po');
  const p = $('#mdpanel');
  if (p) p.innerHTML = mdIntro();
  document.querySelectorAll('.md-i.on').forEach(b => {
    b.classList.remove('on');
    b.setAttribute('aria-current', 'false');
  });
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && ADMM.open && !$('#mback.open') && $('#mdwrap')) mdClose();
});
function mdRec(d) {
  const r = d.report,
    s = d.subject || {},
    n = +(s.reports_total || r.same || 1),
    prev = +(s.reports_actioned || 0);
  const sev = r.severity || mdSev(r.reason, r.same || 1);
  const base = {
    'Harassment or hate': [
      'Read the reported content and any details. If it is abusive or hateful, suspend the account.',
      'Ban for threats, hate speech or repeat abuse.'
    ],
    'Fake or impersonating someone': [
      'Compare the name, role and company with public sources such as the company website or LinkedIn.',
      'If it is clearly fake or copies a real person, suspend until they verify who they are.'
    ],
    'Spam or scam': [
      'Look for sales links, money requests or copy-paste messages.',
      'Suspend if it is spam. A first, mild case can be dismissed with a note to watch.'
    ],
    'Inappropriate content': [
      'Check the profile, photo, bio and links against the guidelines.',
      'If it breaks them, suspend and ask the person to fix it before reactivating.'
    ],
    'Something else': [
      "Read the reporter's details carefully. Many of these are not violations.",
      'Dismiss if nothing breaks the guidelines, and say why in your reason.'
    ]
  }[r.reason] || ['Review the content against the guidelines.', 'Record what you decide.'];
  const extra = [];
  if (n >= 3)
    extra.push(`This person has ${n} reports in total. A pattern like this usually justifies a suspension.`);
  if (prev > 0)
    extra.push(
      `${prev} earlier report${prev > 1 ? 's were' : ' was'} actioned. Consider a ban if this one is confirmed.`
    );
  if (d.reporter && +d.reporter.filed_dismissed >= 3)
    extra.push(
      `The reporter has had ${d.reporter.filed_dismissed} reports dismissed before. Check this one carefully.`
    );
  if (s.staff) extra.push('This is a staff account. Speak to the owner rather than acting here.');
  if (r.target_type === 'room')
    extra.push(
      'If the Room itself is the problem, an owner or admin can delete it. Threads made there are kept.'
    );
  return { sev, steps: base.concat(extra) };
}
function mdPanel() {
  const id = ADMM.open,
    d = ADMM.det[id];
  if (!d) return `<div class="md-pp">${admLoading()}</div>`;
  const r = d.report,
    t = r.target || {},
    s = d.subject,
    c = d.content,
    rp = d.reporter,
    op = r.status === 'open' || r.status === 'reviewing';
  const rec = mdRec(d);
  const sec = (ic, tone, h, body) =>
    `<section class="md-sec"><h3><span class="md-wi sm t-${tone}w" aria-hidden="true">${sv(ic, 16)}</span>${h}</h3>${body}</section>`;
  const dl = rows =>
    `<dl class="au-dl">${rows
      .filter(Boolean)
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
      .join('')}</dl>`;
  let content = '';
  if (c && c.kind === 'profile')
    content = dl([
      ['Name', esc(c.name || dash)],
      c.handle
        ? [
            'Card',
            `<a href="/${esc(c.handle)}" target="_blank" rel="noopener">@${esc(c.handle)} ${sv('ext', 13)}</a>`
          ]
        : null,
      c.role || c.company ? ['Works as', esc([c.role, c.company].filter(Boolean).join(', '))] : null,
      c.city ? ['City', esc(c.city)] : null,
      c.bio ? ['Bio', esc(c.bio)] : null,
      c.links && Object.values(c.links).filter(Boolean).length
        ? [
            'Links',
            Object.values(c.links)
              .filter(Boolean)
              .map(l => esc(String(l)))
              .join('<br>')
          ]
        : null
    ]);
  else if (c && c.kind === 'thread')
    content =
      dl([
        ['Thread with', esc(c.other || 'someone')],
        ['Where they met', esc(c.where_met || dash)],
        ['Started', fmtD(c.created_at)],
        ['Confirmed', c.confirmed ? 'Yes, by both people' : 'Not yet'],
        c.room ? ['Room', esc(c.room)] : null
      ]) + `<p class="au-fine">Private notes and "What's next?" answers are never shown to staff.</p>`;
  else if (c && c.kind === 'room')
    content = dl([
      ['Room', esc(c.name)],
      ['Date', fmtD(c.event_date)],
      c.location ? ['Place', esc(c.location)] : null,
      ['Threads made there', fmtN(c.threads)]
    ]);
  else
    content = `<p class="ix-mu">${t.name ? `${mdType(r.target_type)}: ${esc(t.name)}${t.handle ? ' · @' + esc(t.handle) : ''}` : 'This item has been deleted.'}${d.lite && r.target_type !== 'profile' ? ' Run update 006 to see more.' : ''}</p>`;
  const subj =
    s && s.name
      ? dl([
          ['Name', `${esc(s.name)}${s.handle ? ` <small>@${esc(s.handle)}</small>` : ''}`],
          [
            'Account',
            auSt(s.status || 'active') + (s.staff ? ` <em class="au-role">${esc(s.staff)}</em>` : '')
          ],
          s.joined ? ['Joined', fmtD(s.joined)] : null,
          isNum(s.reports_total)
            ? [
                'Reports about them',
                `${fmtN(s.reports_total)}${s.reports_actioned ? `, ${fmtN(s.reports_actioned)} actioned` : ''}`
              ]
            : null
        ]) +
        (s.id
          ? `<button type="button" class="au-inl" onclick="mdToUser('${s.id}')">Open in Users</button>`
          : '')
      : `<p class="ix-mu">${d.lite && r.target_type !== 'profile' ? 'Run update 006 to see who is behind this ' + mdType(r.target_type).toLowerCase() + '.' : 'The account no longer exists.'}</p>`;
  const rep =
    rp && rp.name
      ? dl([
          ['Name', `${esc(rp.name)}${rp.handle ? ` <small>@${esc(rp.handle)}</small>` : ''}`],
          ['Reason', esc(r.reason)],
          isNum(rp.filed)
            ? [
                'Reports they have made',
                `${fmtN(rp.filed)}${+rp.filed_dismissed ? `, ${fmtN(rp.filed_dismissed)} dismissed` : ''}`
              ]
            : null
        ])
      : dl([
          ['Reporter', 'A deleted account'],
          ['Reason', esc(r.reason)]
        ]);
  const ev =
    `<div class="md-quote"><span>What the reporter said</span><p>${r.details ? esc(r.details) : '<i>No extra details given.</i>'}</p></div>` +
    ((d.same || []).length
      ? `<p class="md-sub">Other reports about the same ${mdType(r.target_type).toLowerCase()}</p><ul class="md-sm">${d.same.map(x => `<li><button type="button" class="au-inl" onclick="mdOpen('${x.id}')">${esc(x.reason)}</button><span>${fmtD(x.created_at)}</span>${mdStP(x.status)}</li>`).join('')}</ul>`
      : '');
  const hist =
    d.history === null
      ? `<p class="ix-mu">Run update 006 to see history.</p>`
      : (() => {
          const H = (d.history || []).slice();
          H.push({ action: 'report.received', created_at: r.created_at, actor: rp && rp.name });
          return `<ol class="au-tl">${H.map(h => `<li><span aria-hidden="true">${sv(h.action.startsWith('user') ? 'user' : h.action.startsWith('room') ? 'cal' : 'shield', 15)}</span><div><b>${mdAct(h.action)}${h.actor ? ` <small>by ${esc(h.actor)}</small>` : ''}</b>${h.reason && h.action !== 'report.received' ? `<p>${esc(h.reason)}</p>` : ''}<small>${fmtD(h.created_at)}, ${fmtT(h.created_at)}</small></div></li>`).join('')}</ol>`;
        })();
  const acts =
    canMod() && op
      ? `<div class="md-acts">${r.status === 'open' ? `<button type="button" class="ix-btn" onclick="mdTake('${id}')">${sv('eye', 16)} Take for review</button>` : ''}<button type="button" class="ix-btn" onclick="mdDecide('${id}','dismissed')">${sv('ban', 16)} Dismiss</button><button type="button" class="ix-btn pri" onclick="mdDecide('${id}','actioned')">${sv('shield', 16)} Take action</button></div>`
      : !op
        ? `<p class="md-done">${sv('check', 16)} ${r.status === 'actioned' ? 'Actioned' : 'Dismissed'}${r.resolver ? ' by ' + esc(r.resolver) : ''}${r.resolved_at ? ' on ' + fmtD(r.resolved_at) : ''}${r.outcome && r.outcome !== 'none' ? ' · ' + esc(mdOut(r.outcome)) : ''}</p>`
        : `<p class="au-fine">Only owners, admins and moderators can decide on reports.</p>`;
  return `<div class="md-pp"><div class="md-ph"><div><div class="md-ir">${mdSevP(rec.sev)}${mdStP(r.status)}${r.assigned ? `<span class="md-as">${sv('user', 13)} ${esc(r.assigned)}</span>` : ''}</div><h2>${esc(r.reason)}</h2><p>${mdType(r.target_type)} report · received ${fmtD(r.created_at)}, ${fmtT(r.created_at)} (${ago(r.created_at)})</p></div><button type="button" class="au-x md-x" onclick="mdClose()" aria-label="Close report">${sv('x2', 18)}</button></div>${acts}
 <div class="md-secs">${sec('doc', 'b', 'Reported content', content)}${sec('user', 'o', 'Reported user', subj)}${sec('user', 'p', 'Reporter details', rep)}
 ${sec('bulb', 'b', 'Recommended action', `<ul class="md-rec">${rec.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`)}${sec('img', 'g', 'Context and evidence', ev)}${sec('clock', 'm', 'Moderation history', hist)}</div>${mdSafe()}</div>`;
}
const mdOut = o =>
  ({
    suspend: 'Account suspended',
    ban: 'Account banned',
    delete_room: 'Room deleted',
    none: 'No account action'
  })[o] || o;
function mdAct(a) {
  return (
    {
      'report.received': 'Report received',
      'report.reviewing': 'Taken for review',
      'report.actioned': 'Report actioned',
      'report.dismissed': 'Report dismissed',
      'user.status.suspended': 'Account suspended',
      'user.status.banned': 'Account banned',
      'user.status.active': 'Account reactivated',
      'room.delete': 'Room deleted',
      'user.plan': 'Plan changed',
      'user.delete': 'Account deleted',
      'user.login_link': 'Login link sent',
      'user.password_reset': 'Password reset sent'
    }[a] || esc(a)
  );
}
function mdToUser(uid) {
  admGo('users');
  setTimeout(() => {
    try {
      auOpen(uid);
    } catch (_) {}
  }, 400);
}
/* decisions */
async function mdTake(id) {
  try {
    if (ADMM.limited)
      await arpc('admin_resolve_report', { rid: id, new_status: 'reviewing', reason: 'Taken for review' });
    else await arpc('admin_report_take', { rid: id });
    toast('You are reviewing this report');
    await mdAfter(id);
  } catch (e) {
    toast((e && e.message) || 'Could not update');
  }
}
function mdDecide(id, dec) {
  const d = ADMM.det[id] || { report: {} },
    r = d.report,
    s = d.subject || {},
    others = (d.same || []).filter(x => x.status === 'open' || x.status === 'reviewing').length;
  const top = admOk(['owner', 'admin']);
  const opts =
    dec === 'dismissed'
      ? []
      : [
          ['none', 'Record only', 'No change to the account, for example a warning given by email.'],
          s.id && !s.staff
            ? ['suspend', 'Suspend the account', 'They cannot use Introthread until reactivated.']
            : null,
          s.id && !s.staff && top ? ['ban', 'Ban the account', 'For serious or repeated abuse.'] : null,
          r.target_type === 'room' && top
            ? ['delete_room', 'Delete the Room', 'Threads made there are kept.']
            : null
        ].filter(Boolean);
  const def = opts.find(o => o[0] === (mdRec(d).sev === 'high' && s.id && !s.staff ? 'suspend' : 'none'))
    ? mdRec(d).sev === 'high' && s.id && !s.staff
      ? 'suspend'
      : 'none'
    : 'none';
  admAsk({
    title: dec === 'dismissed' ? 'Dismiss this report' : 'Take action on this report',
    danger: dec !== 'dismissed',
    body:
      dec === 'dismissed'
        ? 'Use this when nothing breaks the guidelines. The reporter is not told who reviewed it.'
        : 'Choose what happens, then give a reason. Both are saved in the audit log.',
    extra:
      (opts.length
        ? `<fieldset class="md-opts"><legend class="sr">Action</legend>${opts.map(([k, l, h]) => `<label><input type="radio" name="mdact" value="${k}" ${k === def ? 'checked' : ''}><span><b>${l}</b><small>${h}</small></span></label>`).join('')}</fieldset>`
        : '') +
      (others
        ? `<label class="md-ck"><input type="checkbox" id="mdsame" checked> Also close the ${others} other open report${others > 1 ? 's' : ''} about the same ${mdType(r.target_type).toLowerCase()}</label>`
        : ''),
    cta: dec === 'dismissed' ? 'Dismiss report' : 'Save decision',
    run: async reason => {
      const act =
        dec === 'dismissed'
          ? 'none'
          : (document.querySelector('input[name=mdact]:checked') || {}).value || 'none';
      const same = !!($('#mdsame') && $('#mdsame').checked);
      if (ADMM.limited) {
        if (act === 'suspend' || act === 'ban')
          await arpc('admin_set_status', {
            uid: s.id,
            new_status: act === 'ban' ? 'banned' : 'suspended',
            reason
          });
        if (act === 'delete_room') await arpc('admin_delete_room', { room: r.target_id, reason });
        await arpc('admin_resolve_report', { rid: id, new_status: dec, reason });
        if (same)
          for (const x of d.same.filter(x => x.status === 'open' || x.status === 'reviewing'))
            await arpc('admin_resolve_report', { rid: x.id, new_status: dec, reason });
      } else await arpc('admin_moderate', { rid: id, decision: dec, act, reason, close_same: same });
      toast(dec === 'dismissed' ? 'Report dismissed' : act === 'none' ? 'Decision saved' : mdOut(act));
      ADMM._after = id;
    }
  });
}
async function mdAfter(id) {
  await mdLoad(true);
  if (id && ADMM.open === id) await mdOpen(id);
}
const _askGo36 = admAskGo;
admAskGo = async function () {
  await _askGo36.apply(this, arguments);
  if (ADM.tab === 'reports' && !$('#mback.open') && ADMM._after) {
    const id = ADMM._after;
    ADMM._after = null;
    await mdAfter(id);
  }
};
/* guidelines */
function mdGuide() {
  modal(`<div class="cap-m md-guide"><div class="row between"><h3>Moderation guidelines</h3><button class="x" aria-label="Close" onclick="closeModal()">&times;</button></div>
 <p class="fu-sub">Introthread is for real professional relationships. Act quickly, fairly and in proportion.</p>
 <h4>1. Respond within 24 hours</h4><p>Work oldest first, but take high severity reports first. Use "Take for review" so two people do not work on the same report.</p>
 <h4>2. What breaks the rules</h4><ul><li>Spam, scams, sales blasts, or asking for money.</li><li>Fake profiles, or pretending to be another person or company.</li><li>Harassment, threats, hate, or unwanted sexual content.</li><li>Inappropriate photos, bios or links.</li><li>Sharing someone's private details without consent.</li></ul>
 <h4>3. Choosing an action</h4><ul><li><b>Dismiss</b> when nothing breaks the rules. Disagreement or a bad meeting is not a violation.</li><li><b>Record only</b> for a first, minor issue you handled by email.</li><li><b>Suspend</b> for a clear violation. Reactivate once it is fixed.</li><li><b>Ban</b> for threats, hate, scams, or repeat violations. Owners and admins only.</li><li><b>Delete a Room</b> only when the Room itself is abusive or fake.</li></ul>
 <h4>4. Privacy</h4><p>Look only at what you need. Private notes and "What's next?" answers are never shown, and must never be asked for. Do not share report details outside the team, and never tell the reported person who reported them.</p>
 <h4>5. Write a clear reason</h4><p>Every decision needs a short reason, for example "Fake profile copying a real recruiter, suspended until verified". It is saved in the audit log with your name.</p>
 <h4>6. Conflicts and staff</h4><p>Do not review reports about yourself or someone you know personally. Reports about staff go to the owner.</p>
 <button class="cap-btn" onclick="closeModal()">Got it</button></div>`);
}
