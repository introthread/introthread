# Administrator Guide

_How Introthread staff run the platform: access, roles, every admin screen and the standard procedures_

| Document No. | Version | Date of issue | Status |
|---|---|---|---|
| IT-DOC-AG-001 | 1.3 | 27 October 2026 | Approved for release |

**Audience:** Introthread staff with admin access: owner, admin, moderator, support and finance roles

**Related documents:** IT-DOC-UG-001 User Guide; IT-DOC-TM-001 Technical and Operations Manual; SECURITY-AUDIT.md; docs/ROOMS.md

## 01 Purpose and scope

This guide explains how Introthread staff use the admin area to support members, keep the community safe, manage Rooms, plans and revenue, handle privacy requests and manage the staff team. It covers release v131 (26 October 2026).

### Principles

- **Least privilege.** Each staff member gets only the role they need.
- **Every action has a reason.** Changes ask for a reason and are written to the audit log.
- **The server decides.** The screen hides actions your role cannot take, and the database checks your role again (`assert_staff`) before anything changes.
- **Real data only.** Admin screens show live data from the database; nothing is simulated.

## 02 Accessing the admin area

1. Go to **introthread.com/admin** and sign in with your staff account.
2. Admin access needs a second step. The first time, scan the QR code with Google Authenticator, Microsoft Authenticator or 1Password, then enter the 6-digit code. After that, enter a code from your app at each sign-in.
3. You land on the **Dashboard**. Use the left menu to move between screens.

> **Idle sign-out.** For security, the admin area signs you out after a period of inactivity. Save your work before stepping away.

## 03 Roles and permissions

There are five staff roles. The Owner role is held by the product owner. Role changes are made in **Staff** and are audited.

| Role | Intended for | Typical access |
|---|---|---|
| Owner | Product owner | Everything, including staff management, plans and pricing, settings and finance. |
| Admin | Operations lead | All day-to-day screens: users, moderation, Rooms, revenue, plans, settings, privacy and audit log. |
| Moderator | Trust and safety | Moderation reports, user review, Rooms (create, edit, delete). |
| Support | Member support | User lookup and help, Rooms (create and edit), privacy requests. |
| Finance | Billing and revenue | Revenue, subscriptions export, Room pass grants, billing details. |

### Confirmed permission rules

| Action | Allowed roles |
|---|---|
| Create or edit a Room | Owner, admin, moderator, support |
| Delete a Room (type DELETE to confirm) | Owner, admin, moderator |
| Grant a Room pass (for example after a bank transfer) | Owner, admin, finance |
| Change a staff member's role, revoke access | Owner (and admin where the screen allows) |

## 04 Dashboard

The Dashboard gives a live overview of the platform for a chosen date range: sign-ups, active members, Threads created and confirmed, matches, Rooms and revenue, with trends against the previous period. Use it at the start of each day to spot unusual activity.

## 05 Users

### Find a member

1. Open **Users**.
2. Search by name, email or handle, or filter by plan and status.
3. Select a member to open their details panel.

### What you can see and do

- Profile, sign-in methods and plan, with Threads, Rooms and billing history.
- **Change plan**: move a member between plans, for example after a manual payment. Give a reason.
- **Room passes > Add a Room pass**: grant a Room pass when a bank transfer has been received. Give the invoice number as the reason (owner, admin, finance).
- **Delete**: delete an account on a verified request. This cannot be undone.
- Bulk selection with **Clear selection** for list actions.

> **Privacy.** Never share a member's details with anyone else. Members' private Thread notes are not shown in admin.

## 06 Print-ready card orders

Since v141 (26 October 2026) the KES 199 card is print-ready only. Nothing is programmed, printed or posted by staff.

1. A member enters the name, title and company for the card (with a live preview of the chip-card design, v142) and pays KES 199 through Paystack.
2. The server saves the order (table `card_orders`), builds the card PDF and emails it to the buyer as an attachment. When the email is accepted the order status is set to `delivered`.
3. hello@introthread.com receives a short note: "Printable card sold, nothing to post". No action is needed.
4. The member can download the PDF again in **Tap > Tap with an NFC card**.

**If a member says they did not get the PDF:** ask them to check spam, then to download it from the NFC panel. If the order is still `paid` (not `delivered`), the email failed: check that `RESEND_API_KEY` is set in Vercel and look at the Resend dashboard.

**Refunds and cancellations:** staff with database access set the status with the function `admin_card_order_set` (it checks the role and writes the audit log). Statuses: paid, delivered, cancelled (programmed and shipped are kept only for old v133 orders).

