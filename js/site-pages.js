// Introthread - Website pages (v83): home, how it works, rooms, networks, pricing, about, privacy, terms, 404.
// Moved out of js/core.js unchanged (code cleanup step 1). Loads straight after core.js; shares its globals
// (sv, esc, PLANS, ...). Later files wrap some of these (for example vPricing in contacts-import.js).

/* v98: website content and helpers (feat3, secHead, PAGE_META, setMeta, POLICY, TERMS), moved unchanged from
   js/core.js (cleanup plan step 3). Nothing uses them while the page loads; the render wrapper in core.js
   calls setMeta only at run time. */
const feat3 = a =>
  `<div class="x-f3">${a.map(([ic, t, s]) => `<div class="x-f3-i"><span class="x-f3-ic">${sv(ic, 21)}</span><h3>${t}</h3><p>${s}</p></div>`).join('')}</div>`;

const secHead = (eye, h, p) =>
  `<div class="x-head2"><div><div class="x-eye">${eye}</div><h2 class="x-h2">${h}</h2></div>${p ? `<p class="x-sub">${p}</p>` : '<span></span>'}</div>`;

const PAGE_META = {
  '/': [
    'Introthread | Every handshake, followed through',
    'Create your professional card, share it by tap, QR or link, and turn every introduction into a shared Thread with one clear next step. Built for professionals everywhere.'
  ],
  '/how': [
    'How it works | Introthread',
    "Tap or scan, confirm a shared Thread, answer one private question: What's next? See how Introthread turns introductions into follow-through."
  ],
  '/rooms': [
    'Thread Rooms for events and communities | Introthread',
    'Measure what your event created: verified connections, meetings booked and introductions made, live and for 30 days after.'
  ],
  '/networks': [
    'Warmth for teams and networks | Introthread',
    'Consented, verified relationship strength for VC platform teams, accelerators and professional communities. Warm intros that are actually warm.'
  ],
  '/pricing': [
    'Pricing | Introthread',
    'Start free with your card, link, QR and unlimited Threads. Pro for people who follow through, Rooms from $166 per event, custom plans for networks.'
  ],
  '/about': [
    'About | Introthread',
    'Introthread records the moment two people meet and agree on what happens next. Our story, and how to get in touch.'
  ],
  '/privacy': [
    'Trust and privacy | Introthread',
    'Two-sided consent, private answers and opt-in network visibility. Designed for UK GDPR, the DPA 2018 and US state privacy laws.'
  ],
  '/terms': [
    'Terms of Service | Introthread',
    'The terms for using Introthread: your account, your content, acceptable use, plans and payments, and your rights.'
  ],
  '/login': ['Log in | Introthread', 'Log in to Introthread and pick up every Thread where you left it.'],
  '/signup': [
    'Create your free card | Introthread',
    'Create your free Introthread card in 60 seconds. No card required.'
  ]
};

function setMeta() {
  const p = '/' + (location.pathname.split('/').filter(Boolean)[0] || '');
  const m = PAGE_META[p];
  if (!m) return;
  document.title = m[0];
  const set = (sel, attr, val) => {
    const e = document.head.querySelector(sel);
    if (e) e.setAttribute(attr, val);
  };
  set('meta[name="description"]', 'content', m[1]);
  set('link[rel="canonical"]', 'href', 'https://www.introthread.com' + (p === '/' ? '/' : p));
  set('meta[property="og:title"]', 'content', m[0]);
  set('meta[property="og:description"]', 'content', m[1]);
  set('meta[property="og:url"]', 'content', 'https://www.introthread.com' + (p === '/' ? '/' : p));
}

const POLICY = [
  [
    'who',
    'Who we are',
    '<p>Introthread (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides digital professional cards and shared Threads that record when two people meet. We are the controller of the personal data described here. Contact us at <a href="mailto:privacy@introthread.com">privacy@introthread.com</a>.</p>'
  ],
  [
    'data',
    'Data we collect',
    '<ul><li><b>Account data:</b> name, email address and password (stored as a secure hash by our authentication provider).</li><li><b>Card data:</b> job title, company, city, bio, links, profile photo and card style you choose to add.</li><li><b>Thread data:</b> who you met, when and where, your private notes and your answer to What&rsquo;s next?.</li><li><b>Details of people you meet or import:</b> when you add someone (typed, scanned from a QR code or business card, pasted, picked from your phone contacts or imported from a LinkedIn, Google or Outlook file), we store the name, email, phone, LinkedIn, job title, company and other details you choose to keep. Importing never contacts anyone.</li><li><b>Billing data:</b> if you buy a paid plan, your plan, payment status and invoices. Card details are handled by our payment provider and never reach us.</li><li><b>Time and location of a Thread:</b> when you save a Thread, the exact time and, if you allow it, your phone&rsquo;s location. See &ldquo;Location when you save a Thread&rdquo; below.</li><li><b>Technical data:</b> basic device and log information needed to keep the service secure.</li></ul>'
  ],
  [
    'location',
    'Location when you save a Thread',
    '<p>When you save a new Thread, we record the exact time you saved it. If you allow it, we also record your phone&rsquo;s location at that moment: the coordinates, how accurate they are (for example &ldquo;about 12 m&rdquo;) and a place name, so you can remember where you met.</p><ul><li><b>Your permission:</b> your phone asks before sharing your location. If you say no, the Thread is still saved, with the time only.</li><li><b>Only your own location:</b> we record the location of your phone, never the location of the person you met.</li><li><b>Place name:</b> to turn the coordinates into a place name, we send them to OpenStreetMap&rsquo;s Nominatim service. We send only the coordinates, not your name or any details about the person you met.</li><li><b>Who can see it:</b> the time and location are shown only to you, on your Thread, and are included when you export your data.</li><li><b>Turn it off:</b> you can stop recording location at any time in Settings, under &ldquo;Your data and privacy&rdquo;, with the &ldquo;Save where I meet people&rdquo; switch. You can also remove location permission in your phone or browser settings.</li></ul><p>We use this data to provide the feature you chose to use (contract), and the location part only with your permission, which you can withdraw at any time. It is kept and deleted with the Thread it belongs to.</p>'
  ],
  [
    'scan',
    'Business card and QR scanning',
    '<p>When you scan a business card, the text is read on your own phone or computer. The photo is not uploaded to us; only the details you choose to save are stored with your Thread or contact.</p>'
  ],
  [
    'ai',
    'AI follow-up drafts',
    '<p>If you switch on &ldquo;Draft follow-ups with AI&rdquo;, we send the context of that one Thread (names, where you met, your note and your answers) to our AI provider to write a suggested message. Drafts are never sent without you. Our AI provider processes this data only to create the draft, under a data processing agreement, and may not use it to train its models. You can switch this off at any time in Settings.</p>'
  ],
  [
    'use',
    'How and why we use it',
    '<p>We use your data to provide the service you asked for (contract), to keep it secure and improve it (legitimate interests), and to send service messages such as sign-in codes, Thread invitations to the person you met, and follow-up reminders you have switched on. When you start a Thread with someone, we email them once so they can confirm it; they can ignore it and nothing more is sent. We do not sell your personal data and we do not use it for third-party advertising.</p>'
  ],
  [
    'sharing',
    'Who can see what',
    '<p>Your public card is visible to anyone with your link. A Thread is only created when both people confirm it. Your answer to What&rsquo;s next? stays hidden until both people reply, and your private notes are never shown to anyone else. Event organisers and networks only see aggregate results, and only where you opted in.</p>'
  ],
  [
    'processors',
    'Service providers and transfers',
    '<p>We use trusted providers to run Introthread, including hosting (Vercel), database and authentication (Supabase), email delivery (Resend), payments (Paystack), AI follow-up drafts when you switch them on, sign-in with Google or LinkedIn when you choose it, fonts (Google Fonts) and place names for saved locations (OpenStreetMap Nominatim, which receives only coordinates). Where data is transferred outside the UK or EEA, we rely on appropriate safeguards such as the UK International Data Transfer Addendum or Standard Contractual Clauses.</p>'
  ],
  [
    'retention',
    'How long we keep it',
    '<p>We keep your data while your account is active. If you delete your account, we delete your card and your side of every Thread within 30 days, except where we must keep limited records by law.</p>'
  ],
  [
    'rights',
    'Your rights',
    '<p>Under UK GDPR and applicable US state laws you can access, correct, export or delete your data, object to or restrict certain processing, and withdraw consent at any time. You can export or delete your data in Settings, or email <a href="mailto:privacy@introthread.com">privacy@introthread.com</a>. You may also complain to the UK Information Commissioner&rsquo;s Office (ico.org.uk).</p>'
  ],
  [
    'cookies',
    'Cookies and storage',
    '<p>We only use storage that is strictly necessary to keep you signed in and remember your preferences. We do not use advertising cookies. If we add product analytics to understand how the service is used, we will ask for your consent first where the law requires it and update this policy.</p>'
  ],
  [
    'security',
    'Security',
    '<p>Data is encrypted in transit, access is protected by row-level security so you can only read and change your own records, and passwords are never stored in plain text.</p>'
  ],
  [
    'changes',
    'Changes to this policy',
    '<p>If we make material changes we will tell you by email or in the app before they take effect.</p>'
  ]
];

