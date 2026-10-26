# Introthread - handover for the next AI agent

Last updated: 26 Oct 2026, 2:00 pm Nairobi (after v137: full site review fixes; v136: figures cross-checked site-wide; v135: UK Room price fixed; v134: pricing labels, price card, test card orders cancelled). Read the 26 Oct status summary below first, then the 24 Oct summary, ARCHITECTURE-ESSENTIALS.md, ARCHITECTURE.md and AGENTS.md. Update this file and docs/CHANGELOG.md with every change.

## STATUS SUMMARY: 26 Oct 2026, after v133.2 (read this first)

### Done 25-26 Oct (all on `main`, tested, deployed by Vercel unless noted)
- **v120 to v131:** light-logo tone fix, "You matched" email (v123), AI follow-up drafts through Gemini (v127 to v131), clean-up and handover updates.
- **Manuals** in `docs/manuals/` (docx and md): User Guide IT-DOC-UG-001, Administrator Guide IT-DOC-AG-001, Technical and Operations Manual IT-DOC-TM-001 (all now v1.2) and Quick Start Guide IT-DOC-QS-001. Built from Python sources outside the repo (doc_ug.py, doc_ag.py, doc_tm.py, doc_qs.py with docbuild.py); if those are gone, edit the .md and regenerate the .docx another way. Copies also sit in Agnes's Town library (projects/introthread).
- **v132: Room pass $59** (was $199): UK £45, KES 7,670 (59 x 130 unless `ROOM_PASS_KES`). "Why confirm / answer / join" lists added. Confirmed live on `/pricing` and `/rooms`. `img/brand/price-card.png` still shows $199 (not yet redrawn).
- **v133: NFC cards end to end.** Tap > "Tap with an NFC card" opens one panel (`js/nfc-card.js`): tap count, **Order a ready-programmed card, KES 199** (all plans), **Write my own card (Android, Pro)**, **On iPhone: write it with NFC Tools**. Wording: "Tap your Introthread card on their phone to open your card and start a Thread." Card links end in `?src=nfc`; the public card counts the tap (skips the owner and repeat visits in the same browser session) and opens at Start a Thread. Orders: `/api/pay-init` kind `nfc_card`; `pay-verify`, the webhook and `pay-sync` save them with `applyCardOrder` (one per Paystack reference) and email the buyer and `ORDER_EMAIL` (default hello@introthread.com). **Migration `022_nfc_cards.sql` has been run by Agnes (26 Oct).**
- **v133.1: Vercel Hobby allows only 12 serverless functions** (files directly in `api/`). v133 added a 13th and the deploy silently did not go out. `/api/card-tap` is now handled inside `api/status.js` (POST) via `api/_lib/card-tap.js` and a rewrite at the top of `vercel.json`. There are exactly 12 now: add new endpoints inside an existing function with a rewrite.
- **v133.2: a card order no longer switches Pro on.** `api/pay-sync.js` (runs when Billing opens) used to treat every non-Room payment as Pro. It now routes `nfc_card` to `applyCardOrder`, and `applyCharge` refuses any payment whose metadata has a `kind`.

- **v134 (26 Oct, 2 pm):**
  - `/pricing`: small "In development" label (`.x-dev`) next to Warmth dashboard, Warmth API and SSO and admin controls on the Networks plan (`X_DEV_SOON` in `vPricing`, `js/site-pages.js`). Remove a name from `X_DEV_SOON` when that feature ships.
  - `img/brand/price-card.png` redrawn with the $59 Room pass (figure rendered from the pricing page at 2x and placed where $199 was; rest of the image unchanged).
  - The two test card orders are now `cancelled` (Agnes chose option A). Payment rows and receipts IT-2026-0001 / IT-2026-0002 kept. Done by direct update, so there is no audit-log entry; the table has no note column.

- **v137 (26 Oct, 3 pm):** full site review. Login and signup now have one `<h1>` each (side heading is `h2.x-side-h`). `/networks` marks the Warmth API, dashboard, SSO and admin controls as in development. The `/rooms` closing line mentions the free event (20 people, once a month) before the $59 price. Sitemap dates updated. Sweep script result: 10 pages x 2 widths, no script errors, missing files, broken links or sideways scroll. Still open: yearly Pro £90 marked pending confirmation; `img/brand/price-card.png` must be redrawn by hand whenever a price changes.
- **v136 (26 Oct, 2:30 pm):** site-wide figure check. Fixed the in-app `/pricing` description (said unlimited Free Threads and Rooms from $166), the "stop paying" answer on `/how` and in Help (said Free has unlimited Threads) and PRD.md (UK Rooms £149). Everything else matches: Free 5 Threads a month; Pro $12 / £9 a month, $120 / £90 a year (live `plans` table agrees); Room pass $59 / £45 / KES 7,670; one free event a month up to 20 people; up to 1,000 attendees; NFC card KES 199. Still open: the yearly Pro £90 is marked "pending confirmation" in `js/contacts-import.js`.

### Live checks 26 Oct (test account one, handle `testaccountone`, Paystack TEST mode)
- NFC panel shows on the Free plan with the three options; wording correct.
- A direct POST to `/api/card-tap` for testaccountone returned `{"ok":true}`, the row is in `card_taps`, and the Tap screen shows "Your card has been tapped 1 time (1 in the last 30 days)." Agnes's earlier visit from another phone was not counted; most likely that phone was signed in as the same account (owner visits are skipped). Not yet re-tested from a signed-out phone.
- Two test card orders (Paystack "Success" simulation, no real card) saved correctly: `card_orders` references `ps_T126408002797062` and `ps_T286301451422157`, payments with no plan, receipts IT-2026-0001 and IT-2026-0002 in Billing. After v133.2 the account stays on Free.
- The first order hit the old Pro bug. With Agnes's approval the account was set back to Free (receipt kept) and the wrong `subscriptions` row was deleted.

### Waiting on Agnes (next agent: ask or act on her answer)
- ~~Two test card orders~~: done in v134, both `cancelled`. Ignore the two order emails at hello@.
- Signed-out phone re-test of the tap link (`introthread.com/testaccountone?src=nfc`), then check the count goes to 2.
- Source blank NFC cards (NTAG213/215/216, about KES 100 each), printing and delivery. There is no admin orders screen yet; orders arrive by email and status changes need `admin_card_order_set` (staff) or a direct database update.
- Paystack live keys (still TEST mode), company legal details, Resend sender verification for all emails, Google sign-in live test, signed-in HAR/console audit.
- ~~"In development" label for Networks features~~: done in v134. The features themselves are still not built (estimate 8 to 10 weeks).
- ~~Redraw the price card~~: done in v134.
- ~~UK Room price mismatch~~: fixed in v135. The pricing note is now built from `PLANS` and `GBP` (Rooms £45/event), and the price card footer is redrawn. To change a price later, update `PLANS` (js/billing.js or the plans table) and the `GBP` table in js/contacts-import.js; the page follows. The price card image must still be redrawn by hand.
- Phone-to-phone NFC tapping is not possible from a web app; always use a card or sticker.

### How the last agent worked (keep doing this)
- Snapshot commit, edit, `npx prettier --write` on changed js/css, build (version hashes on the 11 HTML pages: `index.html`, `app-shell.html`, and `about`, `how`, `login`, `networks`, `pricing`, `privacy`, `rooms`, `signup`, `terms` `/index.html`), before-and-after screenshots at 390 and 1366, admin tests in `tests/admin/` (including `tnfc.js`), every script in `tests/app`, sweeps with the CSP enforced and axe. Then CHANGELOG entry, this file, commit to `main`, and check live with test account one.
- Agnes wants plain, short replies with no emojis, each commit linked with the checks run, and a plan before any change to live data.

## STATUS SUMMARY: 24 Oct 2026, after v119 (kept for history; see 26 Oct above)

### Done on 23-24 Oct (all on `main`, tested, deployed by Vercel)
- **Code clean-up plan finished (v83 to v115).** The old `js/app-core.js` (about 6,300 lines) was split into screen and feature files, and its layered functions were merged:
  - v83 to v109: website pages, sign-up/login, Today, Threads, Tap and Card, Rooms, Settings and profile, website content, public card and guest pages (`public-pages.js`), Google Calendar, photo upload, account menu, Supabase data and actions (`supabase-data.js`, `supabase-actions.js`) and demo data (`demo-data.js`) each moved to their own file, unchanged.
  - v110 to v114: `render`, `newThread`, `vPublic` and `saveCard` each have one version now (plan step 10). `vPublic` runs named steps from other files (`pcNoNewThreads`, `pcEventAt`, `pcCaptureFields`, `pcReportLink`, `pcFlipCard`, `pcCompanyLogo`).
  - v115: `js/app-core.js` renamed to `js/core.js` (about 1,225 lines). It still loads first. Older notes that say `app-core.js` mean this file.
- **v116: real 404s for missing `/js/` and `/css/` files.** The `vercel.json` catch-all rewrite to `app-shell.html` now skips `/js/` and `/css/`. Confirmed live: `/js/app-core.js` returns 404 and `/js/core.js?v=f65c6e34a7` returns 200. The 404 still carries the 1-year cache header from the `/js/(.*)` header rule; Vercel header rules cannot depend on status, and it is harmless because new files always get a new `?v=` hash.
- **v117: company logos stay visible on every card style.** The logo sits on a small rounded backing (white for dark logos, dark for light logos) on the card, the card preview, the public profile and the My card logo preview. Tone is measured on upload and saved as `profiles.links.logoTone`. Confirmed live on Forest, both on `/app/card` and on the public profile.
- **v118 and v119: style pickers preview until Save changes.** On My card (sidebar and Card style tab) and on the public profile editor (`/app/profile`, Appearance), clicking a style only previews it. My card saves it with Save changes; the profile editor shows a bar with Cancel and Save changes. `CD.theme` / `PP.theme` are null unless a style is being previewed, so a style saved on one screen is never overwritten by the other. Confirmed live with test account one (the account is left on Forest).
- **Google Search Console verification file** `google0693ac56298b9d88.html` is in the site root. Never delete it: Google rechecks it to keep the site verified.
- **Live checks done (24 Oct):** on `/`, `/pricing`, `/login`, `/signup` and `/app` (signed out), `core.js` loads with 200, `app-core.js` is never requested, and there were no 404s or console errors.

### Appearance check (rerun on request)
Agnes can ask the assistant to "run the appearance check". Signed in as test account one on the live site: pick Cobalt on `/app/profile` Appearance without saving, reload and confirm Forest is still saved; save Cobalt, reload and confirm; check `/app/card` shows Cobalt; switch back to Forest and save. Last run 24 Oct, all four steps passed. It needs the hosted browser, so it cannot be a scheduled routine.

