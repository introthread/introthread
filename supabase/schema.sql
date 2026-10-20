-- Introthread database schema (Supabase / Postgres)
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.

create extension if not exists pgcrypto;

-- ---------- PROFILES (public card) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  handle      text unique not null check (handle ~ '^[a-z0-9]{2,20}$'),
  name        text not null,
  role        text default '',
  company     text default '',
  city        text default '',
  bio         text default '' check (char_length(bio) <= 200),
  theme       text default 'midnight',
  links       jsonb default '{}'::jsonb,
  plan        text default 'Free' check (plan in ('Free','Pro','Rooms','Networks')),
  prefs       jsonb default '{"net":true,"nudge":true,"ai":true}'::jsonb,
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public" on public.profiles for select using (true);
drop policy if exists "owner inserts profile" on public.profiles;
create policy "owner inserts profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "owner updates profile" on public.profiles;
create policy "owner updates profile" on public.profiles for update using (auth.uid() = id);
drop policy if exists "owner deletes profile" on public.profiles;
create policy "owner deletes profile" on public.profiles for delete using (auth.uid() = id);

-- ---------- ROOMS (events & communities) ----------
create table if not exists public.rooms (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  event_date  date not null default current_date,
  location    text default '',
  code        text unique not null,
  created_at  timestamptz default now()
);
alter table public.rooms enable row level security;
drop policy if exists "owner manages rooms" on public.rooms;
create policy "owner manages rooms" on public.rooms for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ---------- THREADS ----------
create table if not exists public.threads (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  guest_token   uuid unique not null default gen_random_uuid(),  -- used in introthread.com/t/<token>
  other_name    text not null,
  other_role    text default '',
  other_company text default '',
  other_email   text default '',
  where_met     text default 'In person',
  note          text default '',          -- private to owner, never exposed to guest
  room_id       uuid references public.rooms(id) on delete set null,
  confirmed     boolean default false,
  mine          text check (mine in ('meet','intro','keep','notnow')),
  theirs        text check (theirs in ('meet','intro','keep','notnow')),
  resolved_at   timestamptz,
  resolved_how  text,
  created_at    timestamptz default now()
);
create index if not exists threads_owner_idx on public.threads(owner_id, created_at desc);
create index if not exists threads_room_idx on public.threads(room_id);
alter table public.threads enable row level security;
drop policy if exists "owner manages threads" on public.threads;
create policy "owner manages threads" on public.threads for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ---------- THREAD EVENTS (timeline) ----------
create table if not exists public.thread_events (
  id         bigserial primary key,
  thread_id  uuid not null references public.threads(id) on delete cascade,
  kind       text not null check (kind in ('tap','confirm','answer','followup','resolved','note')),
  text       text not null,
  at         timestamptz default now()
);
create index if not exists thread_events_thread_idx on public.thread_events(thread_id, at);
alter table public.thread_events enable row level security;
drop policy if exists "owner reads events" on public.thread_events;
create policy "owner reads events" on public.thread_events for select
  using (exists (select 1 from public.threads t where t.id = thread_id and t.owner_id = auth.uid()));
drop policy if exists "owner writes events" on public.thread_events;
create policy "owner writes events" on public.thread_events for insert
  with check (exists (select 1 from public.threads t where t.id = thread_id and t.owner_id = auth.uid()));

-- ---------- GUEST FUNCTIONS (no account needed for the other person) ----------
-- These run with elevated rights but only touch the one Thread identified by its secret token,
-- and only return what the guest is allowed to see (never the owner's private note,
-- and an owner "notnow" is shown as "keep" -- the quiet reveal).

create or replace function public.start_thread_from_card(
  p_handle text, p_name text, p_email text, p_role text default '', p_company text default '', p_where text default ''
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_token uuid; v_id uuid;
begin
  select id into v_owner from profiles where handle = lower(p_handle);
  if v_owner is null then raise exception 'card not found'; end if;
  if coalesce(trim(p_name),'') = '' or position('@' in coalesce(p_email,'')) = 0 then raise exception 'name and email required'; end if;
  insert into threads(owner_id, other_name, other_email, other_role, other_company, where_met, confirmed)
  values (v_owner, left(trim(p_name),80), left(trim(p_email),120), left(coalesce(p_role,''),80), left(coalesce(p_company,''),80),
          coalesce(nullif(left(trim(p_where),120),''),'In person'), true)
  returning id, guest_token into v_id, v_token;
  insert into thread_events(thread_id, kind, text) values
    (v_id, 'tap', split_part(trim(p_name),' ',1) || ' started a Thread from your card'),
    (v_id, 'confirm', 'Verified by both');
  return v_token;
end $$;

create or replace function public.get_guest_thread(p_token uuid)
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'where_met', t.where_met, 'confirmed', t.confirmed, 'theirs', t.theirs,
    'owner_answered', t.mine is not null,
    'owner_answer', case when t.theirs is null then null when t.mine = 'notnow' then 'keep' else t.mine end,
    'owner', json_build_object('name', p.name, 'role', p.role, 'company', p.company, 'handle', p.handle)
  )
  from threads t join profiles p on p.id = t.owner_id
  where t.guest_token = p_token;
$$;

create or replace function public.guest_confirm(p_token uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_name text;
begin
  update threads set confirmed = true where guest_token = p_token and confirmed = false returning id, other_name into v_id, v_name;
  if v_id is not null then insert into thread_events(thread_id, kind, text) values (v_id, 'confirm', split_part(v_name,' ',1) || ' confirmed the Thread'); end if;
end $$;

create or replace function public.guest_answer(p_token uuid, p_answer text)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_name text;
begin
  if p_answer not in ('meet','intro','keep','notnow') then raise exception 'invalid answer'; end if;
  update threads set theirs = p_answer where guest_token = p_token and confirmed = true returning id, other_name into v_id, v_name;
  if v_id is not null then insert into thread_events(thread_id, kind, text) values (v_id, 'answer', split_part(v_name,' ',1) || ' answered "What''s next?"'); end if;
end $$;

revoke all on function public.start_thread_from_card(text,text,text,text,text,text) from public;
revoke all on function public.get_guest_thread(uuid) from public;
revoke all on function public.guest_confirm(uuid) from public;
revoke all on function public.guest_answer(uuid,text) from public;
grant execute on function public.start_thread_from_card(text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.get_guest_thread(uuid) to anon, authenticated;
grant execute on function public.guest_confirm(uuid) to anon, authenticated;
grant execute on function public.guest_answer(uuid,text) to anon, authenticated;

-- Handle availability check for sign-up (returns true if free)
create or replace function public.handle_available(p_handle text)
returns boolean language sql security definer set search_path = public as $$
  select not exists (select 1 from profiles where handle = lower(p_handle));
$$;
grant execute on function public.handle_available(text) to anon, authenticated;
