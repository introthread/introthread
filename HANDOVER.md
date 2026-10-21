# Introthread - handover for the next AI agent

Last updated: 21 Oct 2026 (capture v31). Read this before making changes.

## Where things are
- Live site: https://www.introthread.com (apex redirects to www). Vercel deploys automatically from `main` of `introthread/introthread` (preset "Other", static).
- Owner: Agnes. All services (GitHub, Vercel, Supabase, domain) are registered to agneswamaria@gmail.com.
- Supabase project: `zpcsmsqnesqftodnondn`. The public anon key is in `config.js` (safe to ship). Never commit service-role keys, passwords or other secrets.
- Schema: `supabase/schema.sql`. Email templates: `supabase/email-templates/`.

## Working rules (from Agnes)
- Commit directly to `main`. No branches, no pull requests.
- Fonts: only `sans-serif` and `ui-sans-serif` across site, app and emails. `ui-sans-serif` is applied only on Apple devices via `@supports (font:-apple-system-body)`; plain `sans-serif` elsewhere. Headings use font-weight 400. Do not load Google Fonts or any webfont.
- No emojis in UI copy or messages.
- Test on a phone-sized viewport (360-430px wide). Nothing may be wider than the screen.

## How the code is built
- Single-page app in `index.html` (all HTML, CSS and JS inline). Hash/path router; app routes live under `/app/...`, public cards at `/<handle>`, Thread guest pages at `/t/<token>`.
- `scripts/build_pages.py` copies `index.html` into 9 static pages with their own SEO head: `how, rooms, networks, pricing, about, privacy, terms, login, signup` (each `<page>/index.html`). After editing `index.html`, always run the build and commit `index.html` plus all 9 pages together.
- CSS additions go before the last `</style>`; JS additions go before the last `</script>`.
- Demo mode: `MODE="demo"` with demo user handle `sarah` and demo event "Kenya Investment Networking Meetup". Real mode uses Supabase (auth, profiles, cards, threads, rooms).

## Product core
Tap -> Thread -> one question, "What's next?". Answers stay sealed until both people reply (the "quiet reveal"). A "Not now" answer is shown to the other person as "Stay in touch".

## Done so far (main, newest last)
- Supabase wired into sign-up, login, cards, Threads and Rooms; activation-email links and sign-in redirect fixed.
- Mobile fit: nothing wider than the screen; top and bottom bars fixed (0eb7432b).
- Data ownership: CSV and vCard export free on every plan; Threads export menu (vCard, CSV, JSON); pricing "Your data is always yours" section and data FAQs (0b3af52b).
- Event mode at `/app/scan`: full-screen QR, wake lock, light/dark, event tagging via `?at=`, share, NFC, wallpaper download, add manually; PWA `manifest.webmanifest` and icons in `img/` (37e588cf, ebf9b892).
- Bottom bar and Tap page mobile polish (664df6de, e6003209); Today, Threads and Rooms mobile polish, scroll to top on route change (38ffdcf5).
- 8-digit email OTP (`OTP_LEN` from config, default 8, accepts 6-10, auto-submits) (59ec708e).
- Smart contact capture (0fe4fc05):
  - Parser: `parseContact` (LinkedIn links, vCard/MECARD, email signatures, phone/email text), `liFromUrl` (profile URL plus best-guess name only when the slug has 2-4 word parts), `normPhone`.
  - Tap form "Capture in seconds" strip: Paste link or text (`capPaste`), Scan QR code (`capScanQR`; BarcodeDetector, falls back to jsQR from CDN; "Use a photo instead"), Scan business card (`capCard`; Tesseract.js from CDN, then a "Check what we read" review), From contacts (`capContacts`; Contact Picker API, shown only where supported, mainly Android Chrome).
  - Tap form fields: name `#tn`, email `#te`, phone `#tph`, LinkedIn `#tln`, job title `#tr`, company `#tc` (`CAP_FIELDS`). Email OR phone is required.
  - Phone, LinkedIn and capture source are stored inside the thread `where_met` text as ` @@{json}` via `tPack()` and read back with `tMeta()` (avoids a schema change).
  - Thread page shows tap-to-call phone and LinkedIn link; edit has phone (`#tep`); vCard and CSV include phone and LinkedIn.
  - Public card guest form has phone and LinkedIn; sign-up step 2 has a quick-fill textarea (`#suq`, `suQuickFill`).