const TERMS = [
  [
    'accept',
    'Using Introthread',
    '<p>By creating an account or using Introthread you agree to these terms. If you use Introthread for an organisation, you confirm you can accept them on its behalf.</p>'
  ],
  [
    'account',
    'Your account',
    '<p>You must be at least 16, give accurate information and keep your password secure. You are responsible for activity on your account.</p>'
  ],
  [
    'content',
    'Your content',
    '<p>You own the content you add. You give us permission to host and display it so we can run the service, for example showing your card to people you share it with.</p>'
  ],
  [
    'use',
    'Acceptable use',
    '<ul><li>Do not impersonate others or create Threads with people you have not met.</li><li>Do not send spam, scrape the service or try to access other people&rsquo;s data.</li><li>Do not upload unlawful, misleading or infringing content.</li></ul>'
  ],
  [
    'plans',
    'Plans and payments',
    '<p>The Free plan is free. Paid plans are billed in advance, monthly or annually, and renew until cancelled. You can cancel at any time and keep access until the end of the paid period. Prices exclude VAT and sales tax where applicable. UK consumers have a 14-day right to cancel a new subscription.</p>'
  ],
  [
    'availability',
    'Availability and changes',
    '<p>We work to keep Introthread available and secure but cannot promise it will be uninterrupted. We may improve or change features, and will give notice of material changes.</p>'
  ],
  [
    'ending',
    'Ending your account',
    '<p>You can delete your account at any time in Settings. We may suspend accounts that break these terms.</p>'
  ],
  [
    'liability',
    'Liability',
    '<p>Nothing in these terms limits liability that cannot be limited by law. Otherwise, to the extent permitted by law, we are not liable for indirect or consequential losses, and our total liability is limited to the amount you paid us in the 12 months before the claim.</p>'
  ],
  [
    'law',
    'Governing law',
    '<p>These terms are governed by the laws of England and Wales. If you live elsewhere, you keep any mandatory protections of your local law.</p>'
  ],
  [
    'contact',
    'Contact',
    '<p>Questions about these terms: <a href="mailto:hello@introthread.com">hello@introthread.com</a>.</p>'
  ]
];

function mnav(on) {
  return `<header class="x-nav"><div class="x-wrap x-nav-in">${logo()}<nav class="x-links" aria-label="Main"><a href="#/how" class="${on === 'how' ? 'on' : ''}">How it works</a><a href="#/rooms" class="${on === 'rooms' ? 'on' : ''}">Events &amp; communities</a><a href="#/networks" class="${on === 'networks' ? 'on' : ''}">For teams</a><a href="#/pricing" class="${on === 'pricing' ? 'on' : ''}">Pricing</a><div class="x-dd"><button type="button">Resources ${sv('chevd', 14)}</button><div class="x-dd-m"><a href="#/about">About Introthread</a><a href="#/privacy">Privacy &amp; consent</a><a href="#/how">How Threads work</a></div></div>${me() ? '' : '<a href="#/login" class="x-mlogin">Log in</a>'}</nav>
<div class="x-nav-r">${me() ? `<a class="x-btn sm" href="#/app">Open app ${sv('arrow', 15)}</a>` : `<a href="#/login" class="x-login">Log in</a><a href="#/signup" class="x-btn sm">Get your card ${sv('arrow', 15)}</a>`}<button class="x-burger" data-on-click="document.body.classList.toggle('x-open')" aria-label="Menu">${sv('menu2', 22)}</button></div></div></header>`;
}

function foot() {
  return `<footer class="x-foot"><div class="x-wrap"><div class="x-foot-g"><div>${logo()}<p>Every handshake, followed through.</p></div>
<div><h4>Product</h4><a href="#/how">How it works</a><a href="#/how">NFC cards</a><a href="#/networks">For teams</a><a href="#/pricing">Pricing</a></div>
<div><h4>Use cases</h4><a href="#/rooms">Conferences</a><a href="#/how">Professionals</a><a href="#/how">Founders</a><a href="#/how">Sales &amp; BD</a></div>
<div><h4>Company</h4><a href="#/about">About</a><a href="#/about">Contact</a><a href="#/signup">Get started</a></div>
<div><h4>Legal</h4><a href="#/privacy">Privacy</a><a href="#/terms">Terms of Service</a><a href="#/privacy#policy">Privacy policy</a></div></div>
<div class="x-foot-b"><span>&copy; 2026 Introthread. All rights reserved.</span><span>London &middot; New York</span></div></div></footer>`;
}

