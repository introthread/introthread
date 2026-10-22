# Rooms, events, communities and the Room pass

How Rooms work in Introthread today, for staff, organisers and the next developer. Written 22 Oct 2026 from the code on `main`. Where something is not built yet, it says so.

## 1. What a Room is
A Room is a shared space for one gathering. Every Thread (tap) made inside a Room is tagged to it (`threads.room_id`), so the organiser gets results for the whole gathering.

Rooms have one of three types (stored as `kind` in the Room details):

| Type | Use it for | Status rules |
|---|---|---|
| Event (default) | Conferences, meetups, networking nights | Upcoming before the date, Live on the day, Past after |
| Community | Ongoing groups, networks, alumni, member clubs | Always Live (no end) |
| Team meeting | Internal or partner meetings | Same as Event |

Status logic: `rmStatus()` in `index.html` and `room_status()` in `supabase/migrations/007_rooms_screen.sql`.

## 2. Creating a Room (organiser, in the app)
1. Go to **Rooms** > **Create a Room** (`newRoomModal`).
2. Fill in:
   - Name (required, up to 80 characters)
   - Date (required), start and end time, time zone
   - Format: In person (venue), Online (platform + meeting link, must start with `https://`) or Hybrid (both)
   - Access: **Public** (anyone with the link) or **Private** (invite only)
   - Attendance limit (optional), up to 3 topics, short description (optional)
3. Press **Create Room**. The Room gets a short code (3 letters from the name + 2 digits, e.g. `KEN42`) and a join link `introthread.com/r/CODE`.

The app form always creates an **Event**. To make a Room a **Community** or **Team meeting**, staff change the type in Admin > Rooms > Edit room (section 5). Adding a type choice to the app form is an open item.

Storage: table `rooms` (`owner_id, name, event_date, location, code`). Extra details (times, time zone, format, link, access, limit, topics, description, type) are saved as JSON after a `\n@@` marker inside `rooms.location`, so no schema change was needed. Read them with `rm9(r)` in the app and `room_meta()` in SQL.

## 3. Getting people into a Room
- **Join link:** `introthread.com/r/CODE`. It opens the "You're in the Room" page (`vRoomCode`), which explains that tapping or scanning someone's card starts a Thread tagged to the event, and offers **Get your free card**.
- **QR code:** each Room page shows a QR for the join link. Put it on screens, badges and tables. In Admin > Rooms there is a QR modal with **Download PNG**.
- **Event mode** (`/app/scan`): full-screen QR of your card for the event, with event tagging through `?at=`, keep-screen-awake, light/dark, share, NFC, wallpaper download.
- **Private Rooms:** marked "Private, invite only" on the Room page. Share the link only with invited people. Note: the join page does not yet block people without an invitation; private is a label, not enforced access.

## 4. During and after
- Room page (`/app/room/<id>`): date, time and time zone, place or **Join online** link, access, limit, description, QR, and results.
- Results (`roomStats`): Threads made, confirmed by both, answered, meetings agreed, introductions.
- Organisers can export results as CSV.

## 5. Admin > Rooms (staff)
- Cards: total Rooms, total attendees, active Rooms, Room links used.
- Filters: search, status (upcoming, live, past), **Type (Conferences and events, Communities, Team meetings)**, date.
- Details panel: status, type, access, open reports, join link with **Copy link**, **QR code** and **Open join page**; Overview with results.
- Actions: **Create room / Edit room** (owner, admin, moderator, support): name, type, date, format, times, place or link, access, limit, description, organiser by email or handle. **Export results CSV.** **Delete room** (owner, admin, moderator; type DELETE). Every action needs a reason and is written to the audit log.
- Server functions (migration 007): `admin_rooms2`, `admin_room_detail`, `admin_room_save`, `admin_room_log`.
- The Rooms feature can be switched off in Admin > Settings > Features.

## 6. Room pass (paying for extra Rooms)
- Every account includes **1 Room** (`FREE_ROOMS = 1`).
- Each extra Room needs a **Room pass: $199 per event** (one extra Room, Room code, QR and badges, live Resolution Report, up to 1,000 attendees). Defined in `PLANS.rooms`.
- When someone with no Room left presses Create a Room, they see "You've used your included Room" with **Buy a Room pass, $199** (`bRoomAllowed`, `bRoomPass`).
- Passes are counted as `roomCredits` inside the person's billing record (`profiles.prefs.billing`). Creating an extra Room uses one credit ("Room pass used").
- Where to buy: Settings > Billing (**Buy a Room pass**) or the prompt above.

How payment works today:
- **Live site:** card payment for Room passes is **not built yet**. The button is **Request invoice**: it creates a pending invoice "Room pass, one event" ($199 + tax) and says the pass unlocks once it is paid. People pay by bank transfer through billing@introthread.com.
- **Gap to fix:** nothing yet adds the credit automatically when that invoice is paid. Until it is built, staff must mark the invoice paid and add the credit by hand.
- Paystack (v26) currently covers **Pro subscriptions only** (`/api/pay-init {interval}`). Next step: a one-off Paystack charge for `kind:'rooms'` that adds one `roomCredits` in `/api/pay-verify` and the webhook.
- Demo mode simulates the card payment and adds the credit at once.

## 7. Open items
1. Type choice (Event / Community / Team meeting) in the app's Create a Room form.
2. Enforce Private Rooms on the join page (invite list or approval).
3. Room pass payment through Paystack, with the credit added automatically.
4. Enforce the attendance limit and the 1,000-attendee cap on joining.
5. Community-specific features (members list, recurring sessions) if wanted.