- LinkedIn follow-up prompt (this commit): when a capture fills the LinkedIn field but the form has no email and no phone, an amber prompt appears under the capture strip ("Ask for their email or phone now") with its own Email and Phone inputs (`#capae`, `#capap`) that write straight into `#te` / `#tph` (`capAsk`, `capAskSync`, `capAskClose`). It confirms "Added to the form. You can save the Thread." and has "Skip for now". It does not appear when the QR already carries an email or phone (e.g. a vCard).
- Capture v31 (business card reader, richer QR/contacts, new capture UI):
  - Capture strip redesigned (`capStrip`): a primary "Scan a business card" button plus three tiles (Scan QR, Paste link, Contacts). The old card button had no icon because `SV.photo` did not exist; added `SV.photo`, `SV.card`, `SV.paste`, `SV.chev`.
  - Business card flow: `capCard(side)` opens a sheet (Take a photo / Choose from gallery, tips, privacy note) and warms the reader. `capCardRun` prepares the photo on a canvas (`capPrepCanvas`: scale to 1800px, grayscale, contrast stretch, auto-invert dark cards by centre brightness), runs Tesseract.js v5 (CDN, cached worker `capWorker`, page-seg mode 11 = sparse text, which reads two-column cards best), retries at 90/270/180 degrees when confidence is low, and shows step progress. Then `capReview` shows the card photo and editable fields for every detail, with "Add the back" (merges a second photo), "Retake", and "Show the text we read". `capReviewUse` fills the form.
  - Card parser `parseCard` + `ocrFix`: fixes common OCR errors (split emails/websites across lines, "brightwave. co.uk", "linkedin.comyin/", "(at)", O/0 and l/1 in numbers, split P.O. Box numbers). Picks out name (scored, matched against email local part), job title, company (matched against email/website domain, company words, all caps), mobile and second phone (labels M/T/Tel/Mobile/Office/Fax; fax ignored; Kenyan and UK mobile patterns), emails, website, LinkedIn, social handle, address (P.O. Box, street words, cities, UK/US postcodes) and a short note from leftover lines (e.g. a tagline).
  - Tested on four generated card photos (Kenya, UK two-column, US, dark card) with real Tesseract OCR: every field came out right.
  - `parseContact` now also handles full vCard 2.1/3/4 (multiple TEL/EMAIL, CELL preferred, ADR, quoted-printable, NOTE, social URLs), MECARD with multiple numbers, BIZCARD, `tel:`, `sms:`, `mailto:`, `MATMSG`, and WhatsApp `wa.me` links. Signatures also pick up second phone, address and social.
  - Contacts: `capContacts` asks for name, email, tel and address (whatever the phone supports) and fills second phone/email. Where the picker is not available (iPhone Safari by default) the Contacts tile opens `capContactsHelp`: share the contact as a .vcf file and choose it (`capVcfFile`), or paste.
  - Tap form gained a "More details" section (`#capmore`): Second phone `#tp2`, Second email `#te2`, Website `#tws`, Social `#tso`, Address `#tad`. Card notes go into "One line to remember" `#tx`. These are stored in `where_met` via `tPack` (keys phone2, email2, website, address, social), shown on the Thread page (tap to call, mailto, website, Google Maps link), editable (second phone, website, address), and included in vCard and CSV exports.

## Honest limits to keep in mind
- LinkedIn does not let apps read another person's profile from a username. A LinkedIn link gives the profile URL and a best-guess name only; email, phone, title and company must come from paste, QR vCard, business card or contacts.
- Business card reading needs internet the first time (downloads the text reader, about 10 to 20 seconds on mobile data); the photo itself stays on the device. Handwritten or very stylised cards may misread, which is why the review step exists.
- iPhone Safari hides the contact picker unless the Contact Picker API feature flag is turned on.

## Open items / next steps
1. Agnes to paste the Supabase email templates (Magic Link and Confirm signup, code-based, keep code length 8) and configure Resend SMTP; then run a real end-to-end sign-up test with a real inbox.
2. Real Google and Microsoft sign-in (Google sign-in is being tested with mkautospareske@gmail.com).
3. Pro billing (currently simulated) and real outbound email sending.
4. Agnes's on-phone test of capture v31: business card (front and back), QR, paste, contacts / .vcf. Fix anything she reports. Real phone-size screenshots of v31 were not taken (needs approval to run the browser preview).
5. Possible future: move phone/LinkedIn out of `where_met` into proper columns once schema changes are available (the assistant has row access only, no DDL).

## Testing approach used
- jsdom scripts that load `index.html`, log in to demo mode and exercise flows; a pass ends with an empty error list. Covered: Tap form, sign-up, guest reveal, capture, the LinkedIn follow-up prompt, exports, billing, rooms, Today, thread detail.
- Playwright phone-viewport screenshots (390x844) for layout checks.