function vHome() {
  document.body.classList.remove('x-open');
  return (
    mnav() +
    `
<section class="x-hero"><div class="x-wrap x-hero-in"><div>
<span class="x-pill"><span class="x-pill-ic">${sv('grid', 12)}</span>The professional relationship platform</span>
<h1 class="x-h1">Every handshake,<br><em>followed through.</em></h1>
<p class="x-lead">Create your professional identity, share it instantly and turn introductions into meaningful relationships. Tap, scan or share, no app required.</p>
<div class="x-cta-row"><a href="#/signup" class="x-btn lg">Get your free card ${sv('arrow', 17)}</a><a href="#/how" class="x-btn ghost lg"><span class="x-play">${sv('play', 11)}</span>See how it works</a></div>
<ul class="x-checks"><li>${sv('check', 17, 'currentColor', 2.4)}No app needed for the other person</li><li>${sv('check', 17, 'currentColor', 2.4)}Private until you both confirm</li><li>${sv('check', 17, 'currentColor', 2.4)}Set up in 60 seconds</li><li>${sv('check', 17, 'currentColor', 2.4)}Works with NFC, QR and links</li></ul></div>
<div class="x-hero-art">${phone(bizCard(SARAH, { phone: 1 }))}
<div class="x-pcard"><div class="x-pcard-top"><span>introthread</span>${sv('nfc', 18)}</div><div class="x-av" style="width:58px;height:58px;font-size:19px;margin:24px 0 12px">SW</div><div class="x-pcard-n">Sarah Williams</div><div class="x-pcard-r">Marketing Director<br>Acme Technologies</div><div class="x-qr" id="qrHero"></div><div class="x-pcard-f">Tap or scan<br>to connect</div></div>
<span class="x-glow"></span><span class="x-wave"></span><span class="x-wave d2"></span><span class="x-wave d3"></span><span class="x-tline"></span><div class="x-hand">${handArrow(56, 48)}Tap, scan or share<br>&mdash; no app required</div></div></div></section>
<section class="x-ww"><div class="x-wrap"><div class="x-ww-h"><div class="x-eye">Works everywhere</div><h2>Works wherever <em>you network.</em></h2><p>One card for every way you meet people. Nothing to install on the other side.</p></div><div class="x-ww-g">${[
      ['nfc', 'NFC tap', 'Tap any phone'],
      ['qr', 'QR code', 'Scan to connect'],
      ['link', 'Share link', 'introthread.com/you'],
      ['mail', 'Email &amp; SMS', 'Send in one tap'],
      ['contact', 'Save to contacts', 'One-tap vCard'],
      ['phone', 'Any phone', 'iPhone and Android']
    ]
      .map(
        ([ic, t, s]) =>
          `<div class="x-ww-i"><span class="x-ww-ic">${sv(ic, 24)}</span><b>${t}</b><small>${s}</small></div>`
      )
      .join('')}</div></div></section>
<section class="x-sec alt hw" id="how"><div class="x-wrap">
<div class="hw-head"><div><div class="x-eye">How it works</div><h2 class="x-h2 hw-h2">From introduction<br>to <span>opportunity.</span></h2><p class="hw-sub">Introthread captures the relationship, with both people's consent, and helps you remember, follow up and turn conversations into opportunities.</p></div><a href="/how" class="hw-see"><span class="hw-play">${sv('play', 10)}</span>See how it works</a></div>
<ol class="hw-steps">
<li class="hw-step"><div class="hw-v"><span class="hw-n">1</span><div class="hw-nfc"><div class="hw-card"><span class="hw-lg"><span class="x-lm"><i></i><i></i></span>intro<b>thread</b></span><span class="hw-chip"></span></div><span class="hw-waves">${sv('nfc', 28)}</span></div></div><h3>Share your card</h3><p>Tap, scan or share your link. The other person doesn't need an app.</p></li>
<li class="hw-step"><div class="hw-v"><span class="hw-n">2</span><div class="hw-mini"><div class="hw-who"><img src="/img/sarah.jpg" alt="" width="40" height="40"><div><b>Sarah Williams</b><small>Marketing Director</small><small>Acme Technologies</small></div></div><span class="hw-ok">${sv('check', 12, 'currentColor', 2.8)} Confirmed</span></div></div><h3>A shared Thread</h3><p>When both people confirm, a shared record is created.</p></li>
<li class="hw-step"><div class="hw-v"><span class="hw-n">3</span><div class="hw-mini"><b class="hw-q">What's next?</b><div class="hw-opt on">${sv('cal', 14)}<span>Meet again</span><em>${sv('check', 11, '#fff', 3)}</em></div><div class="hw-opt">${sv('users', 14)}<span>Introduce someone</span></div><div class="hw-opt">${sv('bell', 14)}<span>Stay in touch</span></div></div></div><h3>Add context</h3><p>Capture notes, set a follow-up and keep track of what matters.</p></li>
<li class="hw-step"><div class="hw-v"><span class="hw-n">4</span><div class="hw-stack"><div class="hw-mini hw-row"><span class="hw-ic o">${sv('bell', 15)}</span><div><b>Follow up with Sarah</b><small>in 3 days</small></div><span class="hw-tog" aria-hidden="true"></span></div><div class="hw-mini hw-row"><span class="hw-ic b">${sv('mail', 15)}</span><div><b>Suggested message ready</b></div></div></div></div><h3>Turn conversations into opportunities</h3><p>Get timely reminders and suggested messages.</p></li>
</ol></div></section>
<section class="x-sec xsc"><div class="x-wrap xsc-in"><div><div class="x-eye">Scan a paper card</div><h2 class="x-h2">Got their paper card?<br><em>Scan it in seconds.</em></h2><p class="x-sub">Take a photo and Introthread reads the name, title, company, email and phone on your phone, then starts a Thread with that person. The photo never leaves your device.</p><div class="xsc-b"><a href="/signup" class="x-btn lg">Get your free card ${sv('arrow', 17)}</a><button type="button" class="x-btn ghost lg" data-on-click="demoLogin()">Try it in the demo</button></div></div><ol class="xsc-steps"><li><span>1</span><div><b>Snap the card</b><small>Front, and the back if it has more.</small></div></li><li><span>2</span><div><b>Check the details</b><small>Read on your device. Fix anything in one tap.</small></div></li><li><span>3</span><div><b>Start the Thread</b><small>Send the confirm link by WhatsApp or email.</small></div></li></ol></div></section>
<section class="x-sec x-dsec"><div class="x-wrap"><div class="x-head2"><div><div class="x-eye">The difference</div><h2 class="x-h2">More than a<br><em>digital business card.</em></h2></div><div><p class="x-sub">Most digital cards stop at the swap. Introthread follows what happens next, so the people you meet never fade into your contacts.</p><a href="#/how" class="x-btn lg" style="margin-top:24px">See why it's different ${sv('arrow', 17)}</a></div></div>
<div class="x-dl"><div class="x-dl-top"><span>After you meet</span>${['Day 0', 'Day 3', 'Day 30', 'Day 90'].map(d => `<span>${d}</span>`).join('')}</div>
<div class="x-lane old"><div class="x-lane-l"><span class="x-lane-ic">${sv('contact', 18)}</span><div><b>Typical digital card</b><small>A contact, then silence</small></div></div><div class="x-lane-t"><i class="x-lane-line"></i>${[
      ['contact', 'Contact saved', 'Name and number only'],
      ['close', 'No context', 'Where did you meet?'],
      ['bell', 'No follow-up', 'The moment passes'],
      ['user', 'Forgotten', '&ldquo;Who was this again?&rdquo;']
    ]
      .map(
        ([ic, t, s], k) =>
          `<div class="x-node" style="--o:${1 - k * 0.2}"><span class="x-dot"></span><div class="x-nc"><em>${['Day 0', 'Day 3', 'Day 30', 'Day 90'][k]}</em><span class="x-nic">${sv(ic, 15)}</span><b>${t}</b><small>${s}</small></div></div>`
      )
      .join('')}</div></div>
<div class="x-lane new"><div class="x-lane-l"><span class="x-lane-ic"><span class="x-lm"><i></i><i></i></span></span><div><b>Introthread</b><small>A shared Thread that moves forward</small></div></div><div class="x-lane-t"><i class="x-lane-line"></i>${[
      ['check', 'Thread confirmed', 'By both of you, at London Tech Week'],
      ['spark', 'What&rsquo;s next? answered', 'You both chose: Meet again'],
      ['bell', 'Follow-up nudge', 'A suggested message, ready to send'],
      ['users', 'Opportunity', 'An intro to a new partner']
    ]
      .map(
        ([ic, t, s], k) =>
          `<div class="x-node" style="--d:${0.35 + k * 0.35}s"><span class="x-dot"></span><div class="x-nc"><em>${['Day 0', 'Day 3', 'Day 30', 'Day 90'][k]}</em><span class="x-nic">${sv(ic, 15)}</span><b>${t}</b><small>${s}</small></div></div>`
      )
      .join('')}</div></div>
<div class="x-dl-foot">${[
      ['shield', 'Consent on both sides'],
      ['brief', 'Context kept'],
      ['bell', 'Follow-up built in'],
      ['chart', 'Relationships that compound']
    ]
      .map(([ic, t]) => `<span>${sv(ic, 17)}${t}</span>`)
      .join('')}</div></div></div></section>
<section class="x-sec alt x-usec"><div class="x-wrap"><div class="x-head2"><div><div class="x-eye">For every way you network</div><h2 class="x-h2">Built for real-world<br><em>connections.</em></h2></div><p class="x-sub">Whether it's a conference, a client meeting or a community event, Introthread helps you stay connected and turn introductions into meaningful relationships.</p></div>
<div class="x-bento">${[
      [
        'uc-conferences',
        'users',
        'Events',
        'Conferences &amp; events',
        'Capture every connection in the room and keep the momentum going long after the event ends.',
        ['Thread Rooms', 'Event QR codes', 'Attendee follow-up'],
        '#/rooms',
        'big'
      ],
      [
        'uc-professionals',
        'brief',
        'Individuals',
        'For professionals',
        'Showcase your work, share your card and grow your network.',
        0,
        '#/how',
        ''
      ],
      [
        'uc-teams',
        'building',
        'Organisations',
        'For teams',
        'Consistent, on-brand profiles for everyone who represents you.',
        0,
        '#/networks',
        ''
      ],
      [
        'uc-communities',
        'hub',
        'Networks',
        'For communities',
        'Member directories, events and warmer, more engaged networks.',
        ['Member directory', 'Warm intros'],
        '#/rooms',
        'wide'
      ]
    ]
      .map(
        ([img, ic, k, t, p, tags, href, cls]) =>
          `<a class="x-bc ${cls}" href="${href}"><img src="/img/${img}.jpg" alt="" loading="lazy" decoding="async"><span class="x-bc-sh"></span><div class="x-bc-in"><span class="x-bc-k"><span class="x-bc-ic">${sv(ic, 15)}</span>${k}</span><h3>${t}</h3><p>${p}</p>${tags ? `<div class="x-bc-tags">${tags.map(x => `<span>${x}</span>`).join('')}</div>` : ''}<span class="x-bc-go">Explore ${sv('arrow', 15)}</span></div></a>`
      )
      .join('')}</div></div></section>
<section class="x-why"><div class="x-wrap"><div class="x-why-card"><div class="x-why-top"><div class="x-eye">Why we built it</div><span class="x-why-mark">&ldquo;</span><p class="x-why-q">A simple way to turn introductions into <em>real opportunities.</em></p><p class="x-why-b">Most introductions end in a contacts list. Introthread gives every meeting a shared record and one clear next step, agreed by both people, so the relationship actually moves forward.</p><div class="x-why-sig"><span class="x-lm"><i></i><i></i></span><b>The Introthread principle</b></div></div>
<div class="x-why-g">${[
      [
        'lock',
        'Private by default',
        'Your card shows only what you choose. Nothing is shared until you tap.'
      ],
      ['shield', 'Consent on both sides', 'A Thread exists only when both people confirm the meeting.'],
      ['send', 'One clear next step', 'Each person answers What&rsquo;s next? privately, revealed together.']
    ]
      .map(
        ([ic, t, s], n) =>
          `<div class="x-why-i"><span class="x-why-n">0${n + 1}</span><span class="x-why-ic">${sv(ic, 20)}</span><b>${t}</b><small>${s}</small></div>`
      )
      .join('')}</div></div></div></section>
<section class="x-sec" style="padding-top:0"><div class="x-wrap"><div class="x-ctab"><div><div class="x-eye">Get started today</div><h2>Make every introduction count.</h2><p>Create your free Introthread card in 60 seconds. Your next handshake deserves a Thread.</p><div class="x-cta-row" style="margin-top:0"><a href="#/signup" class="x-btn lg">Get your free card ${sv('arrow', 17)}</a><a href="#/login" class="x-btn dk2 lg"><span class="x-play" style="background:#fff;color:#0b1122">${sv('play', 11)}</span>Try the live demo</a></div></div>
<div class="x-ctab-art"><div class="x-wcard o"></div><div class="x-wcard d"><div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:#c8d0e0">introthread ${sv('nfc', 16)}</div><div class="x-qr" id="qrCta" style="margin-top:36px"></div></div><div class="x-wcard w"><div style="font-size:11px;font-weight:700;text-align:left">introthread</div>${avatarC(SARAH, 64)}<div style="font-weight:700;font-size:16px">Sarah Williams</div><div style="font-size:12px;color:#5b6478;margin-top:3px">Marketing Director</div></div></div></div></div></section>` +
    foot()
  );
}

