-- 011: Staff screen (admin redesign, screen 9 of 9)
-- Run once in the Supabase SQL Editor. Safe to run again.

-- 1. Pause a staff member's admin access without removing their role
alter table public.staff add column if not exists suspended_at timestamptz;
alter table public.staff add column if not exists suspended_by uuid references auth.users(id) on delete set null;
alter table public.staff add column if not exists invited_by uuid references auth.users(id) on delete set null;

-- Paused staff are not staff for any permission check
create or replace function public.is_staff(roles text[] default array['owner','admin','support','moderator','finance'])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid() and s.role = any(roles) and s.suspended_at is null);
$$;
create or replace function public.admin_me() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('staff', s.role is not null and s.suspended_at is null, 'role', case when s.suspended_at is null then s.role end,
    'suspended', s.suspended_at is not null, 'aal', coalesce(auth.jwt()->>'aal','aal1'),
    'mfa_required', coalesce((select (value)::text='true' from app_settings where key='admin_require_mfa'), true))
  from (select (select role from staff where user_id = auth.uid()) as role, (select suspended_at from staff where user_id = auth.uid()) as suspended_at) s;
$$;

-- 2. Invitations. Written only through the functions below.
create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null check (role in ('owner','admin','support','moderator','finance')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked','failed')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  sent_at timestamptz, accepted_at timestamptz,
  accepted_user uuid references auth.users(id) on delete set null,
  failure_reason text
);
create unique index if not exists staff_invites_one_pending on public.staff_invites (lower(email)) where status = 'pending';
alter table public.staff_invites enable row level security;
drop policy if exists "staff read invites" on public.staff_invites;
create policy "staff read invites" on public.staff_invites for select using (public.is_staff());

-- helper: owners that are not paused, other than uid
create or replace function public.staff_other_owners(uid uuid) returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from staff where role = 'owner' and suspended_at is null and user_id <> uid;
$$;

-- 3. Everything for the Staff page
create or replace function public.admin_staff2() returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform assert_staff();
  -- expired invitations stay 'pending' in the table; the page shows them as Expired
  return (with st as (
      select s.user_id, s.email, s.role, s.created_at, s.suspended_at, p.name, p.handle, u.last_sign_in_at,
        exists(select 1 from auth.mfa_factors f where f.user_id = s.user_id and f.status = 'verified') as mfa,
        (select coalesce(pp.name, x.email) from staff x left join profiles pp on pp.id = x.user_id where x.user_id = s.invited_by) as invited_by_name
      from staff s left join profiles p on p.id = s.user_id left join auth.users u on u.id = s.user_id),
    inv as (select i.*, (i.status = 'pending' and i.expires_at < now()) as expired,
        (select coalesce(pp.name, x.email) from staff x left join profiles pp on pp.id = x.user_id where x.user_id = i.invited_by) as invited_by_name
      from staff_invites i where i.status in ('pending','failed') or i.created_at > now() - interval '30 days')
    select jsonb_build_object(
      'me', auth.uid(),
      'staff', (select coalesce(jsonb_agg(to_jsonb(st) order by (st.role = 'owner') desc, st.created_at), '[]'::jsonb) from st),
      'invites', (select coalesce(jsonb_agg(to_jsonb(inv) order by inv.created_at desc), '[]'::jsonb) from inv),
      'counts', jsonb_build_object(
        'total', (select count(*) from st),
        'active', (select count(*) from st where suspended_at is null),
        'suspended', (select count(*) from st where suspended_at is not null),
        'pending', (select count(*) from inv where status = 'pending' and not expired),
        'expired', (select count(*) from inv where status = 'pending' and expired),
        'failed', (select count(*) from inv where status = 'failed'),
        'mfa_off', (select count(*) from st where suspended_at is null and not mfa),
        'new_month', (select count(*) from st where created_at >= date_trunc('month', now())))));
end $$;

