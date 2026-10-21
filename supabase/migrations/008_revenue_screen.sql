-- 008: Revenue screen (admin redesign, screen 5 of 9)
-- Run once in the Supabase SQL Editor. Safe to run again.

-- 1. Subscription dates, so monthly revenue and growth can be worked out over time
alter table public.subscriptions add column if not exists started_at timestamptz;
alter table public.subscriptions add column if not exists canceled_at timestamptz;
alter table public.subscriptions add column if not exists amount numeric;      -- what this person pays per interval, in their currency (set by Stripe later)
update public.subscriptions set started_at = coalesce(started_at, updated_at) where started_at is null;
update public.subscriptions set canceled_at = coalesce(canceled_at, updated_at) where status = 'canceled' and canceled_at is null;
alter table public.subscriptions alter column started_at set default now();

-- 2. Payments. Written only by the Stripe webhook (service role). Staff can read.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  plan_id text references public.plans(id),
  amount numeric not null,                  -- in the payment currency, e.g. 12.00
  currency text not null default 'usd',
  amount_usd numeric,                       -- same amount in USD for totals (GBP converted by the webhook)
  status text not null check (status in ('succeeded','failed','refunded','pending')),
  stripe_invoice_id text unique, stripe_payment_intent text,
  failure_reason text,
  created_at timestamptz not null default now()
);
create index if not exists payments_created_idx on public.payments(created_at desc);
alter table public.payments enable row level security;
drop policy if exists "staff read payments" on public.payments;
create policy "staff read payments" on public.payments for select using (public.is_staff(array['owner','admin','finance']));
drop policy if exists "user reads own payments" on public.payments;
create policy "user reads own payments" on public.payments for select using (auth.uid() = user_id);

-- Monthly value of one subscription in USD
create or replace function public.sub_mrr_usd(s subscriptions) returns numeric language sql stable set search_path = public as $$
  select case when s.plan_id = 'free' then 0
    when s.amount is not null and coalesce(s.currency,'usd') = 'usd' then case when s.interval = 'year' then s.amount / 12.0 else s.amount end
    else coalesce((select case when s.interval = 'year' then p.price_usd_year / 12.0 else p.price_usd_month end from plans p where p.id = s.plan_id), 0) end
$$;

-- 3. Everything for the Revenue page
create or replace function public.admin_revenue(months int default 12, gran text default 'month')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare res jsonb; m int := greatest(1, least(coalesce(months,12), 36)); g text := case when gran = 'week' then 'week' else 'month' end;
  t0 timestamptz;
begin
  perform assert_staff(array['owner','admin','finance']);
  t0 := date_trunc(g, now()) - (case when g = 'week' then make_interval(weeks => least(m * 4, 52) - 1) else make_interval(months => m - 1) end);
  with paidnow as (
    select s.* from subscriptions s where s.plan_id <> 'free' and s.status in ('active','trialing','past_due')
  ), b as (
    select gs as start, gs + (case when g = 'week' then interval '1 week' else interval '1 month' end) as stop
    from generate_series(t0, date_trunc(g, now()), case when g = 'week' then interval '1 week' else interval '1 month' end) gs
  ), series as (
    select b.start,
      coalesce((select sum(coalesce(p.amount_usd, case when p.currency = 'usd' then p.amount end)) from payments p where p.status = 'succeeded' and p.created_at >= b.start and p.created_at < b.stop), 0) as revenue,
      coalesce((select sum(public.sub_mrr_usd(s)) from subscriptions s where s.plan_id <> 'free' and s.started_at < least(b.stop, now()) and (s.canceled_at is null or s.canceled_at >= least(b.stop, now()))), 0) as mrr,
      (select count(*) from subscriptions s where s.plan_id <> 'free' and s.started_at >= b.start and s.started_at < b.stop) as new_paying,
      (select count(*) from subscriptions s where s.plan_id <> 'free' and s.started_at < least(b.stop, now()) and (s.canceled_at is null or s.canceled_at >= least(b.stop, now()))) as paying
    from b
  )
  select jsonb_build_object(
    'stripe', jsonb_build_object(
      'connected', exists(select 1 from subscriptions where stripe_subscription_id is not null) or exists(select 1 from payments where stripe_invoice_id is not null),
      'prices_linked', (select count(*) from plans where id <> 'free' and (stripe_price_month is not null or stripe_price_year is not null)),
      'last_payment', (select max(created_at) from payments)),
    'kpi', jsonb_build_object(
      'mrr', (select coalesce(sum(public.sub_mrr_usd(s)), 0) from paidnow s),
      'mrr_prev', (select coalesce(sum(public.sub_mrr_usd(s)), 0) from subscriptions s where s.plan_id <> 'free' and s.started_at < date_trunc('month', now()) and (s.canceled_at is null or s.canceled_at >= date_trunc('month', now()))),
      'paying', (select count(*) from paidnow),
      'paying_prev', (select count(*) from subscriptions s where s.plan_id <> 'free' and s.started_at < date_trunc('month', now()) and (s.canceled_at is null or s.canceled_at >= date_trunc('month', now()))),
      'users', (select count(*) from profiles),
      'users_prev', (select count(*) from profiles where created_at < date_trunc('month', now())),
      'past_due', (select count(*) from subscriptions where plan_id <> 'free' and status = 'past_due'),
      'revenue_range', (select coalesce(sum(revenue), 0) from series),
      'failed_30d', (select count(*) from payments where status = 'failed' and created_at > now() - interval '30 days')),
    'gran', g,
    'series', (select coalesce(jsonb_agg(jsonb_build_object('start', start, 'revenue', round(revenue, 2), 'mrr', round(mrr, 2), 'new_paying', new_paying, 'paying', paying) order by start), '[]'::jsonb) from series),
    'subs_counts', (select jsonb_build_object(
      'active', count(*) filter (where status in ('active','trialing')),
      'past_due', count(*) filter (where status = 'past_due'),
      'canceled', count(*) filter (where status = 'canceled'),
      'all', count(*)) from subscriptions where plan_id <> 'free'),
    'by_plan', (select coalesce(jsonb_agg(x order by x->>'sort'), '[]'::jsonb) from (
      select jsonb_build_object('id', p.id, 'name', p.name, 'sort', p.sort,
        'revenue', coalesce((select sum(coalesce(y.amount_usd, case when y.currency = 'usd' then y.amount end)) from payments y where y.plan_id = p.id and y.status = 'succeeded' and y.created_at >= t0), 0),
        'mrr', coalesce((select sum(public.sub_mrr_usd(s)) from paidnow s where s.plan_id = p.id), 0),
        'people', case when p.id = 'free' then (select count(*) from profiles) - (select count(*) from paidnow) else (select count(*) from paidnow s where s.plan_id = p.id) end) x
      from plans p where p.active or exists(select 1 from subscriptions s where s.plan_id = p.id)) z),
    'plans', (select coalesce(jsonb_agg(to_jsonb(p) order by p.sort), '[]'::jsonb) from plans p)
  ) into res;
  return res;
