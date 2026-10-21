# Introthread - handover for the next AI agent

Last updated: 21 Oct 2026 (admin redesign v37, screen 4 of 9). Read this before making changes.

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
- Agnes's decisions (21 Oct 2026): prices in US dollars, pounds shown to UK visitors; Free plan = 5 new Threads a month; admin Owner = mosemqute@gmail.com; build order: contacts + file import (done), then admin area, then Stripe, then Google/Microsoft connect, then LinkedIn sign-in/share. No LinkedIn company page yet (needed before a LinkedIn developer app). Full plan: Town doc "Introthread: connections, LinkedIn, admin and revenue plan".
- Contacts and file import v32:
  - New page `/app/contacts` (`vContacts`, routed through the `vToday` fallback). Threads and Contacts pages share a segmented switch (`ctBar`).
  - Contact = private, unconfirmed person; Thread = confirmed by both. Imports never send anything.
  - Import (`ctImport` > `ctFile` > `ctPreview` > `ctDoImport`): auto-detects LinkedIn Connections.csv (skips the "Notes:" preamble), Google Contacts CSV (old and new formats, ":::" multi-values), Outlook CSV (ignores the Mr/Mrs "Title" column), any CSV with name/email columns (comma, semicolon or tab), and multi-contact .vcf. Preview with checkboxes, select all, and duplicates (matched on email, last 9 phone digits, LinkedIn URL against Contacts and Threads) marked "Already saved" and left out.
  - Contact row: Invite (prefills the Tap form via `capApply`), and a menu: email, call, LinkedIn, delete. Search and source filter chips. Step-by-step export guides for LinkedIn, Google, Outlook, iPhone/Android.
  - Storage: Supabase table `contacts` (see migration). If the table is missing, contacts are kept on the device (`_local`) with a notice, and upload automatically once the table exists (`ctLoad`).
  - Free limit: real (cloud) accounts not on Pro get 5 new Threads per calendar month (`FREE_LIMIT`, `threadsThisMonth`, `freeLeft`). The Tap page shows "N of 5 free Threads left". At the limit, a sheet offers "See Pro" or "Save as a contact". Demo mode is not limited.
  - Pricing: Free now says "5 new Threads a month", Pro adds "Unlimited Threads", FAQ copy updated. UK visitors (timezone Europe/London or en-GB language) see pounds (`isUK`, `toGBP`; $10->8, $12->10, $96->77, $120->96, $166->129, $199->159, others x0.8).
- Database migration `supabase/migrations/002_contacts_admin.sql` (NOT YET RUN; Agnes must paste it into Supabase SQL Editor and run): contacts, staff + `is_staff()` function, audit_log, reports, account_status, plans (free 5 Threads, pro), subscriptions, app_settings (free_threads_per_month=5, maintenance, feature switches), privacy_requests. All with row level security. Seeds mosemqute@gmail.com as owner (only works once that email has signed up; re-run the insert after sign-up).
- Migration 002 verified live in Supabase on 21 Oct 2026: all tables exist, plans (free 5 Threads, pro) and app_settings seeded, mosemqute@gmail.com is owner in `staff`.
- Admin area v33 at `/admin` (and `/admin/<tab>`), routed by a `render` wrapper:
  - Gate: signed-in check, `admin_me()` staff check, then two-step verification (Supabase TOTP: enroll with QR, then `challengeAndVerify` to reach aal2). Required while app_settings `admin_require_mfa` is true (default). If an owner is ever locked out, run in SQL editor: `update app_settings set value='false' where key='admin_require_mfa';`
  - Tabs (shown by role): Dashboard (people, active 7/30 days, Threads, confirm rate, both-answered rate, paying, estimated monthly revenue, contacts, 30-day bar charts, cities, plan split, alerts for open reports and privacy deadlines), Users (search, paging, CSV export, detail with change plan, suspend, ban, reactivate, export data JSON, delete account with typed DELETE), Moderation (open/actioned/dismissed/all), Rooms (delete), Revenue (MRR, run rate, conversion, subscriptions, price list; Stripe not connected yet), Plans and pricing (edit USD/GBP prices and Thread limits), Settings (announcement banner, maintenance mode, feature switches, require 2-step), Privacy requests (30-day clock, overdue flag, start/export/delete/done/reject), Staff (owner adds by email, changes or removes roles), Audit log (filter, CSV export).
  - Every action asks for a reason and runs through a SECURITY DEFINER function in migration 003 that checks the role (`assert_staff`) and writes the audit log. The browser never holds admin keys. Roles: owner, admin, support, moderator, finance.
  - Note: `SB` is a global const (not `window.SB`). Tests mock it by replacing `const SB=(window.supabase` with `const SB=window.__SB?window.__SB:(window.supabase` (see `tadm.js`).
