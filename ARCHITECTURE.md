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

## Front end (`index.html`)
- **Routing:** clean paths mapped to the hash router `RH()`.
  - `/` and the marketing pages
  - `/app/...`: the signed-in app, with Today, Tap, Threads, Rooms, Card, Profile, Settings and Event mode at `/app/scan`
  - `/<handle>`: public card
  - `/t/<token>`: guest Thread page
  - `/r/<CODE>`: Room join page
  - `/admin/<tab>`: staff area
- **State:** the `DB` object, saved in localStorage in demo mode. In cloud mode it is loaded from Supabase by `loadCloud`. `MODE` is `'demo'` or `'cloud'`; use `cloud()` to check.
- **Layering:** each feature version appends a JS block that wraps earlier functions, for example `render`, `vRoom` and `newRoom9`, and a CSS block. Global name prefixes, so names never clash:

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

## Refactor plan (in progress, one step per commit)
The single-file, layered design works and is fully tested, but it is hard to read. A safe refactor would:
1. split it into `app/*.js` modules and `styles/*.css`, keeping the same global names;
2. fold each `vNN` override into the function it wraps, one screen at a time, re-running the tests after each step;
3. replace inline `onclick` with event listeners, so the CSP can drop `unsafe-inline`.

This is several days of careful work and should be done screen by screen, never in one commit.

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
- **Next steps:**
  - Move the older blocks into `/js`, newest first, one file per feature: payments (v26), accessibility (v28), photo crop (v30-v34), then the admin screens.
  - Move CSS into `/css` files.
  - Fold the overrides into the functions they wrap.
  - Replace `onclick`.

  Run the full test list after each step.