end $$;

-- 4. Subscriptions list
create or replace function public.admin_subs2(st text default 'active', q text default '', lim int default 10, off int default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare res jsonb;
begin
  perform assert_staff(array['owner','admin','finance']);
  with f as (
    select s.*, p.name, p.handle, public.admin_mask_email((select email from auth.users u where u.id = s.user_id)) as email,
      public.sub_mrr_usd(s) as mrr_usd, (select name from plans where id = s.plan_id) as plan_name,
      case when s.amount is not null then s.amount
           when coalesce(s.currency,'usd') = 'gbp' then (select case when s.interval = 'year' then price_gbp_year else price_gbp_month end from plans where id = s.plan_id)
           else (select case when s.interval = 'year' then price_usd_year else price_usd_month end from plans where id = s.plan_id) end as price
    from subscriptions s left join profiles p on p.id = s.user_id
    where s.plan_id <> 'free'
      and (st = 'all' or (st = 'active' and s.status in ('active','trialing')) or (st = 'past_due' and s.status = 'past_due') or (st = 'canceled' and s.status = 'canceled'))
      and (coalesce(q,'') = '' or concat_ws(' ', p.name, p.handle) ilike '%' || q || '%')
  )
  select jsonb_build_object('total', (select count(*) from f),
    'rows', coalesce((select jsonb_agg(to_jsonb(z)) from (select * from f order by coalesce(started_at, updated_at) desc limit greatest(1, least(lim, 500)) offset greatest(off, 0)) z), '[]'::jsonb))
  into res;
  return res;
end $$;

-- 5. Payments list
create or replace function public.admin_payments(st text default 'all', lim int default 8, off int default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare res jsonb;
begin
  perform assert_staff(array['owner','admin','finance']);
  with f as (
    select y.id, y.user_id, y.plan_id, y.amount, y.currency, y.amount_usd, y.status, y.failure_reason, y.created_at, y.stripe_invoice_id,
      p.name, p.handle, (select name from plans where id = y.plan_id) as plan_name
    from payments y left join profiles p on p.id = y.user_id
    where st = 'all' or y.status = st
  )
  select jsonb_build_object('total', (select count(*) from f),
    'rows', coalesce((select jsonb_agg(to_jsonb(z)) from (select * from f order by created_at desc limit greatest(1, least(lim, 500)) offset greatest(off, 0)) z), '[]'::jsonb))
  into res;
  return res;
end $$;

revoke all on function public.admin_revenue(int,text), public.admin_subs2(text,text,int,int), public.admin_payments(text,int,int), public.sub_mrr_usd(subscriptions) from public, anon;
grant execute on function public.admin_revenue(int,text), public.admin_subs2(text,text,int,int), public.admin_payments(text,int,int) to authenticated;