function pHero(eye, h1, sub, ctas, art, center) {
  return `<section class="x-ph ${center ? 'c' : ''}"><div class="x-wrap x-ph-in ${art ? '' : 'solo'}"><div><div class="x-eye">${eye}</div><h1 class="x-h1 x-ph-h">${h1}</h1><p class="x-lead">${sub}</p>${ctas ? `<div class="x-cta-row">${ctas}</div>` : ''}</div>${art ? `<div class="x-ph-art">${art}</div>` : ''}</div></section>`;
}

function ctaBand(h, p, b1, b2) {
  return `<section class="x-sec" style="padding-top:8px"><div class="x-wrap"><div class="x-ctab one"><div><div class="x-eye">Get started today</div><h2>${h || 'Make every introduction count.'}</h2><p>${p || 'Create your free Introthread card in 60 seconds. Your next handshake deserves a Thread.'}</p><div class="x-cta-row" style="margin-top:0">${b1 || `<a href="/signup" class="x-btn lg">Get your free card ${sv('arrow', 17)}</a>`}${b2 || `<a href="/login" class="x-btn dk2 lg">Try the live demo</a>`}</div></div></div></div></section>`;
}

function vHow() {
  return (
    mnav('how') +
    pHero(
      'How it works',
      'A relationship starts the moment you meet. <em>So does Introthread.</em>',
      'Three steps, no forms. Designed so a busy professional can do it between two conversations.',
      `<a href="/signup" class="x-btn lg">Get your free card ${sv('arrow', 17)}</a><a href="/login" class="x-btn ghost lg">Try the live demo</a>`,
      `<div class="x-ph-glow"></div>${phone(threadScreen(), 1)}`
    ) +
    `<section class="x-sec alt"><div class="x-wrap">${secHead('The flow', 'Four moments.<br><em>One shared record.</em>', 'Every step is consented, private by default and over in seconds.')}<div class="x-flow">${[
      [
        'nfc',
        'Tap or scan',
        'Share your card by NFC, QR, link, email or WhatsApp. The other person sees your profile instantly in their browser and taps Start a Thread. No download, no sign-up wall.'
      ],
      [
        'check',
        'A shared Thread opens',
        'Time, place and event are captured automatically. Add one line of context by voice or text. The other person confirms with one tap, and the relationship becomes verified.'
      ],
      [
        'spark',
        'One question: What&rsquo;s next?',
        'Each person privately picks Meet again, Introduce someone, Stay in touch or Not now. When both answer, the match is revealed and Introthread drafts the follow-up.'
      ],
      [
        'bell',
        'Every Thread resolves',
        'Each Thread has a 7-day pulse. We nudge at 48 hours and again before it fades. A Thread ends resolved, or closed gently. Nothing is left hanging.'
      ]
    ]
      .map(
        ([ic, t, s], i) =>
          `<div class="x-flow-i"><span class="x-flow-n">0${i + 1}</span><span class="x-f3-ic">${sv(ic, 21)}</span><h3>${t}</h3><p>${s}</p></div>`
      )
      .join('')}</div></div></section>
<section class="x-sec"><div class="x-wrap x-faqw"><div><div class="x-eye">Questions</div><h2 class="x-h2">Good to<br><em>know.</em></h2><p class="x-sub" style="margin-top:16px">Anything else? Write to <a href="mailto:hello@introthread.com" style="color:var(--xb);font-weight:700">hello@introthread.com</a></p></div><div class="x-faq">${[
      [
        'Does the other person need the app?',
        'No. They see your profile in any browser and can start or confirm a Thread with their email. They can claim a free account later if they want their own card.'
      ],
      [
        'Who can see my answer to What&rsquo;s next?',
        'Nobody, until both of you have answered. If one person chooses Not now, the other sees Stay in touch. That&rsquo;s the quiet reveal.'
      ],
      [
        'Is this a CRM?',
        'No. There are no pipelines or fields to maintain. Teams can sync resolved Threads to their CRM, but individuals only ever answer one question.'
      ],
      [
        'What does verified mean?',
        'Both people confirmed the Thread. Verified Threads are consented, first-party evidence that a relationship exists.'
      ],
      [
        'What happens to my contacts if I stop paying?',
        'Nothing is lost. Pro stays active until the end of the period you paid for, then your account moves to the Free plan. Every Thread, note, tag, Room and your card stay exactly as they are, and Free includes unlimited Threads, so you can keep adding people. Only Pro tools such as AI follow-up drafts and NFC writing are paused.'
      ],
      [
        'Can I export my contacts?',
        'Yes, on every plan, at any time. Download all your contacts as a vCard file that imports into Gmail, Outlook or your phone, or as a CSV spreadsheet for Excel and Google Sheets. You can also download everything we hold about you as a single file.'
      ],
      [
        'How is Introthread different from my Gmail or company email?',
        'Email stores messages. Introthread stores relationships: where and when you met, what you talked about, whether both of you confirmed the connection, and what happens next. It works even when you never exchanged an email, and it reminds you to follow up. It also belongs to you, while company email and its contacts stay with your employer when you change jobs.'
      ],
      [
        'What are the main advantages?',
        'No app needed to connect, contacts confirmed by both people, context you never lose, a clear next step with reminders before a connection goes cold, private by default, and Rooms that show which event connections actually led somewhere.'
      ],
      [
        'Why choose Introthread over a business card app, a CRM or LinkedIn?',
        'Card apps pass on your details and stop there. CRMs are built for sales pipelines, need manual typing and are owned by the company. LinkedIn gives you a connection without context or a next step. Introthread is built around the moment two people meet and agree what happens next, and then helps make sure it happens.'
      ],
      [
        'Can I delete my account and data?',
        'Yes. Settings, Privacy and visibility, Your data. Export first if you want a copy, then delete permanently. Nothing is kept after deletion.'
      ]
    ]
      .map(
        ([q, a], i) =>
          `<details ${i ? '' : 'open'}><summary>${q}<span>${sv('chevd', 18)}</span></summary><p>${a}</p></details>`
      )
      .join('')}</div></div></section>` +
    ctaBand() +
    foot()
  );
}

