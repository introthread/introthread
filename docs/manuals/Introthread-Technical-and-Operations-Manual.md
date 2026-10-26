# Technical and Operations Manual

_Architecture, configuration, security, testing, deployment and runbooks for the Introthread platform_

| Document No. | Version | Date of issue | Status |
|---|---|---|---|
| IT-DOC-TM-001 | 1.0 | 26 October 2026 | Approved for release |

**Audience:** The product owner, developers and anyone operating Introthread

**Related documents:** IT-DOC-UG-001 User Guide; IT-DOC-AG-001 Administrator Guide; README.md; ARCHITECTURE.md; SECURITY-AUDIT.md; HANDOVER.md; docs/CHANGELOG.md

## 01 System overview

Introthread is a web application (installable on phones) for professional networking. It is built as a single-page front end served by Vercel, a Postgres database with authentication on Supabase, and a set of serverless functions on Vercel for email, payments, AI drafts and scheduled jobs.

| Component | Technology | Notes |
|---|---|---|
| Front end | HTML, CSS and JavaScript single-page app | index.html, app-shell.html and 9 pre-rendered public pages; code in /js, styles in four /css files; scripts deferred and versioned with ?v=<hash>. |
| Hosting | Vercel (Hobby plan) | Deploys main automatically; security headers and CSP in vercel.json. |
| Database and auth | Supabase (project zpcsmsqnesqftodnondn) | Postgres with row-level security on every table, Auth, RPC functions. |
| Server functions | Vercel serverless (/api) | Email, AI drafts, payments, webhooks, cron jobs, status. |
| Email sending | Resend | Domain introthread.com via the send subdomain; Supabase sign-in emails use Resend SMTP. |
| Email receiving | ImprovMX (free forwarding) | *@introthread.com forwards to the owner's Gmail. |
| Payments | Paystack (KES) | Pro subscriptions and Room passes; currently test mode. |
| AI | Google Gemini (free tier); Anthropic or OpenAI optional | Follow-up drafts only; never sends anything. |
| Source control | GitHub introthread/introthread | Commits go directly to main. |

## 02 Architecture

### Front end

- `index.html` holds only page structure and file links. `js/core.js` loads first, then feature files in order (for example `threads.js`, `rooms.js`, `settings.js`, `payments.js`, `google-calendar.js`).
- `scripts/build_pages.py` builds the 9 public pages (about, how, login, networks, pricing, privacy, rooms, signup, terms) with their own SEO head; `scripts/prerender.py` saves their text into the HTML. `index.html`, `app-shell.html` and the 9 pages are always rebuilt and committed together.
- No inline JavaScript: markup uses `data-on-*` handlers run by `js/actions.js`, which keeps the Content Security Policy strict.
- Rules: sans-serif fonts only, no emojis, tested at 360 to 430 px wide, class names never start with `ad-`.

### Data model (main tables)

| Table | Purpose |
|---|---|
| profiles | Member profile, handle, card links, theme and private preferences (prefs, including billing). |
| threads | A meeting between the owner and another person: guest token, contact details, where met, private note, Room, confirmed, mine/theirs answers, resolution. |
| thread_events | Timeline of each Thread (tap, confirm, answer, follow-up, resolved, notes such as "Match emailed"). |
| rooms, room members, room_checkins | Rooms, membership, invitations, sessions and attendance. |
| subscriptions, payments, room_passes | Billing records written only by the server. |
| plans | Plan names, prices and limits edited in Admin. |
| staff, audit tables | Staff roles and the audit log. |

### Server functions (/api)

