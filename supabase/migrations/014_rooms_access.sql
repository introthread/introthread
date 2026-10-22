-- 014: Rooms access, Room passes and communities
-- Run once in the Supabase SQL Editor. Safe to run again.
-- Adds: room_passes (paid extra Rooms), room_members (who joined), room_invites (private Rooms),
-- a rule that an extra Room needs an unused Room pass (checked in the database, not only in the app),
-- and functions for the join page, joining, invitations, approvals and the members list.
-- Room details (type, access, limit, repeat) stay in the JSON after "\n@@" in rooms.location (see 007 room_meta).

-- 1. Room passes ---------------------------------------------------------------
create table if not exists public.room_passes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  reference  text unique not null,          -- 'ps_<paystack reference>' or 'staff_<uuid>'
  amount     numeric default 0,
  currency   text default 'kes',
  source     text not null default 'paystack' check (source in ('paystack','staff')),
  room_id    uuid,                          -- the Room it was used for (no foreign key: set before the Room row exists)
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists room_passes_user_idx on public.room_passes(user_id) where used_at is null;
alter table public.room_passes enable row level security;
drop policy if exists "owner reads passes" on public.room_passes;
create policy "owner reads passes" on public.room_passes for select using (auth.uid() = user_id or public.is_staff());
-- No insert/update policy: only the payment server (service role) and the functions below write passes.

-- Every account includes 1 Room. Each further Room uses one unused pass. Staff creating Rooms are exempt.
create or replace function public.rooms_need_pass() returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  if public.is_staff() then return new; end if;
  if (select count(*) from rooms where owner_id = new.owner_id) < 1 then return new; end if;
  select id into pid from room_passes where user_id = new.owner_id and used_at is null order by created_at limit 1 for update skip locked;
  if pid is null then raise exception 'room_pass_required' using errcode = 'P0001', hint = 'Buy a Room pass to create another Room.'; end if;
  update room_passes set used_at = now(), room_id = new.id where id = pid;
  return new;
end $$;
drop trigger if exists rooms_need_pass on public.rooms;
create trigger rooms_need_pass before insert on public.rooms for each row execute function public.rooms_need_pass();

create or replace function public.my_room_passes() returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from room_passes where user_id = auth.uid() and used_at is null;
$$;

-- Staff add a pass by hand (for example after a bank transfer). Reason required, audited.
create or replace function public.admin_room_pass_grant(p_user uuid, p_reason text) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform assert_staff(array['owner','admin','finance']);
  if coalesce(trim(p_reason),'') = '' then raise exception 'Reason required'; end if;
  insert into room_passes(user_id, reference, source) values (p_user, 'staff_' || gen_random_uuid(), 'staff');
  perform audit('room_pass_grant', 'user', p_user::text, p_reason, '{}'::jsonb);
  select count(*)::int into n from room_passes where user_id = p_user and used_at is null;
  return n;
end $$;