/* v79: full sample Resolution Report on /rooms (sample data, clearly labelled). */
function sampleReport() {
  const kpi = [
    ['600', 'Attendees'],
    ['412', 'Verified Threads'],
    ['68%', 'Answered What&rsquo;s next?'],
    ['74%', 'Followed through']
  ];
  const funnel = [
    ['Joined the Room', 512, 600],
    ['Verified Threads', 412, 600],
    ['Answered What&rsquo;s next?', 280, 600],
    ['Followed through', 207, 600]
  ];
  const answers = [
    ['Meet again', 46],
    ['Introduce someone', 22],
    ['Keep in touch', 24],
    ['Not now', 8]
  ];
  const outcomes = [
    ['131', 'Meetings booked'],
    ['57', 'Introductions made'],
    ['19', 'Kept in touch']
  ];
  const when = [
    ['Same day', 62],
    ['Days 2 to 7', 88],
    ['Week 2', 34],
    ['Weeks 3 and 4', 23]
  ];
  const topics = [
    ['Fintech', 31],
    ['Climate', 18],
    ['AI tools', 17],
    ['Hiring', 12]
  ];
  const max = Math.max(...when.map(w => w[1]));
  const bar = (l, v, of, txt) =>
    `<div class="xsr-bar"><div class="xsr-bar-l"><span>${l}</span><b>${txt}</b></div><i><s style="width:${Math.round((v / of) * 100)}%"></s></i></div>`;
  return `<section class="x-sec" id="sample-report"><div class="x-wrap">${secHead('Sample report', 'What organisers get<br><em>after the event.</em>', 'Every Room ends with a Resolution Report: live during the event and updated for 30 days. Aggregate numbers only, never private notes.')}
<div class="xsr"><div class="xsr-top"><div><small class="xsr-eye">Resolution report &middot; Sample data</small><b class="xsr-t">London Tech Week Founders Night</b><small class="xsr-m">One evening &middot; 600 attendees &middot; report covers 30 days after the event</small></div><span class="xsr-pill">Sample</span></div>
<div class="xsr-kpi">${kpi.map(([n, l]) => `<div><b>${n}</b><small>${l}</small></div>`).join('')}</div>
<div class="xsr-grid">
<div class="xsr-card"><h3>From the room to a real next step</h3>${funnel.map(([l, v, of]) => bar(l, v, of, v.toLocaleString('en-GB'))).join('')}<p class="xsr-note">74% of the people who answered What&rsquo;s next? followed through.</p></div>
<div class="xsr-card"><h3>What people wanted next</h3>${answers.map(([l, v]) => bar(l, v, 100, v + '%')).join('')}<p class="xsr-note">Answers stay sealed until both people reply. Organisers only see totals.</p></div>
<div class="xsr-card"><h3>Outcomes</h3><div class="xsr-out">${outcomes.map(([n, l]) => `<div><b>${n}</b><small>${l}</small></div>`).join('')}</div><p class="xsr-note">Recorded when a Thread is resolved by both people.</p></div>
<div class="xsr-card"><h3>When follow-ups happened</h3>${when.map(([l, v]) => bar(l, v, max, String(v))).join('')}<p class="xsr-note">Most follow-ups happen in the first week, which is why Introthread sends reminders.</p></div>
<div class="xsr-card"><h3>Top topics</h3>${topics.map(([l, v]) => bar(l, v, 100, v + '% of Threads')).join('')}</div>
<div class="xsr-card xsr-sp"><h3>For sponsors</h3><ul><li>Verified connections made at your event, not badge scans</li><li>Meetings and introductions that followed</li><li>CSV and PDF export, aggregate only</li></ul><a href="/signup" class="x-btn">Create a Room ${sv('arrow', 16)}</a></div>
</div></div></div></section>`;
}

