-- Introthread migration 002: contacts, moderation, admin, plans and billing
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- Safe to run again (uses IF NOT EXISTS / ON CONFLICT).

-- 1. Contacts: imported or captured people, private to the owner (not yet a Thread)
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text, email text, phone text, company text, role text, linkedin text,
  source text, notes text,
  created_at timestamptz not null default now()
);
create index if not exists contacts_owner_idx on public.contacts(owner_id, created_at desc);
alter table public.contacts enable row level security;
drop policy if exists "owner manages contacts" on public.contacts;
create policy "owner manages contacts" on public.contacts for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- 2. Staff roles (separate table so users can never make themselves admin)
create table if not exists public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner','admin','support','moderator','finance')),
  created_at timestamptz not null default now()
);
alter table public.staff enable row level security;
create or replace function public.is_staff(roles text[] default array['owner','admin','support','moderator','finance'])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid() and s.role = any(roles));
$$;
drop policy if exists "staff read staff" on public.staff;
create policy "staff read staff" on public.staff for select using (public.is_staff());
drop policy if exists "owner manages staff" on public.staff;
create policy "owner manages staff" on public.staff for all using (public.is_staff(array['owner'])) with check (public.is_staff(array['owner']));

-- Owner account (Agnes's decision, 21 Oct 2026). Works once this email has signed up.
insert into public.staff (user_id, email, role)
select id, email, 'owner' from auth.users where lower(email) = 'mosemqute@gmail.com'
on conflict (user_id) do update set role = 'owner';

-- 3. Audit log: every staff action, cannot be edited or deleted
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null, target_type text, target_id text, reason text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
drop policy if exists "staff read audit" on public.audit_log;
create policy "staff read audit" on public.audit_log for select using (public.is_staff());
drop policy if exists "staff write audit" on public.audit_log;
create policy "staff write audit" on public.audit_log for insert with check (public.is_staff() and actor_id = auth.uid());

-- 4. Reports from users (moderation queue)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in ('profile','thread','room')),
  target_id text not null, reason text not null, details text,
  status text not null default 'open' check (status in ('open','reviewing','actioned','dismissed')),
  resolved_by uuid references auth.users(id), resolved_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
drop policy if exists "anyone signed in can report" on public.reports;
create policy "anyone signed in can report" on public.reports for insert with check (auth.uid() = reporter_id);
drop policy if exists "reporter reads own" on public.reports;
create policy "reporter reads own" on public.reports for select using (auth.uid() = reporter_id or public.is_staff());
drop policy if exists "staff update reports" on public.reports;
create policy "staff update reports" on public.reports for update using (public.is_staff(array['owner','admin','moderator']));

-- 5. Account status (suspensions) kept by staff, readable by the user
create table if not exists public.account_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','suspended','banned')),
  reason text, updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
alter table public.account_status enable row level security;
drop policy if exists "user reads own status" on public.account_status;
create policy "user reads own status" on public.account_status for select using (auth.uid() = user_id or public.is_staff());
drop policy if exists "staff manage status" on public.account_status;
create policy "staff manage status" on public.account_status for all using (public.is_staff(array['owner','admin','moderator'])) with check (public.is_staff(array['owner','admin','moderator']));

-- 6. Plans (editable in admin without code) and subscriptions (kept in step with Stripe)
create table if not exists public.plans (
  id text primary key,
  name text not null,
  price_usd_month numeric, price_usd_year numeric,
  price_gbp_month numeric, price_gbp_year numeric,
  threads_per_month int,           -- null = unlimited
  features jsonb default '[]'::jsonb,
  stripe_price_month text, stripe_price_year text,
  active boolean not null default true,
  sort int default 0
);
alter table public.plans enable row level security;
drop policy if exists "plans are public" on public.plans;
create policy "plans are public" on public.plans for select using (true);
drop policy if exists "staff manage plans" on public.plans;
create policy "staff manage plans" on public.plans for all using (public.is_staff(array['owner','finance'])) with check (public.is_staff(array['owner','finance']));
insert into public.plans (id,name,price_usd_month,price_usd_year,price_gbp_month,price_gbp_year,threads_per_month,sort) values
 ('free','Free',0,0,0,0,5,1),
 ('pro','Pro',12,120,10,96,null,2)
on conflict (id) do nothing;

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null references public.plans(id) default 'free',
  status text not null default 'active',
  interval text, currency text,
  stripe_customer_id text, stripe_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
drop policy if exists "user reads own subscription" on public.subscriptions;
create policy "user reads own subscription" on public.subscriptions for select using (auth.uid() = user_id or public.is_staff());
-- Writes come only from the Stripe webhook (service role) or finance staff
drop policy if exists "finance manage subscriptions" on public.subscriptions;
create policy "finance manage subscriptions" on public.subscriptions for all using (public.is_staff(array['owner','finance'])) with check (public.is_staff(array['owner','finance']));

-- 7. App settings and feature switches
create table if not exists public.app_settings (
  key text primary key, value jsonb not null, updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists "settings are public" on public.app_settings;
create policy "settings are public" on public.app_settings for select using (true);
drop policy if exists "admins manage settings" on public.app_settings;
create policy "admins manage settings" on public.app_settings for all using (public.is_staff(array['owner','admin'])) with check (public.is_staff(array['owner','admin']));
insert into public.app_settings (key,value) values
 ('free_threads_per_month','5'::jsonb),
 ('maintenance','false'::jsonb),
 ('features','{"card_scan":true,"contact_import":true,"rooms":true,"linkedin_import":true}'::jsonb)
on conflict (key) do nothing;

-- 8. Privacy requests (UK GDPR / CCPA: 30-day clock)
create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text, kind text not null check (kind in ('export','delete','correct')),
  status text not null default 'open' check (status in ('open','in_progress','done','rejected')),
  due_at timestamptz not null default now() + interval '30 days',
  handled_by uuid references auth.users(id), handled_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.privacy_requests enable row level security;
drop policy if exists "user creates own request" on public.privacy_requests;
create policy "user creates own request" on public.privacy_requests for insert with check (auth.uid() = user_id);
drop policy if exists "user reads own request" on public.privacy_requests;
create policy "user reads own request" on public.privacy_requests for select using (auth.uid() = user_id or public.is_staff());
drop policy if exists "staff handle requests" on public.privacy_requests;
create policy "staff handle requests" on public.privacy_requests for update using (public.is_staff(array['owner','admin','support']));
