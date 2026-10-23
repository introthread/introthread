// Introthread - Admin Plans and pricing (v39, screen 6 of 9). Prefix pl / PLX.
// Moved out of index.html in v52 (code split step 4). Load order matters: see the <script> list at the end of index.html.

/* ==== Admin redesign v39: screen 6 of 9, Plans and pricing (prefix pl / PLX) ==== */
let PLX = { data: null, limited: false, orig: {}, hist: null, histPlan: 'all', justSaved: null };
Object.assign(SV, {
  plgift:
    '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8c-1.5-3-5-3.8-5.6-1.8C5.8 8 9 8 12 8zM12 8c1.5-3 5-3.8 5.6-1.8C18.2 8 15 8 12 8z"/>',
  plcrown: '<path d="M4 17.5h16M4.5 17.5 3.5 8l5 3.8L12 5.5l3.5 6.3 5-3.8-1 9.5"/>',
  pllist:
    '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.6" cy="6.5" r=".9"/><circle cx="4.6" cy="12" r=".9"/><circle cx="4.6" cy="17.5" r=".9"/>',
  plsave: '<path d="M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  plhist: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3.5 4.5V9H8M12 7.5V12l3 2"/>',
  plundo: '<path d="M9 7 4.5 11.5 9 16"/><path d="M5 11.5h9a5 5 0 0 1 0 10h-2"/>'
});
const PL_F = [
  ['name', 'Plan name'],
  ['description', 'Description'],
  ['price_usd_month', 'Price (USD) per month'],
  ['price_usd_year', 'Price (USD) per year'],
  ['price_gbp_month', 'Price (GBP) per month'],
  ['price_gbp_year', 'Price (GBP) per year'],
  ['threads_per_month', 'New Threads per month'],
  ['active', 'Status']
];
const plLab = k => (PL_F.find(f => f[0] === k) || [k, k])[1];
const plMiss = e =>
  /admin_plans2|admin_plan_save|admin_plan_history|could not find|schema cache|does not exist/i.test(
    (e && e.message) || ''
  );
const plNum = v => {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(/,/g, '').trim());
  return isFinite(n) ? n : NaN;
};
const plMoney = (n, c) =>
  !isNum(n)
    ? dash
    : (c === 'gbp' ? '£' : '$') +
      n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const plVal2 = (k, v) =>
  k === 'active'
    ? v
      ? 'Active'
      : 'Hidden'
    : k === 'threads_per_month'
      ? v == null
        ? 'Unlimited'
        : fmtN(v)
      : /^price_/.test(k)
        ? plMoney(v == null ? null : +v, k.includes('gbp') ? 'gbp' : 'usd')
        : v == null || v === ''
          ? dash
          : String(v);