| Function | Purpose | Access |
|---|---|---|
| status | Which features are configured (email, ai, nudges, pay); never returns keys. | Public, rate-limited |
| notify | Emails the other person the confirm link, once per Thread. | Signed-in owner |
| match-notify | Emails both people once when their answers match; refuses the owner using their own guest link. | Owner or guest token |
| ai-draft | Writes a follow-up draft from one Thread's context. | Signed-in owner |
| room-invite | Adds invitations to a Room and emails the link. | Room organiser |
| pay-init, pay-verify, pay-manage, pay-sync | Paystack checkout, verification, management and sync. | Signed-in member |
| paystack-webhook | Records successful charges (signature checked). | Paystack only |
| cron-nudge | Daily reminders for Threads 48 to 72 hours old that need a step. | Vercel Cron with CRON_SECRET |
| weekly-digest | Weekly summary for members who switched it on. | Vercel Cron with CRON_SECRET |

Every function uses a shared guard: same-site origin check, no cross-site preflight, and a per-IP rate limit.

### Scheduled jobs

| Job | Schedule (UTC) | Nairobi time |
|---|---|---|
| /api/cron-nudge | 0 6 * * * (daily) | 09:00 daily |
| /api/weekly-digest | 0 6 * * 1 (Mondays) | 09:00 Mondays |

## 03 Configuration

### Vercel environment variables (Production)

> **Rule.** Secret values live only in Vercel and Supabase. Never commit them, paste them into chat or email, or write them in documents.

| Variable | Purpose | Status (26 Oct 2026) |
|---|---|---|
| RESEND_API_KEY | Sending notification emails | Set |
| NOTIFY_FROM | Sender, default "Introthread <hello@introthread.com>" | Optional (default used) |
| SUPABASE_SERVICE_ROLE_KEY | Server-only database access for cron jobs and match emails | Set |
| CRON_SECRET | Protects the scheduled jobs | Set (26 Oct) |
| GEMINI_API_KEY | AI drafts on Google's free tier | Set (26 Oct) |
| GEMINI_MODEL, GEMINI_PAID | Optional model override; set GEMINI_PAID=1 on a paid Gemini plan to include private notes | Not set |
| ANTHROPIC_API_KEY / OPENAI_API_KEY, AI_MODEL | Optional paid AI providers (used before Gemini when set) | Not set |
| PAYSTACK_SECRET_KEY | Paystack API | Set (test key) |
| PAYSTACK_PLAN_MONTH, PAYSTACK_PLAN_YEAR | Pro plan codes | Test codes; recreate in live mode |
| ROOM_PASS_KES, KES_PER_USD | Room pass price in shillings (default 199 x 130 = KES 25,870) | Defaults |
| SITE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, ALLOWED_ORIGINS | Overrides for site and Supabase addresses | Defaults |

### Supabase settings

- Authentication > URL Configuration: Site URL https://www.introthread.com; redirect URLs https://www.introthread.com/** and https://introthread.com/**.
- Providers on: Email (confirm email on), Google, LinkedIn (OIDC). Microsoft (Azure) was removed on 24 October 2026.
- Allow manual linking: on (needed for Connect in Settings > Integrations).
- Custom SMTP: smtp.resend.com, port 465, user resend, sender noreply@introthread.com, name Introthread.
- Recommended: raise "Emails sent per hour" (for example 100) and paste the templates from supabase/email-templates.

### Database migrations

Schema is in `supabase/schema.sql`; changes are in `supabase/migrations/NNN_*.sql`, run by the owner in the Supabase SQL Editor. Migrations 002 to 021 have all been run.

| Migration | Adds |
|---|---|
| 002 to 004 | Contacts, admin functions, dashboard ranges |
| 005 to 012 | Admin screens: users, moderation, rooms, revenue, plans, privacy, staff, audit |
| 013 | Fix for ambiguous columns |
| 014 | Rooms access: joining, private Rooms, limits, members, card-paid Room passes |
| 015, 016 | Security hardening and private profile read |
| 017 | Room sessions and attendance |
| 018 | Billing guard: browser cannot change server billing fields |
| 019 | Pricing: Free 5 Threads a month, Pro $12 / £9 |
| 020, 021 | Paid Rooms, then one free small event a month for up to 20 people |

### Domain and DNS

introthread.com is registered with the domain host; the live zone is served by ns1 to ns4.mysecurecloudhost.com and edited in the domain's DNS management in the client area. The hosting (Enhance) panel zone is not live: do not edit DNS there.