function vRoomsPage() {
  const st = [
    ['412', 'Verified Threads'],
    ['68%', 'Answered What&rsquo;s next?'],
    ['131', 'Meetings booked'],
    ['57', 'Introductions made']
  ];
  return (
    mnav('rooms') +
    pHero(
      'Thread Rooms for events &amp; communities',
      'Prove which connections <em>went somewhere.</em>',
      'Badge scans count footfall. Thread Rooms measure outcomes: verified connections, follow-ups, introductions and meetings, live during the event and for 30 days after.',
      `<a href="/signup" class="x-btn lg">Create a Room ${sv('arrow', 17)}</a><a href="#sample-report" class="x-btn ghost lg" data-on-click="scrollToId(event,'sample-report')">See a sample report</a>`,
      `<div class="x-ph-glow"></div><div class="x-rep" id="report"><div class="x-rep-h"><span>Resolution report</span><em><i></i>Live</em></div><b class="x-rep-t">London Tech Week Founders Night</b><small class="x-rep-s">Sample report</small><div class="x-rep-g">${st.map(([n, l]) => `<div><b>${n}</b><small>${l}</small></div>`).join('')}</div><div class="x-rep-bar"><span>Resolution rate</span><b>74%</b><i><s style="width:74%"></s></i></div></div>`
    ) +
    sampleReport() +
    `<section class="x-sec alt"><div class="x-wrap">${secHead('For organisers', 'Outcomes your sponsors<br><em>can see.</em>', 'One code for the whole room. Live numbers while it happens, a clean report when it ends.')}${feat3(
      [
        [
          'qr',
          'Room code and QR',
          'Put one code on screens, badges and tables. Every tap inside the room is tagged to your event.'
        ],
        [
          'chart',
          'Live Resolution Report',
          'See verified Threads, answers and outcomes as they happen. Share the report with sponsors.'
        ],
        [
          'shield',
          'Consent by default',
          'Attendees choose what to share. Organisers see aggregate outcomes, never private notes.'
        ]
      ]
    )}</div></section>` +
    ctaBand(
      'Run your next event on Threads.',
      'Rooms start at $199 per event, up to 1,000 attendees.',
      `<a href="/signup" class="x-btn lg">Create a Room ${sv('arrow', 17)}</a>`,
      `<a href="/pricing" class="x-btn dk2 lg">See pricing</a>`
    ) +
    foot()
  );
}

function vNetworks() {
  const rows = [
    ['DO', 'Daniel Okafor', 'Met twice, intro made, resolved', 92],
    ['JC', 'James Carter', 'Met at SaaStr, both chose Meet again', 74],
    ['EL', 'Emma Laurent', 'Thread confirmed, no follow-up', 38]
  ];
  return (
    mnav('networks') +
    pHero(
      'For teams and networks',
      'Warm intros that are <em>actually warm.</em>',
      'VC platform teams, accelerators and professional communities make introductions every day based on guesses. Warmth shows consented, verified relationship strength between members, built from real Threads.',
      `<a href="/about" class="x-btn lg">Talk to us ${sv('arrow', 17)}</a><a href="/how" class="x-btn ghost lg">How Threads work</a>`,
      `<div class="x-ph-glow"></div><div class="x-warm"><small>Sample &middot; Warmth</small><b>Who genuinely knows Priya Shah?</b>${rows.map(([i, n, s, v]) => `<div class="x-warm-r"><span class="x-av" style="width:40px;height:40px;font-size:13px">${i}</span><div><b>${n}</b><small>${s}</small><i><s style="width:${v}%"></s></i></div><em>${v}</em></div>`).join('')}<p>${sv('lock', 13)} Shown only where both members opted in to network visibility.</p></div>`
    ) +
    `<section class="x-sec alt"><div class="x-wrap">${secHead('Why Warmth', 'Relationship data you<br><em>can trust.</em>', 'Every signal comes from a Thread two people confirmed. Nothing scraped, nothing guessed.')}${feat3(
      [
        [
          'check',
          'Verified, not inferred',
          'Every edge is a Thread both people confirmed. No scraping, no guessing.'
        ],
        [
          'shield',
          'Built for consent',
          'Members control network visibility per Thread. Private notes never leave the member.'
        ],
        [
          'link',
          'API and integrations',
          'Feed Warmth into your intro workflows, job boards and CRM via the Warmth API.'
        ]
      ]
    )}</div></section>` +
    ctaBand(
      'Bring Warmth to your network.',
      'Custom annual plans with SSO, admin controls and a dedicated success manager.',
      `<a href="/about" class="x-btn lg">Talk to us ${sv('arrow', 17)}</a>`,
      `<a href="/pricing" class="x-btn dk2 lg">See pricing</a>`
    ) +
    foot()
  );
}

