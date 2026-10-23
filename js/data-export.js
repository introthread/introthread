// Introthread - Your data is always yours (v23): free CSV and vCard export on every plan.
// Moved out of index.html in v53 (code split step 5). Load order matters: see the <script> list at the end of index.html.

/* ===== v23 Your data is always yours: free CSV and vCard export on every plan ===== */
delete FEATURES.export;
PLANS.free.features.splice(4, 0, 'Export contacts anytime (vCard and CSV)');
PLANS.pro.features = PLANS.pro.features.filter(f => !/export/i.test(f));
function vcfEsc(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/([,;])/g, '\\$1');
}
function bExportVcf() {
  const T = myThreads();
  if (!T.length) return toast('You have no contacts to export yet');
  const cards = T.map(t => {
    const n = (t.other.name || '').trim().split(/\s+/);
    const last = n.length > 1 ? n.pop() : '';
    const first = n.join(' ');
    const note = [
      `Met at ${t.where || 'in person'} on ${new Date(t.createdAt).toISOString().slice(0, 10)} (Introthread)`,
      tagsOf(t).length ? 'Topics: ' + tagsOf(t).join(', ') : '',
      t.note ? 'Note: ' + t.note : ''
    ]
      .filter(Boolean)
      .join(' | ');
    return [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:' + vcfEsc(last) + ';' + vcfEsc(first) + ';;;',
      'FN:' + vcfEsc(t.other.name),
      t.other.role ? 'TITLE:' + vcfEsc(t.other.role) : '',
      t.other.company ? 'ORG:' + vcfEsc(t.other.company) : '',
      t.other.email ? 'EMAIL;TYPE=INTERNET:' + t.other.email : '',
      'NOTE:' + vcfEsc(note),
      'CATEGORIES:Introthread',
      'END:VCARD'
    ]
      .filter(Boolean)
      .join('\r\n');
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([cards.join('\r\n') + '\r\n'], { type: 'text/vcard' }));
  a.download = 'introthread-contacts-' + new Date().toISOString().slice(0, 10) + '.vcf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast(T.length + ' contacts exported');
}
function bExportMenu() {
  modal(
    `<div class="bl-co"><div class="row between"><h3>Export your contacts</h3><button class="x" aria-label="Close" data-on-click="closeModal()">&times;</button></div><p class="fu-sub">Free on every plan. Your data is always yours.</p><div class="bl-exp"><button type="button" data-on-click="closeModal();bExportVcf()"><span>${sv('user', 20)}</span><div><b>Contacts file (vCard)</b><small>Import into Gmail, Outlook, iPhone or Android contacts.</small></div>${sv('chev', 16)}</button><button type="button" data-on-click="closeModal();bExportThreads()"><span>${sv('brief', 20)}</span><div><b>Spreadsheet (CSV)</b><small>Every Thread with status, answers, topics and notes.</small></div>${sv('chev', 16)}</button><button type="button" data-on-click="closeModal();exportMine()"><span>${sv('shield', 20)}</span><div><b>Everything (JSON)</b><small>Your profile, Threads and Rooms in one file.</small></div>${sv('chev', 16)}</button></div></div>`
  );
}
const _vThreads23 = vThreads;
vThreads = function () {
  return _vThreads23().replace(
    'onclick="bExportThreads()" title="Export Threads to CSV">',
    'onclick="bExportMenu()" title="Export your contacts">'
  );
};
const _bPrivacy23 = bPrivacy;
bPrivacy = function (u) {
  return _bPrivacy23(u).replace(
    '<div class="bl-data"><div><b>Delete your account</b>',
    `<div class="bl-data"><div><b>Export contacts (vCard)</b><small>Import into Gmail, Outlook or your phone.</small></div><button type="button" class="t-how sm" data-on-click="bExportVcf()">Download vCard</button></div><div class="bl-data"><div><b>Delete your account</b>`
  );
};
HELP.splice(
  HELP.length - 1,
  0,
  [
    'Your data',
    'What happens to my contacts if I stop paying?',
    'Nothing is lost. Pro stays active until the end of the period you paid for, then your account moves to the Free plan. Every Thread, note, tag, Room and your card stay exactly as they are, and Free includes unlimited Threads, so you can keep adding people. Only Pro tools such as AI follow-up drafts and NFC writing are paused.'
  ],
  [
    'Your data',
    'Can I export my contacts?',
    'Yes, on every plan, at any time. Download all your contacts as a vCard file that imports into Gmail, Outlook or your phone, or as a CSV spreadsheet for Excel and Google Sheets. You can also download everything we hold about you as a single file.'
  ],
  [
    'Your data',
    'How is Introthread different from my Gmail or company email?',
    'Email stores messages. Introthread stores relationships: where and when you met, what you talked about, whether both of you confirmed the connection, and what happens next. It works even when you never exchanged an email, and it reminds you to follow up. It also belongs to you, while company email and its contacts stay with your employer when you change jobs.'
  ],
  [
    'Your data',
    'What are the main advantages?',
    'No app needed to connect, contacts confirmed by both people, context you never lose, a clear next step with reminders before a connection goes cold, private by default, and Rooms that show which event connections actually led somewhere.'
  ],
  [
    'Your data',
    'Why choose Introthread over a business card app, a CRM or LinkedIn?',
    'Card apps pass on your details and stop there. CRMs are built for sales pipelines, need manual typing and are owned by the company. LinkedIn gives you a connection without context or a next step. Introthread is built around the moment two people meet and agree what happens next, and then helps make sure it happens.'
  ],
  [
    'Your data',
    'Can I delete my account and data?',
    'Yes. Settings, Privacy and visibility, Your data. Export first if you want a copy, then delete permanently. Nothing is kept after deletion.'
  ]
);