const plAnyDirty = () => PLX.data && (PLX.data.plans || []).some(p => Object.keys(plDiff(p.id)).length);
const _alt39 = admLoadTab;
admLoadTab = async function () {
  if (ADM.stage === 'ready' && ADM.tab === 'plans') return plLoad(true);
  return _alt39.apply(this, arguments);
};
if (typeof admGo === 'function') {
  const _plGo = admGo;
  admGo = function (t) {
    if (
      ADM.tab === 'plans' &&
      t !== 'plans' &&
      plAnyDirty() &&
      !confirm('You have unsaved plan changes. Leave without saving?')
    )
      return;
    return _plGo.apply(this, arguments);
  };
}
window.addEventListener('beforeunload', e => {
  if (ADM && ADM.tab === 'plans' && document.getElementById('plwrap') && plAnyDirty()) {
    e.preventDefault();
    e.returnValue = '';
  }
});
/* load: keeps unsaved edits on the other plan when one plan is saved */
async function plLoad(keep) {
  const drafts = {};
  if (keep && PLX.data && $('#plwrap'))
    (PLX.data.plans || []).forEach(p => {
      if (p.id !== PLX.justSaved && Object.keys(plDiff(p.id)).length) drafts[p.id] = plRead(p.id);
    });
  PLX.justSaved = null;
  if (!$('#plwrap')) admBody(plSkel());
  try {
    let d = null;
    if (!PLX.limited) {
      try {
        d = await arpc('admin_plans2');
      } catch (e) {
        if (plMiss(e)) PLX.limited = true;
        else throw e;
      }
    }
    if (PLX.limited) {
      const r = await SB.from('plans').select('*').order('sort');
      if (r.error) throw r.error;
      d = { plans: r.data || [], users: null, paying: null, stripe: false };
    }
    PLX.data = d;
    PLX.orig = {};
    (d.plans || []).forEach(p => (PLX.orig[p.id] = plNorm(p)));
    if (ADM.tab !== 'plans') return;
    admBody(plPage());
    Object.keys(drafts).forEach(id => {
      if (PLX.orig[id]) {
        plFill(id, drafts[id]);
        plOnInput(id);
      }
    });
  } catch (e) {
    admBody(
      plHead() +
        `<div class="ix-card ix-fail" role="alert">${sv('alert', 22)}<div><b>Plans could not load</b><p>${esc((e && e.message) || 'Unknown error')}</p></div><button type="button" class="ix-btn" data-on-click="plLoad()">${sv('refresh', 16)} Try again</button></div>`
    );
  }
}
function plNorm(p) {
  const n = v => (v == null || v === '' ? null : Math.round(+v * 100) / 100);
  return {
    name: String(p.name || '').trim(),
    description: String(p.description || '').trim(),
    price_usd_month: n(p.price_usd_month),
    price_usd_year: n(p.price_usd_year),
    price_gbp_month: n(p.price_gbp_month),
    price_gbp_year: n(p.price_gbp_year),
    threads_per_month: p.threads_per_month == null ? null : Math.round(+p.threads_per_month),
    active: p.active !== false
  };
}
/* form <-> values */
const plEl = (id, k) => document.getElementById('pl_' + id + '_' + k);
function plRead(id) {
  const o = PLX.orig[id] || {},
    v = {};
  const t = k => {
    const e = plEl(id, k);
    return e ? e.value : null;
  };
  v.name = t('name') == null ? o.name : t('name').trim();
  v.description = t('description') == null ? o.description : t('description').trim();
  ['price_usd_month', 'price_usd_year', 'price_gbp_month', 'price_gbp_year'].forEach(k => {
    const x = t(k);
    v[k] = x == null ? o[k] : plNum(x);
  });
  const u = plEl(id, 'unl');
  v.threads_per_month = u && u.checked ? null : plNum(t('threads_per_month'));
  const a = plEl(id, 'active');
  v.active = a ? a.checked : o.active;
  return v;
}
function plFill(id, v) {
  Object.keys(v).forEach(k => {
    const e = plEl(id, k);
    if (!e) return;
    if (k === 'active') e.checked = !!v[k];
    else e.value = v[k] == null ? '' : v[k];
  });
  const u = plEl(id, 'unl');
  if (u) {
    u.checked = v.threads_per_month == null && id !== 'free';
    const t = plEl(id, 'threads_per_month');
    if (t) t.disabled = u.checked || !canFin();
  }
}
function plDiff(id) {
  const o = PLX.orig[id];
  if (!o || !document.getElementById('plf_' + id)) return {};
  const v = plRead(id),
    d = {};
  Object.keys(o).forEach(k => {
    if (PLX.limited && k === 'description') return;
    const a = o[k],
      b = v[k];
    const same =
      typeof a === 'number' || typeof b === 'number'
        ? a == null
          ? b == null
          : isNum(b) && Math.abs(a - b) < 0.0001
        : a === b;
    if (!same) d[k] = { from: a, to: b };
  });
  return d;
}
function plErrs(id, v) {
  const e = {};
  if (!v.name) e.name = 'Enter a plan name';
  else if (v.name.length > 40) e.name = 'Use 40 characters or fewer';
  if (v.description && v.description.length > 140) e.description = 'Use 140 characters or fewer';
  ['price_usd_month', 'price_usd_year', 'price_gbp_month', 'price_gbp_year'].forEach(k => {
    const n = v[k];
    if (n == null || isNaN(n)) e[k] = 'Enter a price';
    else if (n < 0) e[k] = 'Price cannot be negative';
    else if (n > 100000) e[k] = 'Price is too high';
    else if (Math.round(n * 100) !== Math.round(n * 1e6) / 1e4) e[k] = 'Use at most 2 decimals';
    else if (id === 'free' && n !== 0) e[k] = 'The Free plan must stay at 0';
  });
  const t = v.threads_per_month;
  if (t == null) {
    if (id === 'free') e.threads_per_month = 'The Free plan needs a limit';
  } else if (isNaN(t) || t < 0 || t % 1) e.threads_per_month = 'Enter a whole number, 0 or more';
  else if (t > 100000) e.threads_per_month = 'Use 100,000 or fewer, or tick Unlimited';
  return e;
}
/* live update: errors, yearly saving, summary, save state */
function plOnInput(id) {
  const v = plRead(id),
    er = plErrs(id, v),
    d = plDiff(id),
    n = Object.keys(d).length,
    shown = (PLX.touched = PLX.touched || {});
  PL_F.forEach(([k]) => {
    const box = document.getElementById('ple_' + id + '_' + k);
    const w = document.getElementById('plw_' + id + '_' + k);
    const bad = er[k] && (d[k] || shown[id + k]);
    if (box) box.textContent = bad ? er[k] : '';
    if (w) w.classList.toggle('bad', !!bad);
    const el = plEl(id, k);
    if (el) el.setAttribute('aria-invalid', bad ? 'true' : 'false');
  });
  ['usd', 'gbp'].forEach(c => {
    const h = document.getElementById('ply_' + id + '_' + c);
    if (h) h.outerHTML = plYear(id, v, c);
  });
  const s = document.getElementById('pls_' + id);
  if (s) s.textContent = plSum(id, v);
  const t = plEl(id, 'threads_per_month'),
    u = plEl(id, 'unl');
  if (t && u) t.disabled = u.checked || !canFin();
  const st = document.getElementById('plst_' + id),
    b = document.getElementById('plsv_' + id),
    r = document.getElementById('plrs_' + id);
  const ok = !Object.keys(er).length;
  if (b) b.disabled = !n || !ok || !canFin();
  if (r) r.hidden = !n;
  if (st) {
    st.className = 'pl-st ' + (!n ? 'ok' : ok ? 'dirty' : 'bad');
    st.innerHTML = !n
      ? `${sv('check', 16, 'currentColor', 2.2)} No changes to save`
      : ok
        ? `${sv('dot', 14)} ${n} unsaved change${n > 1 ? 's' : ''}`
        : `${sv('alert', 15)} Fix the highlighted field${Object.keys(er).length > 1 ? 's' : ''}`;
  }
}
function plYear(id, v, c) {
  const m = v['price_' + c + '_month'],
    y = v['price_' + c + '_year'];
  let t = '',
    cls = '';
  if (isNum(m) && isNum(y) && m > 0 && y > 0) {
    const full = m * 12;
    if (y < full) {
      const pc = Math.round((1 - y / full) * 100),
        mf = Math.round(((full - y) / m) * 10) / 10;
      t = `Saves ${pc}% against monthly (${mf} month${mf === 1 ? '' : 's'} free)`;
    } else if (y > full) {
      t = 'Costs more than 12 monthly payments';
      cls = ' warn';
    } else t = 'Same as 12 monthly payments';
  } else if (isNum(y) && y > 0 && (!isNum(m) || m === 0)) t = 'Yearly only';
  return `<small class="pl-hint${cls}" id="ply_${id}_${c}" aria-live="polite">${t}</small>`;
}
function plSum(id, v) {
  const nm = v.name || 'This plan',
    t = v.threads_per_month;
  const lim =
    t == null
      ? 'unlimited new Threads per month'
      : t === 0
        ? 'no new Threads (they can still answer Threads they receive)'
        : `up to ${fmtN(t)} new Thread${t === 1 ? '' : 's'} per month`;
  const fr = [v.price_usd_month, v.price_usd_year, v.price_gbp_month, v.price_gbp_year].every(x => x === 0);
  const pr = fr
    ? 'No charge.'
    : `${plMoney(v.price_usd_month, 'usd')} a month or ${plMoney(v.price_usd_year, 'usd')} a year; UK visitors see ${plMoney(v.price_gbp_month, 'gbp')} or ${plMoney(v.price_gbp_year, 'gbp')}.`;
  return `${nm} users can create ${lim}. ${pr}${v.active ? '' : ' Hidden: not offered to new customers.'}`;
}
/* page */
function plHead() {
  return `<div class="ix-h"><div><h1>Plans and pricing</h1><p>Manage subscription prices, billing intervals and usage limits.</p></div><div class="ix-hc"><button type="button" class="ix-btn" data-on-click="plHist()">${sv('plhist', 17)} Pricing history</button></div></div>`;
}
function plSkel() {
  return (
    plHead() +
    `<div class="ix-card sk" style="height:84px;margin-top:22px"></div><div class="pl-g"><div class="ix-card sk" style="height:620px"></div><div class="ix-card sk" style="height:620px"></div></div>`
  );
}
function plPage() {
  const d = PLX.data,
    P = d.plans || [],
    ed = canFin();
  const info = `<div class="pl-info" role="note">${sv('info', 22)}<div><b>Changes are saved straight away</b><p>Every change is recorded in the audit log with your reason. The Free plan's Thread limit applies to everyone at once. Card payments are not switched on yet${d.stripe ? '' : ' (Stripe is not connected)'}, so nobody is charged a new price until billing is connected.</p></div></div>`;
  return `<div id="plwrap" class="pl">${plHead()}${PLX.limited ? `<p class="ix-upd">Run database update 009 for plan descriptions, people on each plan, checked saving and pricing history with before and after values.</p>` : ''}${info}
 ${ed ? '' : `<div class="pl-ro">${sv('lock', 16)} You can view plans. Only owners and finance staff can change them.</div>`}
 ${P.length ? `<div class="pl-g">${P.map(plCard).join('')}</div>` : `<div class="ix-card adm-empty">${sv('grid', 22)}<b>No plans yet</b><p>Run database update 002 to add the Free and Pro plans.</p></div>`}</div>`;
}
function plCard(p) {
  const id = esc(p.id),
    o = PLX.orig[p.id],
    ed = canFin(),
    dis = ed ? '' : ' disabled',
    pro = p.id !== 'free',
    d = PLX.data;
  const inp = (k, lab, sub, pre, extra) =>
    `<div class="pl-f"><label for="pl_${id}_${k}">${lab}${sub ? ` <span>${sub}</span>` : ''}</label><div class="pl-in${pre ? '' : ' np'}" id="plw_${id}_${k}">${pre ? `<span class="pl-pre" aria-hidden="true">${pre}</span>` : ''}<input id="pl_${id}_${k}" ${extra || ''} value="${esc(o[k] == null ? '' : o[k])}" data-on-input="plOnInput('${id}')" data-on-blur="plTouch('${id}','${k}')" aria-describedby="ple_${id}_${k}"${dis}></div><small class="pl-err" id="ple_${id}_${k}" role="alert"></small></div>`;
  const prc = (c, s) => {
    const fixed = p.id === 'free' ? ' readonly title="The Free plan is always free"' : '';
    return `<div class="pl-2">${inp('price_' + c + '_month', `Price (${c.toUpperCase()})`, 'per month', s, `type="text" inputmode="decimal" autocomplete="off"${fixed}`)}<div>${inp('price_' + c + '_year', `Price (${c.toUpperCase()})`, 'per year', s, `type="text" inputmode="decimal" autocomplete="off"${fixed}`)}${plYear(p.id, o, c)}</div></div>`;
  };
  const people = pro
    ? isNum(+p.people) && p.people != null
      ? fmtN(p.people) + ' paying'
      : null
    : d.users != null && d.paying != null
      ? fmtN(Math.max(0, d.users - d.paying)) + ' people'
      : null;
  const stripe = pro
    ? p.stripe_price_month || p.stripe_price_year
      ? `<span class="pl-chip g">${sv('check', 13, 'currentColor', 2.2)} Stripe prices linked</span>`
      : `<span class="pl-chip a">${sv('alert', 13)} Stripe prices not linked</span>`
    : '';
  const upd = p.updated_at
    ? `<span class="pl-chip">${sv('clock', 13)} Updated ${fmtD(p.updated_at)}${p.updated_by_name ? ' by ' + esc(p.updated_by_name) : ''}</span>`
    : '';
  return `<section class="ix-card pl-card${pro ? ' pro' : ''}" id="plf_${id}" aria-labelledby="plt_${id}"><div class="pl-hd"><span class="pl-ic" aria-hidden="true">${sv(pro ? 'plcrown' : 'plgift', 28)}</span><div class="pl-hn"><h2 id="plt_${id}">${esc(p.name)}</h2><p>${esc(p.description || (pro ? 'For professionals and teams.' : 'Basic access for new users.'))}</p></div>
 <span class="pl-pill ${p.active ? 'on' : 'off'}">${p.active ? sv('check', 14, 'currentColor', 2.4) + ' Active' : 'Hidden'}</span></div>
 <div class="pl-meta">${people ? `<span class="pl-chip">${sv('users', 13)} ${people}</span>` : ''}${stripe}${upd}</div>
 <form class="pl-body" data-on-submit="event.preventDefault();plSave('${id}')" novalidate>
 ${inp('name', 'Plan name', '', '', 'type="text" maxlength="40" autocomplete="off"')}
 ${PLX.limited ? '' : inp('description', 'Description', 'shown under the plan name', '', 'type="text" maxlength="140" autocomplete="off"')}
 ${prc('usd', '$')}${prc('gbp', '£')}
 <div class="pl-f"><label for="pl_${id}_threads_per_month">New Threads <span>per month</span></label><div class="pl-tr"><div class="pl-in np" id="plw_${id}_threads_per_month"><input id="pl_${id}_threads_per_month" type="text" inputmode="numeric" autocomplete="off" value="${o.threads_per_month == null ? '' : o.threads_per_month}" placeholder="${o.threads_per_month == null ? 'Unlimited' : ''}" data-on-input="plOnInput('${id}')" aria-describedby="ple_${id}_threads_per_month"${o.threads_per_month == null || !ed ? ' disabled' : ''}></div>
 ${pro ? `<label class="pl-ck"><input type="checkbox" id="pl_${id}_unl" ${o.threads_per_month == null ? 'checked' : ''} data-on-change="plUnlim('${id}',this.checked,${+(PLX.orig.free || {}).threads_per_month || 5})"${dis}> Unlimited</label>` : ''}</div><small class="pl-err" id="ple_${id}_threads_per_month" role="alert"></small></div>
 ${pro ? `<label class="pl-sw"><input type="checkbox" id="pl_${id}_active" ${o.active ? 'checked' : ''} data-on-change="plOnInput('${id}')"${dis}><span class="pl-swt" aria-hidden="true"></span><span><b>Offer this plan</b><small>Hidden plans stay on existing accounts but are not offered to new customers.</small></span></label>` : ''}
 <div class="pl-sum"><span class="pl-si" aria-hidden="true">${sv('pllist', 20)}</span><div><b>Plan summary</b><p id="pls_${id}" aria-live="polite">${esc(plSum(p.id, o))}</p></div></div>
 ${ed ? `<div class="pl-ft"><button type="submit" class="ix-btn pri" id="plsv_${id}" disabled>${sv('plsave', 17)} Save ${esc(p.name)} plan</button><button type="button" class="ix-btn" id="plrs_${id}" hidden data-on-click="plReset('${id}')">${sv('plundo', 16)} Undo changes</button><span class="pl-st ok" id="plst_${id}" role="status">${sv('check', 16, 'currentColor', 2.2)} No changes to save</span></div>` : ''}
 </form></section>`;
}
function plReset(id) {
  plFill(id, PLX.orig[id]);
  if (PLX.touched)
    Object.keys(PLX.touched).forEach(k => {
      if (k.indexOf(id) === 0) delete PLX.touched[k];
    });
  plOnInput(id);
}
function plSave(id) {
  if (!canFin()) return toast('Only owners and finance staff can change plans');
  const v = plRead(id),
    er = plErrs(id, v),
    d = plDiff(id);
  if (Object.keys(er).length) {
    PLX.touched = PLX.touched || {};
    Object.keys(er).forEach(k => (PLX.touched[id + k] = 1));
    plOnInput(id);
    const f = plEl(id, Object.keys(er)[0]);
    if (f) f.focus();
    return;
  }
  if (!Object.keys(d).length) return;
  const p = (PLX.data.plans || []).find(x => x.id === id) || {};
  const patch = {};
  Object.keys(d).forEach(k => (patch[k] = d[k].to));
  const rows = Object.keys(d)
    .map(
      k =>
        `<tr><th scope="row">${plLab(k)}</th><td>${esc(plVal2(k, d[k].from))}</td><td>${esc(plVal2(k, d[k].to))}</td></tr>`
    )
    .join('');
  const price = Object.keys(d).some(k => /^price_/.test(k));
  admAsk({
    title: 'Save ' + esc(p.name || id) + ' plan',
    body: 'Check the changes below. They are saved straight away and recorded in the audit log.',
    extra: `<div class="pl-diff"><table><thead><tr><th scope="col">Field</th><th scope="col">Before</th><th scope="col">After</th></tr></thead><tbody>${rows}</tbody></table></div>${price && id !== 'free' ? `<p class="pl-note">${sv('info', 15)} New prices are for new customers. Existing subscribers keep their current price until it is changed in Stripe.</p>` : ''}`,
    cta: 'Save changes',
    run: async r => {
      PLX.justSaved = id;
      if (PLX.limited) {
        const lp = Object.assign({}, patch);
        if ('threads_per_month' in lp && lp.threads_per_month == null) lp.threads_per_month = '';
        await arpc('admin_update_plan', { pid: id, patch: lp, reason: r });
      } else await arpc('admin_plan_save', { pid: id, patch, reason: r });
    }
  });
}
/* pricing history */
async function plHist() {
  modal(
    `<div class="cap-m pl-hm"><div class="row between"><h3>Pricing history</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div><div id="plhb"><div class="ix-card sk" style="height:180px"></div></div></div>`
  );
  try {
    let L;
    try {
      if (PLX.limited) throw { message: 'admin_plan_history' };
      L = await arpc('admin_plan_history', { pid: null, lim: 200 });
    } catch (e) {
      if (!plMiss(e)) throw e;
      L = ((await arpc('admin_audit', { lim: 1000 })) || []).filter(x => x.target_type === 'plan');
    }
    PLX.hist = L || [];
    plHistDraw();
  } catch (e) {
    const b = $('#plhb');
    if (b) b.innerHTML = `<p class="adm-err">${esc((e && e.message) || 'Could not load the history')}</p>`;
  }
}
function plHistDraw() {
  const b = $('#plhb');
  if (!b) return;
  const P = (PLX.data && PLX.data.plans) || [];
  const L = (PLX.hist || []).filter(x => PLX.histPlan === 'all' || x.target_id === PLX.histPlan);
  const name = x => x.plan_name || (P.find(p => p.id === x.target_id) || {}).name || x.target_id;
  const ch = x => {
    const dt = x.details || {};
    if (dt.changes)
      return Object.keys(dt.changes)
        .filter(k => k !== 'updated_at' && k !== 'updated_by')
        .map(
          k =>
            `<li><span>${plLab(k)}</span> ${esc(plVal2(k, dt.changes[k].from))} ${sv('arrow', 13)} <b>${esc(plVal2(k, dt.changes[k].to))}</b></li>`
        )
        .join('');
    return Object.keys(dt)
      .filter(k => PL_F.some(f => f[0] === k))
      .map(
        k =>
          `<li><span>${plLab(k)}</span> set to <b>${esc(plVal2(k, k === 'threads_per_month' && dt[k] === '' ? null : /^price_/.test(k) ? +dt[k] : dt[k]))}</b></li>`
      )
      .join('');
  };
  b.innerHTML = `<div class="pl-hf">${mdSel('plhp', 'Plan', PLX.histPlan, [['all', 'All plans']].concat(P.map(p => [p.id, esc(p.name)])), 'PLX.histPlan=this.value;plHistDraw()')}<span class="ix-mu">${fmtN(L.length)} change${L.length === 1 ? '' : 's'}</span></div>
 ${L.length ? `<ol class="pl-hl">${L.map(x => `<li><div class="pl-hh"><b>${esc(name(x))}</b><span>${fmtD(x.created_at)} ${fmtT(x.created_at)}</span></div><small>${esc(x.actor || 'Unknown staff member')}${x.reason ? ' · ' + esc(x.reason) : ''}</small><ul>${ch(x) || '<li>No field changes recorded</li>'}</ul></li>`).join('')}</ol>` : `<div class="adm-empty">${sv('plhist', 22)}<b>No price changes yet</b><p>Saved changes to plans appear here with who made them and why.</p></div>`}`;
}

/* v59: named handlers for the Plans screen (no inline JavaScript). */
function plTouch(id, k) {
  (PLX.touched = PLX.touched || {})[id + k] = 1;
  plOnInput(id);
}
function plUnlim(id, checked, def) {
  const t = plEl(id, 'threads_per_month');
  if (!checked && t && !t.value) t.value = def;
  plOnInput(id);
}
