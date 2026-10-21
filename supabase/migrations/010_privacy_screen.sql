-- 010: Privacy requests screen (admin redesign, screen 8 of 9)
-- Run once in the Supabase SQL Editor. Safe to run again.

-- 1. Extra fields: the person's own note, identity check, how the request was closed
alter table public.privacy_requests add column if not exists details text;               -- optional note from the person (max 500)
alter table public.privacy_requests add column if not exists identity_checked_at timestamptz;
alter table public.privacy_requests add column if not exists identity_checked_by uuid references auth.users(id) on delete set null;
alter table public.privacy_requests add column if not exists resolution text;            -- staff note when the request was closed
create index if not exists privacy_requests_created_idx on public.privacy_requests(created_at desc);
do $$ begin
  alter table public.privacy_requests add constraint privacy_details_len check (details is null or length(details) <= 500);
exception when duplicate_object then null; end $$;

-- 2. List with counts, search, status and date filters, paging
create or replace function public.admin_privacy2(st text default 'all', q text default '', days int default 0, lim int default 25, off int default 0)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare qq text := lower(btrim(coalesce(q,''))); since timestamptz := case when coalesce(days,0) > 0 then now() - make_interval(days => days) else '-infinity'::timestamptz end;
begin
  perform assert_staff(array['owner','admin','support']);
  return (with base as (
      select r.*, p.name, p.handle, u.email as account_email,
        upper(substr(replace(r.id::text,'-',''),1,8)) as ref,
        case when r.status in ('open','in_progress') then 'open' when r.status = 'done' then 'actioned' else 'dismissed' end as grp
      from privacy_requests r left join profiles p on p.id = r.user_id left join auth.users u on u.id = r.user_id
      where r.created_at >= since),
    hit as (select * from base where qq = '' or lower(coalesce(name,'')) like '%'||qq||'%' or lower(coalesce(handle,'')) like '%'||qq||'%'
              or lower(coalesce(account_email, email, '')) like '%'||qq||'%' or lower(ref) like '%'||replace(replace(qq,'pr-',''),'#','')||'%' or id::text = qq)
    select jsonb_build_object(
      'counts', jsonb_build_object('all', (select count(*) from hit), 'open', (select count(*) from hit where grp='open'),
         'actioned', (select count(*) from hit where grp='actioned'), 'dismissed', (select count(*) from hit where grp='dismissed'),
         'overdue', (select count(*) from hit where grp='open' and due_at < now()),
         'due_soon', (select count(*) from hit where grp='open' and due_at >= now() and due_at < now() + interval '7 days')),
      'total', (select count(*) from hit where st = 'all' or grp = st),
      'rows', (select coalesce(jsonb_agg(to_jsonb(x) - 'grp' order by (x.grp='open') desc, case when x.grp='open' then x.due_at end asc, x.created_at desc), '[]'::jsonb)
               from (select * from hit where st = 'all' or grp = st
                     order by (grp='open') desc, case when grp='open' then due_at end asc, created_at desc
                     limit greatest(1, least(lim, 100)) offset greatest(0, off)) x)));
end $$;

-- 3. One request with the person and its history
create or replace function public.admin_privacy_detail(rid uuid) returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare r jsonb;
begin
  perform assert_staff(array['owner','admin','support']);
  select to_jsonb(q) || jsonb_build_object('name', p.name, 'handle', p.handle, 'account_email', u.email, 'account_created', u.created_at,
      'is_staff', exists(select 1 from staff s where s.user_id = q.user_id),
      'ref', upper(substr(replace(q.id::text,'-',''),1,8)),
      'checked_by_name', (select coalesce(pp.name, s.email) from staff s left join profiles pp on pp.id = s.user_id where s.user_id = q.identity_checked_by),
      'handled_by_name', (select coalesce(pp.name, s.email) from staff s left join profiles pp on pp.id = s.user_id where s.user_id = q.handled_by),
      'others', (select count(*) from privacy_requests o where o.user_id = q.user_id and o.id <> q.id))
    into r from privacy_requests q left join profiles p on p.id = q.user_id left join auth.users u on u.id = q.user_id where q.id = rid;
  if r is null then raise exception 'Request not found' using errcode = 'P0002'; end if;
  return r || jsonb_build_object('history', (select coalesce(jsonb_agg(to_jsonb(l) || jsonb_build_object('actor',
      (select coalesce(p.name, s.email) from staff s left join profiles p on p.id = s.user_id where s.user_id = l.actor_id)) order by l.created_at), '[]'::jsonb)
    from audit_log l where (l.target_type = 'privacy' and l.target_id = rid::text)
       or (l.target_type = 'user' and l.target_id = (r->>'user_id') and l.action in ('user.export','user.delete') and l.created_at >= (r->>'created_at')::timestamptz)));
end $$;

-- 4. Actions: start, verify identity, complete, reject. Checked transitions, reason required, audited.
create or replace function public.admin_privacy_act(rid uuid, act text, reason text) returns jsonb language plpgsql security definer set search_path = public as $$
declare r privacy_requests; ns text;
begin
  perform assert_staff(array['owner','admin','support']);
  if coalesce(btrim(reason),'') = '' then raise exception 'Add a short reason' using errcode = '22023'; end if;
  select * into r from privacy_requests where id = rid for update;
  if not found then raise exception 'Request not found' using errcode = 'P0002'; end if;
  if r.status in ('done','rejected') then raise exception 'This request is already closed' using errcode = '22023'; end if;
  if act = 'start' then
    if r.status <> 'open' then raise exception 'This request is already in progress' using errcode = '22023'; end if;
    update privacy_requests set status = 'in_progress', handled_by = auth.uid(), handled_at = now() where id = rid;
  elsif act = 'verify' then
    if r.identity_checked_at is not null then raise exception 'Identity is already marked as checked' using errcode = '22023'; end if;
    update privacy_requests set identity_checked_at = now(), identity_checked_by = auth.uid(),
      status = case when status = 'open' then 'in_progress' else status end, handled_by = coalesce(handled_by, auth.uid()), handled_at = coalesce(handled_at, now()) where id = rid;
  elsif act in ('done','reject') then
    ns := case when act = 'done' then 'done' else 'rejected' end;
    update privacy_requests set status = ns, handled_by = auth.uid(), handled_at = now(), resolution = btrim(reason) where id = rid;
  else raise exception 'Unknown action' using errcode = '22023'; end if;
  perform audit('privacy.'||act, 'privacy', rid::text, reason, jsonb_build_object('from', r.status, 'kind', r.kind));
  return (select to_jsonb(x) from privacy_requests x where id = rid);
end $$;

revoke all on function public.admin_privacy2(text,text,int,int,int), public.admin_privacy_detail(uuid), public.admin_privacy_act(uuid,text,text) from public, anon;
grant execute on function public.admin_privacy2(text,text,int,int,int), public.admin_privacy_detail(uuid), public.admin_privacy_act(uuid,text,text) to authenticated;
