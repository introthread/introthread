# Security audit - Introthread

Date: 22 Oct 2026 (v37). Scope: the whole app (`index.html`), server functions (`api/`), database (`supabase/schema.sql`, migrations 002-015), hosting config (`vercel.json`), and third-party scripts.

**Action needed:** Agnes must run `supabase/migrations/015_security.sql` in the Supabase SQL Editor. The app works before and after; the database fixes (S1-S3) only apply once it is run.

## Findings and fixes

| ID | Area | Severity | Finding | Fix |
|---|---|---|---|---|
| S1 | Data exposure | High | `profiles` was readable by anyone, including private columns: `prefs` (billing details, invoices, card brand and last 4 digits, settings) and `plan`. | Migration 015: the public can read only the card columns (id, handle, name, role, company, city, bio, theme, links, created_at). Each person reads their own full row through `my_profile()`. App and `api/ai-draft.js` updated to use it, with a fallback. |
| S2 | Broken access control | High | A signed-in person could set their own `profiles.plan` to Pro. | Migration 015 trigger `profiles_guard`: only the payment server, database functions and staff can change `plan`; new profiles always start Free. |
| S3 | Input validation | Medium | No length limits on most profile fields; `links` (which stores the photo) had no size limit. | Migration 015 check constraint: text fields up to 120 characters, `links` and `prefs` up to about 1.5 MB. Existing rows are not re-checked. |
| S4 | API abuse | Medium | No rate limiting and no origin check on server functions. | `guard()` in `api/_lib/common.js`, used by every function: refuses requests from other websites (403), refuses cross-site preflight, and limits requests per IP and route (429 with Retry-After). Limits: AI drafts 10/min, payments 10-20/min, notify 20/min, status 60/min, webhook 120/min. |
| S5 | Supply chain | Medium | `supabase-js` loaded as the floating version `@2`, and no CDN script had an integrity check. | Pinned to `@supabase/supabase-js@2.118.0` and added Subresource Integrity (sha384) and `crossorigin` to both static CDN scripts. If the CDN file is altered, the browser refuses it. |
| S6 | Cross-site scripting | Medium | Some values were inserted into HTML without escaping: announcement text in Admin > Settings, staff invitation email and error message, plan names and tags on the Billing page. | Escaped with `esc()`. A scan of every `${...}` that inserts a name, bio, company, role, note, email or description found no other unescaped HTML output. The rest are escaped, or are plain text such as vCards, email bodies and page titles. |
| S7 | Open redirect / injection | Low | The "return to Room after sign-in" code was read from browser storage and used in a path. | Validated as 2-12 letters or digits before use (`rjCode`). |
| S8 | Session expiry | Low | Staff sessions on /admin never timed out. | Admin area signs out after 30 minutes without activity. |
| S9 | Security headers | Low | Already good: HSTS (2 years, preload), CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP. | Added X-Permitted-Cross-Domain-Policies: none, Cross-Origin-Resource-Policy: same-site, X-DNS-Prefetch-Control: off. |
| S10 | Payments | Fixed earlier (v36) | Payment sync could have turned Pro on for a Room pass payment. | Fixed in commit e769814. |

## Checked and found sound
- **SQL injection:** the database is reached only through Supabase's REST API and RPC, with parameters, never string-built SQL. No `execute`/dynamic SQL in any migration. Server functions build REST filters only from verified values (the user's id from their token, or URL-encoded Paystack codes).
- **CSRF:** the API uses `Authorization: Bearer` tokens, not cookies, so another site cannot make a logged-in request; S4 adds an origin check as well. The Paystack webhook checks Paystack's HMAC SHA-512 signature in constant time. The cron endpoint needs `CRON_SECRET`.
- **Authentication and passwords:** Supabase Auth stores passwords hashed with bcrypt; the app never sees or stores them. Sign-up requires at least 8 characters. Email codes are 8 digits. Staff need two-step verification (`admin_require_mfa`).
- **Authorisation:** row-level security is on for every table. Admin functions call `assert_staff(roles)` and write the audit log, which cannot be edited. Room rules (014) are enforced in the database.
- **Secrets:** no secret keys in the code. `config.js` holds only the public anon key, which is designed to be public and is limited by row-level security. Paystack, Resend, AI and service-role keys live only in Vercel environment variables.
- **HTTPS everywhere:** HSTS with preload, `upgrade-insecure-requests` in the CSP, and Vercel redirects HTTP to HTTPS.
- **CORS:** no `Access-Control-Allow-Origin` header is sent, so browsers block other sites from reading API responses. S4 also refuses their requests.
- **File uploads:** profile photos are read in the browser, re-drawn on a canvas and saved as a 480px JPEG data image, so no raw file reaches the server. The business card image never leaves the device.
- **Session hijacking:** tokens are kept by supabase-js in browser storage. The strict CSP (no third-party scripts except the pinned, integrity-checked CDN files and consented PostHog) limits XSS-based theft. Access tokens expire after 1 hour by default.

## Still to do (cannot be done from code)
1. Run migration 015.
2. Supabase dashboard > Authentication:
   - turn on leaked-password protection
   - keep the minimum password length at 8 or more
   - keep refresh token rotation on
   - consider a session time-box, for example 30 days
3. Supabase dashboard > Authentication > Rate limits: check the email and OTP limits.
4. Paystack: switch to live keys only when going live, and keep the webhook secret in Vercel only.
5. **Content Security Policy:** it still allows `unsafe-inline` because the whole app is inline with `onclick` handlers. Removing that needs the app split into files (see ARCHITECTURE.md, "Refactor plan").
6. **Dependencies:** the only third-party code is the pinned CDN files plus scripts loaded on demand (jsQR, tesseract.js, PostHog). Review versions monthly and update the pins and hashes together. A Dependabot config could not be added because the GitHub connection cannot write to `.github/`.
7. **Card data in profiles:** `prefs.billing` (invoices, card last 4) is still written by the browser for display. The payment truth is in `subscriptions`, `payments` and `room_passes`, which only the server writes. Moving billing display to those tables would remove client-edited billing data entirely.
