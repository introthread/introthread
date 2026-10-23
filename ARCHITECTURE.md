# Architecture

## Overview
```
Browser (index.html SPA) --HTTPS--> Supabase (Auth, Postgres + RLS, RPC)
        |                               ^
        +--HTTPS--> Vercel functions (api/*) --service role--+
                          |--> Paystack (payments)   |--> Resend (email)   |--> Anthropic/OpenAI (drafts)
Paystack --webhook (HMAC)--> api/paystack-webhook
Vercel Cron (06:00 UTC) --> api/cron-nudge
```

## Front end (`index.html` + `/js` + `/css`)
- **Routing:** clean paths mapped to the hash router `RH()`.
  - `/` and the marketing pages
  - `/app/...`: the signed-in app, with Today, Tap, Threads, Rooms, Card, Profile, Settings and Event mode at `/app/scan`
  - `/<handle>`: public card
  - `/t/<token>`: guest Thread page
  - `/r/<CODE>`: Room join page
  - `/admin/<tab>`: staff area
- **State:** the `DB` object, saved in localStorage in demo mode. In cloud mode it is loaded from Supabase by `loadCloud`. `MODE` is `'demo'` or `'cloud'`; use `cloud()` to check.
- **Files:** `index.html` (about 6 KB) holds page structure and `<link>`/`<script>` tags. `js/app-core.js` loads first; the other `/js` feature files load after it, in order, deferred and versioned with `?v=<hash>`. Styles load from `css/base.css`, `app.css`, `admin.css` and `features.css`.
- **Layering:** some later features still wrap earlier functions (for example `render`, `vRoom` and `newRoom9`); folding these in is a next step. Global name prefixes, so names never clash:

  | Prefix | Area |
  |---|---|
  | `au` | Users |
  | `md` | Moderation |
  | `rm` | admin Rooms |
  | `rv` | Revenue |
  | `pl` | Plans |
  | `sg` | Settings |
  | `pq` | Privacy |
  | `sf` | Staff |
  | `al` | Audit |
  | `ra` / `rj` | Room access / join page |
  | `b` | Billing |
  | `it` | server features |

- **Security helpers:**
  - `esc()` escapes all HTML output.
  - `itA11y()` handles accessibility.
  - The admin idle sign-out is v37.

## Server functions (`api/`)
`_lib/common.js` holds the shared code:
- `send` and `readBody` (20 KB cap)
- `caller`, which checks the user's token with Supabase
- `guard`, which does the origin check and rate limit
- `sendEmail` and `layout`

`_lib/pay.js` holds the Paystack helpers and `applyCharge` / `applyRoomPass`.

| Function | Purpose |
|---|---|
| notify | email the confirm link |
| ai-draft | AI follow-up |
| status | which features are configured |
| pay-init / pay-verify / pay-manage / pay-sync | Paystack |
| paystack-webhook | Paystack events |
| cron-nudge | daily reminders |

Each returns 503 `not_configured` until its keys exist.

## Database
- Core tables: `profiles`, `threads`, `thread_events`, `rooms`.
- Admin and billing tables: `staff`, `audit_log`, `reports`, `account_status`, `plans`, `subscriptions`, `payments`, `app_settings`, `contacts`, `privacy_requests`, `admin_notes`.
- Rooms (014): `room_passes`, `room_members`, `room_invites`.
- Every table has row-level security. Privileged work runs in `security definer` functions that check `auth.uid()` or `assert_staff()`.
- Migrations are numbered and safe to re-run. 015 adds the security hardening.

## Refactor plan (steps 1-12 done)
The app used to be one 1.2 MB `index.html` with inline scripts, inline styles and inline `onclick` handlers. As of v63 it is:
1. split into `/js` feature files and four `/css` files, with the same global names;
2. free of duplicate function declarations (merged in v54);
3. free of inline JavaScript: every handler is a `data-on-*` attribute run by `js/actions.js`, and `'unsafe-inline'` is no longer in `script-src`.

Each step was done one screen or file per commit, with the full test list re-run after each.

