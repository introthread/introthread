# Product requirements - Introthread

## Problem
People meet at events and swap cards, then nothing happens. Nobody knows which connections went anywhere.

## Users
- **Professionals:** founders, investors, operators.
- **Event and community organisers.**
- **Staff:** the admin team.

## Core flow
1. **Tap:** share your card by QR, NFC or link, or capture the other person's details (typed, QR, business card, paste, contacts).
2. **Thread:** both people confirm they met.
3. **What's next?** Each answers: meet again, introduce someone, keep in touch, or not now. Answers are sealed until both reply. "Not now" is shown to the other person as "Stay in touch".
4. **Follow-up:** reminders, AI-written drafts, and resolving the Thread.

## Features
- Digital card with themes, a public page `/<handle>` and Event mode.
- Threads list, Today page and export (CSV, vCard, JSON, free on every plan).
- **Rooms** for events, communities and team meetings:
  - join link and QR code
  - public or private access with invitations and join requests
  - attendance limit up to 1,000
  - members list and repeating sessions
  - results
  - see docs/ROOMS.md
- **Plans** (as published on `/pricing`; source of truth in HANDOVER.md, "PRICING"):
  - **Free:** $0 forever. Card, link and QR; 5 new Threads a month; What's next? and the quiet reveal; save to contacts; export anytime.
  - **Pro:** $12 a month (£9 in the UK). Unlimited Threads, AI follow-ups, calendar booking from a match, NFC card support, Thread search.
  - **Rooms:** $199 per event (£149 in the UK). Room code, QR and badges; live Resolution Report; up to 1,000 attendees; sponsor-ready export. In the code and database a purchased Room is called a "Room pass" (`room_passes`).
  - **Networks:** custom annual pricing for VC platforms and networks, sales-led. The Warmth dashboard, Warmth API and SSO are roadmap items, not built yet.
- **Admin:** dashboard, users, moderation, rooms, revenue, plans, settings, privacy requests, staff and audit log, with roles and two-step verification.

## Non-functional requirements
- Works on phones 360px wide.
- WCAG 2.2 AA.
- Secure by default (see SECURITY-AUDIT.md).
- Real data only.
- Fonts: sans-serif only.

## Next
- Google and LinkedIn sign-in. (Microsoft sign-in was dropped on 24 Oct 2026.)
- Resend email.
- Live Paystack.
- Emailed Room invitations.
- The refactor plan in ARCHITECTURE.md.
