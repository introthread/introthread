-- 006: Moderation screen (admin redesign, screen 3 of 9)
-- Run once in the Supabase SQL Editor. Safe to run again.

alter table public.reports add column if not exists assigned_to uuid references auth.users(id) on delete set null;
alter table public.reports add column if not exists outcome text;
create index if not exists reports_target_idx on public.reports(target_type, target_id);
create index if not exists reports_created_idx on public.reports(created_at desc);

-- Who a report is about (the account behind a profile, Thread or Room)
create or replace function public.report_subject(p_type text, p_id text) returns uuid
language sql stable security definer set search_path = public as $$
  select case p_type
    when 'profile' then (select id from profiles where id::text = p_id)
    when 'thread'  then (select owner_id from threads where id::text = p_id)
    when 'room'    then (select owner_id from rooms where id::text = p_id)
  end
$$;

-- Severity: serious reasons, or several reports about the same thing, rank higher
create or replace function public.report_severity(p_reason text, p_n bigint) returns text
language sql immutable as $$
  select case
    when p_reason in ('Harassment or hate','Fake or impersonating someone') or p_n >= 3 then 'high'
    when p_reason in ('Spam or scam','Inappropriate content') or p_n >= 2 then 'medium'
    else 'low' end
$$;

-- List with counts, search, filters and sort
create or replace function public.admin_reports2(q text default '', st text default 'open', typ text default 'all',
  sev text default 'all', days int default 30, sort text default 'new', lim int default 25, off int default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare res jsonb;
begin
  perform assert_staff(array['owner','admin','moderator','support']);
  with base as (
    select r.*,
      (select count(*) from reports x where x.target_type = r.target_type and x.target_id = r.target_id) as n_same,
      (select jsonb_build_object('id', p.id, 'name', p.name, 'handle', p.handle) from profiles p where p.id = r.reporter_id) as reporter,
      case r.target_type
        when 'profile' then (select jsonb_build_object('name', p.name, 'handle', p.handle) from profiles p where p.id::text = r.target_id)
        when 'room' then (select jsonb_build_object('name', m.name) from rooms m where m.id::text = r.target_id)
        else (select jsonb_build_object('name', 'Thread with ' || split_part(t.other_name, ' ', 1)) from threads t where t.id::text = r.target_id)
      end as target,
      (select jsonb_build_object('id', p.id, 'name', p.name, 'handle', p.handle) from profiles p where p.id = public.report_subject(r.target_type, r.target_id)) as subject
    from reports r
    where coalesce(days, 0) <= 0 or r.created_at >= now() - make_interval(days => days)
  ), sv as (select b.*, public.report_severity(b.reason, b.n_same) as severity from base b),
  f as (
    select * from sv where
      (st = 'all' or sv.status = st or (st = 'open' and sv.status in ('open','reviewing')))
      and (typ = 'all' or sv.target_type = typ)
      and (sev = 'all' or sv.severity = sev)
      and (coalesce(q,'') = '' or concat_ws(' ', sv.reason, sv.details, sv.reporter->>'name', sv.reporter->>'handle',
            sv.target->>'name', sv.target->>'handle', sv.subject->>'name', sv.subject->>'handle') ilike '%' || q || '%')
  )
  select jsonb_build_object(
    'counts', (select jsonb_build_object(
        'open', count(*) filter (where status in ('open','reviewing')),
        'overdue', count(*) filter (where status in ('open','reviewing') and created_at < now() - interval '24 hours'),
        'high_open', count(*) filter (where status in ('open','reviewing') and severity = 'high'),
        'actioned', count(*) filter (where status = 'actioned'),
        'dismissed', count(*) filter (where status = 'dismissed'),
        'all', count(*)) from sv),
    'total', (select count(*) from f),
    'rows', coalesce((select jsonb_agg(to_jsonb(z) - 'n_same' || jsonb_build_object('same', z.n_same)) from (
        select * from f order by
          case when sort = 'sev' then case severity when 'high' then 0 when 'medium' then 1 else 2 end end,
          case when sort = 'old' or sort = 'sev' then created_at end asc,
          created_at desc
        limit greatest(1, least(lim, 200)) offset greatest(off, 0)) z), '[]'::jsonb)
  ) into res;
  return res;
end $$;

-- Everything needed to decide on one report
create or replace function public.admin_report_detail(rid uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r reports; sid uuid; res jsonb;
begin
  perform assert_staff(array['owner','admin','moderator','support']);
  select * into r from reports where id = rid;
  if r.id is null then raise exception 'Report not found'; end if;
  sid := public.report_subject(r.target_type, r.target_id);
  select jsonb_build_object(
    'report', to_jsonb(r) || jsonb_build_object('severity', public.report_severity(r.reason,
        (select count(*) from reports x where x.target_type = r.target_type and x.target_id = r.target_id)),
      'assigned', (select name from profiles where id = r.assigned_to),
      'resolver', (select name from profiles where id = r.resolved_by)),
    'reporter', (select jsonb_build_object('id', p.id, 'name', p.name, 'handle', p.handle, 'joined', p.created_at,
        'filed', (select count(*) from reports x where x.reporter_id = r.reporter_id),
        'filed_dismissed', (select count(*) from reports x where x.reporter_id = r.reporter_id and x.status = 'dismissed'))
      from profiles p where p.id = r.reporter_id),
    'subject', (select jsonb_build_object('id', p.id, 'name', p.name, 'handle', p.handle, 'role', p.role, 'company', p.company,
        'city', p.city, 'joined', p.created_at, 'plan', p.plan,
        'status', coalesce((select status from account_status where user_id = p.id), 'active'),
        'staff', (select role from staff where user_id = p.id),
        'reports_total', (select count(*) from reports x where public.report_subject(x.target_type, x.target_id) = p.id),
        'reports_actioned', (select count(*) from reports x where x.status = 'actioned' and public.report_subject(x.target_type, x.target_id) = p.id))
      from profiles p where p.id = sid),
    'content', case r.target_type
      when 'profile' then (select jsonb_build_object('kind','profile','name', p.name, 'handle', p.handle, 'role', p.role,
          'company', p.company, 'city', p.city, 'bio', p.bio, 'links', p.links) from profiles p where p.id::text = r.target_id)
      when 'thread' then (select jsonb_build_object('kind','thread','other', split_part(t.other_name,' ',1) || coalesce(' ' || left(nullif(split_part(t.other_name,' ',2),''),1) || '.', ''),
          'where_met', t.where_met, 'created_at', t.created_at, 'confirmed', t.confirmed,
          'room', (select name from rooms m where m.id = t.room_id)) from threads t where t.id::text = r.target_id)
      when 'room' then (select jsonb_build_object('kind','room','name', m.name, 'location', m.location, 'event_date', m.event_date,
          'threads', (select count(*) from threads t where t.room_id = m.id)) from rooms m where m.id::text = r.target_id)
    end,
    'same', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'reason', x.reason, 'status', x.status, 'created_at', x.created_at) order by x.created_at desc)
      from reports x where x.target_type = r.target_type and x.target_id = r.target_id and x.id <> r.id), '[]'::jsonb),
    'history', coalesce((select jsonb_agg(jsonb_build_object('action', a.action, 'reason', a.reason, 'created_at', a.created_at,
        'actor', (select name from profiles where id = a.actor_id)) order by a.created_at desc)
      from (select * from audit_log a where (a.target_type = 'report' and a.target_id in
              (select x.id::text from reports x where x.target_type = r.target_type and x.target_id = r.target_id))
           or (sid is not null and a.target_type = 'user' and a.target_id = sid::text)
           order by a.created_at desc limit 40) a), '[]'::jsonb)
  ) into res;
  return res;