### Progress
- **Step 1 (v41, 22 Oct 2026), done:** the newest feature code moved out of `index.html` into `/js` files, loaded after the main script in this order:
  1. `rooms-access.js`
  2. `admin-idle.js`
  3. `room-sessions.js`
  4. `billing-sync.js`

  The app's start-up (`boot`) now waits for `DOMContentLoaded`, so every file has run before the first screen is drawn. Before, it waited one microtask, which was only enough when all the code was inline.
- **Step 2 (v50, 22 Oct 2026), done:** the server features and payments code (v25-v26d) moved to `js/payments.js`, loaded first of the `/js` files. Every `/js` file is now formatted with Prettier (`.prettierrc.json`) so it reads like normal code. Run `npx prettier --write "js/*.js"` after editing.
- **Step 3 (v51, 22 Oct 2026), done:** the accessibility helper (v28) and the photo crop sizing (v32) moved to `js/a11y.js` and `js/photo-crop.js`. The main inline script now ends with the original app code, and every later feature lives in `/js` in load order: payments, a11y, photo-crop, rooms-access, admin-idle, room-sessions, billing-sync, first-visit, match-celebrate, install-prompt, company-logo.
- **Step 4 (v52, 22 Oct 2026), done:**
  - Each admin screen now has its own file: `js/admin-core.js`, `admin-dashboard.js`, `admin-users.js`, `admin-moderation.js`, `admin-rooms.js`, `admin-revenue.js`, `admin-plans.js`, `admin-settings.js`, `admin-privacy.js`, `admin-staff.js` and `admin-audit.js`.
  - The three small fixes that came after them are in `late-fixes.js`, keeping their original order.
  - All of these files are Prettier-formatted.
  - The `index.html` script is now about 0.9 MB, down from 1.2 MB.
  - The admin tests in `tests/admin` copy the `/js` files into the page before running.
- **Step 5 (v53, 22 Oct 2026), done:** the app features from v17 to v32 moved to `js/app-routing.js`, `billing.js`, `app-navigation.js`, `data-export.js`, `event-mode.js`, `capture.js` and `contacts-import.js`, all formatted. The inline script is now about 0.7 MB and holds only the original app plus the v4-v16 screen redesigns.
- **Why the rest is not split yet:** v4-v16 declare 28 functions more than once (for example `vToday`, `vThreads`, `vCard`, `vRooms`). Inside one script the last declaration wins everywhere; split into files, earlier code would see older versions. Before moving that part, merge each duplicate into a single function, one screen per commit.
- **Step 6 (v54, 22 Oct 2026), done: duplicates merged.**
  - All 27 functions that were declared more than once now have one declaration, one screen per commit: Today, Threads, Tap and Card, Rooms, Settings and profile, website pages.
  - The removed copies were dead code, because inside one script the last declaration always wins.
  - Tool used: the acorn parser, top-level declarations only.
- **Step 7 (v55, 22 Oct 2026), done: styles moved.**
  - The 382 KB `<style>` block moved to `css/base.css`, `app.css`, `admin.css` and `features.css`, in the original order, and Prettier-formatted.
  - Before-and-after screenshots of 14 page and size combinations matched, apart from normal animation noise.
  - `index.html` is now about 0.29 MB.
- **Step 8 (v56, 23 Oct 2026), done: core app moved.**
  - The last inline app script (285 KB, v1-v16) now lives in `js/app-core.js`, Prettier-formatted, about 6,000 lines.
  - It loads first, straight after `config.js` and the four `/css` files. Every other `/js` file depends on it.
  - `index.html` is now only page structure, the schema.org data and `<link>`/`<script>` tags, about 6 KB.
  - Tests swap in a fake Supabase by matching the formatted `const SB =` line in `js/app-core.js`. If you reformat that line, update `tests/admin/*.js` and `tests/app/*.py` too.
