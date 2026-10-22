// Introthread - Guided first visit (v44): a short 4-step welcome for new signed-in users.
// Shown once per account on this device, on the app pages, when the person has no Threads yet.
// Reopen any time with itTour(). Loaded after billing-sync.js. Prefix ft / FT.
const FT = { i: 0, open: false };
const FT_STEPS = [
  {
    t: 'Welcome to Introthread',
    b: 'Your digital card is how people find you after you meet. It takes a minute to set up and you can change it any time.',
    ic: 'user'
  },
  {
    t: 'Tap to Thread',
    b: 'When you meet someone, open Tap to Thread. They scan your QR code, or you save their details. Each meeting becomes a Thread.',
    ic: 'link'
  },
  {
    t: 'What\u2019s next?',
    b: 'Each of you answers one question: meet again, introduce someone, or keep in touch. Answers stay private until you have both replied.',
    ic: 'check'
  },
  {
    t: 'Rooms for events',
    b: 'Running an event or community? Create a Room so every connection made there is counted, and people can join with a link or QR code.',
    ic: 'cal'
  }
];
const ftKey = () => 'it_tour_' + (DB.session || '');
function ftDone() {
  try {
    return localStorage.getItem(ftKey()) === '1';
  } catch (e) {
    return true;
  }
}
function ftRender() {
  const s = FT_STEPS[FT.i],
    last = FT.i === FT_STEPS.length - 1;
  let el = document.getElementById('ftour');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ftour';
    el.className = 'ft-back';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'ftt');
    document.body.appendChild(el);
    el.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        ftClose();
      }
      if (e.key === 'Tab') {
        const f = [...el.querySelectorAll('button')];
        if (!f.length) return;
        const a = f[0],
          z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    });
  }
  el.innerHTML = `<div class="ft-card"><div class="row between"><span class="ft-n">Step ${FT.i + 1} of ${FT_STEPS.length}</span><button type="button" class="ft-skip" onclick="ftClose()">Skip</button></div>
 <span class="ft-ic" aria-hidden="true">${typeof sv === 'function' ? sv(s.ic, 22) : ''}</span><h2 id="ftt">${esc(s.t)}</h2><p>${esc(s.b)}</p>
 <div class="ft-dots" aria-hidden="true">${FT_STEPS.map((_, k) => `<i class="${k === FT.i ? 'on' : ''}"></i>`).join('')}</div>
 <div class="ft-b">${FT.i ? `<button type="button" class="t-how" onclick="ftStep(-1)">Back</button>` : '<span></span>'}${last ? `<button type="button" class="x-btn" onclick="ftClose('/app/card')">Set up my card</button>` : `<button type="button" class="x-btn" onclick="ftStep(1)">Next</button>`}</div></div>`;
  const b = el.querySelector('.ft-b .x-btn');
  if (b) b.focus();
}
function ftStep(d) {
  FT.i = Math.max(0, Math.min(FT_STEPS.length - 1, FT.i + d));
  ftRender();
}
function ftClose(to) {
  try {
    localStorage.setItem(ftKey(), '1');
  } catch (e) {}
  FT.open = false;
  const el = document.getElementById('ftour');
  if (el) el.remove();
  if (to) go(to);
}
function itTour() {
  FT.i = 0;
  FT.open = true;
  ftRender();
}
function ftCheck() {
  if (FT.open || document.getElementById('ftour')) return;
  if (!(cloud() && me())) return;
  const p = String(RH() || '').replace(/^#/, '');
  if (!p.startsWith('/app') || p.startsWith('/app/room/') || ftDone()) return;
  if (typeof myThreads === 'function' && myThreads().length) return;
  const mb = document.getElementById('mback');
  if (mb && mb.classList.contains('open')) return;
  itTour();
}
const _render44 = render;
render = function () {
  const r = _render44.apply(this, arguments);
  try {
    setTimeout(ftCheck, 600);
  } catch (e) {}
  return r;
};