- User side v33: "Report this profile" on public cards and "Report a problem with this Thread" (writes `reports`); suspended or banned accounts see a paused/closed screen (reads `account_status`); maintenance mode screen for non-staff; announcement banner (dismissible per message); Settings has "Your data and privacy" with Request a copy / Delete my account (writes `privacy_requests`); Free limit now reads `free_threads_per_month` from app_settings; `isPro` is case-insensitive (profiles store "Pro").
- Admin redesign v34 (screen 1 of 9: Dashboard). Agnes is redesigning the 9 admin screens one at a time against her mockups (navy sidebar, electric blue, restrained orange). Rules she set: keep all functionality/permissions, real data only (no fake trends), show an em dash when a metric cannot be calculated (distinct from 0), date range must work across the whole dashboard, loading/error/empty states everywhere, consistent across all 9 screens.
  - New shell (`vAdmin` override, classes `adm2-*`): navy sidebar with icons, collapsible icon rail on desktop (saved in localStorage `it_adm_col`), slide-in drawer with scrim below 1024px (Esc closes), skip link, sign-out button (`admSignOut`), back-to-app button, orange badges for open reports/privacy.
  - Dashboard (`admDash2`, `admDashLoad`): range select 7/30/90 days (saved `it_adm_range`), Refresh with spinner and "Updated" time; 8 KPI cards (People, Active, Threads, Confirmed %, Both answered %, Paying, Monthly revenue, Contacts) with real previous-period comparisons, linked cards go to Users/Revenue; Operations panel (urgent/review/info: open reports and age, privacy deadlines, two-step off, staff without two-step, maintenance, billing not connected, suspended accounts) with action buttons; New people / New Threads charts with y-axis, date labels, hover and arrow-key tooltips, empty states; funnel (Threads > confirmed > answered > both answered); locations and plan mix with bars; skeleton loading and error card.
  - Data comes from `admin_stats_range(days)` in `supabase/migrations/004_dashboard_ranges.sql`. If 004 is not run yet, the page falls back to `admin_stats` (30 days only, other ranges disabled, note shown).
  - Next: Screen 2 Users (Agnes's brief: search + filters by plan/status, overview counts total/active/suspended/pending, side detail panel with account info, activity, Threads, notes, usage; actions change plan, send login link, reset password, suspend, delete with permissions and confirmation; permission-controlled exports, protect sensitive data). Login link and password reset need a server-side function (Supabase Edge Function with the service key, or the user-facing reset email flow) because the browser cannot call admin auth APIs.
- Admin redesign v35 (screen 2 of 9: Users), `auLoad`/`auPage`/`auPanel`:
  - Overview cards (clickable status filters): Total (+joined this month), Active (signed in within 30 days), Suspended or banned, Pending (email not confirmed or profile not finished).
  - Toolbar: debounced search (name, handle, email, company), plan and status filters, sort (newest, oldest, recently signed in, name, most Threads), removable filter chips, Clear all. Sortable column headers with aria-sort.
  - Table with select boxes (select all on page, bulk bar with Export selected), row "..." menu (keyboard: arrows, Esc), pagination with 10/25/50 per page (saved `it_adm_per`). Phones get a stacked card layout.
  - Details panel (sticky right column on wide screens, slide-over drawer below 1280px, Esc closes): Overview (account details, change plan, usage, actions), Activity timeline (sign-up, sign-ins, Threads, confirmations, answers, staff actions), Threads (other person shown as first name + initial only; private notes never shown), Notes (private staff notes, add/delete).
  - Actions, all with reason and audit log: change plan, send login link (`SB.auth.signInWithOtp` with shouldCreateUser false), reset password (`SB.auth.resetPasswordForEmail`; the app already handles the recovery link), suspend/reactivate, delete (typed DELETE), invite user (`signInWithOtp` with shouldCreateUser true). No service key needed: Supabase sends these emails from the public client. Email actions are recorded through `admin_log`.
  - Data protection: exports only for owner/admin, recorded with count and filters; emails masked server-side (`admin_mask_email`) for moderator and finance roles; full email fetched only for email actions (`admin_user_email`, owner/admin/support).
  - Needs `supabase/migrations/005_users_screen.sql` (admin_users2, admin_user_more, admin_notes table, admin_add_note, admin_delete_note, admin_log, admin_user_email). Without it the page falls back to the old list (no counts/filters/notes) with a note.
  - Next: Screen 3 Moderation.
- Admin redesign v36 (screen 3 of 9: Moderation), `mdLoad`/`mdPage`/`mdPanel`, state `ADMM`:
  - Cards (click to filter): Open reports (shows how many are over 24 hours old), Actioned, Dismissed, All reports in the chosen range.
  - Toolbar: search (user, reason, details), Status (Open, In review, Actioned, Dismissed, All), Type (Profile, Thread, Room), Severity (High, Medium, Low), Date (7/30/90 days, all time; saved `it_mod_days`).
  - Left: report list with severity and status pills, "Over 24h" marker, count of reports on the same item, sort (newest, oldest, most serious), Show more. Empty state with Refresh.
  - Right: "Select a report" intro (What you'll see + safety box) until a report is picked; then Reported content, Reported user, Reporter details, Recommended action (rules by reason, report history, reporter reliability), Context and evidence (details + other reports on the same item), Moderation history (audit log). Drawer below 1180px; Esc closes.
  - Actions (owner/admin/moderator; support is read-only): Take for review (assigns to you), Dismiss, Take action with Record only / Suspend / Ban (owner, admin) / Delete Room (owner, admin), plus "also close other open reports about the same item". Staff accounts cannot be suspended from here. Reason required; all audited.
  - Moderation guidelines open in a modal (header button and the panel's safety box).
  - Severity: Harassment or hate and Fake/impersonating = High; Spam and Inappropriate = Medium; others Low; 2+ reports on the same item raise it to Medium, 3+ to High.
  - Needs `supabase/migrations/006_moderation.sql` (reports.assigned_to, reports.outcome, report_subject, report_severity, admin_reports2, admin_report_detail, admin_report_take, admin_moderate). Without it the page works from the newest 300 reports with the old functions, and shows a note.
  - Next: Screen 4 Rooms.
- Admin redesign v37 (screen 4 of 9: Rooms), `rmLoad`/`rmPage`/`rmPanel`, state `RMX` (note: `ADMR` is the dashboard range variable, do not reuse it):
  - Cards: Total rooms, Total attendees (distinct people who made Threads in Rooms, with connections made), Active rooms (happening today, or ongoing communities; click to filter, shows upcoming count), Unique room links (links used by at least one person).
  - Toolbar: search (name, description, place, code, organiser), Status (Happening now, Upcoming, Past), Type (Conferences and events, Communities, Team meetings), Date (any, next 30 days, this month, past 30/90 days), Clear filters. Sort: newest, oldest, next event, latest event date, most Threads, name.
  - Empty state with Create room and the Share a link / QR code / Manage attendees strip; "Select a room" intro with the 4 uses and a Learn more modal (how Rooms work).
  - Details panel: status, type, access, open reports; join link introthread.com/r/CODE with Copy link, QR code (modal + Download PNG drawn on canvas) and Open join page. Tabs: Overview (results: Threads, attendees, confirmed, both answered, meetings agreed, introductions; Room details; organiser; reports), Attendees, Activity (other person first name + initial only), History (audit log).
  - Actions: Create room and Edit room (owner/admin/moderator/support; name, type, date, format, start/end, place or platform and link, access, limit, description, organiser by email or handle), Export results CSV, Delete room (owner/admin/moderator, typed DELETE). Reason required; audited. Type is stored as `kind` in the Room's existing meta JSON (after "\n@@" in rooms.location), so the app is unaffected.
  - Needs `supabase/migrations/007_rooms_screen.sql` (room_meta, room_place, room_status, admin_rooms2, admin_room_detail, admin_room_save, admin_room_log). Without it the page works from the newest 500 Rooms with the old function; staff can still create Rooms they own and delete Rooms, but not edit, see attendees or export.
  - Next: Screen 5 Revenue.

## Honest limits to keep in mind
- LinkedIn does not let apps read another person's profile from a username. A LinkedIn link gives the profile URL and a best-guess name only; email, phone, title and company must come from paste, QR vCard, business card or contacts.
- Business card reading needs internet the first time (downloads the text reader, about 10 to 20 seconds on mobile data); the photo itself stays on the device. Handwritten or very stylised cards may misread, which is why the review step exists.
- iPhone Safari hides the contact picker unless the Contact Picker API feature flag is turned on.

## Open items / next steps
0. 002 and 003 are run. Agnes to run `supabase/migrations/004_dashboard_ranges.sql` and `005_users_screen.sql`. Admin redesign continues with screen 3 (Moderation). Then sign in as mosemqute@gmail.com, open /admin, set up two-step verification. Next phase: Stripe billing (checkout, customer portal, webhook writing `subscriptions`).
1. Agnes to paste the Supabase email templates (Magic Link and Confirm signup, code-based, keep code length 8) and configure Resend SMTP; then run a real end-to-end sign-up test with a real inbox.
2. Real Google and Microsoft sign-in (Google sign-in is being tested with mkautospareske@gmail.com).
3. Pro billing (currently simulated) and real outbound email sending.
4. Agnes's on-phone test of capture v31: business card (front and back), QR, paste, contacts / .vcf. Fix anything she reports. Real phone-size screenshots of v31 were not taken (needs approval to run the browser preview).
5. Possible future: move phone/LinkedIn out of `where_met` into proper columns once schema changes are available (the assistant has row access only, no DDL).

## Testing approach used
- jsdom scripts that load `index.html`, log in to demo mode and exercise flows; a pass ends with an empty error list. Covered: Tap form, sign-up, guest reveal, capture, the LinkedIn follow-up prompt, exports, billing, rooms, Today, thread detail.
- Playwright phone-viewport screenshots (390x844) for layout checks.