function vPricing() {
  const p = (m, y) => (billing === 'm' ? m : y);
  const plans = [
    [
      'Free',
      '$0',
      'forever',
      PLANS.free.tag || 'Basic access for new users.',
      [
        'Your card, link and QR',
        thrTxt(freeLim()),
        'What&rsquo;s next? and the quiet reveal',
        'Save to contacts',
        'Export your contacts anytime'
      ],
      'Get started',
      '/signup',
      ''
    ],
    [
      'Pro',
      p(usd0(proM()), usd0(proY() / 12)),
      'per month' + (billing === 'y' ? ', billed yearly' : ''),
      PLANS.pro.tag || 'For professionals and teams.',
      [
        'Everything in Free',
        thrTxt(PLANS.pro.threads),
        'AI follow-ups in your voice',
        'Calendar booking from a match',
        'NFC card support',
        'Thread search'
      ],
      'Start Pro',
      '/signup',
      'hot'
    ],
    [
      'Rooms',
      '$199',
      'per event',
      'For events and communities',
      [
        'Free for up to 20 people, one event a month',
        'Room code, QR and badges',
        'Live Resolution Report',
        'Up to 1,000 attendees',
        'Sponsor-ready export'
      ],
      'Create a Room',
      '/signup',
      ''
    ],
    [
      'Networks',
      'Custom',
      'annual',
      'For VC platforms and networks',
      ['Warmth dashboard', 'Warmth API', 'SSO and admin controls', 'Dedicated success manager'],
      'Talk to us',
      '/about',
      ''
    ]
  ];
  return (
    mnav('pricing') +
    `<section class="x-ph c"><div class="x-wrap"><div class="x-eye">Pricing</div><h1 class="x-h1 x-ph-h">Start free. <em>Pay when it pays off.</em></h1><p class="x-lead" style="margin:0 auto">We never charge per tap or per scan. Sharing should be free.</p></div></section>
 <section class="x-sec" style="padding-top:0"><div class="x-wrap"><div class="x-plans">${plans.map(([n, a, per, who, f, c, href, hot]) => `<div class="x-plan ${hot}">${hot ? '<span class="x-plan-tag">Most popular</span>' : ''}<b class="x-plan-n">${n}</b><small class="x-plan-w">${who}</small><div class="x-plan-a">${a}<small>${per}</small></div><a href="${href}" class="x-btn ${hot ? '' : 'ghost'} block">${c}</a><ul>${f.map(x => `<li>${sv('check', 16, 'currentColor', 2.4)}${x}</li>`).join('')}</ul></div>`).join('')}</div><p class="x-plan-note">UK prices shown in GBP: Pro &pound;9/month, Rooms &pound;149/event. Cards are charged the equivalent in Kenyan shillings. Prices exclude VAT and sales tax where applicable.</p></div></section><section class="x-sec alt" id="your-data"><div class="x-wrap"><div class="x-head2"><div><div class="x-eye">Your data is always yours</div><h2 class="x-h2">Stop paying, <em class="ink">keep everything.</em></h2></div><p class="x-sub">Your relationships belong to you, not to a subscription. Here is exactly what happens if you stop paying.</p></div><div class="x-own">${[
   [
     'shield',
     'Nothing is deleted',
     'If you stop paying, Pro runs to the end of your paid period, then you move to Free. Every Thread, note, tag and Room stays.'
   ],
   [
     'users',
     'Free keeps working',
     'The Free plan includes unlimited Threads, your card and the quiet reveal, so you can keep meeting people.'
   ],
   [
     'arrow',
     'Export anytime, free',
     'Download all contacts as a vCard for Gmail, Outlook or your phone, or as a CSV spreadsheet. On every plan.'
   ],
   [
     'lock',
     'Leave whenever you like',
     'Delete your account and data in Settings at any time. We never sell your data.'
   ]
 ]
   .map(
     ([ic, t, p]) =>
       `<div class="x-own-i"><span class="x-f3-ic">${sv(ic, 21)}</span><h3>${t}</h3><p>${p}</p></div>`
   )
   .join(
     ''
   )}</div></div></section><section class="x-sec"><div class="x-wrap x-faqw"><div><div class="x-eye">Pricing and data</div><h2 class="x-h2">Questions,<br><em>answered.</em></h2><p class="x-sub" style="margin-top:16px">Anything else? Write to <a href="mailto:hello@introthread.com" style="color:var(--xb);font-weight:700">hello@introthread.com</a></p></div><div class="x-faq">${[
   [
     'What happens to my contacts if I stop paying?',
     'Nothing is lost. Pro stays active until the end of the period you paid for, then your account moves to the Free plan. Every Thread, note, tag, Room and your card stay exactly as they are, and Free includes unlimited Threads, so you can keep adding people. Only Pro tools such as AI follow-up drafts and NFC writing are paused.'
   ],
   [
     'Can I export my contacts?',
     'Yes, on every plan, at any time. Download all your contacts as a vCard file that imports into Gmail, Outlook or your phone, or as a CSV spreadsheet for Excel and Google Sheets. You can also download everything we hold about you as a single file.'
   ],
   [
     'How is Introthread different from my Gmail or company email?',
     'Email stores messages. Introthread stores relationships: where and when you met, what you talked about, whether both of you confirmed the connection, and what happens next. It works even when you never exchanged an email, and it reminds you to follow up. It also belongs to you, while company email and its contacts stay with your employer when you change jobs.'
   ],
   [
     'What are the main advantages?',
     'No app needed to connect, contacts confirmed by both people, context you never lose, a clear next step with reminders before a connection goes cold, private by default, and Rooms that show which event connections actually led somewhere.'
   ],
   [
     'Why choose Introthread over a business card app, a CRM or LinkedIn?',
     'Card apps pass on your details and stop there. CRMs are built for sales pipelines, need manual typing and are owned by the company. LinkedIn gives you a connection without context or a next step. Introthread is built around the moment two people meet and agree what happens next, and then helps make sure it happens.'
   ],
   [
     'Can I delete my account and data?',
     'Yes. Settings, Privacy and visibility, Your data. Export first if you want a copy, then delete permanently. Nothing is kept after deletion.'
   ]
 ]
   .map(
     ([q, a], i) =>
       `<details ${i ? '' : 'open'}><summary>${q}<span>${sv('chevd', 18)}</span></summary><p>${a}</p></details>`
   )
   .join('')}</div></div></section>` +
    ctaBand() +
    foot()
  );
}