- **Step 9 (v57, 23 Oct 2026), done: faster loading.**
  - Every script is `defer` (order kept), so the browser no longer stops drawing the page to download the Supabase and QR libraries in `<head>`.
  - `/js` and `/css` links carry a content hash (`?v=`) and are cached for a year. Repeat visits load them from the browser cache, and a file's hash changes only when that file changes.
  - Start-up (`boot()` in `app-core.js`) waits for `DOMContentLoaded` through a `DOM_READY` flag, because with deferred scripts `readyState` is already `interactive` before the last files have run.
- **Step 10 (v58, 23 Oct 2026), done: pre-rendered website pages.**
  - `scripts/prerender.py` loads `/`, `/how`, `/rooms`, `/networks`, `/pricing`, `/about`, `/privacy` and `/terms` in headless Chromium (logged out, no network). It saves the drawn `#root` between `<!--pre-->` markers, so the text shows before scripts run and search engines read it directly. The app redraws the same content on load.
  - App, admin, card and room routes now use `app-shell.html` (an empty root) through the `vercel.json` catch-all, so they never flash the home page.
  - Login and signup are not pre-rendered, because they change with sign-in options.
  - Screenshots of each page with and without scripts match at 390px and 1366px. The only difference is the pulsing LIVE dot on /rooms.
- **Step 11 (v59-v63, 23 Oct 2026), done: no inline JavaScript.**
  - `js/actions.js` runs `data-on-*` handlers without eval.
  - All 747 inline handlers, across the admin screens and the app, are converted (v59-v62).
  - v63 removed `'unsafe-inline'` from `script-src`. A test with the policy enforced over the website, the demo app and admin found 0 violations.
