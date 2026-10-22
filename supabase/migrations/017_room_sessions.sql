-- 017: Attendance for each session of a repeating Room (communities and team meetings). 22 Oct 2026.
-- Run once in the Supabase SQL Editor. Safe to run again. Needs 014 (room_members, owns_room, is_room_member).
-- A Room repeats when its details (JSON after "\n@@" in rooms.location) have repeat = weekly | biweekly | monthly.
-- Session dates are counted from rooms.event_date (the first session). Monthly sessions keep the same day of the
-- month, or the last day when a month is shorter.

create table if not exists public.room_checkins (
  room_id      uuid not null references public.rooms(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  session_date date not null,
  marked_by    uuid references auth.users(id) on delete set null,
  at           timestamptz not null default now(),
  primary key (room_id, user_id, session_date)
);
create index if not exists room_checkins_room_idx on public.room_checkins(room_id, session_date);
alter table public.room_checkins enable row level security;
drop policy if exists "read own or organised checkins" on public.room_checkins;
create policy "read own or organised checkins" on public.room_checkins for select
  using (auth.uid() = user_id or public.owns_room(room_id) or public.is_staff());
-- Writes go through the functions below only.

-- The i-th session date of a Room (i = 0 is the first session).
create or replace function public.room_session_n(first date, rep text, i int) returns date language sql immutable as $$
  select case rep when 'weekly'   then first + 7 * i
                  when 'biweekly' then first + 14 * i
                  when 'monthly'  then (first + make_interval(months => i))::date
                  else case when i = 0 then first end end
$$;

-- Is d one of this Room's session dates?
create or replace function public.room_is_session(rid uuid, d date) returns boolean language plpgsql stable security definer set search_path = public as $$
declare r rooms; rep text; k int;
begin
  select * into r from rooms where id = rid;
  if r.id is null or d is null or d < r.event_date then return false; end if;
  rep := coalesce(room_meta(r.location)->>'repeat', '');
  if rep = 'weekly' then return (d - r.event_date) % 7 = 0;
  elsif rep = 'biweekly' then return (d - r.event_date) % 14 = 0;
  elsif rep = 'monthly' then
    k := ((extract(year from d) - extract(year from r.event_date)) * 12 + extract(month from d) - extract(month from r.event_date))::int;
    return room_session_n(r.event_date, 'monthly', k) = d;
  else return d = r.event_date;
  end if;
end $$;

-- Recent sessions (up to p_limit, newest first) plus the next upcoming one, with attendance counts.
-- Organiser and members only.
create or replace function public.room_sessions(p_room uuid, p_limit int default 8) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r rooms; rep text; i int := 0; d date; out jsonb := '[]'::jsonb; dates date[] := '{}'; nxt date;
begin
  select * into r from rooms where id = p_room;
  if r.id is null then raise exception 'Room not found'; end if;
  if not (r.owner_id = auth.uid() or is_room_member(p_room)) then raise exception 'Join this Room to see its sessions'; end if;
  rep := coalesce(room_meta(r.location)->>'repeat', '');
  loop
    d := room_session_n(r.event_date, rep, i);
    exit when d is null;
    if d > current_date then nxt := d; exit; end if;
    dates := array_append(dates, d);
    i := i + 1;
    exit when i > 2000 or rep = '';
  end loop;
  dates := dates[greatest(1, coalesce(array_length(dates, 1), 0) - least(greatest(coalesce(p_limit, 8), 1), 52) + 1):];
  select coalesce(jsonb_agg(jsonb_build_object('date', x.d, 'count',
            (select count(*) from room_checkins c where c.room_id = p_room and c.session_date = x.d),
            'me', exists(select 1 from room_checkins c where c.room_id = p_room and c.session_date = x.d and c.user_id = auth.uid()),
            'today', x.d = current_date) order by x.d desc), '[]'::jsonb)
    into out from unnest(dates) as x(d);
  return jsonb_build_object('repeat', rep, 'sessions', out, 'next', nxt,
    'members', (select count(*) from room_members where room_id = p_room and status = 'member'), 'is_owner', r.owner_id = auth.uid());
end $$;

-- Check yourself in to today's session (organiser or member).
create or replace function public.room_checkin(p_room uuid) returns text language plpgsql security definer set search_path = public as $$
begin
  if not (owns_room(p_room) or is_room_member(p_room)) then raise exception 'Join this Room first'; end if;
  if not room_is_session(p_room, current_date) then return 'not_today'; end if;
  insert into room_checkins(room_id, user_id, session_date, marked_by) values (p_room, auth.uid(), current_date, auth.uid())
    on conflict do nothing;
  return 'ok';
end $$;

-- Organiser: who was at a session (every current member, with attended true/false).
create or replace function public.room_session_people(p_room uuid, p_date date) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not owns_room(p_room) then raise exception 'Only the organiser can do this'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', m.user_id, 'name', p.name, 'role', p.role, 'company', p.company,
      'attended', exists(select 1 from room_checkins c where c.room_id = p_room and c.user_id = m.user_id and c.session_date = p_date))
      order by p.name)
    from room_members m left join profiles p on p.id = m.user_id
    where m.room_id = p_room and m.status = 'member'), '[]'::jsonb);
end $$;

-- Organiser: mark or unmark someone for a past or today's session.
create or replace function public.room_attendance_set(p_room uuid, p_user uuid, p_date date, p_on boolean) returns text language plpgsql security definer set search_path = public as $$
begin
  if not owns_room(p_room) then raise exception 'Only the organiser can do this'; end if;
  if p_date > current_date or not room_is_session(p_room, p_date) then raise exception 'Not a session date'; end if;
  if not exists (select 1 from room_members where room_id = p_room and user_id = p_user and status = 'member') then raise exception 'Not a member'; end if;
  if p_on then
    insert into room_checkins(room_id, user_id, session_date, marked_by) values (p_room, p_user, p_date, auth.uid()) on conflict do nothing;
  else
    delete from room_checkins where room_id = p_room and user_id = p_user and session_date = p_date;
  end if;
  return 'ok';
end $$;

revoke all on function public.room_is_session(uuid,date), public.room_sessions(uuid,int), public.room_checkin(uuid),
  public.room_session_people(uuid,date), public.room_attendance_set(uuid,uuid,date,boolean) from public, anon;
grant execute on function public.room_sessions(uuid,int), public.room_checkin(uuid),
  public.room_session_people(uuid,date), public.room_attendance_set(uuid,uuid,date,boolean) to authenticated;
