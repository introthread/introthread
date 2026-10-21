-- 009: Plans and pricing screen (admin redesign, screen 6 of 9)
-- Run once in the Supabase SQL Editor. Safe to run again.

-- 1. Plan description and who changed it last
alter table public.plans add column if not exists description text;
alter table public.plans add column if not exists updated_at timestamptz;
alter table public.plans add column if not exists updated_by uuid references auth.users(id) on delete set null;
update public.plans set description = 'Basic access for new users.' where id = 'free' and description is null;
update public.plans set description = 'For professionals and teams.' where id = 'pro' and description is null;

-- 2. Everything for the Plans page: plans, people on each plan, who changed each plan last
create or replace function public.admin_plans2() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform assert_staff(array['owner','admin','finance']);
  return jsonb_build_object(
    'users',  (select count(*) from profiles),
    'paying', (select count(*) from subscriptions where plan_id <> 'free' and status in ('active','trialing','past_due')),
    'stripe', exists(select 1 from subscriptions where stripe_subscription_id is not null),
    'plans',  (select coalesce(jsonb_agg(to_jsonb(p) || jsonb_build_object(
        'people', case when p.id = 'free' then null
                  else (select count(*) from subscriptions s where s.plan_id = p.id and s.status in ('active','trialing','past_due')) end,
        'updated_by_name', (select coalesce(pr.name, st.email) from staff st left join profiles pr on pr.id = st.user_id where st.user_id = p.updated_by)
      ) order by p.sort, p.id), '[]'::jsonb) from plans p));
end $$;

-- 3. Save one plan: validates every value, records exactly what changed (before and after)
create or replace function public.admin_plan_save(pid text, patch jsonb, reason text) returns jsonb language plpgsql security definer set search_path = public as $$
declare b plans; a plans; ch jsonb; k text; n numeric;
begin
  perform assert_staff(array['owner','finance']);
  if coalesce(btrim(reason), '') = '' then raise exception 'Add a short reason' using errcode = '22023'; end if;
  if patch is null or jsonb_typeof(patch) <> 'object' then raise exception 'Nothing to save' using errcode = '22023'; end if;
  select * into b from plans where id = pid for update;
  if not found then raise exception 'Plan not found' using errcode = 'P0002'; end if;

  if patch ? 'name' and (coalesce(btrim(patch->>'name'), '') = '' or length(btrim(patch->>'name')) > 40) then
    raise exception 'Plan name must be 1 to 40 characters' using errcode = '22023'; end if;
  if patch ? 'description' and length(coalesce(patch->>'description', '')) > 140 then
    raise exception 'Description must be 140 characters or fewer' using errcode = '22023'; end if;
  foreach k in array array['price_usd_month','price_usd_year','price_gbp_month','price_gbp_year'] loop
    if patch ? k then
      begin n := (patch->>k)::numeric; exception when others then n := null; end;
      if n is null or n < 0 or n > 100000 or n <> round(n, 2) then
        raise exception 'Prices must be between 0 and 100000, with at most 2 decimals' using errcode = '22023'; end if;
      if pid = 'free' and n <> 0 then raise exception 'The Free plan must stay at 0' using errcode = '22023'; end if;
    end if;
  end loop;
  if patch ? 'threads_per_month' then
    if jsonb_typeof(patch->'threads_per_month') = 'null' then
      if pid = 'free' then raise exception 'The Free plan needs a Thread limit' using errcode = '22023'; end if;
    else
      begin n := (patch->>'threads_per_month')::numeric; exception when others then n := null; end;
      if n is null or n < 0 or n > 100000 or n <> trunc(n) then
        raise exception 'New Threads per month must be a whole number from 0 to 100000' using errcode = '22023'; end if;
    end if;
  end if;
  if patch ? 'active' and jsonb_typeof(patch->'active') <> 'boolean' then raise exception 'Invalid status' using errcode = '22023'; end if;
  if pid = 'free' and patch ? 'active' and (patch->>'active')::boolean = false then
    raise exception 'The Free plan cannot be hidden' using errcode = '22023'; end if;

  update plans set
    name              = case when patch ? 'name' then btrim(patch->>'name') else name end,
    description       = case when patch ? 'description' then nullif(btrim(patch->>'description'), '') else description end,
    price_usd_month   = case when patch ? 'price_usd_month' then (patch->>'price_usd_month')::numeric else price_usd_month end,
    price_usd_year    = case when patch ? 'price_usd_year'  then (patch->>'price_usd_year')::numeric  else price_usd_year end,
    price_gbp_month   = case when patch ? 'price_gbp_month' then (patch->>'price_gbp_month')::numeric else price_gbp_month end,
    price_gbp_year    = case when patch ? 'price_gbp_year'  then (patch->>'price_gbp_year')::numeric  else price_gbp_year end,
    threads_per_month = case when patch ? 'threads_per_month' then (patch->>'threads_per_month')::numeric::int else threads_per_month end,
    active            = case when patch ? 'active' then (patch->>'active')::boolean else active end
  where id = pid returning * into a;

  select coalesce(jsonb_object_agg(o.key, jsonb_build_object('from', o.bv, 'to', x.av)), '{}'::jsonb) into ch
    from jsonb_each(to_jsonb(b)) as o(key, bv) join jsonb_each(to_jsonb(a)) as x(key, av) using (key)
    where o.key not in ('updated_at','updated_by') and o.bv is distinct from x.av;
  if ch = '{}'::jsonb then return to_jsonb(a); end if;   -- nothing changed: no audit entry

  update plans set updated_at = now(), updated_by = auth.uid() where id = pid returning * into a;
  -- The app reads the Free limit from app_settings, so keep it in step
  if pid = 'free' and ch ? 'threads_per_month' then
    insert into app_settings(key, value, updated_by, updated_at) values ('free_threads_per_month', to_jsonb(a.threads_per_month), auth.uid(), now())
    on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now();
  end if;
  perform audit('plan.update', 'plan', pid, reason, jsonb_build_object('name', a.name, 'changes', ch));
  return to_jsonb(a);
end $$;

-- 4. Pricing history (from the audit log)
create or replace function public.admin_plan_history(pid text default null, lim int default 100) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform assert_staff(array['owner','admin','finance']);
  return (select coalesce(jsonb_agg(to_jsonb(l) || jsonb_build_object(
      'actor', (select coalesce(p.name, s.email) from staff s left join profiles p on p.id = s.user_id where s.user_id = l.actor_id),
      'plan_name', (select name from plans where id = l.target_id)) order by l.created_at desc), '[]'::jsonb)
    from (select * from audit_log where target_type = 'plan' and (pid is null or target_id = pid)
          order by created_at desc limit greatest(1, least(lim, 500))) l);
end $$;

revoke all on function public.admin_plans2(), public.admin_plan_save(text,jsonb,text), public.admin_plan_history(text,int) from public, anon;
grant execute on function public.admin_plans2(), public.admin_plan_save(text,jsonb,text), public.admin_plan_history(text,int) to authenticated;