- **Step 12 (v60, 23 Oct 2026), done: demo account locked down.** See `js/demo-mode.js` and HANDOVER.
- **Step 13 (v83, 23 Oct 2026), done: website pages split out.** The 15 website page functions (home, how it works, rooms with the sample report, networks, pricing, about, privacy, terms, 404, plus `mnav`, `foot`, `pHero`, `ctaBand`, `legalDoc`) moved unchanged from `js/app-core.js` to `js/site-pages.js`, loaded straight after it. `app-core.js` is down to about 5,800 lines. The pre-rendered pages were byte-for-byte the same before and after, apart from the new script tag.
- **Step 14 (v84, 23 Oct 2026), done: sign-up and login split out.** The 11 sign-up and login functions (`authSideBase`, `chkH`, `liveP`, `setPv`, `pickTheme`, `doSu3`, `vSignup`, `prevHTML`, `forgotPw`, `vLogin`, `authSide`) moved unchanged from `js/app-core.js` to `js/auth-pages.js`, loaded right after `site-pages.js`. `app-core.js` is down to about 5,570 lines. The pre-rendered pages are the same before and after, apart from the new script tag.
- **Step 15 (v85, 23 Oct 2026), done: Today screen split out.** The 6 Today screen functions (`dAction`, `dMenu`, `dIcs`, `fuOpen`, `fuSave`, `vToday`) moved unchanged from `js/app-core.js` to `js/today.js`, loaded right after `auth-pages.js`. The small `const` helpers they use (`dChip`, `dWarm`, `dRing`, `dSecHead`, `dPromo`, `D_OUT`, `DRANGE`) stay in `app-core.js` for now. `app-core.js` is down to about 5,410 lines. The pre-rendered pages are the same before and after, apart from the new script tag.
- **Step 16 (v86, 23 Oct 2026), done: Threads screens split out.** The 34 Threads functions (the list `vThreads` and `th*`, the Thread page `vThread` and `td*`, topics `tp*`, and `threadVcf`) moved unchanged from `js/app-core.js` to `js/threads.js`, loaded right after `today.js`. Shared state and helpers (`threadState`, `threadLink`, `TF2`, `TQ2`, `TSORT`, `TH_SORTS`, `TDT`, `topicsField`) stay in `app-core.js`. `app-core.js` is down to about 4,910 lines. The pre-rendered pages are the same before and after, apart from the new script tag.
- **Step 17 (v87, 23 Oct 2026), done: Today helpers moved.** The Today screen's helpers (`dChip`, `dWarm`, `dRing`, `dSecHead`, `dPromo`, `DRANGE`, `D_OUT`) moved unchanged from `js/app-core.js` to the top of `js/today.js`. Nothing at the top level of `app-core.js`, `site-pages.js` or `auth-pages.js` uses them while loading; `threads.js` and `billing.js` use them only inside functions at run time. `app-core.js` is down to about 4,860 lines. The pre-rendered pages are identical before and after.
- **Step 18 (v88, 23 Oct 2026), done: Tap and Card screens split out.** The 33 Tap and My card functions (`vTap`, `tap*`, `vCard`, `cd*`) moved unchanged from `js/app-core.js` to `js/tap-card.js`, loaded right after `threads.js`. The v11 `cdSave` wrapper (`const _cdSave11 = cdSave; ...`) ran during load, so it moved with `cdSave` and still runs straight after it. `app-core.js` is down to about 4,340 lines. The pre-rendered pages are the same before and after, apart from the new script tag.
- **Step 19 (v89, 23 Oct 2026), done: Threads state moved.** The Threads screens' own state and sort options (`TF2`, `TQ2`, `TS2`, `TSORT`, `TLIM`, `TCOMPACT`, `TFT`, `TFV`, `TH_SORTS`, `TDT`, `TDC`, `TDF`) moved unchanged from `js/app-core.js` to the top of `js/threads.js`. Nothing at the top level of `app-core.js`, `site-pages.js`, `auth-pages.js` or `today.js` uses them while loading; `app-core.js` and `app-navigation.js` use them only at run time. `app-core.js` is down to about 4,320 lines. The pre-rendered pages are identical before and after.
- **Step 20 (v90, 23 Oct 2026), done: Rooms screens split out.** The 33 Rooms functions (`vRooms`, `r*`, `ro*`, `vRoom`, `rm9`, `newRoom`, `newRoomModal`, `newRoom9`, `vRoomCode`, `roomStats`, `seedDemoRooms9`) moved unchanged, in their original order, from `js/app-core.js` to `js/rooms.js`, loaded right after `tap-card.js`. Two load-time wrappers moved with them so they still run right after what they wrap: the v4 `newRoom = function ...` replacement and the v9 `const _vRoom9 = vRoom; vRoom = ...` wrapper. The other references in `app-core.js` (`vRoomCode`, `rm9`, `seedDemoRooms9`) are inside `render` wrappers and only run once the page is running. `app-core.js` is down to about 3,670 lines. The pre-rendered pages are the same before and after, apart from the new script tag.
- **Step 21 (v91, 23 Oct 2026), done: Settings and profile split out.** The 65 Settings and profile functions (the profile editor `pf*`, the public profile editor `vProfile` and `pp*`, Settings `vSettings`, `st*` and `st12*`) moved unchanged, in their original order, from `js/app-core.js` to `js/settings.js`, loaded right after `rooms.js`. Nothing at the top level of `app-core.js` or earlier files uses them while loading. Their small shared values (`STAB`, `ST12`, `ST_TABS`, `PP`, `stCard`, `stTog`) and the account menu (`am*`) stay in `app-core.js` for now. `app-core.js` is down to about 2,830 lines. The pre-rendered pages are the same before and after, apart from the new script tag.
- **Next steps (next):**
  - Fold the remaining `vNN` wrappers (`const _f=f; f=function(){...}`) into the functions they wrap, one screen per commit, and merge `js/late-fixes.js` into the files it patches.
  - Keep splitting `js/app-core.js` (about 2,830 lines): move the remaining per-screen state next to its screen, then review what is left (data loading, routing, shared helpers).
  - Split `css/app.css` (about 12,800 lines) the same way, and remove unused rules.
  - Move the billing display off `profiles.prefs.billing` onto the server-written `subscriptions`, `payments` and `room_passes` tables (SECURITY-AUDIT.md, item 6).

  Run the full test list (`npm test`, plus the browser checks in HANDOVER.md) after each step.