| Record | Name | Value | Purpose |
|---|---|---|---|
| A | @ | 216.198.79.1 | Website on Vercel (apex redirects to www) |
| CNAME | www | 6a4a04d359ca44ce.vercel-dns-017.com | Website on Vercel |
| MX | @ | mx1.improvmx.com (10), mx2.improvmx.com (20) | Receive mail (ImprovMX) |
| TXT | @ | v=spf1 include:spf.improvmx.com ~all | SPF for the root domain |
| CNAME / MX / TXT | send | send.forge.rmta.net; MX feedback.forge.rmta.net; SPF | Resend sending |
| TXT | resend._domainkey | DKIM public key | Resend signing |
| TXT | _dmarc | v=DMARC1; p=none; | DMARC (optionally add rua=mailto:hello@introthread.com) |

### Google and Search

- Google Auth Platform: app Introthread, branding verified, authorised domains introthread.com and the Supabase domain; redirect URI https://zpcsmsqnesqftodnondn.supabase.co/auth/v1/callback.
- Google Search Console: verified with google0693ac56298b9d88.html at the site root. Never delete this file.

## 04 Email

| Email | Sent by | From |
|---|---|---|
| Sign-in code, verification, password reset | Supabase Auth through Resend SMTP | noreply@introthread.com |
| Confirm link, You matched, reminders, weekly summary, Room invitations | Vercel functions through the Resend API | hello@introthread.com |
| Incoming mail to any @introthread.com address | ImprovMX forwarding | Arrives in the owner's Gmail |

Live checks on 25 and 26 October 2026: confirm-link, You matched and password reset emails arrived in the Gmail inbox, not spam.

## 05 Payments

- Paystack charges in Kenyan shillings: Pro about KES 1,560 a month; Room pass KES 25,870.
- Checkout: /api/pay-init; on return /api/pay-verify; the webhook records charge.success. Each payment reference adds only one Room pass.
- Billing fields (plan, status, card, room credits) are written only by the server (migration 018).
- Bank transfers: staff grant Room passes in Admin (audited).

### Go-live checklist (after business registration is approved)

1. In Paystack, switch to Live mode and copy the live secret key.
2. Create the Pro plans again in Live mode (monthly KES 1,560 and yearly) and copy both plan codes.
3. In Vercel, set PAYSTACK_SECRET_KEY, PAYSTACK_PLAN_MONTH and PAYSTACK_PLAN_YEAR, then redeploy.
4. Set the live webhook URL to https://www.introthread.com/api/paystack-webhook.
5. Run a checkout test that stops before paying, then one small real payment and refund.
6. Add the company's legal details to invoices and the site footer.

## 06 AI follow-up drafts

- Provider order when several keys are set: Anthropic, OpenAI, then Gemini.
- Gemini models tried in order: gemini-3.5-flash-lite, gemini-3.1-flash-lite, gemini-2.5-flash (moves on only when a model is not available).
- Prompt rules: 60 to 120 words, plain text, opens with "Hi <first name>,", names the place where they met in the first sentence, dates written as "26 October", no invented facts; the server adds the greeting if a model leaves it out.
- On free Gemini the private Thread note is not sent, because Google may use free-tier prompts to improve its products. The privacy policy states this.
- Errors: 429 returns "AI is busy right now"; other provider errors show the status code and are logged to Vercel.

## 07 Security

- Row-level security on every table; private profile read (migration 015); server-only billing fields (018).
- Strict security headers: Content Security Policy, HSTS with preload, nosniff, frame and referrer policies, permissions policy.
- Every API function is rate-limited and requires sign-in, a guest token, a webhook signature or the cron secret.
- Admin requires two-step verification, role checks on the server and an audit log.
- Passwords are hashed by Supabase Auth; leaked-password protection is on.
- Known limit: an owner who signs out and opens their own guest link elsewhere could answer for the other person; capped at one match email per Thread and rate-limited.
- Full findings: SECURITY-AUDIT.md.

