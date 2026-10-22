-- 016: Re-apply the 015 profile privacy fix (22 Oct 2026). Run once in the Supabase SQL Editor. Safe to run again.
-- Why: after 015, has_column_privilege('anon','public.profiles','prefs','select') still returned TRUE,
-- so visitors could still read private profile fields. Likely causes: 015 stopped part-way (the SQL Editor
-- rolls back the whole script if one statement fails), or a SELECT grant remained via PUBLIC or a column grant.
-- This script removes every SELECT path (table and column, for PUBLIC, anon and authenticated) and then
-- grants back only the public card columns. The last query prints a self-check: every row must say "ok".

-- 1. Private profile fields --------------------------------------------------------
revoke select on public.profiles from public, anon, authenticated;
revoke select (prefs, plan) on public.profiles from public, anon, authenticated;
grant select (id, handle, name, role, company, city, bio, theme, links, created_at) on public.profiles to anon, authenticated;

create or replace function public.my_profile() returns public.profiles language sql stable security definer set search_path = public as $$
  select * from profiles where id = auth.uid();
$$;
revoke all on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- 2. Only the server, database functions and staff can change a plan ---------------
create or replace function public.profiles_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') and coalesce(auth.role(), '') <> 'service_role' and not public.is_staff() then
    if tg_op = 'INSERT' then new.plan := 'Free';
    elsif new.plan is distinct from old.plan then new.plan := old.plan;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before insert or update on public.profiles for each row execute function public.profiles_guard();

-- 3. Input limits (existing rows are not re-checked) ---------------------------------
alter table public.profiles drop constraint if exists profiles_len_chk;
alter table public.profiles add constraint profiles_len_chk check (
  char_length(name) <= 120 and char_length(coalesce(role,'')) <= 120 and char_length(coalesce(company,'')) <= 120
  and char_length(coalesce(city,'')) <= 120 and char_length(coalesce(theme,'')) <= 40
  and pg_column_size(coalesce(links,'{}'::jsonb)) <= 1500000 and pg_column_size(coalesce(prefs,'{}'::jsonb)) <= 1500000
) not valid;

-- 4. Self-check: every row should say ok ----------------------------------------------
select check_name, case when result = expected then 'ok' else 'PROBLEM' end as status, result, expected from (values
  ('visitors cannot read prefs',          has_column_privilege('anon','public.profiles','prefs','select'),          false),
  ('visitors cannot read plan',           has_column_privilege('anon','public.profiles','plan','select'),           false),
  ('signed-in users cannot read prefs',   has_column_privilege('authenticated','public.profiles','prefs','select'), false),
  ('visitors can read card name',         has_column_privilege('anon','public.profiles','name','select'),           true),
  ('visitors can read card handle',       has_column_privilege('anon','public.profiles','handle','select'),         true),
  ('my_profile() exists',                 exists(select 1 from pg_proc where proname = 'my_profile'),               true),
  ('plan guard trigger exists',           exists(select 1 from pg_trigger where tgname = 'profiles_guard'),         true),
  ('length limits exist',                 exists(select 1 from pg_constraint where conname = 'profiles_len_chk'),   true)
) as t(check_name, result, expected);
