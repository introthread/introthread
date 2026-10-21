-- 012: Audit log screen (admin redesign) and audit log protection
-- Run once in the Supabase SQL Editor. Safe to run again.

-- 1. Records are append-only. Nobody (staff or API) can edit or delete an entry.
create or replace function public.audit_log_immutable() returns trigger language plpgsql as $$
begin
  raise exception 'Audit log entries cannot be edited or deleted' using errcode = '42501';
end $$;
drop trigger if exists audit_log_no_update on public.audit_log;
create trigger audit_log_no_update before update or delete on public.audit_log for each row execute function public.audit_log_immutable();
drop trigger if exists audit_log_no_truncate on public.audit_log;
create trigger audit_log_no_truncate before truncate on public.audit_log for each statement execute function public.audit_log_immutable();

-- 2. Entries are written only by the checked admin functions (through audit()), never directly from the browser,
--    so staff cannot add made-up activity.
drop policy if exists "staff write audit" on public.audit_log;
create index if not exists audit_log_created_idx on public.audit_log(created_at desc);
create index if not exists audit_log_actor_idx on public.audit_log(actor_id, created_at desc);

-- 3. Exports of the audit log itself are recorded (any staff member can export, as before)
create or replace function public.admin_log(act text, uid uuid, reason text, details jsonb default '{}'::jsonb) returns void language plpgsql security definer set search_path = public as $$
begin
  if act in ('users.export') then perform assert_staff(array['owner','admin']);
  elsif act = 'audit.export' then perform assert_staff();
  else perform assert_staff(array['owner','admin','support']); end if;
  if act not in ('user.login_link','user.password_reset','user.invite','users.export','audit.export') then raise exception 'Unknown action'; end if;
  perform audit(act, case when act = 'audit.export' then 'audit' else 'user' end, coalesce(uid::text,''), reason, details);
end $$;

-- 4. Category of an action (same rules as the page)
create or replace function public.audit_category(a text) returns text language sql immutable as $$
  select case
    when a like '%export%' then 'export'
    when a like 'staff.%' or a = 'setting.admin_require_mfa' or a like 'user.status.%' or a in ('user.delete','user.login_link','user.password_reset') then 'security'
    when a like 'setting.%' then 'settings'
    when a like 'plan.%' or a like 'subscription%' or a = 'user.plan' then 'billing'
    when a like 'privacy.%' then 'privacy'
    when a like 'report.%' then 'moderation'
    when a like 'room.%' then 'rooms'
    when a like 'user.%' then 'users'
    else 'other' end
$$;

-- 5. Everything for the Audit log page: filtered, paged rows with readable targets, counts and the staff list
create or replace function public.admin_audit2(q text default '', cat text default 'all', actor uuid default null, days int default 30,
  outcome text default 'all', lim int default 25, off int default 0) returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare qq text := lower(btrim(coalesce(q,''))); since timestamptz := case when coalesce(days,0) > 0 then now() - make_interval(days => days) else '-infinity'::timestamptz end;
  d0 timestamptz := date_trunc('day', now()); d1 timestamptz := date_trunc('day', now()) - interval '1 day';
begin
  perform assert_staff();
  return (with base as (
      select l.*, audit_category(l.action) as category,
        case when l.action like '%failed%' then 'failed' else 'completed' end as outcome,
        (select coalesce(p.name, s.email) from staff s left join profiles p on p.id = s.user_id where s.user_id = l.actor_id) as actor,
        (select s.role from staff s where s.user_id = l.actor_id) as actor_role,
        case l.target_type
          when 'user' then (select coalesce(p.name, u.email) from auth.users u left join profiles p on p.id = u.id where u.id::text = l.target_id)
          when 'plan' then (select name from plans where id = l.target_id)
          when 'room' then (select name from rooms where id::text = l.target_id)
          when 'privacy' then 'PR-' || upper(substr(replace(l.target_id,'-',''),1,8))
          when 'staff_invite' then l.details->>'email'
          when 'setting' then l.target_id
          else null end as target_label
      from audit_log l where l.created_at >= since),
    hit as (select * from base where (cat = 'all' or category = cat) and (admin_audit2.actor is null or base.actor_id = admin_audit2.actor)
              and (admin_audit2.outcome = 'all' or base.outcome = admin_audit2.outcome)
              and (qq = '' or lower(action) like '%'||qq||'%' or lower(coalesce(base.actor,'')) like '%'||qq||'%' or lower(coalesce(reason,'')) like '%'||qq||'%'
                   or lower(coalesce(target_label,'')) like '%'||qq||'%' or lower(coalesce(target_id,'')) like '%'||qq||'%' or lower(details::text) like '%'||qq||'%'))
    select jsonb_build_object(
      'total', (select count(*) from hit),
      'rows', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc, x.id desc), '[]'::jsonb)
               from (select * from hit order by created_at desc, id desc limit greatest(1, least(lim, 200)) offset greatest(0, off)) x),
      'counts', (select jsonb_build_object(
          'today', count(*) filter (where created_at >= d0), 'yesterday', count(*) filter (where created_at >= d1 and created_at < d0),
          'security_today', count(*) filter (where created_at >= d0 and audit_category(action) = 'security'),
          'security_yesterday', count(*) filter (where created_at >= d1 and created_at < d0 and audit_category(action) = 'security'),
          'exports_today', count(*) filter (where created_at >= d0 and audit_category(action) = 'export'),
          'exports_yesterday', count(*) filter (where created_at >= d1 and created_at < d0 and audit_category(action) = 'export'),
          'failed_today', count(*) filter (where created_at >= d0 and action like '%failed%'),
          'failed_yesterday', count(*) filter (where created_at >= d1 and created_at < d0 and action like '%failed%'),
          'staff_today', count(distinct actor_id) filter (where created_at >= d0),
          'all_time', (select count(*) from audit_log)) from audit_log where created_at >= d1),
      'actors', (select coalesce(jsonb_agg(jsonb_build_object('id', a.actor_id, 'name', a.name, 'role', a.role) order by a.name), '[]'::jsonb)
                 from (select distinct l.actor_id, (select coalesce(p.name, s.email) from staff s left join profiles p on p.id = s.user_id where s.user_id = l.actor_id) as name,
                         (select s.role from staff s where s.user_id = l.actor_id) as role
                       from audit_log l where l.actor_id is not null) a)));
end $$;

revoke all on function public.admin_audit2(text,text,uuid,int,text,int,int) from public, anon;
grant execute on function public.admin_audit2(text,text,uuid,int,text,int,int) to authenticated;
