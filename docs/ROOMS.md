# Rooms, events, communities and the Room pass

How Rooms work in Introthread today, for staff, organisers and the next developer. Written 22 Oct 2026, updated for v36 (Rooms access). Server rules are in `supabase/migrations/014_rooms_access.sql`. **Migration 014 must be run by Agnes in the Supabase SQL Editor** before joining, private Rooms, seat limits, members and card-paid Room passes work on the live site. Until then the app falls back to the older behaviour.

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

The form now has **Type** (Event, Community, Team meeting). Communities and team meetings can **repeat**: every week, every 2 weeks or every month. The Room page shows the type, how often it repeats and the **next session** date. Staff can still change the type in Admin > Rooms > Edit room.

Attendance limit: up to 1,000 (the form no longer accepts more).

Storage: table `rooms` (`owner_id, name, event_date, location, code`). Extra details (times, time zone, format, link, access, limit, topics, description, type) are saved as JSON after a `\n@@` marker inside `rooms.location`, so no schema change was needed. Read them with `rm9(r)` in the app and `room_meta()` in SQL.

## 3. Getting people into a Room
- **Join link:** `introthread.com/r/CODE`. It opens the "You're in the Room" page (`vRoomCode`), which explains that tapping or scanning someone's card starts a Thread tagged to the event, and offers **Get your free card**.
- **QR code:** each Room page shows a QR for the join link. Put it on screens, badges and tables. In Admin > Rooms there is a QR modal with **Download PNG**.
- **Event mode** (`/app/scan`): full-screen QR of your card for the event, with event tagging through `?at=`, keep-screen-awake, light/dark, share, NFC, wallpaper download.
- **Joining:** the join page loads the Room from the database (`room_public`) and shows its name, date, type, access, organiser and how many people have joined. People sign in (or sign up), then press **Join Room**. After sign-in they are brought back to the same Room page. Joined Rooms appear under **Rooms you have joined** in the app and in the Tap form's "Where did you meet?" list.
- **Private Rooms (enforced):** private Rooms hide the place, description and online link from people who are not members. Invited people (organiser adds their emails on the Room page; each is emailed the Room link by `/api/room-invite` once Resend is set up) get in straight away when they sign in with that email. Anyone else can **Request to join**; the organiser sees them under **Waiting for you** and presses **Let in** or **Decline**. Checked in the database (`room_join`, `room_member_set`), not only in the app.
- **Attendance limit (enforced):** joining and approving stop at the Room's limit, or 1,000 if no limit is set. Visitors see "This Room is full". Checked in the database with a lock, so two people cannot take the last place at the same time.

## 4. During and after
- Room page (`/app/room/<id>`): date, time and time zone, place or **Join online** link, access, limit, description, QR, and results.
- Results (`roomStats`): Threads made, confirmed by both, answered, meetings agreed, introductions.
- Organisers can export results as CSV.
- **People in this Room** (on the Room page): the organiser sees members (with Remove), join requests (Let in / Decline) and, for private Rooms, the invitation list (add or remove emails). Members see the other members (name, role, company, link to their card) and can **Leave this Room**. Functions: `room_members_list`, `room_invite`, `room_uninvite`, `room_leave`.

### Sessions and attendance (v39, needs migration 017)
- Repeating Rooms (communities and team meetings) show a **Sessions** card on the Room page:
  - the last 8 sessions and the next one
  - how many members attended each session
- On the day of a session, members and the organiser can press **Check in to today's session**.
- The organiser can open **Attendance** for any past or current session and tick who was there.
- Session dates count from the Room's first date: every week, every 2 weeks, or monthly on the same day (the last day of the month when a month is shorter).
- Database functions: `room_sessions`, `room_checkin`, `room_session_people`, `room_attendance_set`, `room_is_session`. Table: `room_checkins`. Rules:
  - only members and the organiser can see sessions
  - only the organiser can mark attendance
  - check-ins only on real session dates

## 5. Admin > Rooms (staff)
- Cards: total Rooms, total attendees, active Rooms, Room links used.
- Filters: search, status (upcoming, live, past), **Type (Conferences and events, Communities, Team meetings)**, date.
- Details panel: status, type, access, open reports, join link with **Copy link**, **QR code** and **Open join page**; Overview with results.
- Actions: **Create room / Edit room** (owner, admin, moderator, support): name, type, date, format, times, place or link, access, limit, description, organiser by email or handle. **Export results CSV.** **Delete room** (owner, admin, moderator; type DELETE). Every action needs a reason and is written to the audit log.
- Server functions (migration 007): `admin_rooms2`, `admin_room_detail`, `admin_room_save`, `admin_room_log`.
- The Rooms feature can be switched off in Admin > Settings > Features.

## 6. Room pass (paying for extra Rooms)
- **Since v76 one event a month for up to 20 people is free** (attendance limit 1 to 20, migration 021). Bigger or extra Rooms need a Room pass. Before that, v71: every Room needed a Room pass (`FREE_ROOMS = 0`, migration 020). Rooms created before v71 are kept. Before v71 every account included 1 free Room.
- Each extra Room needs a **Room pass: $199 per event** (one extra Room, Room code, QR and badges, live Resolution Report, up to 1,000 attendees). Defined in `PLANS.rooms`.
- When someone without an unused pass presses Create a Room, they see "Create a Room with a Room pass" with **Buy a Room pass, $199** (`bRoomAllowed`, `bRoomPass`).
- Passes are counted as `roomCredits` inside the person's billing record (`profiles.prefs.billing`). Creating an extra Room uses one credit ("Room pass used").
- Where to buy: Settings > Billing (**Buy a Room pass**) or the prompt above.

How payment works now (v36):
- **Card payment (automatic):** when card payments are switched on (`/api/status` says `pay:true`), **Buy a Room pass** opens Paystack's secure page. The price is shown as $199 and charged once in Kenyan shillings (`ROOM_PASS_KES`, default 199 x `KES_PER_USD` = KES 25,870). When the payment succeeds, `/api/pay-verify` (on return) and the webhook (`charge.success` with `metadata.kind = 'rooms'`) add **one unused pass** in `room_passes`, record the payment and add a paid receipt to Billing. Each payment reference adds only one pass, even if both run.
- **Enforced in the database:** creating a second or later Room needs an unused pass. A database trigger (`rooms_need_pass`) uses one pass and links it to the new Room. Without a pass it refuses with `room_pass_required`, and the app opens Buy a Room pass. Staff creating Rooms from Admin are exempt.
- **Bank transfer:** if card payments are off, the button is still **Request invoice**. When the money arrives, staff open Admin > Users > the person > **Room passes** > **Add a Room pass** and give a reason, such as the invoice number. This uses `admin_room_pass_grant` (owner, admin, finance) and is audited.
- The app reads unused passes with `my_room_passes()`.
- Demo mode simulates the card payment and adds the pass at once.

## 7. Before it works live
1. Agnes: run `supabase/migrations/014_rooms_access.sql` in the Supabase SQL Editor.
2. Card payments for Room passes use the same Paystack keys as Pro (`PAYSTACK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Optional: `ROOM_PASS_KES` to set the shilling price.
3. Test once in Paystack test mode: buy a pass, create a second Room, join a private Room from another account, approve, and fill a Room with a limit of 2.

## 8. Not built (possible next steps)
