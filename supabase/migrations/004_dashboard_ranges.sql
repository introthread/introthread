-- Introthread migration 004: dashboard statistics for any date range (7, 30 or 90 days)
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to re-run.
-- Real numbers only. Each period is compared with the period just before it.

create or replace function public.admin_stats_range(days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare
  d int := greatest(1, least(coalesce(days,30), 365));
  p_start timestamptz := now() - make_interval(days => d);
  q_start timestamptz := now() - make_interval(days => 2*d);
  r jsonb;
begin
  perform assert_staff();
  select jsonb_build_object(
    'days', d,
    'generated_at', now(),
    -- people
    'users', (select count(*) from profiles),
    'users_period', (select count(*) from profiles where created_at >= p_start),
    'users_prev', (select count(*) from profiles where created_at >= q_start and created_at < p_start),
    -- active = created at least one Thread in the period
    'active_period', (select count(distinct owner_id) from threads where created_at >= p_start),
    'active_prev', (select count(distinct owner_id) from threads where created_at >= q_start and created_at < p_start),
    'signed_in_period', (select count(*) from auth.users where last_sign_in_at >= p_start),
    -- threads and quality
    'threads', (select count(*) from threads),
    'threads_period', (select count(*) from threads where created_at >= p_start),
    'threads_prev', (select count(*) from threads where created_at >= q_start and created_at < p_start),
    'confirmed_period', (select count(*) from threads where created_at >= p_start and confirmed),
    'confirmed_prev', (select count(*) from threads where created_at >= q_start and created_at < p_start and confirmed),
    'answered_period', (select count(*) from threads where created_at >= p_start and mine is not null),
    'both_period', (select count(*) from threads where created_at >= p_start and mine is not null and theirs is not null),
    'both_prev', (select count(*) from threads where created_at >= q_start and created_at < p_start and mine is not null and theirs is not null),
    -- contacts
    'contacts', (select count(*) from contacts),
    'contacts_period', (select count(*) from contacts where created_at >= p_start),
    'contacts_prev', (select count(*) from contacts where created_at >= q_start and created_at < p_start),
    'rooms', (select count(*) from rooms),
    -- money (current snapshot; no history until Stripe is connected)
    'paying', (select count(*) from subscriptions where plan_id <> 'free' and status in ('active','trialing')),
    'mrr_usd', (select coalesce(sum(case when s.interval='year' then p.price_usd_year/12.0 else p.price_usd_month end),0)
                 from subscriptions s join plans p on p.id=s.plan_id where s.plan_id<>'free' and s.status in ('active','trialing')),
    'plans', (select coalesce(jsonb_object_agg(plan_id,n),'{}'::jsonb) from (select plan_id,count(*) n from subscriptions group by 1) x),
    'billing_configured', (select exists(select 1 from plans where id<>'free' and active and (stripe_price_month is not null or stripe_price_year is not null))),
    -- operations and health
    'reports_open', (select count(*) from reports where status in ('open','reviewing')),
    'reports_oldest', (select min(created_at) from reports where status in ('open','reviewing')),
    'privacy_open', (select count(*) from privacy_requests where status in ('open','in_progress')),
    'privacy_overdue', (select count(*) from privacy_requests where status in ('open','in_progress') and due_at < now()),
    'privacy_next_due', (select min(due_at) from privacy_requests where status in ('open','in_progress')),
    'suspended', (select count(*) from account_status where status <> 'active'),
    'mfa_required', coalesce((select (value)::text='true' from app_settings where key='admin_require_mfa'), true),
    'maintenance', coalesce((select (value)::text='true' from app_settings where key='maintenance'), false),
    'staff_without_mfa', (select count(*) from staff s where not exists (select 1 from auth.mfa_factors f where f.user_id=s.user_id and f.status='verified')),
    -- series
    'signups_by_day', (select coalesce(jsonb_agg(jsonb_build_object('d',g::date,'n',(select count(*) from profiles p where p.created_at::date=g::date)) order by g),'[]'::jsonb)
        from generate_series(current_date-(d-1), current_date, interval '1 day') g),
    'threads_by_day', (select coalesce(jsonb_agg(jsonb_build_object('d',g::date,'n',(select count(*) from threads t where t.created_at::date=g::date)) order by g),'[]'::jsonb)
        from generate_series(current_date-(d-1), current_date, interval '1 day') g),
    'cities', (select coalesce(jsonb_agg(jsonb_build_object('c',c,'n',n) order by n desc),'[]'::jsonb) from (
        select coalesce(nullif(trim(city),''),'Not set') c, count(*) n from profiles group by 1 order by 2 desc limit 8) c)
  ) into r;
  return r;
end $$;

revoke all on function public.admin_stats_range(int) from public, anon;
grant execute on function public.admin_stats_range(int) to authenticated;
