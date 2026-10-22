# Introthread change log

Everything built so far, newest first. Full technical detail for each item is in `HANDOVER.md`. How Rooms, events, communities and the Room pass work: `docs/ROOMS.md`.

## 22 Oct 2026
- **v39: Attendance for each community session.** Needs migration 017.
  - A Sessions card on repeating Rooms shows the last 8 sessions, the next session and attendance counts.
  - Members check in on the day.
  - The organiser can mark who attended.
- **v38 - Room invitations are emailed.** New `/api/room-invite` (organiser only, checked in the database; up to 50 emails per request; 10 requests a minute). Sends the Room link through Resend; until Resend is set up the invitations are still saved and the organiser is told to share the link.
- **Migration 016:** re-applies the 015 profile privacy fix. 015 had not taken effect. The self-check showed all 8 rows ok. (cb5106b)
- **Live Rooms test (Paystack test mode):** all passed. Signed-out visitors to a full Room now see "This Room is full". (f14b360)
- **pay-sync:** Room pass payments never switch Pro on. (e769814)
- **v37: Security hardening.** Needs migration 015. Details in SECURITY-AUDIT.md.
  - Private profile fields are hidden from the public.
  - People can no longer upgrade themselves to Pro.
  - Input limits on profile fields.
  - API rate limiting and same-site checks.
  - Pinned CDN scripts with integrity checks.
  - XSS escapes in Admin > Settings, Staff and Billing.
  - The "return to Room after sign-in" code is checked before use.
  - Admin sessions sign out after 30 minutes idle.
  - Extra security headers.
  - New docs: AGENTS.md, ARCHITECTURE-ESSENTIALS.md, ARCHITECTURE.md, PRD.md, SECURITY-AUDIT.md.
- **v36: Rooms access.** Needs migration 014.
  - **Room pass card payment:** Paystack, one-off. The pass is added automatically and the database enforces passes when Rooms are created. Staff can add a pass by hand after a bank transfer.
  - **Room types in the app:** Event, Community and Team meeting, with repeat sessions and the next session date.
  - **Real join page:** private Rooms are enforced, with invitations and join requests.
  - **Attendance limit:** enforced, maximum 1,000.
  - **Members list:** shown on the Room page. Joined Rooms appear in the app.
- **Docs:** `docs/ROOMS.md` and this change log. (6a67adc)
- **v35 - Ad blockers no longer hide admin screens.** Every style name starting with `ad-` (430 uses) is renamed to `ix-`. Ad blockers hide anything named `ad-...`. Never use that prefix again. (commit 4084fef)
- **v31 to v34 - Profile photo popup: Save photo always visible.** Root cause: the popup buttons were named `ad-btn` and the owner's ad blocker hid them. Fixes:
  - buttons renamed (`pcb`)
  - a **Save** button next to the ×
  - the picture shrinks to fit the window
  - Save photo / Cancel stay pinned at the bottom
  (commits 002d7e8, 619d8e1, 923605b, d8708d7)
- **Automated photo popup check.** `tests/app/photo_crop.py` checks 14 screen sizes. It also runs in GitHub Actions (`.github/workflows/photo-crop.yml`, added by the owner). (b8e64a9, 7438e70)
- **v30 - Photo popup** fitted to short laptop screens. (7c762fc)
- **v29 - Admin retest** of Users, Moderation, Rooms, Revenue, Privacy, Staff and Audit log on phone and laptop:
  - the closed menu on phones is hidden properly
  - red status text is readable
  - icon-only buttons are named for screen readers
  (e79b844)
- **v28 - Accessibility (WCAG 2.2 AA).** Zero problems found by the automated checker on every page:
  - a visible focus ring everywhere
  - stronger colour contrast
  - readable avatar initials
  - bigger tap targets
  - all buttons usable from the keyboard
  (78f54c0)
- **Content Security Policy** in `vercel.json`. It allows only the services the app uses: Supabase, jsDelivr, PostHog EU, OpenStreetMap and the card-scanner data. It blocks frames and plugins. (d98c1d6)
- **Site audit** fixes (c4c28f6):
  - website header on phones
  - Tap topic box
  - search-engine data
  - duplicate theme colour
  - security headers
  - sitemap
- **Deployments note:** Vercel Hobby allows about 100 deploys a day. Commit each change as one commit.

## 21 Oct 2026
- **Paystack billing (v26)** for Pro, in test mode and KES only:
  - checkout, verify, manage card or cancel, webhook
  - Room passes still use **Request invoice** (see `docs/ROOMS.md`)
- **Server features (v25):**
  - email the other person their confirm link
  - daily reminder emails
  - AI follow-up drafts
  - PostHog analytics, only after consent
- **Where and when you met:** exact time and, with permission, place on each new Thread.
- **Admin redesign, all screens (v34 to v43)** from Agnes's mockups:
  - Dashboard, Users, Moderation, Rooms, Revenue
  - Plans and pricing, Settings, Privacy requests, Staff, Audit log
  - migrations 004 to 013
- **Admin area (v33)** at `/admin` with roles: owner, admin, moderator, support, finance. Includes reports from users and suspended or banned account screens.
- **Contacts and file import (v32), smart capture (v31):**
  - business card reader
  - QR / vCard
  - paste
  - phone contacts
  - LinkedIn follow-up prompt
- **Database migration 002:** contacts, staff, audit log, reports, plans, subscriptions, app settings, privacy requests.
- **Decisions (Agnes):**
  - prices in USD, GBP for UK visitors
  - Free plan is 5 new Threads a month
  - admin owner is mosemqute@gmail.com

## Earlier
- Supabase wired into sign-up, login, cards, Threads and Rooms.
- 8-digit email sign-in code.
- Mobile fit: nothing wider than the screen; fixed top and bottom bars.
- **Data export free on every plan:** CSV, vCard and JSON.
- **Event mode** (`/app/scan`):
  - full-screen QR
  - screen kept awake
  - event tagging
  - NFC
  - wallpaper
  - installable app (PWA)
- **Rooms:** create with date, time zone, format, access, limit and topics. Each Room has a join link `/r/CODE`, a QR code and results. 1 Room is free; a Room pass is $199 per extra Room.