function vAbout() {
  return (
    mnav() +
    pHero(
      'About Introthread',
      'We started with a simple <em>observation.</em>',
      'The most valuable part of networking happens after the introduction, and that&rsquo;s exactly where it falls apart.',
      '',
      `<div class="x-ph-glow"></div><div class="x-quotecard"><span>&ldquo;</span><p>Card apps capture contacts. Graph tools guess relationships. Nobody records the moment two people actually meet and agree on what happens next.</p></div>`
    ) +
    `<section class="x-sec alt"><div class="x-wrap x-story"><div><div class="x-eye">Our story</div><h2 class="x-h2">Fixing relationship data<br><em>at the source.</em></h2></div><div><p>Introthread was built by people who spent years keeping network data accurate for one of the world&rsquo;s largest networks of networks. We saw where relationship data breaks: it is guessed from email traffic, scraped from profiles and never confirmed by the people involved.</p><p>So we started at the source, the moment two people meet. A Thread both people confirm, one honest question about what happens next, and a gentle nudge so it actually does.</p></div></div></section>
 <section class="x-sec"><div class="x-wrap x-contact"><div><div class="x-eye">Get in touch</div><h2 class="x-h2">Let&rsquo;s <em>talk.</em></h2><p class="x-sub" style="margin-top:16px">Partnerships, Rooms, Networks or investment. We reply within one business day.</p><a class="x-mailto" href="mailto:hello@introthread.com">${sv('mail', 18)} hello@introthread.com</a><p class="x-sub" style="margin-top:14px;font-size:14px">London &middot; New York</p></div>
 <form class="x-cform x-form" data-on-submit="contactSend(event)"><div class="x-g2"><label class="x-f"><span>Name</span><input id="cn" required autocomplete="name"></label><label class="x-f"><span>Work email</span><input id="ce" type="email" required autocomplete="email"></label></div><label class="x-f"><span>How can we help?</span><textarea id="cm" rows="5" required placeholder="Partnerships, Rooms, Networks, investment"></textarea></label><button class="x-btn lg">Send message ${sv('arrow', 17)}</button></form></div></section>` +
    foot()
  );
}

function vPrivacy() {
  return (
    mnav() +
    pHero(
      'Trust &amp; privacy',
      'Consent is <em>the product.</em>',
      'Introthread only works if both people trust it. So privacy is not a setting, it is how every Thread is built.',
      `<a href="/signup" class="x-btn lg">Get your free card ${sv('arrow', 17)}</a>`,
      `<div class="x-ph-glow"></div><div class="x-shield">${sv('shield', 64, '#fff', 1.4)}<b>Private by default</b><small>UK GDPR &middot; DPA 2018 &middot; US state privacy laws</small></div>`
    ) +
    `<section class="x-sec alt"><div class="x-wrap">${secHead('Our principles', 'Four promises,<br><em>built in.</em>', '')}<div class="x-f4">${[
      [
        'users',
        'Two-sided by design',
        'A Thread only becomes verified when both people confirm it. Either person can delete their side at any time.'
      ],
      [
        'lock',
        'Private answers',
        'Answers to What&rsquo;s next? stay hidden until both people reply. A Not now is never shown to the other person.'
      ],
      [
        'brief',
        'Your notes are yours',
        'Private context you add to a Thread is never visible to the other person, an organiser or a network.'
      ],
      [
        'hub',
        'Network visibility is opt-in',
        'Warmth only includes Threads where both members opted in. Organisers see aggregate outcomes only.'
      ]
    ]
      .map(
        ([ic, t, s]) =>
          `<div class="x-f3-i"><span class="x-f3-ic">${sv(ic, 21)}</span><h3>${t}</h3><p>${s}</p></div>`
      )
      .join('')}</div>
 <div class="x-reg"><span class="x-f3-ic" style="background:var(--xink)">${sv('shield', 21)}</span><div><b>Regulation</b><p>Designed for UK GDPR, the Data Protection Act 2018 and applicable US state privacy laws. Export and deletion are built in. Questions about your data: <a href="mailto:privacy@introthread.com">privacy@introthread.com</a></p></div></div></div></section><section class="x-sec" id="policy"><div class="x-wrap">${secHead('Privacy policy', 'The detail,<br><em>in plain English.</em>', 'Last updated 21 October 2026')}<div class="x-legal-w"><nav class="x-toc" aria-label="Policy sections">${POLICY.map(([id, t], i) => `<a href="#${id}" data-on-click="scrollToId(event,'${id}')">${i + 1}. ${t}</a>`).join('')}</nav><article class="x-legal-a">${POLICY.map(([id, t, b], i) => `<section id="${id}"><h2>${i + 1}. ${t}</h2>${b}</section>`).join('')}</article></div></div></section>` +
    foot()
  );
}

function vNotFound(h) {
  const ok = /^[a-z0-9]{2,20}$/.test(String(h || ''));
  return (
    mnav() +
    `<section class="x-ph c x-nf"><div class="x-wrap"><div class="x-eye">${ok ? 'Card not found' : 'Page not found'}</div><h1 class="x-h1 x-ph-h">${ok ? `This card is <em>still available.</em>` : `We couldn&rsquo;t find <em>that page.</em>`}</h1><p class="x-lead" style="margin:0 auto">${ok ? `Nobody has claimed introthread.com/${esc(h)} yet. It could be yours in 60 seconds.` : 'The link may be old or mistyped. Here are some places to start.'}</p><div class="x-cta-row" style="justify-content:center">${ok ? `<a href="/signup" class="x-btn lg">Claim this link ${sv('arrow', 17)}</a>` : `<a href="/" class="x-btn lg">Go to the home page ${sv('arrow', 17)}</a>`}<a href="/how" class="x-btn ghost lg">How it works</a></div></div></section>` +
    foot()
  );
}

function legalDoc(eye, title, updated, sections) {
  return (
    mnav() +
    `<section class="x-ph c" style="padding-bottom:36px"><div class="x-wrap"><div class="x-eye">${eye}</div><h1 class="x-h1 x-ph-h">${title}</h1><p class="x-lead" style="margin:0 auto">Last updated ${updated}</p></div></section><section class="x-sec" style="padding-top:20px"><div class="x-wrap x-legal-w"><nav class="x-toc" aria-label="On this page">${sections.map(([id, t], i) => `<a href="#${id}" data-on-click="scrollToId(event,'${id}')">${i + 1}. ${t}</a>`).join('')}</nav><article class="x-legal-a">${sections.map(([id, t, b], i) => `<section id="${id}"><h2>${i + 1}. ${t}</h2>${b}</section>`).join('')}</article></div></section>` +
    foot()
  );
}

function vTerms() {
  return legalDoc('Legal', 'Terms of <em>Service.</em>', '20 October 2026', TERMS);
}

/* v96: named handlers for this screen, moved unchanged from js/core.js (code cleanup). */
function scrollToId(e, id) {
  e.preventDefault();
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}
function setBilling(v) {
  billing = v;
  window._keepScroll = true;
  render();
}
function contactSend(e) {
  e.preventDefault();
  if (!$('#ce').value.includes('@')) return toast('Add a valid email');
  location.href =
    'mailto:hello@introthread.com?subject=' +
    encodeURIComponent('Introthread enquiry from ' + $('#cn').value) +
    '&body=' +
    encodeURIComponent($('#cm').value + '\n\n' + $('#cn').value + ' <' + $('#ce').value + '>');
  toast('Opening your email app to send this.');
}
