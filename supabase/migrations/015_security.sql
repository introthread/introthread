-- 015: Security hardening (22 Oct 2026). Run once in the Supabase SQL Editor. Safe to run again.
-- Fixes found in the security audit (see SECURITY-AUDIT.md):
--  S1 Data exposure: anyone could read every profile's private columns (prefs: billing details, invoices,
--     card brand/last 4, settings; plan). Now the public can read only the card fields; each person reads
--     their own full row through my_profile().
--  S2 Privilege escalation: a signed-in person could set their own profiles.plan to 'Pro'. Now only the
--     payment server (service role), database functions and staff can change plan.
--  S3 Input limits: length limits on profile text and a size limit on links (which holds the photo).

-- S1 -------------------------------------------------------------------------------
revoke select on public.profiles from anon, authenticated;
grant select (id, handle, name, role, company, city, bio, theme, links, created_at) on public.profiles to anon, authenticated;

create or replace function public.my_profile() returns public.profiles language sql stable security definer set search_path = public as $$
  select * from profiles where id = auth.uid();
$$;
revoke all on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- S2 -------------------------------------------------------------------------------
create or replace function public.profiles_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Clients run as 'authenticated'. The payment server (service role), SQL editor and security-definer
  -- functions run as other database roles and may change the plan; staff may too.
  if current_user in ('authenticated', 'anon') and coalesce(auth.role(), '') <> 'service_role' and not public.is_staff() then
    if tg_op = 'INSERT' then new.plan := 'Free';
    elsif new.plan is distinct from old.plan then new.plan := old.plan;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before insert or update on public.profiles for each row execute function public.profiles_guard();

-- S3 -------------------------------------------------------------------------------
-- NOT VALID: existing rows are not re-checked; every new insert or update is.
alter table public.profiles drop constraint if exists profiles_len_chk;
alter table public.profiles add constraint profiles_len_chk check (
  char_length(name) <= 120 and char_length(coalesce(role,'')) <= 120 and char_length(coalesce(company,'')) <= 120
  and char_length(coalesce(city,'')) <= 120 and char_length(coalesce(theme,'')) <= 40
  and pg_column_size(coalesce(links,'{}'::jsonb)) <= 1500000 and pg_column_size(coalesce(prefs,'{}'::jsonb)) <= 1500000
) not valid;
