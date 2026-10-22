-- 018: Billing display comes only from server-written data (22 Oct 2026). Run once in the Supabase SQL Editor. Safe to run again.
-- Before: the browser could write anything into profiles.prefs.billing (plan, status, renewal date, card,
-- "paid" receipts). Pro itself was already protected by 015/016 (profiles.plan), but the Billing page could be
-- made to show false data. Now, for normal signed-in users, the database keeps the server's values for:
--   plan, status, interval, periodEnd, cancelAt, trialEnd, trialUsed, card, roomCredits, provider
-- and for receipts: every invoice the server wrote (id starting "ps_", or status paid) is kept exactly as it was,
-- and a browser-created invoice can never be marked paid (it stays open/pending until staff or the server change it).
-- Still allowed from the browser: billing details (name, email, company, address, VAT, country), requesting
-- invoices, and the invoice number counter. The payment server (service role), database functions and staff are
-- not restricted. Replaces profiles_guard from 015/016 and keeps its plan rule.

create or replace function public.profiles_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare ob jsonb; nb jsonb; k text; inv jsonb;
begin
  if not (current_user in ('authenticated', 'anon') and coalesce(auth.role(), '') <> 'service_role' and not public.is_staff()) then
    return new;
  end if;
  -- 1. plan (from 015/016)
  if tg_op = 'INSERT' then
    new.plan := 'Free';
    -- a new profile starts with no billing state of its own
    if new.prefs ? 'billing' then new.prefs := new.prefs - 'billing'; end if;
    return new;
  end if;
  if new.plan is distinct from old.plan then new.plan := old.plan; end if;
  -- 2. billing state inside prefs
  ob := coalesce(old.prefs -> 'billing', '{}'::jsonb);
  nb := coalesce(new.prefs -> 'billing', '{}'::jsonb);
  if nb is distinct from ob then
    foreach k in array array['plan','status','interval','periodEnd','cancelAt','trialEnd','trialUsed','card','roomCredits','provider'] loop
      if ob ? k then nb := jsonb_set(nb, array[k], ob -> k); else nb := nb - k; end if;
    end loop;
    -- receipts: server invoices exactly as before, then browser invoices (never paid), newest first
    select coalesce(jsonb_agg(x.v order by coalesce((x.v ->> 'date')::numeric, 0) desc), '[]'::jsonb) into inv from (
      select o.v from jsonb_array_elements(coalesce(ob -> 'invoices', '[]'::jsonb)) as o(v)
        where coalesce(o.v ->> 'id', '') like 'ps\_%' or coalesce(o.v ->> 'status', '') = 'paid'
      union all
      select case when coalesce(n.v ->> 'status', '') = 'paid'
                  then jsonb_set(n.v, '{status}', to_jsonb(coalesce((select p.v ->> 'status' from jsonb_array_elements(coalesce(ob -> 'invoices', '[]'::jsonb)) as p(v)
                                                                   where p.v ->> 'id' = n.v ->> 'id' limit 1), 'open')))
                  else n.v end
        from jsonb_array_elements(case when jsonb_typeof(nb -> 'invoices') = 'array' then nb -> 'invoices' else '[]'::jsonb end) as n(v)
        where coalesce(n.v ->> 'id', '') not like 'ps\_%'
          and not exists (select 1 from jsonb_array_elements(coalesce(ob -> 'invoices', '[]'::jsonb)) as q(v)
                          where q.v ->> 'id' = n.v ->> 'id' and coalesce(q.v ->> 'status', '') = 'paid')
    ) as x(v);
    nb := jsonb_set(nb, '{invoices}', inv);
    new.prefs := jsonb_set(coalesce(new.prefs, '{}'::jsonb), '{billing}', nb);
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before insert or update on public.profiles for each row execute function public.profiles_guard();

-- Self-check: should say ok
select 'billing guard installed' as check_name,
  case when position('roomCredits' in pg_get_functiondef('public.profiles_guard'::regproc)) > 0
        and exists(select 1 from pg_trigger where tgname = 'profiles_guard') then 'ok' else 'PROBLEM' end as status;
