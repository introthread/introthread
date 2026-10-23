-- Introthread migration 019: pricing exactly as published on /pricing (23 Oct 2026)
-- Free: $0 forever, 5 new Threads a month. Pro: $12 a month (GBP 9). Rooms: $199 per event (GBP 149), handled in code and Paystack, not in this table.
-- Yearly Pro stays $120 (GBP 90 pending confirmation). Safe to run more than once.
update public.plans set name = 'Free', description = 'Basic access for new users.',
  price_usd_month = 0, price_usd_year = 0, price_gbp_month = 0, price_gbp_year = 0, threads_per_month = 5
  where id = 'free';
update public.plans set name = 'Pro', description = 'For professionals and teams.',
  price_usd_month = 12, price_usd_year = 120, price_gbp_month = 9, price_gbp_year = 90, threads_per_month = null
  where id = 'pro';