### Still open
- **Signed-in network and console audit of `/app`, `/app/tap`, `/app/threads`, `/app/rooms`, `/app/card`, `/app/profile` and `/app/settings`.** Not done. The hosted browser can sign in but cannot read network or console logs. Agnes tried to send a Chrome HAR and console log several times, but nothing arrived in the thread or in agneswamaria@gmail.com. A later try (24 Oct, 11:40 pm) also did not include them: the newest thread attachments were the Google verification file and a PDF of the Google Auth branding page, and none of the attached files is a .har or a text log. Next step: get the HAR/log as a thread attachment, or run the audit with the test account login in a test browser that records requests.
- **hello@introthread.com receives mail (26 Oct):** forwarded free by ImprovMX to agneswamaria@gmail.com (catch-all `*@introthread.com`). Live DNS (the zone on ns1-ns4.mysecurecloudhost.com, edited in the domain's DNS management in the client area): MX `@` mx1.improvmx.com (10) and mx2.improvmx.com (20), TXT `@` `v=spf1 include:spf.improvmx.com ~all`. Tested: an email from another address arrived (the first went to Spam and was marked Not spam). Replies from Gmail come from the Gmail address unless ImprovMX's paid sending is used. Do not edit DNS in the hosting (Enhance) panel: its zone is not live and points the site at 198.38.92.53 instead of Vercel.
- **Live checks 26 Oct:**
  - Password reset email: arrives from `Introthread <noreply@introthread.com>` (through Resend) and lands in the inbox, not spam.
  - LinkedIn sign-in: switched on in Supabase (`linkedin_oidc`). v124 added Continue with LinkedIn to login and signup.
  - Settings > Integrations Connect (as the mosesmunyi19@gmail.com account): Google and LinkedIn both show "Available", but Connect shows "<Provider> is not set up yet for Introthread." The cause was Supabase "Allow manual linking" being off. Agnes turned it on (26 Oct, 8:20 am) and the retest passed: Connect on Google opens accounts.google.com ("Sign in to continue to Introthread") and Connect on LinkedIn opens www.linkedin.com/uas/login. The test stopped at the provider sign-in page, so no account was linked.
- **Review 26 Oct (v125):** fixed LinkedIn tokens being saved as the Google Calendar token, name and photo autofill for LinkedIn sign-ups, and missed "You matched" emails when the other person answered after the owner's page loaded. Live smoke check: all public pages return 200, missing /js and /css files return 404, the security headers (CSP, HSTS, nosniff, frame and referrer policy) are present, and every API function is rate-limited and either requires sign-in or a secret.
- **Open after the review:**
  - `/api/status` reports `nudges: false`, so `CRON_SECRET` is missing in Vercel and the daily reminders and weekly summary do not run. Add it (any long random string) and redeploy.
  - `nudges` is now on (Agnes added `CRON_SECRET` on 26 Oct).
  - AI follow-up drafts: v127 adds free Google Gemini (`GEMINI_API_KEY` from aistudio.google.com, no card). Paid alternatives: `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`. On free Gemini the private Thread note is not sent, because Google may use free-tier prompts to improve its products.
  - Self-answer loophole narrowed in v126: a signed-in owner opening their own guest link cannot confirm or answer, and the server refuses the match email for them. Only an owner who signs out and uses the link elsewhere could still answer for the other person (inherent to link-based confirmation); one email per Thread and rate limits cap it.
- **Vercel Hobby allows at most 12 serverless functions** (files directly in `api/`, not `api/_lib/`). There are 12 now; add new endpoints inside an existing function with a rewrite, as `/api/card-tap` does.
- **NFC cards (v133, 26 Oct):** see CHANGELOG. **Agnes must run `supabase/migrations/022_nfc_cards.sql`** before tap counts and card orders work. Orders arrive by email at hello@introthread.com; program each card with the link in the email (NFC Tools: Write, Add a record, URL), print, and call the buyer to deliver. Card payments are in Paystack test mode until the live keys are added. Writing your own card on Android stays Pro; ordering a card is open to every member.
- **Room pass price cut to $59 per event (v132, 26 Oct, Agnes's decision):** was $199. UK display £45 (was £149). Charged KES 7,670 (59 × 130) unless `ROOM_PASS_KES` is set in Vercel. The published price card image (`img/brand/price-card.png`) still shows $199 and must be replaced.
- **Documentation (26 Oct):** `docs/manuals/` holds the User Guide, Administrator Guide and Technical and Operations Manual (Word and Markdown), covering release v131. Update them with any change to features, admin screens, configuration or pricing.
- **AI drafts (v127 to v131):** free Google Gemini (`GEMINI_API_KEY` set 26 Oct) with model fallback; drafts open with "Hi <first name>,", name the place met and write dates as "26 October". Tested live on Moses's account; the "AI draft test" Thread there is test data.
- **"You matched" email (v123):** `api/match-notify.js` emails both people once when their "What's next?" answers match. Needs `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` in Vercel; without them it returns 503 and nothing is sent. Test: `tests/admin/tmatch.js`.
- **Live email check 25 Oct:** the confirm-link email ("... started a Thread with you") reached agneswamaria@gmail.com in the inbox, not spam, from `Introthread <hello@introthread.com>` (the NOTIFY_FROM default). introthread.com has no MX record, so replies to hello@ bounce until mail receiving is set up.
- **Microsoft sign-in dropped (v122, Agnes's decision 24 Oct):** the Continue with Microsoft buttons on login and signup, the Microsoft row in Settings > Integrations and Connected accounts, and the Microsoft wording in the privacy policy are gone. Sign-in is Google, LinkedIn (when set up) and email. Skip section 5 (Microsoft Azure) of the setup guide; nothing needs to be set up in Azure or in Supabase's Azure provider.
- **Settings profile editor style picker:** removed in v121. `pfTheme` and its `.pf-sty` styles were never shown on any screen and nothing depended on them.
- **Logos uploaded before v117:** fixed in v120. The tone is worked out and saved the first time the owner opens My card.
- **Billing security fix:** already in place. Receipts and Room passes come from the server's `payments` and `room_passes` tables since v80, and plan, status and card in `prefs.billing` are written only by the payment server; migration 018 (run) stops the browser changing them.
- **Launch setup done by Agnes (confirmed 24 Oct, 10:30 pm):** domain host paid, Resend set up for sign-in emails, Google sign-in set up, Google Search Console verified and approved, and all Supabase migrations run (including 019 to 021). Live test 24 Oct: email-code sign-in works end to end for test account one (code emailed and accepted). Not yet confirmed: that the email comes from noreply@introthread.com through Resend (the browser cannot read email headers; check the sender in the inbox), and Google sign-in (the hosted browser could not use the Google route; a person should test Continue with Google once).
- **Launch items still waiting on Agnes** (she owns Paystack and the company records):
  1. Switch Paystack from test to live keys in Vercel, and confirm the Pro plan amounts in KES (`PAYSTACK_PLAN_MONTH` / `PAYSTACK_PLAN_YEAR`). Then ask the assistant to check the Pro checkout charges KES 1,560 and stop before paying.
  2. Send the company's legal details (registered name, address, registration and tax numbers) for invoices and the site footer.
- **Product decisions already made (23 Oct):** global USD pricing (not Kenya-first), no physical NFC card, Free plan stays at 5 new Threads a month, keep the words "Thread" and "Rooms", and one free small Rooms event a month for up to 20 people (migration `021_free_small_rooms.sql`). The rest of the JamboLink comparison (plain words in the app, WhatsApp-first sharing, fewer tabs, Teams) is suggestions, not decisions.

### How to work on this repo (unchanged rules)
- One step per commit, no change in behaviour unless asked. Build with `python3 scripts/build_pages.py && python3 scripts/prerender.py`, then check every `?v=` hash.
- Before and after each change: screenshot every screen at 390px and 1366px and compare, plus a targeted check of the changed behaviour.
- Tests for every change: all 10 admin tests in `tests/admin`, every script in `tests/app` (`integrations.py`, `notifications.py`, `thread_stages.py`, `photo_crop.py`), the sweeps at 390/1366 with the CSP enforced, and axe.
- Update `ARCHITECTURE.md` and `docs/CHANGELOG.md` with each change, and use `data-on-*` handlers only.

## PRICING: source of truth (v65, 23 Oct 2026)

This is exactly what `/pricing` shows. It was checked in a browser in US and UK time zones.

| Plan | Subtitle | Price | Features |
|---|---|---|---|
| Free | Basic access for new users. | $0, forever ("Get started") | Your card, link and QR; 5 new Threads a month; What's next? and the quiet reveal; Save to contacts; Export your contacts anytime |
| Pro (Most popular) | For professionals and teams. | $12 per month ("Start Pro") | Everything in Free; Unlimited Threads; AI follow-ups in your voice; Calendar booking from a match; NFC card support; Thread search |
| Rooms | For events and communities | $59 per event ("Create a Room") | Room code, QR and badges; Live Resolution Report; Up to 1,000 attendees; Sponsor-ready export |
| Networks | For VC platforms and networks | Custom, annual ("Talk to us") | Warmth dashboard; Warmth API; SSO and admin controls; Dedicated success manager |

The page footer reads (since v69): "UK prices shown in GBP: Pro £9/month, Rooms £45/event. Cards are charged the equivalent in Kenyan shillings. Prices exclude VAT and sales tax where applicable." Update the published price card image to match.

**Where each price lives (change all of them together)**
- **`js/billing.js` `PLANS`:** names, subtitles, prices and feature lists. The billing screen and the pricing page read from here.
- **`js/core.js` `vPricing()`:** the pricing page layout. Rooms always shows $59. There is no yearly Room discount; the old $166 yearly Room price was removed in v65.
- **`js/contacts-import.js` `GBP` map:** the UK display prices. 12→9, 199→149, 120→90 (yearly Pro, pending confirmation, see below).
- **`js/admin-staff.js` `planApply()`:** overrides names, subtitles, USD/GBP prices and Thread limits from the Supabase `plans` table, which staff edit in Admin, Plans and pricing.
- **`supabase/migrations/019_pricing.sql`:** sets Free to $0 with 5 Threads a month, and Pro to $12 / £9 a month, $120 / £90 a year, with the subtitles above. **Agnes must run it.** Until she does, the live table still has Pro at £10 a month and £96 a year.
- **`api/_lib/pay.js`:** the Room pass is charged in KES, at `ROOM_PASS_KES` = 59 × `KES_PER_USD` (default 130), which is KES 7,670. Pro is charged through the Paystack plan codes `PAYSTACK_PLAN_MONTH` / `PAYSTACK_PLAN_YEAR`. Their amounts are set in the Paystack dashboard: about KES 1,560 a month at 130 KES/USD. Agnes needs to confirm these.
- **`scripts/build_pages.py` META `/pricing`:** the search/social description, which now matches the page.

**How each plan works today**
- **Free:**
  - The 5 new Threads a month are enforced by `freeLim()` / `freeLeft()` / `limitSheet()`. Staff can change the number in Admin, Settings (`free_threads_per_month`, default 5).
  - Contact export is free on every plan (`bExportMenu`).
- **Pro:**
  - AI drafts, NFC and analytics are gated with `has('ai_drafts' | 'nfc' | 'analytics')`.
  - The yearly toggle shows $10 a month billed yearly ($120 a year).
  - Cancelling keeps Pro until the end of the paid period. Nothing is deleted.
- **Rooms:**
  - Since v71 no Room is included (`FREE_ROOMS = 0` in billing.js, migration 020). Every Room needs a Room pass at $59 per event (`bRoomPass()`), charged through Paystack (`/api/pay-init { kind: 'rooms' }`).
  - Room size is capped at 1,000 attendees in the create-room form.
  - The Resolution Report and the sponsor export come with the Room.
- **Networks:**
  - Sales-led, with no self-serve checkout. "Talk to us" goes to /about (contact).
  - Contracts are custom annual, invoiced by bank transfer for now.
  - The Warmth dashboard and Warmth API are **not built yet**. They are roadmap items: a consent-scoped read API over two-sided confirmed Threads (see the strategy document).
  - SSO and admin controls for a customer's own network are also roadmap. The current admin area is Introthread staff only.

**Open pricing decisions (ask the owner; don't guess)**
1. **GBP at checkout: RESOLVED in v69 (footer wording).** Paystack charges in KES, so the footer now reads "UK prices shown in GBP: Pro £9/month, Rooms £45/event. Cards are charged the equivalent in Kenyan shillings." Adding Stripe for real GBP charges remains an option later; it needs a Stripe account and keys from the owner.
2. **Yearly Pro: RESOLVED in v70 (toggle removed).** The published card shows monthly only, so the Monthly/Annual switch is gone from /pricing, the Billing plans box and both Upgrade dialogs. New subscriptions are monthly. The yearly code paths (`proY()`, `PAYSTACK_PLAN_YEAR`, the switch-interval action) stay so any existing yearly subscriber keeps working. The £90 placeholder in the `GBP` map is unused.
3. **Free Room: UPDATED in v76: one free event a month for up to 20 people** (owner's decision). A Room is free when its attendance limit is 1 to 20 and the owner has no other free Room created this calendar month; bigger or extra Rooms need a Room pass ($59). Client: `js/pro-gates.js` (`pgFreeRoomUsed`, `FREE_ROOM_CAP`). Database: `supabase/migrations/021_free_small_rooms.sql` (the owner must run it), which also stops a free Room being raised above 20 people without a pass. /pricing and the Rooms plan list "Free for up to 20 people, one event a month". Earlier, v71: The card lists no free Room, so every new Room needs a Room pass ($59 per event). Rooms already created are kept. `supabase/migrations/020_paid_rooms.sql` makes the database trigger require a pass for the first Room too; **the owner must run it**. Until then the app blocks the first free Room, but the database would still allow it.
4. **Thread search: RESOLVED in v72 (Pro only).** `FEATURES.search` is set in `js/pro-gates.js` (new, loaded last). On Free, a search on the Threads list or in the phone search sheet shows a "Thread search is part of Pro" card with Unlock, and the full list stays visible. Filters and topics still work on Free.
5. **Calendar booking: RESOLVED in v73 (Pro only).** `has('booking')` now guards `dIcs()` (the "Add to calendar" file on a Thread, the Threads follow-up list and the Thread menu) in `js/pro-gates.js`. Free users see the "Calendar booking is a Pro feature" dialog. The "Book a meeting" link on a person's own card stays free, because it is part of their card.
6. **Paystack plan amounts** for Pro in KES need checking against $12 (monthly) and $120 (yearly).

## STATUS SUMMARY: 23 Oct 2026, after v64 (kept for history; see 24 Oct above)

### Done (all on `main`, tested, deployed by Vercel)
- **Code clean-up**
  - v54: the duplicate functions are merged.
  - v55: styles are in `/css`, in 4 files.
  - v56: all app code is in `/js`, and `index.html` is about 6 KB of structure.
- **Speed**
  - v57: scripts load with `defer`, and `/js` and `/css` carry `?v=` hash tags with a 1-year cache.
  - v58: the 8 website pages are pre-rendered (text is in the page source), and app, admin and card routes use `app-shell.html`.
- **Security: strict script policy is ON**
  - v59 to v62: all 747 inline handlers are converted to `data-on-*`, which `js/actions.js` runs without eval.
  - v63: `'unsafe-inline'` was removed from `script-src`. A test with the policy enforced over the website, the demo app and admin found 0 violations.
- **Demo account**
  - v60: fresh data on every start. Delete, deactivate, reactivate and change password are blocked. It keeps the Pro plan, never reaches the server or admin, and payments are simulated.
  - v64: each browser tab keeps its own demo copy.
  - Tested: 5 browsers at once stay independent, and 2 tabs in one browser stay separate.
- **Tests passing on v64**
  - all 10 admin tests
  - the sweeps at 390 and 1366 for app and site
  - axe
  - the strict-policy check
  - the demo tests
  - photo crop
  - payments

### Waiting on Agnes (she owns GitHub, Vercel, Supabase and the domain)
0. Run `supabase/migrations/019_pricing.sql`, which sets Pro to £9/month and the published plan text. Confirm the Paystack Pro plan amounts in KES.
1. Turn on the Google and LinkedIn sign-in providers in Supabase (Microsoft was dropped in v122).
2. Set up Resend for sign-in emails and add its key in Vercel.
3. Run database migration 012 in Supabase.
4. Send the company's legal details for the invoice.
5. Optional: grant workflow permission to the GitHub connection, so the photo-crop check can run in GitHub Actions.

### Needs a person (the assistant's tools cannot do these)
- **Live console check after each deploy:**
  1. Hard refresh with Ctrl+Shift+R and open the console with F12.
  2. Visit the website pages, `/app` (demo) and `/admin`, at phone and laptop width.
  3. Look for red "Content Security Policy" errors, especially from PostHog and the jsdelivr libraries.
  4. View the page source to confirm the `<!--pre-->` text is there.
- **Real devices:** iPhone and Android, including VoiceOver, plus scanning the QR code on the back of the public card.
- **Deploys:** confirm each Vercel deploy succeeds. The Hobby plan allows about 100 deploys a day, so commit each change once.

### If you continue the work
- Build: `python3 scripts/build_pages.py && python3 scripts/prerender.py`. Afterwards, check that each `?v=` tag in `index.html` equals the first 10 characters of `sha1sum js/<file>`.
- Commit one step at a time, never in parallel.
- Use `data-on-*` handlers only. Complex logic becomes a named function.
- Any new account-level action must be added to the `demoGuard` list in `js/demo-mode.js`.

## START HERE: state on 23 Oct 2026 (after v60)

### Code layout
- `index.html` (website home, with pre-rendered text) and `app-shell.html` (an empty root, served by the `vercel.json` catch-all for /app, /admin, cards and rooms). Both are generated: never edit them by hand.
- `js/` holds all app code, 34 files loaded with `defer` in a fixed order:
  - `actions.js` loads first.
  - `core.js` (the original app, v1-v16) loads second.
  - Feature files, admin screens, `payments.js`, then `demo-mode.js` last.
- `css/` holds the styles: `base`, `app`, `admin`, `features`, in that order.
- `scripts/build_pages.py`:
  - writes per-page meta
  - writes the 9 page folders and `app-shell.html`
  - adds `?v=<hash>` and `defer`
- `scripts/prerender.py` saves the drawn text of 8 website pages into their HTML.
- `scripts/convert_handlers.js` converts inline handlers (see below).

### Build and test (every change)
1. Build: `python3 scripts/build_pages.py && python3 scripts/prerender.py`. Prerender needs Playwright Chromium. If you skip it, the website pages go back to empty.
2. Run the 10 admin tests, 3 or 4 at a time: `node tests/admin/<t>.js` with `t` in `tadm tusers tmod trm trv tpl tsg tpq tsf tal`. Each should print `errs []`.
3. Run `python3 tests/app/photo_crop.py`.
4. Run the browser sweeps at 390 and 1366 for the app and the site, plus axe. These are sandbox scripts. To rebuild them, serve `index.html`/`app-shell.html` and route `/js` and `/css` from disk.
5. Commit everything that changed in one commit, because Vercel Hobby limits daily deploys:
   - `index.html` and `app-shell.html`
   - the 9 page folders
   - `js/`, `css/`
   - the docs
6. `/js` and `/css` are cached for a year by `?v=`. Always rebuild after editing them.

### Stricter security setting (removing 'unsafe-inline'): IN PROGRESS
- **How it works:** markup uses `data-on-click="fn('a', this.value)"`, not `onclick`. `js/actions.js` runs it without eval. It supports:
  - global function calls, separated by `;`
  - literal arguments, plus `this`/`event` properties
  - `return false`

  Anything else (assignments, `if`, arrow functions) must become a named function in the same file, under a `/* v59: named handlers ... */` block.
- **Tool:** `node scripts/convert_handlers.js js/<file>.js` lists what it can convert and what it cannot. Add `--apply` to rename the simple ones, then hand-write the rest. In the browser, `ACT.check(document)` lists any `data-on-*` that would fail.
- **Done (one commit each):**
  - v59a-v59j: Dashboard plus `actions.js`, then Users, Moderation, Rooms, Revenue, Plans, Settings, Privacy, Staff, Audit.
  - v61a-v61g: `core.js` screen by screen: website pages, Today, Threads, Tap, Card/Profile, Rooms, Settings plus app shell and account menu. `core.js` is now at 0.
  - v61h: `admin-core.js` is now at 0.
  - v61i: `billing.js` is now at 0. The card form keeps its action in `data-act` and runs it with `ACT.run`.
  - `convert_handlers.js --only=fnA,fnB` converts inside the named top-level functions only.
- **v62 (23 Oct 2026):** every remaining file is converted, one commit each:
  - v62a `capture.js`, v62b `contacts-import.js`
  - v62c `rooms-access.js`, v62d `event-mode.js`, v62e `app-navigation.js`, v62f `payments.js`, v62g `app-routing.js`
  - v62h `data-export.js`, v62i `late-fixes.js`, v62j `first-visit.js`, v62k `room-sessions.js`
  - v62l `match-celebrate.js`, v62m `install-prompt.js`, v62n `company-logo.js`
  - v62o: the `index.html` modal backdrop uses `backdropClose(event,this)` in `actions.js`.
  - `actions.js` also handles `dragover`, `dragleave` and `drop`, and exposes `ACT.run`.
- **Left: 0 inline handlers** in `index.html`, `app-shell.html` and `js/`. The only match is a comment in `actions.js`. Recount with: `grep -o ' on[a-z]\+=\\\?["'"'"']' js/*.js index.html app-shell.html | sort | uniq -c`
- **Lesson from v62:** never commit two steps in parallel. The v62j commit was rejected ("not a fast forward") while v62k landed with pages that pointed at first-visit's new `?v=` tag, before that file was in the repo. For the retry, a one-line header note gave `first-visit.js` a fresh tag so no browser could have cached the old file under it. After every build, check that each `?v=` tag in `index.html` equals the first 10 characters of `sha1sum js/<file>`.
- **Watch out:** CSS and JS can target handler text, so update them in the same commit.
  - Already handled:
    - `rooms-access.js` selectors
    - the `admin-audit` showNudges regex
    - the shell account-button replace
    - billing's Help-button `setAttribute` and `app-navigation`'s profile-link replace
    - the `a11y.js` selector
    - the `features.css` danger-button rule (`button[data-on-click^='stConfirm']`)
  - Before each commit, grep `css/` and `js/` for `[onclick` and `onclick=` inside strings.
- **DONE in v63 (23 Oct 2026):** `'unsafe-inline'` was removed from `script-src`.
  - The earlier count missed four handlers that come straight after a quote or backtick. They are now fixed, including `data-export`'s export-button matcher, which had silently stopped matching.
  - A browser test with the strict policy enforced, covering the website, the demo app and admin at 390 and 1366, recorded 0 violations.
  - To check new markup for leftovers, use: `grep -no "[^a-z-]on[a-z]*=[\\]\?[\"']" js/*.js index.html`
  - **Still to do by a person:** watch the live console for blocked scripts, especially from PostHog and the Supabase/QR CDNs.
- **Previous plan, kept for history (count is now 0):**
  1. Remove `'unsafe-inline'` from `script-src` in `vercel.json`. The JSON-LD block is data, so it is not affected.
  2. Test everything.
  3. Watch the console on the live site.

### Demo account (v60, `js/demo-mode.js`)
- **Where it runs:** the demo (demo@introthread.com, "Explore the live demo") runs only in the visitor's own browser.
  - It never calls the server: `itApi` needs a cloud session.
  - It cannot open /admin, which says "Admin needs the live database".
  - Payments are simulated.
- **What v60 adds:**
  - Every demo start loads fresh data, so no visitor's edits carry over.
  - Delete, deactivate, reactivate and change password are blocked with a message.
  - The demo keeps the Pro plan so every feature can be tried.
- **Rules:**
  - Never create a real Supabase user with the demo email. Signup already refuses it.
  - Any new account-level action must be added to the `demoGuard` list.

### Demo with many visitors (tested 23 Oct 2026)
- Five separate browsers used the demo at the same time, each editing and moving between all app screens. None saw another's changes and there were no errors. Each visitor's demo lives only in their own browser, so the number of visitors only adds static file downloads from Vercel's CDN.
- **Fixed in v64:** each browser tab keeps its own demo copy. The tab's demo, with its sign-in, lives in `sessionStorage` under `introthread_v1_demo_tab` and survives reloads of that tab. `localStorage` keeps only a signed-out copy, so a page opened in a new tab (such as "View as visitor" on `/sarah`) can still show the demo card. A new tab is not signed in until its visitor starts the demo. Real accounts are unaffected because their data is in Supabase. See `js/demo-mode.js`.

### Live checks still needed (only a person can do these)
- In browser devtools, check that each page's source has `<!--pre-->` text, that /app and /admin show no homepage flash, and that the console is clear at phone and laptop width. The assistant's browser tools cannot read raw source or the console.
- Waiting on Agnes:
  - Google and LinkedIn sign-in providers
  - Resend
  - migration 012
  - the company's legal details for the invoice
  - workflow permission for the GitHub connection

## Earlier state: 22 Oct 2026
**Repo docs:**
- README.md: index of all docs
- ARCHITECTURE-ESSENTIALS.md: one page
- ARCHITECTURE.md
- AGENTS.md: rules
- PRD.md
- SECURITY-AUDIT.md
- docs/ROOMS.md
- docs/CHANGELOG.md: every change with commit links
- this file: full history below

**Live and verified:**
- **Deploys:** `main` deploys to https://www.introthread.com. The latest code commits are v37 security (251723b) and migration 016 (cb5106b).
- **Database:**
  - Migrations 014 (Rooms access) and 016 (security fix) are run.
  - 016's self-check showed all 8 rows ok: visitors and other users cannot read `prefs` or `plan`; card fields are public; `my_profile()`, the `profiles_guard` trigger and `profiles_len_chk` exist.
  - 015 was run first but did not take effect, so 016 re-applies it.
  - Leaked-password protection is on and the sign-in limits were checked (reported by the owner).
- **Rooms (v36), live test in Paystack test mode, all passed:**
  - Room pass purchase (KES 25,870), then a second Room
  - private Room request, then Let in
  - limit of 2 filled
  - full Room message for signed-out visitors and for a signed-in non-member
  - Test Rooms QAP55 and QAS41 stay on the live site. The owner said do NOT delete them.
- **Billing page after 016:** Pro active, receipts IT-2026-0001 and 0002 show, 0 unused passes.
- **Photo popup:** Save photo is visible. The root cause was ad blockers hiding `ad-` classes; all were renamed to `ix-` (v35).
- **Admin:** all screens are redesigned, including the Audit log (v43, done 21 Oct). Do not redo it unless Agnes sends a new mockup.

**Build (v58):** `python3 scripts/build_pages.py && python3 scripts/prerender.py` (needs Playwright Chromium).

**Caching (v57):** `/js` and `/css` are cached for a year by version tag. Always run `python3 scripts/build_pages.py` after editing them.

**Code layout (v56):**
- `index.html` is now about 6 KB: page structure and `<link>`/`<script>` tags only.
- The original app (v1-v16, no duplicate functions left) is in `js/core.js` and must load first.
- Styles are in `css/` (base, app, admin, features).
- Features are in `js/` (32 files, in load order).
- The sandbox browser tests and `tests/admin` serve or inline both `/js` and `/css`.

**Brand (v48):**
- Logo = the thread mark: two dots (blue `#1f5eff` and orange `#ff5a1f`) joined by a gradient thread. On dark backgrounds the left dot is white and the thread starts in `#6ea0ff`.
- Files are in `img/brand/`.
- In the app it is drawn by the CSS on `.x-lm` (an SVG background); the old `<i>` circles are hidden.
- Do not bring back overlapping circles; they look like Mastercard.

**Pending (owner or Agnes):**
1. Confirm the public card (introthread.com/mosesmunyi in a private window) still shows name, photo and links after 016. The owner's screenshot did not arrive.
2. Check whether migrations 012 (audit screen) and 013 (fix ambiguous columns) were run. Open /admin/users and /admin/audit; if either shows "column reference ... is ambiguous", run 013.
3. Agnes: turn on Google and LinkedIn sign-in providers.
4. Agnes: set up Resend email (`RESEND_API_KEY`, `NOTIFY_FROM`) and verify the domain. Then do a real end-to-end sign-up test.
5. Company legal details for invoices: address, company number, VAT number. Invoices currently say "Introthread Ltd, London and New York".
6. Paystack: switch to live keys and live plan codes before launch. USD once the Kenyan USD account is approved.
7. Optional: give the GitHub connection "workflow" permission so agents can edit `.github/workflows`. Dependabot needs it too.
8. Real-device checks: iPhone and Android, VoiceOver, QR scan of the back of the public card. Also check whether the darker chip and tag colours look too heavy.

**Pending (code), being worked in this order:**
1. DONE v38: Room invitations are emailed by `api/room-invite.js` once Resend is configured (mock test `/home/user/invtest2.js`).
2. DONE v39: attendance for each community session. **Agnes must run `supabase/migrations/017_room_sessions.sql`.** Until then the Sessions card stays hidden. Client prefix `ses`/`SESX`; the name `RS` was already taken. Test: `/home/user/looptest_ses.py ok`.
3. DONE v40: the billing guard. **Agnes must run `supabase/migrations/018_billing_guard.sql`.** It extends the `profiles_guard` trigger so that, for signed-in users, `prefs.billing` keeps the server's values for plan, status, interval, periodEnd, cancelAt, trialEnd, trialUsed, card, roomCredits and provider, plus every server or paid invoice. Browser invoices can never be marked paid. Billing details, invoice requests and `seq` stay editable. The `bSave` wrapper reloads the profile from the server after saving. Side effect: a browser-only Pro trial no longer works in cloud mode; trials must come from the payment server. Not tested against a real database (no Postgres in the sandbox): Agnes runs it, then re-check Billing.
4. IN PROGRESS (v41 step 1, v50 step 2, v51 step 3, v52 step 4, v53 step 5, v54 duplicates merged, v55 styles in `/css` done (v17-v32 app features in `js/`; next, merge the duplicate function declarations in v4-v16 before moving them, see ARCHITECTURE.md): the admin screens are in `js/admin-*.js` and the late fixes in `js/late-fixes.js`; `tests/admin/*.js` inline the `/js` files; a11y and photo crop are in `/js`, and the sandbox axetest/kbtest now serve `/js`; payments are in `js/payments.js`, loaded first; `/js` is Prettier-formatted): **Refactor plan** in ARCHITECTURE.md. The v36-v40 code now lives in `/js/rooms-access.js`, `admin-idle.js`, `room-sessions.js` and `billing-sync.js`, and `boot` waits for DOMContentLoaded. The sandbox browser tests (sweep, ratest, rjtest, looptest*) were updated to serve `/js`. Plan: split `index.html` into modules screen by screen, fold the `vNN` overrides into the functions they wrap, and replace `onclick` so the CSP can drop `unsafe-inline`. Do it one screen per commit, with tests after each.
5. PARTLY DONE v42: faster website pages.
   - Done: preconnect to jsDelivr and Supabase, lazy and async images, a cache header for `/img` in `vercel.json`, and `og.jpg` recompressed.
   - Not done: every website page is still a full copy of the 1.2 MB app (about 324 KB gzip). Recompressing the `uc-*.jpg` and `sarah.jpg` images saved nothing.
   - Next: build light marketing pages that load the app only on /login, /signup and /app. This depends on the code split (item 4).
6. DONE v43: monthly library check.
   - Run `python3 scripts/check_deps.py` (needs internet).
   - Workflow file: `docs/deps-check.yml`. The owner must copy it to `.github/workflows/`.
   - Results on 22 Oct: qrcode-generator 1.4.4 -> 1.5.2 is available (same major). The hash is printed by the script. Test QR codes before switching.
   - tesseract.js 7 and qrcode-generator 2 are new major versions; not adopted.
7. Ideas, built in this order: (1) DONE v44, guided first visit (`js/first-visit.js`, test `/home/user/fttest.py`). (6) DONE v49, company logo on the card: `js/company-logo.js`, test `/home/user/cltest.py`. All six ideas are now handled. (5) NOT NEEDED, instant page navigation: measured on 22 Oct with `/home/user/navtest.py`. Clicking website links (for example Home to /pricing) switches pages inside the app with 0 full page reloads, because the internal-link click handler near `boot` already does this. The real speed cost is the first load, see item 5 of the code list. (4) DONE v47, install prompt: `js/install-prompt.js`, test `/home/user/iptest.py`. There is no service worker, so whether Chrome fires `beforeinstallprompt` depends on the browser version. If it never fires, Android users see no bar, while iPhone users still get the steps. (3) DONE v46, match celebration (`js/match-celebrate.js`, test `/home/user/mctest.py`). (2) DONE v45, weekly digest: `api/weekly-digest.js`, cron `0 6 * * 1` in `vercel.json` (the Hobby plan allows 2 crons; both are now used). It uses the existing Settings toggle `prefs.digest` (opt-in) and dedupes with `prefs.digestWeek`. Test: `/home/user/digesttest.js`. Still to build:

**Sandbox test tools** (in /home/user of the agent sandbox; they are not in the repo and must be recreated if the sandbox is gone):
- **Layout and accessibility:** `sweep.py WxH app|site`, `axetest.py 390|1366`, `kbtest.py`, `admcheck.py 390|1366 [axe]`
- **Other app checks:** `csptest.py`, `stagetest.py`
- **Rooms:** `ratest.py` (create a community), `rjtest.py` (join page states), `looptest.py ok|fail` (render-loop check with a simulated Supabase)
- **API mocks:** `roompaytest.js`, `paytest.js`, `synctest.js`
- **In the repo:** `tests/admin/*.js` and `tests/app/photo_crop.py`

---

## Earlier state notes (21 Oct 2026, kept for history)

- `main` head: the Audit log commit (v43). Vercel deploys `main` automatically.
- Migration 011 (`supabase/migrations/011_staff_screen.sql`) is NOT YET RUN. Until it is, the Staff page adds existing accounts directly (no invitations, no pausing, no two-step or last-active columns).
- Migration 010 (`supabase/migrations/010_privacy_screen.sql`) is NOT YET RUN. Until it is, the Privacy page filters in the browser, has no identity-check step, and people's notes on new requests are dropped (the request itself still saves).
- Migration 009 (`supabase/migrations/009_plans_screen.sql`) is NOT YET RUN. Agnes must paste it into the Supabase SQL Editor and run it. Until then the Plans page uses its fallback (no descriptions, no people counts, older save function, history from the audit log).
- Database migrations 002 to 008 are ALL RUN by Agnes and were verified live (21 Oct 2026):
  - 002/003: tables `staff`, `audit_log`, `reports`, `account_status`, `plans`, `subscriptions`, `app_settings`, `contacts`, `privacy_requests`; admin functions.
  - 004: `admin_stats_range` exists. 005: `admin_notes` table exists. 006: `reports.outcome` column exists. 007: `admin_rooms2` exists. 008: `payments` table and `subscriptions.started_at` exist; `admin_revenue` exists.
  - Check method used: select/count on new tables and order by new columns; call new functions with the service connection and expect "Not allowed" (42501 from `assert_staff`), which proves the function exists. "Could not find the function" would mean it is missing.
- Live data: 3 profiles, 0 threads, 0 rooms, 0 contacts, 0 reports, 0 subscriptions, 0 payments, 0 admin notes. Staff: one owner (the admin owner account).
- app_settings: `admin_require_mfa` = true (staff must set up two-step verification at /admin), announcement off, maintenance off, all features on, `free_threads_per_month` = 5.
- Lockout fix if two-step breaks: `update app_settings set value='false' where key='admin_require_mfa';`
- Every admin screen still has a fallback for a missing migration, but none are needed now. Do not remove the fallbacks; they keep the page usable if a future migration is not yet run.

## Admin redesign: progress (9 screens, from Agnes's mockups, one at a time)
| # | Screen | Version | Migration | Status |
|---|---|---|---|---|
| 1 | Dashboard + shell | v34 | 004 | Done |
| 2 | Users | v35 | 005 | Done |
| 3 | Moderation | v36 | 006 | Done |
| 4 | Rooms | v37 | 007 | Done |
| 5 | Revenue | v38 | 008 | Done |
| 6 | Plans and pricing | v39 | 009 (not yet run) | Done |
| 7 | Settings | v40 | none (uses existing admin_set_setting) | Done |
| 8 | Privacy requests | v41 | 010 (not yet run) | Done |
| 9 | Staff | v42 | 011 (not yet run) | Done (Audit log screen itself not redesigned yet) |
- Agnes's instruction for each screen: "exact equivalent or better" than her mockup, real backend only, nothing faked. Where a mockup shows something untrue (for example "Stripe connected", "All systems operational"), show the honest state instead and say so in the report.
- Pattern per screen: new `supabase/migrations/00N_*.sql` (SECURITY DEFINER functions that call `assert_staff(roles)` and write `audit(...)`; revoke from public/anon, grant to authenticated), one JS block and one CSS block appended to `index.html`, an `admLoadTab` override for the tab, a fallback to the older RPC when the new one is missing, a jsdom test, HANDOVER update, one commit.
- Shared look: KPI cards (`rm-c` / `md-c`), toolbar selects (`mdSel`), list + detail panel grid (`md-g`, drawer below 1180px, Esc closes), sections (`md-sec`), tables (`au-t`), status pills, `admAsk` confirm dialog (reason always required, optional typed DELETE).
- Global names already taken, do not redeclare (a clash breaks the whole app): `ADMR` (dashboard range), `money`, `usd`, `pct`, `ago`, `fmtT`, `initials`. Prefix new globals per screen: `au*`/`ADMU` Users, `md*`/`ADMM` Moderation, `rm*`/`RMX` Rooms, `rv*`/`RVX` Revenue, `pl*`/`PLX`/`PL_F` Plans (`PLANS` is the older billing constant, do not reuse it), `sg*`/`SGX`/`SG_FEAT`/`SG_LAB` Settings, `pq*`/`PQX`/`PQ_KIND`/`PQ_ST` Privacy, `sf*`/`SFX`/`SF_ROLES` Staff. Before adding a global, grep `index.html` for `(const|let|function) name`.
- Roles: owner, admin, moderator, support, finance. `admOk([...])` in the client; `assert_staff([...])` on the server decides.

## Where things are
- Docs: `docs/CHANGELOG.md` (all changes, newest first), `docs/ROOMS.md` (Rooms, events, communities, Room pass, with known gaps). Keep both updated.
- Live site: https://www.introthread.com (apex redirects to www). Vercel deploys automatically from `main` of `introthread/introthread` (preset "Other", static).
- Owner: Agnes. All services (GitHub, Vercel, Supabase, domain) are registered to the project owner's account.
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
- Agnes's decisions (21 Oct 2026): prices in US dollars, pounds shown to UK visitors; Free plan = 5 new Threads a month; admin Owner = the admin owner account; build order: contacts + file import (done), then admin area, then Stripe, then Google/Microsoft connect, then LinkedIn sign-in/share. No LinkedIn company page yet (needed before a LinkedIn developer app). Full plan: Town doc "Introthread: connections, LinkedIn, admin and revenue plan".
- Contacts and file import v32:
  - New page `/app/contacts` (`vContacts`, routed through the `vToday` fallback). Threads and Contacts pages share a segmented switch (`ctBar`).
  - Contact = private, unconfirmed person; Thread = confirmed by both. Imports never send anything.
  - Import (`ctImport` > `ctFile` > `ctPreview` > `ctDoImport`): auto-detects LinkedIn Connections.csv (skips the "Notes:" preamble), Google Contacts CSV (old and new formats, ":::" multi-values), Outlook CSV (ignores the Mr/Mrs "Title" column), any CSV with name/email columns (comma, semicolon or tab), and multi-contact .vcf. Preview with checkboxes, select all, and duplicates (matched on email, last 9 phone digits, LinkedIn URL against Contacts and Threads) marked "Already saved" and left out.
  - Contact row: Invite (prefills the Tap form via `capApply`), and a menu: email, call, LinkedIn, delete. Search and source filter chips. Step-by-step export guides for LinkedIn, Google, Outlook, iPhone/Android.
  - Storage: Supabase table `contacts` (see migration). If the table is missing, contacts are kept on the device (`_local`) with a notice, and upload automatically once the table exists (`ctLoad`).
  - Free limit: real (cloud) accounts not on Pro get 5 new Threads per calendar month (`FREE_LIMIT`, `threadsThisMonth`, `freeLeft`). The Tap page shows "N of 5 free Threads left". At the limit, a sheet offers "See Pro" or "Save as a contact". Demo mode is not limited.
  - Pricing: Free now says "5 new Threads a month", Pro adds "Unlimited Threads", FAQ copy updated. UK visitors (timezone Europe/London or en-GB language) see pounds (`isUK`, `toGBP`; $10->8, $12->10, $96->77, $120->96, $166->129, $199->159, others x0.8).
- Database migration `supabase/migrations/002_contacts_admin.sql` (NOT YET RUN; Agnes must paste it into Supabase SQL Editor and run): contacts, staff + `is_staff()` function, audit_log, reports, account_status, plans (free 5 Threads, pro), subscriptions, app_settings (free_threads_per_month=5, maintenance, feature switches), privacy_requests. All with row level security. Seeds the admin owner account as owner (only works once that email has signed up; re-run the insert after sign-up).
- Migration 002 verified live in Supabase on 21 Oct 2026: all tables exist, plans (free 5 Threads, pro) and app_settings seeded, the admin owner account is owner in `staff`.
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
- Admin redesign v38 (screen 5 of 9: Revenue), `rvLoad`/`rvPage`, state `RVX` (helpers prefixed rv; `money` and `usd` names were already taken):
  - Header: honest Stripe badge (green "Stripe connected" only when a subscription or payment carries a Stripe id, otherwise amber "Stripe not connected"), range (3/6/12/24 months, saved `it_rev_m`), Manage billing (opens Stripe dashboard when connected; otherwise a "Connect Stripe" checklist).
  - KPI cards: Monthly revenue (MRR, USD), Yearly run rate, Paying people (% of users), Conversion (Free to Paid, with change in points). Month-on-month change uses subscription start and cancel dates.
  - Charts (SVG, hover/focus tooltips, Monthly/Weekly): Revenue received + monthly revenue; New paying users + cumulative paying users.
  - Past-due / failed-payment alert with Review.
  - Subscriptions table with Active / Past due / Cancelled / All tabs and counts, paging, open person in Users, CSV export (owner/finance, audited).
  - Revenue by plan donut (payments received in range; falls back to monthly revenue when no payments yet).
  - Price list from the plans table (USD, GBP, monthly and yearly, Thread limit, Stripe linked or not, status) with Edit prices (goes to Plans).
  - Recent payments (6) with View all modal (filters Paid, Failed, Refunded).
  - Needs `supabase/migrations/008_revenue_screen.sql` (subscriptions.started_at, canceled_at, amount; new `payments` table written only by the Stripe webhook; sub_mrr_usd, admin_revenue, admin_subs2, admin_payments). Without it the page estimates from current subscriptions and plan prices and hides charts.
  - Stripe itself (checkout, webhook writing subscriptions and payments) is still to build, per the agreed build order. When it is built, /pricing and in-app billing should read prices from the `plans` table.
  - Next: Screen 6 Plans and pricing.
- Admin redesign v39 (screen 6 of 9: Plans and pricing), `plLoad`/`plPage`/`plCard`, state `PLX`. Built from Agnes's mockup "Introthread Plans & Pricing Dashboard":
  - Header with Pricing history button. Honest info banner: changes are saved at once and audited, the Free Thread limit applies at once, but card payments are not on yet (Stripe not connected), so nobody is charged a new price. The mockup's "Changes apply immediately" was softened for that reason.
  - One card per plan (Free blue with gift icon, Pro orange with crown), Active/Hidden pill, chips for people on the plan, Stripe prices linked or not (Pro), last updated and by whom.
  - Fields: Plan name, Description (needs 009), USD and GBP per month and per year with currency prefixes, New Threads per month with an Unlimited tick box (Pro only; Free must have a number because the app reads `free_threads_per_month`), Offer this plan switch (Pro only; Free cannot be hidden). Free prices are read-only at 0.
  - Live checks under each field (required name, prices 0 to 100000 with at most 2 decimals, whole-number Thread limit), yearly saving hint ("Saves 17% against monthly (2 months free)"; amber when yearly costs more than 12 months), live Plan summary.
  - Save button is disabled until something changes; status reads "No changes to save" / "N unsaved changes" / "Fix the highlighted field". Undo changes button. Saving opens `admAsk` with a before/after table and a reason; price changes on Pro add a note that existing subscribers keep their price until changed in Stripe.
  - Unsaved edits on the other plan are kept when one plan is saved. Leaving the tab (admGo) or the page asks first when there are unsaved changes.
  - Pricing history modal: every plan change with date, staff member, reason and before -> after values, filter by plan. Older entries from `admin_update_plan` show "set to" values.
  - Read-only for roles other than owner/finance (inputs disabled, note shown).
  - `supabase/migrations/009_plans_screen.sql`: plans.description, updated_at, updated_by; `admin_plans2` (plans + people per plan + who changed it), `admin_plan_save` (server-side validation, records only real changes with before/after in the audit log, keeps `free_threads_per_month` in app_settings in step), `admin_plan_history`. Without 009 the page loads plans from the table, saves with `admin_update_plan`, and reads history from `admin_audit`.
  - Since 21 Oct (after v42): the public /pricing page, Settings > Subscription and Billing read prices, names, descriptions and Thread limits from the `plans` table at load (`planSync`/`planApply` update `PLANS` and the GBP map; helpers `proM`, `proY`, `usd0`, `thrTxt`). The Free Thread limit still comes from app_settings `free_threads_per_month` (kept in step by `admin_plan_save`). Feature bullet lists and the Room pass ($59) are still in code. Stripe checkout must charge the same table prices.
  - Next: Screen 7 Settings.
- Admin redesign v40 (screen 7 of 9: Settings), `sgLoad`/`sgPage`, state `SGX`. From Agnes's mockup "Introthread Settings Dashboard" and her brief (keep backend actions and permissions, reason for every global change, audit log, confirm before maintenance, no settings the app does not support). No migration: everything goes through the existing `admin_set_setting(k,v,reason)` (owner/admin; `admin_require_mfa` owner only), which writes the audit log.
  - Header with "View changes log" (modal of `setting.*` entries from `admin_audit`, with readable values).
  - Announcement banner: message (160 max, counter), style (Information / Warning), Show banner switch, live preview using the real `.ann` banner style, Live / Not showing pill, unsaved state, Undo, Publish confirm with preview and reason. Showing a banner with no message is blocked.
  - Maintenance mode: status pill, explainer, switch, optional message (200 max). New key `maintenance_message` (saved through admin_set_setting); `vMaint` now shows it on the "Back shortly" screen. Turning maintenance ON needs a reason AND typing MAINTENANCE (red button). Turning off or changing the message needs a reason.
  - Features: Business card scan, Contact import, LinkedIn import, Rooms, with descriptions, On/Off text and switches; each change asks for a reason. IMPORTANT: before v40 these switches were saved but the app ignored them. v40 makes them real by wrapping `capCard` (card_scan), `ctImport` (contact_import), `importParse` (LinkedIn Connections.csv blocked when linkedin_import is off) and `vRooms`/`vRoom` (rooms; shows "Rooms are turned off for now"). Applies to everyone, including staff, the next time the app loads.
  - Security: two-step requirement switch (owner only; turning it OFF needs typing TURN OFF), plus read-only "Built in" rows for staff roles (link to Staff), data exports and email masking, which are fixed rules in the code, not settings.
  - Left out on purpose because the app does not support them: Session timeout, Allow staff to export data switch, Show email addresses switch, and the Danger zone (Clear all data, Reset settings). Add them only with real backend support.
  - Unsaved announcement or maintenance edits are kept when the other card is saved; leaving the tab or page asks first.
  - Next: Screen 8 Privacy requests.
- Admin redesign v41 (screen 8 of 9: Privacy requests), `pqLoad`/`pqPage`/`pqOpen`/`pqAct`, state `PQX`. From Agnes's mockup and brief (connect to the existing workflow, enforce staff permissions, record actions, treat 30 days as a reminder, not a universal legal rule).
  - Header button "Learn about GDPR & CCPA" (matches the mockup; opens the privacy guide: practical steps for identity, data copy, deletion, correction, deadlines, records; "not legal advice"; UK GDPR one month and CCPA 45 days, both extendable, with links to the ICO and the California AG).
  - Cards (click to filter): Total, Open (overdue or due within 7 days), Actioned (status done), Dismissed (status rejected). Open = open + in_progress.
  - Toolbar: status tabs with counts, date filter (any, 7, 30, 90 days, 12 months), debounced search by name, handle, email or request ID (PR-XXXXXXXX = first 8 hex characters of the id).
  - Table: Request ID, Person, Type, Reason (the person's own optional note), Received, Respond by (with days left / overdue), Status, Review/View. Below 760px each row becomes a card. Empty state explains where people make requests and links the guide. Bottom strip: what requests are, a checklist, and what a data copy includes (matches `admin_export_user`).
  - Request detail (modal): person, email, dates, note, then steps: 1 Check identity (Mark identity checked, needs 010), 2 Export data (`admExportAsk`) / Delete account (`admDeleteAsk`, owner and admin only, blocked for staff accounts) / Correct (opens the person in Users), 3 Start / Mark actioned / Dismiss. Closing warns when no export or deletion is recorded or identity is not checked. History shows privacy actions plus exports and deletions of that account since the request. The modal reopens after each action.
  - Roles: owner, admin, support (same as before). Every action needs a reason and is audited.
  - User side: the request form in the app's Settings now has an optional "Anything we should know?" note (500 max) saved as `details`; if 010 is not run yet it retries without the note.
  - `supabase/migrations/010_privacy_screen.sql`: privacy_requests.details, identity_checked_at/by, resolution; `admin_privacy2` (counts, search, filters, paging), `admin_privacy_detail`, `admin_privacy_act` (start, verify, done, reject; checked transitions; closed requests cannot change; reason required; audited). Without 010 the page uses `admin_privacy` and `admin_set_privacy` and history from `admin_audit`.
  - Not built (no backend for it): bulk select in the table, which the mockup shows.
  - Mobile checked with 390px Playwright screenshots (cards, table cards, modal, empty state).
  - Next: Screen 9 Staff and Audit log.
- Admin redesign v42 (screen 9 of 9: Staff), `sfLoad`/`sfPage`/`sfManage`, state `SFX`. From Agnes's mockup "Modern Staff Management Dashboard" and her five requirements.
  - Header "View audit log" (opens the Audit log tab). Cards: Total staff (added this month), Active (how many without two-step), Pending invites (failed/expired), Suspended (paused). The mockup's "% from last month" trends were left out: removals are not tracked as history, so they would be invented.
  - Staff members: search, role filter, table with name (+You), email, role, two-step (from auth.mfa_factors), status (Active/Suspended), last active (auth last sign-in), and a manage button (owners only, never on yourself). Open and failed invitations are listed in the same table with Pending / Expired / Failed (with reason) and Resend / Revoke. Below 760px rows become cards.
  - Manage (modal): change role, pause/restore access, remove access (typed REMOVE). Giving the Owner role (invite or change) needs typed OWNER and shows a warning. The only active owner cannot be changed, paused or removed (also enforced on the server).
  - Invite panel (owners only; others see "ask an owner"): email + role with live checks (valid email, already staff, already pending). Flow: `admin_staff_invite` saves a pending invitation (7 days) and audits it; the browser asks Supabase to send a sign-in email (`signInWithOtp`, shouldCreateUser true, redirect /admin); the result is written back with `admin_staff_invite_sent` (failed + reason if the email failed). When the invited person signs in with that confirmed email and opens /admin, `admBoot` calls `staff_accept_invite()`, which adds them with the invited role and marks the invitation accepted. Supabase sends its normal sign-in or sign-up email, not a custom invitation email.
  - Roles and permissions: five cards (Owner, Admin, Support, Moderator, Finance) with what each can do and the screens each role can open, computed from `ADM_TABS`, plus live counts.
  - Role names and the existing permission rules are unchanged. Staff management stays owner-only (same as `admin_set_staff`).
  - `supabase/migrations/011_staff_screen.sql`: staff.suspended_at/suspended_by/invited_by; `is_staff` and `admin_me` now ignore paused staff (so every server check blocks them); `staff_invites` table (one pending per email); `admin_staff2`, `admin_staff_invite`, `admin_staff_invite_sent`, `admin_staff_invite_resend`, `admin_staff_invite_revoke`, `staff_accept_invite`, `admin_staff_role`, `admin_staff_suspend`, `admin_staff_remove` (all audited; reason required; cannot act on yourself; always keeps one active owner). Without 011 the page falls back to `admin_staff` / `admin_set_staff`.
  - Mobile checked with 390px Playwright screenshots (table cards, invite panel, manage modal).
  - Next: redesign the Audit log screen when Agnes sends a mockup.
- Admin redesign v43 (Audit log), `alLoad`/`alPage`/`alOpen`/`alExport`, state `ALX`. From Agnes's mockup "Modern Audit Log Dashboard" and brief (no fake activity, no editing or deleting entries, keep backend and permissions).
  - Cards (real counts only): Events today (vs yesterday), Staff active today (and total events), Security events today (vs yesterday), Exports today (or failed actions today). The mockup's percentage trends were replaced by plain "+N vs yesterday".
  - Toolbar: search (action, staff member, target, reason, details), action type (Users, Moderation, Rooms, Billing, Privacy, Settings, Security, Export, Other), staff member, date range (24 hours to all time, default 30 days), outcome (Completed / Failed; Failed = actions whose code contains "failed", for example staff.invite_failed), Clear filters.
  - Table: Event (readable label + category pill, Failed pill), Staff member (name + role), Date and time, Target (readable name: user, plan, room, privacy request, staff invitation email, setting), Reason, Details. Pages of 25. Below 760px rows become cards.
  - Details panel (modal): action code, category, outcome, staff member and role, exact time with seconds, target and target ID, reason, before/after table when the entry has changes, other details, a link to the related screen, Copy entry ID, and an immutability note.
  - Export CSV exports the filtered list (up to 5,000), asks for a reason and is recorded as `audit.export` (any staff member can export, as before).
  - Empty state: activity icon, "No activity recorded yet" and an explanation; filtered empty state with Clear filters. Immutability note at the bottom.
  - `supabase/migrations/012_audit_screen.sql` (NOT YET RUN): triggers that block UPDATE, DELETE and TRUNCATE on audit_log for everyone; drops the old "staff write audit" policy so entries can only be written by the checked admin functions through `audit()` (staff can no longer insert made-up rows from the browser); indexes; `admin_log` also accepts `audit.export`; `audit_category()`; `admin_audit2` (server-side filters, paging, readable targets, counts, staff list). Without 012 the page filters the newest 1,000 entries in the browser and the export is not recorded.
  - Mobile checked with 390px Playwright screenshots (cards, table cards, details panel).

## Where and when you met (21 Oct 2026, after v43)
- Every new Thread saved from the Tap form (typed, QR scan, business card, paste, contacts) records the exact save time (`other.at`, ISO) and, with the phone's permission, location (`other.geo` = lat, lng, accuracy in metres, fix time, place name). Stored inside `where_met` with the other extras (`tPack`/`tMeta` wrappers, keys `at` and `geo`), so no schema change.
- Place name comes from OpenStreetMap Nominatim reverse geocoding (browser fetch, low volume). Needs HTTPS (live is fine).
- Thread page shows "Where and when you met" (time with seconds and time zone, event or place typed, place name, coordinates, accuracy, Open in Maps). CSV export adds the time and location to the Note column.
- Settings > Your data and privacy has "Save where I meet people" (profiles.prefs.geo; on by default, the phone still asks permission). Only the owner's own location is recorded, never the other person's.
- Not covered: Threads created by the other person from your public card or Event mode QR (their device, not yours). The privacy policy should mention location data before launch.

## Honest limits to keep in mind
- LinkedIn does not let apps read another person's profile from a username. A LinkedIn link gives the profile URL and a best-guess name only; email, phone, title and company must come from paste, QR vCard, business card or contacts.
- Business card reading needs internet the first time (downloads the text reader, about 10 to 20 seconds on mobile data); the photo itself stays on the device. Handwritten or very stylised cards may misread, which is why the review step exists.
- iPhone Safari hides the contact picker unless the Contact Picker API feature flag is turned on.

## Open items / next steps
0. Agnes: run migration 013 (`013_fix_ambiguous.sql`) now. Live, /admin/users failed with 'column reference "plan" is ambiguous' and /admin/audit with 'column reference "actor" is ambiguous': a function parameter had the same name as a column (plan in admin_users2 from 005; actor/outcome in admin_audit2 from 012). 013 qualifies every reference; 005 and 012 are patched in place for fresh setups. Lesson: in plpgsql functions never reuse a column name as a parameter name, or always qualify it (function_name.param).
1. Agnes: migrations 009, 010 and 011 are run and verified (staff invitation tested: Pending, then Accepted, both in the audit log). Run migration 012 next, then reload /admin/audit (the update note disappears).
1b. All admin screens are redesigned (v34 to v43). Agnes sends one mockup at a time.
2. Agnes: sign in with the admin owner account, open /admin, set up two-step verification.
3. Stripe billing (next in the build order after admin): Product + monthly/yearly Prices in USD and GBP, Price IDs into Plans, secret key and webhook secret in Vercel env (never in code), checkout, customer portal, webhook writing `subscriptions` (incl. started_at, canceled_at, amount, current_period_end) and `payments` (amount_usd for totals). The Revenue badge turns green automatically once Stripe ids appear.
4. Then Google connect, then LinkedIn (agreed build order: contacts and import, admin, Stripe, Google, LinkedIn; Microsoft dropped 24 Oct). No LinkedIn company page yet.
5. Supabase email templates (code based, code length 8) and Resend SMTP; then a real end-to-end sign-up test with a real inbox.
6. Real Google sign-in (Google sign-in being tested with a separate test account).
7. Agnes's on-phone test of capture (business card, QR, paste, contacts/.vcf); fix what she reports.
8. Contacts are stored on the device until used with the `contacts` table (exists since 002); check sync when real users arrive.
9. Possible future: move phone/LinkedIn out of `where_met` into proper columns.

## Product decisions (Agnes, 21 Oct 2026)
- Prices in USD everywhere; GBP shown to UK visitors (Pro $12 or GBP 10 a month; yearly $120 / GBP 96). Free plan: 5 new Threads a month.
- Admin Owner account: the admin owner account (details kept outside the repository).

## Testing approach used
- Sandbox workflow: write large JS/CSS to the session file store first, copy one file at a time into the sandbox, insert JS before the last `</script>` and CSS before the last `\n</style>`, run `python3 scripts/build_pages.py` (prints "built 10"), keep a `.bak` of `index.html` before each insert.
- Admin tests mock Supabase by replacing `const SB=(window.supabase` with `const SB=window.__SB?window.__SB:(window.supabase` and setting `__SB` in jsdom `beforeParse`. Per-screen tests are saved in `tests/admin/` (tadm all tabs, tusers, tmod, trm rooms, trv revenue, tpl plans, tsg settings, tpq privacy, tsf staff, tal audit log). Run from the repo root after `npm i jsdom`, for example `timeout 13 node tests/admin/trv.js 2>&1 | grep -v "Not implemented" | tail -1`; a pass ends in `errs []`. They read `index.html` from the current folder. Each covers the full page, detail panel, actions with reasons, and the fallback without the screen's migration. Run at most about 4 tests per command (each takes 10 to 13 seconds).
- jsdom scripts that load `index.html`, log in to demo mode and exercise flows; a pass ends with an empty error list. Covered: Tap form, sign-up, guest reveal, capture, the LinkedIn follow-up prompt, exports, billing, rooms, Today, thread detail.
- Playwright phone-viewport screenshots (390x844) for layout checks.

## Server features v25 (21 Oct 2026, night): email, reminders, AI drafts, analytics
- Vercel functions in `api/` (Node, CommonJS, no dependencies; `api/_lib/common.js` shared, not a route). Each returns 503 `not_configured` until its keys exist, so nothing breaks before setup.
  - `POST /api/notify {thread_id}`: emails the other person the confirm link `/t/<guest_token>` once per Thread (marker event `note` "Confirm link emailed"). Uses the caller's Supabase token, so RLS limits it to the owner. Client calls it from the `addEvent` wrapper on kind `tap`.
  - `GET /api/cron-nudge`: daily Vercel Cron (06:00 UTC, `vercel.json` `crons`). Threads 48-72h old, unresolved, not closed with Not now; one email per owner listing them; marker "Reminder emailed"; respects `profiles.prefs.nudge`.
  - `POST /api/ai-draft {thread_id}`: Anthropic (if `ANTHROPIC_API_KEY`) else OpenAI (`OPENAI_API_KEY`), optional `AI_MODEL`. Respects `prefs.ai`. Client shows "Rewrite with AI" under `#draft` only when `/api/status` says `ai:true`.
  - `GET /api/status`: booleans only (email, ai, nudges).
- Vercel env vars needed: `RESEND_API_KEY`, `NOTIFY_FROM` (optional, default `Introthread <hello@introthread.com>`), `SUPABASE_SERVICE_ROLE_KEY` + `CRON_SECRET` (reminders), `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`. Redeploy after adding.
- Analytics: PostHog loads only when `posthogKey` is set in `config.js` AND the visitor taps Allow on the consent bar (`it_consent` in localStorage). No names or emails sent; identify uses the user id. Events: thread_started, thread_confirmed, thread_answered, followup_sent, thread_resolved, ai_draft_used, plus page views.
- Local mock test: `node /home/user/apitest.js` (sandbox only).
- Payments: Stripe on hold; Paystack planned with the user (not built yet).

## Paystack billing v26 (21 Oct 2026, night)
- Stripe on hold; Paystack (Kenya, test mode, KES only for now). Test plans: monthly `PLN_igm7c0i78tlx9jz` (KES 1,300), yearly `PLN_scrctkdhtg6us1f` (KES 12,500); defaults in `api/_lib/pay.js`, override with `PAYSTACK_PLAN_MONTH` / `PAYSTACK_PLAN_YEAR`. Test public key pk_test_61677ac8dacf82d2b15735bc2e4bc8433a32e20d (not needed by the code: checkout is initialised server-side).
- Functions: `POST /api/pay-init {interval}` (Paystack hosted checkout, card only, callback `/app?pay=done`), `POST /api/pay-verify {reference}` (called by the app on return; checks metadata.user_id), `POST /api/pay-manage` (Paystack manage link: update card / cancel), `POST /api/paystack-webhook` (HMAC SHA512 check; charge.success, subscription.create, subscription.not_renew, subscription.disable, invoice.payment_failed).
- No migration: Paystack ids reuse the existing columns. `subscriptions.stripe_customer_id` = CUS_ code, `stripe_subscription_id` = SUB_ code, `payments.stripe_invoice_id` = `ps_<reference>`. `amount_usd` = KES / `KES_PER_USD` (default 130). Pro = `profiles.plan='Pro'`.
- Client: `bUpgrade` and `stManage` switch to Paystack only when `/api/status` returns `pay:true` (needs `PAYSTACK_SECRET_KEY` + `SUPABASE_SERVICE_ROLE_KEY` in Vercel). Otherwise the old "Request invoice" flow stays.
- Mock test: `node /home/user/paytest.js`.
- Before live: switch to live key and live plan codes; enable USD when a Kenyan USD account is approved.

## Deployments (22 Oct 2026)
- Vercel Hobby allows about 100 deployments a day and every commit to `main` is one. On 21 Oct the limit was reached, so the last commits (Paystack receipts fix, Check for payments, Billing plan fix) were on GitHub but not deployed. Commit each change as ONE commit (index.html, api files and rebuilt pages together).
- If commits pile up while limited, Vercel does not deploy them later on its own: push one new commit (or Vercel > Deployments > Create Deployment from `main`) once the limit clears.

## Content Security Policy (22 Oct 2026)
- Set in `vercel.json` headers. Allows: scripts from self, inline (the app is inline and uses onclick handlers), `wasm-unsafe-eval` (card scanner) and cdn.jsdelivr.net (qrcode-generator, supabase-js, jsQR, tesseract.js) plus eu-assets.i.posthog.com; connections to the Supabase project (https + wss), Nominatim, jsDelivr and tessdata (scanner data), PostHog EU; workers from blob:; images from https/data/blob; no frames, no plugins, framing only by self.
- Adding a new CDN, API or embed? Add its origin to the right directive or it will be blocked. Test: `python3 /home/user/csptest.py` (injects the policy, opens every website and app page, loads the QR reader and scanner, reports violations).

## Accessibility, WCAG 2.2 AA (22 Oct 2026, v28)
- axe-core (wcag2a/aa, 21a/aa, 22aa) on all website pages, the public card and all app pages at 390 and 1366px: 0 violations after fixes. Keyboard pass (Tab through each page): every stop has a visible focus ring and a name.
- Fixes: global `:focus-visible` ring (3px #3157ff); darker text for green/orange/purple/blue/pink chips, tags, rings, counters and danger text; avatars get a 30% dark overlay so white initials pass; "old way" lane on home no longer faded below contrast; target sizes at least 24px rendered (note the app shell is zoomed to 0.8 at desktop widths, so use 31px CSS); `itA11y()` removes aria-labels that hid visible text (2.5.3), moves aria-label off `<label>` to its input, and gives clickable divs tabindex/role with Enter/Space activation.
- IMPORTANT for CSS additions: insert before the FIRST `</style>` (`s.index`). The last `</style>` in the file is inside the invoice print template string in JS.
- Tests: `python3 /home/user/axetest.py 390|1366`, `python3 /home/user/axecc.py 390` (contrast detail), `python3 /home/user/kbtest.py` (keyboard).

## Admin retest (22 Oct 2026, v29)
- Users, Moderation, Rooms, Revenue, Privacy requests, Staff, Audit log: node tests all pass; at 390 and 1366px nothing wider than the screen, no cut-off buttons or headings, no script errors; axe-core 0 violations after fixes.
- Fixes: closed mobile sidebar drawer is now `visibility:hidden` (it was reachable by Tab and screen readers while off-screen); red status pill `.t-r` darker for contrast; `itA11y()` no longer makes rows that contain buttons focusable (nested-interactive on Privacy and Audit rows) and names icon-only buttons on phones (Export CSV, Invite user) from their hidden label.
- Test: `python3 /home/user/admcheck.py 390|1366 [axe]` (uses /home/user/mock.js).

## Automated check: profile photo crop (22 Oct 2026)
- `python3 tests/app/photo_crop.py` (run from the repo root) opens the real crop dialog from Settings at 14 sizes (1920x1080 down to 320x568, including short laptop windows 1310x640, 1280x600, 1280x520 and small phones) and checks Save photo is fully visible: inside the screen, inside the scrolling dialog, and not covered (checked at its corners and centre), before and after zooming. Exits with code 1 and names the failing sizes otherwise.
- Verified it catches the bug: with the sticky button bar removed and a taller picture, it fails on 1310x640, 1280x600, 1280x520, 1024x600 and the small phones.
- Run it after any change to the photo dialog, modals or global CSS.

## GitHub Actions: photo crop check (22 Oct 2026)
- `.github/workflows/photo-crop.yml` runs `python tests/app/photo_crop.py` with Playwright (Chromium) on every push to `main`, on every pull request, and on demand (Actions tab > "Photo crop dialog check" > Run workflow). A red X on the commit means Save photo is cut off or covered at one of the 14 sizes; the log names the sizes.
- Actions runs are separate from Vercel and do not use Vercel deployments.

### Photo crop v32 (22 Oct 2026)
`pcFit()` (end of the main script) measures the dialog after it opens: it shrinks the picture until Save photo/Cancel sit inside the window and inside every box that could clip them, and adds a "Save" button in the dialog header next to the close button that can never be pushed off. Refits on resize. Checked with `tests/app/photo_crop.py` (14 sizes) and with the dialog forcibly clipped three different ways.
- v33: Vercel confirmed v32 live, yet the owner's browser showed no header Save, so the late script override was not running there. The header Save button and inline-styled Save photo/Cancel are now written straight into the `pcOpen` template, which calls `pcFit` itself. They no longer depend on any later override.
- v34: root cause found. The owner's ad blocker hides any element classed `ad-btn` (generic cosmetic filter), which removed Save photo, Cancel and the header Save from the popup while the × (class `x`) stayed. The popup buttons now use `.pcb`. Follow-up done in v35.

- v35: every class starting `ad-` (ad-btn, ad-card, ad-h, ad-sel, ad-opl, etc., 430 uses) renamed to `ix-` in index.html and tests/admin/*.js, so ad blockers no longer hide admin buttons or cards. **Never name a class `ad-...` again.** All 10 admin node tests, admcheck 390/1366 with axe, sweep 390/1366 app, axe on all pages, keyboard pass and photo_crop pass after the rename.

## Rooms access v36 (22 Oct 2026)
- **Agnes must run `supabase/migrations/014_rooms_access.sql`.** It adds:
  - tables `room_passes`, `room_members` and `room_invites`
  - a `rooms_need_pass` trigger: the 2nd and later Rooms need an unused pass; staff are exempt
  - helper functions `owns_room` and `is_room_member`, which policies use so the policies never call each other (that would be infinite recursion)
  - a "members read rooms" policy
  - functions `room_public` (anon), `room_join`, `room_leave`, `room_member_set`, `room_invite`, `room_uninvite`, `room_members_list`, `my_room_passes` and `admin_room_pass_grant`
- **API:**
  - `pay-init {kind:'rooms'}` starts a one-off KES charge with metadata kind rooms.
  - `applyRoomPass` in `api/_lib/pay.js` inserts the pass, ignoring a duplicate reference, then records the payment and the receipt.
  - `pay-verify` and the webhook branch on `meta.kind === 'rooms'`.
  - Mock test: `node /home/user/roompaytest.js`.
- **Client:**
  - The v36 block uses prefixes `ra*`/`RA` for the Room page and passes, and `rj*`/`RJ` for the join page. Do not use `rm*`, which is admin Rooms.
  - The Create form gets Type and Repeats (`rk`, `rr`).
  - `pay=done&kind=rooms` is handled.
  - `vTap` lists every Room the person can see in cloud mode.
  - Admin Users panel: Room passes > Add a Room pass.
- **Fallbacks:** if 014 is missing, the join page shows the old static page, the members box is hidden, and passes fall back to `prefs.billing.roomCredits`.
- **Tests that passed:**
  - `/home/user/ratest.py`: demo create of a community with weekly repeat
  - `/home/user/rjtest.py`: every join page state
  - all 10 admin tests, the app sweep at 390 and 1366, photo_crop and the API mock
- The database functions are written but not yet run against a real database. Test them in Supabase after running 014.
- v36 loop check (22 Oct 2026):
  - **Fixed:** `api/pay-sync.js` now sends Room pass payments (`metadata.kind = 'rooms'`) to `applyRoomPass`. Before the fix, "Check for payments" would have run them through `applyCharge` and switched Pro on.
  - Render-loop test with a simulated Supabase (`/home/user/looptest.py ok|fail`), on the Room page, the Rooms list, the join page, the join button and the sign-in return to the Room:
    - the page redraws only 1 to 3 times, then stays still
    - each server function is called once
    - nothing changes when 014 is missing
  - The database rules can't loop:
    - the `rooms` and `room_members` policies use the `owns_room` and `is_room_member` helpers, which run with elevated rights, so the policies never call each other
    - the trigger only updates `room_passes` and never inserts into `rooms`
  - Paystack retries are safe: a payment reference creates only one pass, whether it comes through verify, the webhook or sync.
- v36 live test (22 Oct 2026, after Agnes ran 014, Paystack test mode), all passed:
  - The second Room was blocked until a pass was bought (KES 25,870 test checkout). The pass was then added and used.
  - Request to join a private Room, then Let in: "1 of 2 joined".
  - A Room with a limit of 2 filled with two accounts.
  - Test Rooms left in place: QAP55 (private, limit 2) and QAS41.
  - Fixed afterwards: signed-out visitors to a full Room now see "This Room is full" instead of "Sign in to join".
  - Not tested live: a third signed-in person being turned away. The database function enforces this.

## Security hardening v37 (22 Oct 2026)
- **Agnes must run `supabase/migrations/015_security.sql`.** It adds:
  - a private profile read through `my_profile()`, with column-level select on `profiles` for the public
  - the `profiles_guard` trigger, so clients cannot change `plan`
  - `profiles_len_chk` length and size limits
- **App and API fallbacks:** if 015 is missing, the old direct reads are used.
- **API:** every function calls `guard()` in `_lib/common.js` (origin allowlist + per-IP rate limit). Extra allowed origins can be added with the Vercel env var `ALLOWED_ORIGINS` (comma-separated).
- **CDN scripts:** supabase-js is pinned to 2.118.0 (`dist/umd/supabase.js`) with SRI. qrcode-generator 1.4.4 has SRI. To update either, change the URL and the sha384 hash together.
- **Full findings:** SECURITY-AUDIT.md. Refactor plan: ARCHITECTURE.md.
- **Tests passed after v37:**
  - all 10 admin tests
  - photo_crop
  - the Rooms tests (ratest, rjtest, looptest)
  - the app sweep at 390px
  - the API mocks (roompaytest, paytest, synctest)
  - a guard unit check: a foreign origin gets 403, the 10th request in a minute gets 429
- 22 Oct 2026: owner reports Agnes ran migration 015, turned on leaked-password protection and checked the sign-in limits. Not yet verified from Town (a direct database check was refused by policy); verify through the app.
- 22 Oct 2026: Agnes's check `has_column_privilege('anon','public.profiles','prefs','select')` returned TRUE after 015, so the privacy fix was not in effect. Added `016_security_fix.sql`, which removes every SELECT path (table and column, PUBLIC/anon/authenticated), re-applies 015 and ends with a self-check table (all rows must say ok).