-- 4. Invite (owners only). The browser then asks Supabase to send the sign-in email and reports the result.
create or replace function public.admin_staff_invite(em text, new_role text, reason text) returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare e text := lower(btrim(coalesce(em,''))); r staff_invites;
begin
  perform assert_staff(array['owner']);
  if coalesce(btrim(reason),'') = '' then raise exception 'Add a short reason' using errcode = '22023'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(e) > 254 then raise exception 'Enter a valid email address' using errcode = '22023'; end if;
  if new_role not in ('owner','admin','support','moderator','finance') then raise exception 'Choose a valid role' using errcode = '22023'; end if;
  if exists(select 1 from staff where lower(email) = e or user_id = (select id from auth.users where lower(email) = e)) then
    raise exception 'This person is already on the staff list. Change their role instead.' using errcode = '23505'; end if;
  update staff_invites set status = 'revoked' where lower(email) = e and status = 'pending' and expires_at < now();
  if exists(select 1 from staff_invites where lower(email) = e and status = 'pending') then
    raise exception 'An invitation to this email is already pending. Resend it instead.' using errcode = '23505'; end if;
  insert into staff_invites(email, role, invited_by) values (e, new_role, auth.uid()) returning * into r;
  perform audit('staff.invite', 'staff_invite', r.id::text, reason, jsonb_build_object('email', e, 'role', new_role));
  return to_jsonb(r);
end $$;

create or replace function public.admin_staff_invite_sent(iid uuid, ok boolean, err text default null) returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_staff(array['owner']);
  if ok then update staff_invites set sent_at = now(), failure_reason = null where id = iid and status in ('pending','failed');
  else
    update staff_invites set status = 'failed', failure_reason = left(coalesce(err,'Email could not be sent'), 300) where id = iid and status = 'pending';
    perform audit('staff.invite_failed', 'staff_invite', iid::text, left(coalesce(err,'Email could not be sent'), 300));
  end if;
end $$;

create or replace function public.admin_staff_invite_resend(iid uuid, reason text) returns jsonb language plpgsql security definer set search_path = public as $$
declare r staff_invites;
begin
  perform assert_staff(array['owner']);
  if coalesce(btrim(reason),'') = '' then raise exception 'Add a short reason' using errcode = '22023'; end if;
  select * into r from staff_invites where id = iid for update;
  if not found or r.status not in ('pending','failed') then raise exception 'This invitation can no longer be sent' using errcode = '22023'; end if;
  if exists(select 1 from staff where lower(email) = lower(r.email)) then raise exception 'This person is already on the staff list' using errcode = '23505'; end if;
  update staff_invites set status = 'pending', expires_at = now() + interval '7 days', failure_reason = null where id = iid returning * into r;
  perform audit('staff.invite_resend', 'staff_invite', iid::text, reason, jsonb_build_object('email', r.email, 'role', r.role));
  return to_jsonb(r);
end $$;

create or replace function public.admin_staff_invite_revoke(iid uuid, reason text) returns void language plpgsql security definer set search_path = public as $$
declare r staff_invites;
begin
  perform assert_staff(array['owner']);
  if coalesce(btrim(reason),'') = '' then raise exception 'Add a short reason' using errcode = '22023'; end if;
  update staff_invites set status = 'revoked' where id = iid and status in ('pending','failed') returning * into r;
  if not found then raise exception 'This invitation is already closed' using errcode = '22023'; end if;
  perform audit('staff.invite_revoke', 'staff_invite', iid::text, reason, jsonb_build_object('email', r.email, 'role', r.role));
end $$;

-- 5. Accept: called by the invited person after they sign in (confirmed email must match the invitation)
create or replace function public.staff_accept_invite() returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare u auth.users; r staff_invites;
begin
  select * into u from auth.users where id = auth.uid();
  if u.id is null or u.email_confirmed_at is null then return null; end if;
  select * into r from staff_invites where lower(email) = lower(u.email) and status = 'pending' and expires_at >= now() order by created_at desc limit 1 for update;
  if not found then return null; end if;
  if exists(select 1 from staff where user_id = u.id) then
    update staff_invites set status = 'revoked' where id = r.id;  -- already staff: keep their current role
    return null;
  end if;
  insert into staff(user_id, email, role, invited_by) values (u.id, lower(u.email), r.role, r.invited_by);
  update staff_invites set status = 'accepted', accepted_at = now(), accepted_user = u.id where id = r.id;
  perform audit('staff.invite_accepted', 'user', u.id::text, 'Accepted staff invitation', jsonb_build_object('email', lower(u.email), 'role', r.role, 'invite', r.id));
  return jsonb_build_object('role', r.role);