## 08 Quality assurance

| Test | What it checks |
|---|---|
| tests/admin/*.js (jsdom) | Admin screens and server logic, including tmatch (You matched email) and tai (AI drafts). Each ends with errs []. |
| tests/app/integrations.py, notifications.py, thread_stages.py | Settings integrations, notifications and every Thread stage in a real browser. |
| tests/app/photo_crop.py | The photo crop dialog at 14 screen sizes. |
| Sweeps at 390 and 1366 px | Every page with the CSP enforced and axe accessibility checks. |
| Before and after screenshots | 52 screens compared for every change. |

Every release in this period passed the admin tests, every script in tests/app, the sweeps with the CSP enforced, and axe, unless noted as a server-only change.

## 09 Deployment and operations

1. Make the change, then run `npm run format` and the page build (`python3 scripts/build_pages.py`).
2. Run the tests listed above.
3. Commit to main with a clear message and update docs/CHANGELOG.md and HANDOVER.md.
4. Vercel deploys automatically within about a minute.
5. Check https://www.introthread.com/api/status: it should show email, ai, nudges and pay as true.

### Runbooks

| Situation | Action |
|---|---|
| A secret may have leaked | Create a new key at the provider, update Vercel or Supabase, redeploy, then delete the old key. |
| Emails stop arriving | Check Resend (domain verified), the DNS records above and Supabase SMTP settings; check Spam. |
| Reminders not sent | /api/status must show nudges: true (CRON_SECRET and SUPABASE_SERVICE_ROLE_KEY set); check Vercel Cron logs. |
| AI drafts fail | Check GEMINI_API_KEY and Vercel logs for "ai-draft"; a 429 means the free quota was reached. |
| Sign-in with Google or LinkedIn fails | Check the provider is on in Supabase, redirect URLs, and the Google or LinkedIn app settings. |
| Site needs pausing | Admin > Settings > Maintenance mode. |

## 10 Release history (23 to 26 October 2026)

| Release | Summary |
|---|---|
| v110 to v117 | Clean-up plan finished: single implementations of render, newThread, vPublic and saveCard; app-core.js renamed js/core.js; real 404s for missing files; company logo backing. |
| v118, v119 | Card and profile style pickers preview until Save. |
| v120 | Older light company logos get the right backing automatically. |
| v121 | Removed unused Settings style picker code. |
| v122 | Microsoft sign-in removed (owner's decision). |
| v123 | "You matched" email to both people, once per Thread. |
| v124 | Continue with LinkedIn on login and signup. |
| v125 | Review fixes: LinkedIn token no longer treated as Google Calendar; LinkedIn name and photo autofill; no missed match emails. |
| v126 | Thread owner cannot answer for the other person. |
| v127 | Free AI drafts with Google Gemini; private note withheld on free tier; privacy policy updated. |
| v128 | Own-link check fixed live; guest page shows clean place names; clearer AI error messages. |
| v129 | Current free Gemini models with fallback. |
| v130 | AI drafts open with a first-name greeting and name the place met. |
| v131 | Natural dates in AI drafts ("26 October"). |

Operational changes in the same period: Search Console verified; Resend sign-in emails; Google and LinkedIn sign-in; manual linking on; hello@introthread.com receiving via ImprovMX; CRON_SECRET and GEMINI_API_KEY added.

## 11 Open items

| Item | Owner | Status |
|---|---|---|
| Paystack live keys and live plan codes | Agnes | Waiting for business registration approval |
| Company legal details on invoices and footer | Agnes | Waiting for business registration approval |
| Full LinkedIn sign-in round trip on the live site | Agnes | To test once |
| Supabase email rate limit and templates | Agnes | To confirm |
| Signed-in network and console audit of the 7 app screens | Agnes and developer | Needs a HAR file and console log |
| DMARC reporting address | Agnes | Optional |
| Networks dashboard, Warmth API and SSO | Product | Roadmap |