end $$;

-- Take a report (mark it as being reviewed by me)
create or replace function public.admin_report_take(rid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform assert_staff(array['owner','admin','moderator']);
  update reports set status = 'reviewing', assigned_to = auth.uid() where id = rid and status in ('open','reviewing');
  perform audit('report.reviewing', 'report', rid::text, 'Taken for review');
end $$;

-- One decision: optional action on the account or Room, then close the report (and optionally
-- every other open report about the same thing). All in one transaction, all audited.
create or replace function public.admin_moderate(rid uuid, decision text, act text, reason text, close_same boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r reports; sid uuid; n int := 0;
begin
  perform assert_staff(array['owner','admin','moderator']);
  if coalesce(trim(reason),'') = '' then raise exception 'A reason is required'; end if;
  if decision not in ('actioned','dismissed') then raise exception 'Unknown decision'; end if;
  select * into r from reports where id = rid;
  if r.id is null then raise exception 'Report not found'; end if;
  sid := public.report_subject(r.target_type, r.target_id);
  if decision = 'actioned' and act in ('suspend','ban') then
    if sid is null then raise exception 'This account no longer exists'; end if;
    if exists(select 1 from staff where user_id = sid) then raise exception 'Staff accounts cannot be suspended from Moderation'; end if;
    if act = 'ban' and not public.is_staff(array['owner','admin']) then raise exception 'Only owners and admins can ban'; end if;
    insert into account_status(user_id, status, reason, updated_by, updated_at)
      values (sid, case act when 'ban' then 'banned' else 'suspended' end, reason, auth.uid(), now())
      on conflict (user_id) do update set status = excluded.status, reason = excluded.reason, updated_by = excluded.updated_by, updated_at = now();
    perform audit('user.status.' || case act when 'ban' then 'banned' else 'suspended' end, 'user', sid::text, reason, jsonb_build_object('report', rid));
  elsif decision = 'actioned' and act = 'delete_room' then
    if r.target_type <> 'room' then raise exception 'Only Room reports can delete a Room'; end if;
    if not public.is_staff(array['owner','admin']) then raise exception 'Only owners and admins can delete Rooms'; end if;
    perform audit('room.delete', 'room', r.target_id, reason, (select jsonb_build_object('name', name) from rooms where id::text = r.target_id));
    delete from rooms where id::text = r.target_id;
  end if;
  update reports set status = decision, outcome = coalesce(nullif(act,''),'none'), resolved_by = auth.uid(), resolved_at = now()
    where id = rid or (close_same and target_type = r.target_type and target_id = r.target_id and status in ('open','reviewing'));
  get diagnostics n = row_count;
  perform audit('report.' || decision, 'report', rid::text, reason, jsonb_build_object('action', coalesce(nullif(act,''),'none'), 'closed', n));
  return jsonb_build_object('closed', n);
end $$;

revoke all on function public.admin_reports2(text,text,text,text,int,text,int,int), public.admin_report_detail(uuid),
  public.admin_report_take(uuid), public.admin_moderate(uuid,text,text,text,boolean), public.report_subject(text,text) from public, anon;
grant execute on function public.admin_reports2(text,text,text,text,int,text,int,int), public.admin_report_detail(uuid),
  public.admin_report_take(uuid), public.admin_moderate(uuid,text,text,text,boolean) to authenticated;