-- 2. Members and invitations ---------------------------------------------------
create table if not exists public.room_members (
  room_id   uuid not null references public.rooms(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  status    text not null default 'member' check (status in ('member','pending','declined')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index if not exists room_members_user_idx on public.room_members(user_id);
alter table public.room_members enable row level security;
-- Writes go through the functions below only.

create table if not exists public.room_invites (
  room_id    uuid not null references public.rooms(id) on delete cascade,
  email      text not null,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (room_id, email)
);
alter table public.room_invites enable row level security;

-- Helper checks run with elevated rights so the rooms and room_members policies never call each other
-- (that would be "infinite recursion detected in policy").
create or replace function public.owns_room(rid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from rooms where id = rid and owner_id = auth.uid());
$$;
create or replace function public.is_room_member(rid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from room_members where room_id = rid and user_id = auth.uid() and status = 'member');
$$;
drop policy if exists "read own or owned memberships" on public.room_members;
create policy "read own or owned memberships" on public.room_members for select
  using (auth.uid() = user_id or public.owns_room(room_id) or public.is_staff());
drop policy if exists "owner reads invites" on public.room_invites;
create policy "owner reads invites" on public.room_invites for select
  using (public.owns_room(room_id) or public.is_staff());
-- Members can read the Rooms they belong to (so joined Rooms show in their app).
drop policy if exists "members read rooms" on public.rooms;
create policy "members read rooms" on public.rooms for select
  using (public.is_room_member(id));

-- Seat limit: the Room's own limit if set, never more than 1000.
create or replace function public.room_cap(loc text) returns int language sql immutable as $$
  select least(1000, coalesce(nullif((public.room_meta(loc)->>'cap')::int, 0), 1000));
$$;

-- 3. Join page: what anyone with the link may see --------------------------------
create or replace function public.room_public(p_code text) returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare r rooms; m jsonb; me uuid := auth.uid(); st text; n int; inv boolean := false; em text;
begin
  select * into r from rooms where code = upper(trim(p_code));
  if r.id is null then return jsonb_build_object('found', false); end if;
  m := room_meta(r.location);
  select count(*) into n from room_members where room_id = r.id and status = 'member';
  if me is not null then
    select status into st from room_members where room_id = r.id and user_id = me;
    select lower(email) into em from auth.users where id = me;
    inv := exists (select 1 from room_invites where room_id = r.id and lower(email) = em);
  end if;
  return jsonb_build_object('found', true, 'id', r.id, 'code', r.code, 'name', r.name, 'date', r.event_date,
    'kind', coalesce(nullif(m->>'kind',''),'event'), 'priv', coalesce(nullif(m->>'priv',''),'public'),
    'fmt', coalesce(m->>'fmt','inperson'), 'start', m->>'start', 'end', m->>'end', 'tz', m->>'tz', 'repeat', coalesce(m->>'repeat',''),
    'place', case when coalesce(m->>'priv','public') = 'private' and coalesce(st,'') <> 'member' and r.owner_id is distinct from me then '' else room_place(r.location) end,
    'desc', case when coalesce(m->>'priv','public') = 'private' and coalesce(st,'') <> 'member' and r.owner_id is distinct from me then '' else coalesce(m->>'desc','') end,
    'link', case when coalesce(st,'') = 'member' or r.owner_id = me then coalesce(m->>'link','') else '' end,
    'members', n, 'cap', room_cap(r.location), 'full', n >= room_cap(r.location),
    'owner', (select coalesce(p.name,'') from profiles p where p.id = r.owner_id),
    'is_owner', r.owner_id = me, 'status', coalesce(st, ''), 'invited', inv);
end $$;

-- Join a Room. Returns 'owner', 'member', 'pending' (private, waiting for the organiser) or 'full'.
create or replace function public.room_join(p_code text) returns text language plpgsql security definer set search_path = public, auth as $$
declare r rooms; me uuid := auth.uid(); st text; n int; em text; priv text;
begin
  if me is null then raise exception 'Sign in to join this Room'; end if;
  select * into r from rooms where code = upper(trim(p_code));
  if r.id is null then raise exception 'Room not found'; end if;
  if r.owner_id = me then return 'owner'; end if;
  perform pg_advisory_xact_lock(hashtext(r.id::text));
  select status into st from room_members where room_id = r.id and user_id = me;
  if st = 'member' then return 'member'; end if;
  if st = 'pending' then return 'pending'; end if;
  priv := coalesce(nullif(room_meta(r.location)->>'priv',''), 'public');
  select lower(email) into em from auth.users where id = me;
  if priv = 'private' and not exists (select 1 from room_invites where room_id = r.id and lower(email) = em) then
    insert into room_members(room_id, user_id, status) values (r.id, me, 'pending')
      on conflict (room_id, user_id) do update set status = 'pending', joined_at = now();
    return 'pending';
  end if;
  select count(*) into n from room_members where room_id = r.id and status = 'member';
  if n >= room_cap(r.location) then return 'full'; end if;
  insert into room_members(room_id, user_id, status) values (r.id, me, 'member')
    on conflict (room_id, user_id) do update set status = 'member', joined_at = now();
  return 'member';
end $$;

create or replace function public.room_leave(p_room uuid) returns void language sql security definer set search_path = public as $$
  delete from room_members where room_id = p_room and user_id = auth.uid();
$$;

-- Organiser: approve, decline or remove someone. Approving respects the seat limit.
create or replace function public.room_member_set(p_room uuid, p_user uuid, p_status text) returns text language plpgsql security definer set search_path = public as $$
declare r rooms; n int;
begin
  select * into r from rooms where id = p_room;
  if r.id is null or r.owner_id is distinct from auth.uid() then raise exception 'Only the organiser can do this'; end if;
  perform pg_advisory_xact_lock(hashtext(r.id::text));
  if p_status = 'remove' then delete from room_members where room_id = p_room and user_id = p_user; return 'removed'; end if;
  if p_status = 'declined' then update room_members set status = 'declined' where room_id = p_room and user_id = p_user; return 'declined'; end if;
  if p_status <> 'member' then raise exception 'Unknown status'; end if;
  select count(*) into n from room_members where room_id = p_room and status = 'member';
  if n >= room_cap(r.location) then return 'full'; end if;
  update room_members set status = 'member', joined_at = now() where room_id = p_room and user_id = p_user;
  return 'member';
end $$;

-- Organiser: invite people by email (private Rooms). Pending requests from invited people are approved at once.
create or replace function public.room_invite(p_room uuid, p_emails text[]) returns int language plpgsql security definer set search_path = public, auth as $$
declare r rooms; e text; k int := 0;
begin
  select * into r from rooms where id = p_room;
  if r.id is null or r.owner_id is distinct from auth.uid() then raise exception 'Only the organiser can do this'; end if;
  foreach e in array coalesce(p_emails, '{}') loop
    e := lower(trim(e));
    if e ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(e) <= 200 then
      insert into room_invites(room_id, email, invited_by) values (p_room, e, auth.uid()) on conflict do nothing;
      k := k + 1;
    end if;
  end loop;
  return k;
end $$;

create or replace function public.room_uninvite(p_room uuid, p_email text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from rooms where id = p_room and owner_id = auth.uid()) then raise exception 'Only the organiser can do this'; end if;
  delete from room_invites where room_id = p_room and email = lower(trim(p_email));
end $$;

-- Members list: the organiser sees everyone (with pending requests and invitations);
-- members of a community see the other members (name, role, company, card handle only).
create or replace function public.room_members_list(p_room uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r rooms; me uuid := auth.uid(); own boolean;
begin
  select * into r from rooms where id = p_room;
  if r.id is null then raise exception 'Room not found'; end if;
  own := r.owner_id = me;
  if not own and not exists (select 1 from room_members where room_id = p_room and user_id = me and status = 'member') then
    raise exception 'Join this Room to see its members';
  end if;
  return jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', m.user_id, 'status', m.status, 'at', m.joined_at,
        'name', p.name, 'handle', p.handle, 'role', p.role, 'company', p.company) order by m.joined_at)
      from room_members m left join profiles p on p.id = m.user_id
      where m.room_id = p_room and (own or m.status = 'member')), '[]'::jsonb),
    'invites', case when own then coalesce((select jsonb_agg(i.email order by i.created_at) from room_invites i where i.room_id = p_room), '[]'::jsonb) else '[]'::jsonb end,
    'cap', room_cap(r.location), 'is_owner', own);
end $$;

revoke all on function public.my_room_passes(), public.admin_room_pass_grant(uuid,text), public.room_public(text), public.room_join(text),
  public.room_leave(uuid), public.room_member_set(uuid,uuid,text), public.room_invite(uuid,text[]), public.room_uninvite(uuid,text),
  public.room_members_list(uuid) from public, anon;
grant execute on function public.my_room_passes(), public.admin_room_pass_grant(uuid,text), public.room_join(text),
  public.room_leave(uuid), public.room_member_set(uuid,uuid,text), public.room_invite(uuid,text[]), public.room_uninvite(uuid,text),
  public.room_members_list(uuid) to authenticated;
-- The join page works before sign-in too (it shows the Room and a sign-in button).
grant execute on function public.room_public(text) to anon, authenticated;
