-- 022_nfc_cards.sql  (v133, 26 Oct 2026)
-- NFC cards: count taps on a member's card link (?src=nfc) and record ready-programmed card orders (KES 199).
-- Run once in the Supabase SQL Editor. Safe to run again.

-- 1. Card taps. Written only by the server (/api/card-tap, service role). Each member can read their own.
create table if not exists public.card_taps (
  id         bigserial primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  src        text not null default 'nfc' check (src in ('nfc','qr','link')),
  at         timestamptz not null default now()
);
create index if not exists card_taps_profile_idx on public.card_taps(profile_id, at desc);
alter table public.card_taps enable row level security;
drop policy if exists "owner reads own taps" on public.card_taps;
create policy "owner reads own taps" on public.card_taps for select using (profile_id = auth.uid());
drop policy if exists "staff read taps" on public.card_taps;
create policy "staff read taps" on public.card_taps for select using (public.is_staff(array['owner','admin','support']));

create or replace function public.my_card_taps()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total',  count(*),
    'last30', count(*) filter (where at > now() - interval '30 days'),
    'last',   max(at))
  from public.card_taps where profile_id = auth.uid() and src = 'nfc';
$$;
revoke all on function public.my_card_taps() from public;
grant execute on function public.my_card_taps() to authenticated;

-- 2. Card orders. Created only by the server after a successful Paystack payment (one row per reference).
create table if not exists public.card_orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  reference     text unique not null,
  amount        numeric not null,
  currency      text not null default 'kes',
  status        text not null default 'paid' check (status in ('paid','programmed','shipped','delivered','cancelled')),
  name_on_card  text,
  title_on_card text,
  phone         text,
  delivery      text,
  handle        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists card_orders_created_idx on public.card_orders(created_at desc);
alter table public.card_orders enable row level security;
drop policy if exists "user reads own card orders" on public.card_orders;
create policy "user reads own card orders" on public.card_orders for select using (user_id = auth.uid());
drop policy if exists "staff read card orders" on public.card_orders;
create policy "staff read card orders" on public.card_orders for select using (public.is_staff(array['owner','admin','support','finance']));

-- Staff move an order along (programmed, shipped, delivered, cancelled). Audited.
create or replace function public.admin_card_order_set(p_id uuid, p_status text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_staff(array['owner','admin','support','finance']);
  if p_status not in ('paid','programmed','shipped','delivered','cancelled') then raise exception 'invalid status'; end if;
  if coalesce(trim(p_reason),'') = '' then raise exception 'reason required'; end if;
  update public.card_orders set status = p_status, updated_at = now() where id = p_id;
  if not found then raise exception 'order not found'; end if;
  perform public.audit('card_order_status', 'card_order', p_id::text, p_reason, jsonb_build_object('status', p_status));
end $$;
revoke all on function public.admin_card_order_set(uuid,text,text) from public;
grant execute on function public.admin_card_order_set(uuid,text,text) to authenticated;
