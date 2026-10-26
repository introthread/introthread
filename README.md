# Introthread

**Professional networking and relationship intelligence for professionals everywhere.**

Identity → Share → Connect → Remember → Follow Up → Grow

Introthread starts with a digital business card and turns every introduction into a lasting professional relationship. Users create a professional identity, share it by QR, NFC, link, email, SMS or wallet, capture the connection, keep the context of where and why they met, and follow up at the right time.

- Website: [introthread.com](https://introthread.com)
- Market: global, for professionals everywhere

## Connected accounts and services

All project services are registered to and connected through the project owner's account. Contact details for the owner and staff are kept outside this public repository.

| Service | Purpose | Status |
| --- | --- | --- |
| GitHub ([introthread/introthread](https://github.com/introthread/introthread)) | Source code and version control | Connected |
| Vercel | Hosting and deployments (connected to this repo) | Connected |
| Supabase | Database, authentication and storage | Connected |
| Domain: introthread.com | Primary brand domain | Registered |

> Never commit secrets (API keys, Supabase service-role keys, database passwords) to this repository. Keep them in Vercel environment variables and a local `.env.local` file, which must stay in `.gitignore`.

## Handover

The current state of the build, working rules, what has been done and what comes next are in [HANDOVER.md](HANDOVER.md). Read it before making changes.

## Development workflow

- Setup: `npm install` (Node 20.19 or later). This installs the pinned Prettier, jsdom and acorn from `package.json`.
- `npm test` runs the admin tests (each should end in `errs []`); `npm run test:photo-crop` runs the Playwright check; `npm run format` formats `/js` and `/css`; `npm run build:pages` rebuilds and pre-renders the pages. Do not add a script named `build`: Vercel runs it on every deploy, and the build needs Python and Chromium, which Vercel does not have, so the deploy fails.
- Edit `index.html`, then run `python3 scripts/build_pages.py` to regenerate the 9 static pages, and commit them together.

- Commits are made directly to `main`.
- Vercel deploys automatically from `main`.

## Product roadmap (summary)

1. **MVP** - professional profile, digital business card, QR / link / NFC / wallet sharing, no app needed for the recipient.
2. **Relationship layer** - connection context (where and when you met), notes, follow-up reminders and suggested follow-up messages.
3. **AI networking assistant** - conversation summaries, next actions and contact enrichment.
4. **Teams and events** - company profiles, team plans, event networking and analytics.
5. **Integrations and enterprise** - CRM integrations, SSO and directory sync.

## Documentation
- `ARCHITECTURE-ESSENTIALS.md`: one-page overview (start here)
- `AGENTS.md`: rules for anyone changing the code
- `ARCHITECTURE.md`: how the app, API and database fit together, plus the refactor plan
- `PRD.md`: what the product does and for whom
- `SECURITY-AUDIT.md`: security findings, fixes and remaining actions
- `HANDOVER.md`: full technical history and current state
- `docs/ROOMS.md`: Rooms, events, communities and the Room pass
- `docs/CHANGELOG.md`: every change, newest first
- `docs/manuals/`: the full product documentation (Word and Markdown), release v131, 26 Oct 2026:
  - `Introthread-User-Guide` (IT-DOC-UG-001): every member feature, step by step
  - `Introthread-Administrator-Guide` (IT-DOC-AG-001): admin roles, every admin screen and procedures
  - `Introthread-Technical-and-Operations-Manual` (IT-DOC-TM-001): architecture, configuration, DNS, email, payments, AI, security, tests, runbooks and release history

## Security at a glance
- Row-level security on every table, plus a private profile read (migration 015).
- Rate limiting and same-site checks on every API function.
- Pinned CDN scripts with integrity checks; strict security headers and HTTPS everywhere.
- Passwords hashed by Supabase Auth (bcrypt); no secret keys in the code.
- See SECURITY-AUDIT.md for details and the actions still needed in the Supabase dashboard.