**About the chip:** the gold chip on the card is printed artwork. Members who want tapping add their own NFC sticker and write their link to it in the app.

## 07 Moderation

1. Open **Moderation** to see reports about profiles, cards or behaviour.
2. Filter by status or type; select **Refresh** for the latest.
3. Open a report, review the content, and use **Open in Users** to see the account.
4. Record the outcome with a reason. The report and your decision are kept in the audit log.

## 08 Rooms

Admin > Rooms shows every Room on the platform with totals (Rooms, attendees, active Rooms, join links used) and filters for search, status (upcoming, live, past), type (events, communities, team meetings) and date.

- Details panel: status, type, access, open reports, join link with **Copy link**, **QR code** (with Download PNG) and **Open join page**, and results.
- **Create room / Edit room**: name, type, date, format, times, place or link, access, limit, description and organiser (by email or handle).
- **Export results CSV** for organisers and sponsors.
- **Delete room**: type DELETE and give a reason.
- Rooms created by staff do not need a Room pass.
- The Rooms feature can be switched off for everyone in **Settings > Features**.

## 09 Revenue

Revenue shows subscriptions, payments and Room passes from Paystack, recorded by the server. Use **Export subscriptions CSV** for accounting and **Review** to inspect items that need attention. Charges are made in Kenyan shillings; the pricing page shows US dollars and, for UK visitors, pounds.

> **Current status.** Paystack is in test mode until the business registration is approved and the live keys are added. Test payments are not real revenue.

## 10 Plans and pricing

Plans and pricing lets the owner adjust plan names, subtitles, prices (USD and GBP) and the Free plan Thread limit. Changes are read by the app and the pricing page.

| Plan | Current price | Key limits |
|---|---|---|
| Free | $0 | 5 new Threads a month |
| Pro | $12 a month (£9 UK) | Unlimited Threads, AI follow-ups, calendar booking, NFC, search |
| Rooms | $59 per event (£45 UK) | Up to 1,000 attendees; one free event a month for up to 20 people |
| Networks | Custom, annual | Sales-led |

> **Important.** A price change must also be made in Paystack (plan amounts) and on any published price card. See the Technical and Operations Manual, section "Payments".

## 11 Settings

- **Maintenance mode**: pause the app for everyone except staff, with a message. Public cards stay visible.
- **Features**: turn features on or off for everyone, for example Rooms or contact import.
- **Manage staff**: shortcut to the Staff screen.
- Every settings change asks for a reason and is audited.

## 12 Privacy requests

1. Open **Privacy requests**. Filter by type and status and page with **Previous** and **Next**.
2. Select a request and choose **Start working on it** so others know it is in progress.
3. Verify the requester controls the account email before acting.
4. Complete the request (export, correction or deletion) within the legal time limit, normally 30 days, then close it. Use **Dismiss** only for invalid or duplicate requests, with a reason.

## 13 Staff

- Invite a staff member by email and choose a role. They receive an invitation; use **Resend** if needed.
- **Change role** when responsibilities change.
- **Revoke** access immediately when someone leaves.
- Every staff member must use two-step verification.

## 14 Audit log

The audit log records every admin action: who, when, what changed and the reason given. Filter by staff member, screen and date. Use it for investigations and regular reviews.

## 15 Standard operating procedures

### Support a member who cannot sign in

1. Find the member in Users and check their sign-in methods.
2. Ask them to use **Forgot password?** on the login page, or to sign in with Google or LinkedIn if linked.
3. If codes do not arrive, ask them to check Spam and to mark Introthread emails as Not spam.
4. Never send passwords or codes yourself.

### Grant a Room pass after a bank transfer

1. Confirm the payment in the bank account.
2. Users > member > **Room passes** > **Add a Room pass**.
3. Enter the invoice number as the reason and save. The member can now create the Room.

### Handle an abuse report

1. Review the report in Moderation.
2. Check the account in Users and any related Threads or Rooms.
3. Act proportionately and record the reason.
4. Escalate legal or safety issues to the owner straight away.

### Monthly review

- Review the audit log and staff list; revoke unused access.
- Export subscriptions for accounting.
- Check open privacy requests and reports.
- Check the system status (see the Technical and Operations Manual).

## 16 Contacts

Product owner: Agnes. Support mailbox: hello@introthread.com (forwards to the owner). Security issues: email hello@introthread.com with "SECURITY" in the subject.