end $$;

-- 6. Change role, pause/restore, remove (owners only). Always keeps at least one active owner; you cannot change yourself.
create or replace function public.admin_staff_role(uid uuid, new_role text, reason text) returns void language plpgsql security definer set search_path = public as $$
declare s staff;
begin
  perform assert_staff(array['owner']);
  if coalesce(btrim(reason),'') = '' then raise exception 'Add a short reason' using errcode = '22023'; end if;
  if uid = auth.uid() then raise exception 'You cannot change your own role. Ask another owner.' using errcode = '42501'; end if;
  if new_role not in ('owner','admin','support','moderator','finance') then raise exception 'Choose a valid role' using errcode = '22023'; end if;
  select * into s from staff where user_id = uid for update;
  if not found then raise exception 'This person is not on the staff list' using errcode = 'P0002'; end if;
  if s.role = new_role then return; end if;
  if s.role = 'owner' and staff_other_owners(uid) = 0 then raise exception 'Introthread must keep at least one active owner' using errcode = '42501'; end if;
  update staff set role = new_role where user_id = uid;
  perform audit('staff.role', 'user', uid::text, reason, jsonb_build_object('email', s.email, 'from', s.role, 'to', new_role));
end $$;

create or replace function public.admin_staff_suspend(uid uuid, pause boolean, reason text) returns void language plpgsql security definer set search_path = public as $$
declare s staff;
begin
  perform assert_staff(array['owner']);
  if coalesce(btrim(reason),'') = '' then raise exception 'Add a short reason' using errcode = '22023'; end if;
  if uid = auth.uid() then raise exception 'You cannot pause your own access' using errcode = '42501'; end if;
  select * into s from staff where user_id = uid for update;
  if not found then raise exception 'This person is not on the staff list' using errcode = 'P0002'; end if;
  if pause and s.role = 'owner' and staff_other_owners(uid) = 0 then raise exception 'Introthread must keep at least one active owner' using errcode = '42501'; end if;
  update staff set suspended_at = case when pause then now() end, suspended_by = case when pause then auth.uid() end where user_id = uid;
  perform audit(case when pause then 'staff.suspend' else 'staff.restore' end, 'user', uid::text, reason, jsonb_build_object('email', s.email, 'role', s.role));
end $$;

create or replace function public.admin_staff_remove(uid uuid, reason text) returns void language plpgsql security definer set search_path = public as $$
declare s staff;
begin
  perform assert_staff(array['owner']);
  if coalesce(btrim(reason),'') = '' then raise exception 'Add a short reason' using errcode = '22023'; end if;
  if uid = auth.uid() then raise exception 'You cannot remove your own access' using errcode = '42501'; end if;
  select * into s from staff where user_id = uid for update;
  if not found then raise exception 'This person is not on the staff list' using errcode = 'P0002'; end if;
  if s.role = 'owner' and staff_other_owners(uid) = 0 then raise exception 'Introthread must keep at least one active owner' using errcode = '42501'; end if;
  delete from staff where user_id = uid;
  perform audit('staff.remove', 'user', uid::text, reason, jsonb_build_object('email', s.email, 'role', s.role));
end $$;

revoke all on function public.admin_staff2(), public.admin_staff_invite(text,text,text), public.admin_staff_invite_sent(uuid,boolean,text),
  public.admin_staff_invite_resend(uuid,text), public.admin_staff_invite_revoke(uuid,text), public.staff_accept_invite(),
  public.admin_staff_role(uuid,text,text), public.admin_staff_suspend(uuid,boolean,text), public.admin_staff_remove(uuid,text), public.staff_other_owners(uuid) from public, anon;
grant execute on function public.admin_staff2(), public.admin_staff_invite(text,text,text), public.admin_staff_invite_sent(uuid,boolean,text),
  public.admin_staff_invite_resend(uuid,text), public.admin_staff_invite_revoke(uuid,text), public.staff_accept_invite(),
  public.admin_staff_role(uuid,text,text), public.admin_staff_suspend(uuid,boolean,text), public.admin_staff_remove(uuid,text) to authenticated;
