-- Introthread migration 003: secure admin functions
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to re-run.
-- Every admin action runs on the server, checks the staff role (and 2-step verification),
-- and writes to the audit log. The browser never holds admin keys.

insert into public.app_settings (key,value) values
 ('admin_require_mfa','true'::jsonb),
 ('announcement','{"on":false,"text":"","tone":"info"}'::jsonb)
on conflict (key) do nothing;

-- Staff check used by every admin function: role + (optionally) 2-step verification (aal2)
create or replace function public.staff_ok(roles text[] default array['owner','admin','support','moderator','finance'])
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff(roles) and (
    coalesce((select (value)::text = 'true' from public.app_settings where key='admin_require_mfa'), true) = false
    or coalesce(auth.jwt()->>'aal','aal1') = 'aal2');
$$;
create or replace function public.assert_staff(roles text[] default array['owner','admin','support','moderator','finance'])
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff(roles) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if not public.staff_ok(roles) then raise exception 'Two-step verification required' using errcode = '42501'; end if;
end $$;
create or replace function public.audit(p_action text, p_type text, p_id text, p_reason text, p_details jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_log(actor_id,action,target_type,target_id,reason,details) values (auth.uid(),p_action,p_type,p_id,p_reason,coalesce(p_details,'{}'::jsonb));
$$;

-- Who am I (used by the admin sign-in gate)
create or replace function public.admin_me() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('staff', s.role is not null, 'role', s.role, 'aal', coalesce(auth.jwt()->>'aal','aal1'),
    'mfa_required', coalesce((select (value)::text='true' from app_settings where key='admin_require_mfa'), true))
  from (select (select role from staff where user_id = auth.uid()) as role) s;
$$;

-- Dashboard numbers
create or replace function public.admin_stats() returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare r jsonb;
begin
  perform assert_staff();
  select jsonb_build_object(
    'users', (select count(*) from profiles),
    'users_7d', (select count(*) from profiles where created_at > now()-interval '7 days'),
    'users_30d', (select count(*) from profiles where created_at > now()-interval '30 days'),
    'active_7d', (select count(distinct owner_id) from threads where created_at > now()-interval '7 days'),
    'active_30d', (select count(distinct owner_id) from threads where created_at > now()-interval '30 days'),
    'signed_in_7d', (select count(*) from auth.users where last_sign_in_at > now()-interval '7 days'),
    'threads', (select count(*) from threads),
    'threads_30d', (select count(*) from threads where created_at > now()-interval '30 days'),
    'confirmed', (select count(*) from threads where confirmed),
    'answered', (select count(*) from threads where mine is not null),
    'both_answered', (select count(*) from threads where mine is not null and theirs is not null),
    'contacts', (select count(*) from contacts),
    'rooms', (select count(*) from rooms),
    'reports_open', (select count(*) from reports where status in ('open','reviewing')),
    'privacy_open', (select count(*) from privacy_requests where status in ('open','in_progress')),
    'privacy_overdue', (select count(*) from privacy_requests where status in ('open','in_progress') and due_at < now()),
    'suspended', (select count(*) from account_status where status <> 'active'),
    'paying', (select count(*) from subscriptions where plan_id <> 'free' and status in ('active','trialing')),
    'mrr_usd', (select coalesce(sum(case when s.interval='year' then p.price_usd_year/12.0 else p.price_usd_month end),0)
                 from subscriptions s join plans p on p.id=s.plan_id where s.plan_id<>'free' and s.status in ('active','trialing')),
    'plans', (select coalesce(jsonb_object_agg(plan_id,n),'{}'::jsonb) from (select plan_id,count(*) n from subscriptions group by 1) x),
    'signups_by_day', (select coalesce(jsonb_agg(jsonb_build_object('d',d,'n',n) order by d),'[]'::jsonb) from (
        select g::date d, (select count(*) from profiles p where p.created_at::date=g::date) n
        from generate_series(current_date-29, current_date, interval '1 day') g) a),
    'threads_by_day', (select coalesce(jsonb_agg(jsonb_build_object('d',d,'n',n) order by d),'[]'::jsonb) from (
        select g::date d, (select count(*) from threads t where t.created_at::date=g::date) n
        from generate_series(current_date-29, current_date, interval '1 day') g) b),
    'cities', (select coalesce(jsonb_agg(jsonb_build_object('c',c,'n',n) order by n desc),'[]'::jsonb) from (
        select coalesce(nullif(trim(city),''),'Not set') c, count(*) n from profiles group by 1 order by 2 desc limit 8) c)
  ) into r;
  return r;
end $$;

-- Users list and detail
create or replace function public.admin_users(q text default '', lim int default 50, off int default 0)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare r jsonb;
begin
  perform assert_staff();
  select jsonb_build_object('total', (select count(*) from profiles p join auth.users u on u.id=p.id
      where q='' or p.name ilike '%'||q||'%' or p.handle ilike '%'||q||'%' or u.email ilike '%'||q||'%'),
    'rows', coalesce(jsonb_agg(x order by x->>'created_at' desc),'[]'::jsonb)) into r from (
    select jsonb_build_object('id',p.id,'name',p.name,'handle',p.handle,'email',u.email,'role',p.role,'company',p.company,'city',p.city,
      'created_at',p.created_at,'last_sign_in_at',u.last_sign_in_at,'confirmed_email',u.email_confirmed_at is not null,
      'plan',coalesce(s.plan_id,'free'),'status',coalesce(a.status,'active'),
      'threads',(select count(*) from threads t where t.owner_id=p.id),
      'reports',(select count(*) from reports rp where rp.target_type='profile' and rp.target_id=p.id::text),
      'staff',(select role from staff st where st.user_id=p.id)) x
    from profiles p join auth.users u on u.id=p.id
    left join subscriptions s on s.user_id=p.id left join account_status a on a.user_id=p.id
    where q='' or p.name ilike '%'||q||'%' or p.handle ilike '%'||q||'%' or u.email ilike '%'||q||'%'
    order by p.created_at desc limit greatest(1,least(lim,200)) offset greatest(0,off)) z;
  return r;
end $$;

create or replace function public.admin_user(uid uuid) returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare r jsonb;
begin
  perform assert_staff();
  select jsonb_build_object(
    'profile', to_jsonb(p) - 'prefs',
    'email', u.email, 'last_sign_in_at', u.last_sign_in_at, 'created_at', u.created_at, 'confirmed_email', u.email_confirmed_at is not null,
    'providers', u.raw_app_meta_data->'providers',
    'plan', coalesce(s.plan_id,'free'), 'sub', to_jsonb(s), 'status', coalesce(a.status,'active'), 'status_reason', a.reason,
    'counts', jsonb_build_object('threads',(select count(*) from threads where owner_id=uid),'confirmed',(select count(*) from threads where owner_id=uid and confirmed),
       'contacts',(select count(*) from contacts where owner_id=uid),'rooms',(select count(*) from rooms where owner_id=uid)),
    'reports', (select coalesce(jsonb_agg(to_jsonb(r2) order by r2.created_at desc),'[]'::jsonb) from reports r2 where r2.target_type='profile' and r2.target_id=uid::text),
    'audit', (select coalesce(jsonb_agg(to_jsonb(l) order by l.created_at desc),'[]'::jsonb) from (select * from audit_log where target_id=uid::text order by created_at desc limit 20) l)
  ) into r from profiles p join auth.users u on u.id=p.id left join subscriptions s on s.user_id=p.id left join account_status a on a.user_id=p.id where p.id=uid;
  return r;
end $$;

create or replace function public.admin_set_status(uid uuid, new_status text, reason text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_staff(array['owner','admin','moderator']);
  if coalesce(trim(reason),'')='' then raise exception 'A reason is required'; end if;
  if exists(select 1 from staff where user_id=uid and role='owner') then raise exception 'Owners cannot be suspended'; end if;
  insert into account_status(user_id,status,reason,updated_by,updated_at) values (uid,new_status,reason,auth.uid(),now())
  on conflict (user_id) do update set status=excluded.status, reason=excluded.reason, updated_by=excluded.updated_by, updated_at=now();
  perform audit('user.status.'||new_status,'user',uid::text,reason);
end $$;

create or replace function public.admin_set_plan(uid uuid, new_plan text, reason text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_staff(array['owner','finance','admin']);
  if coalesce(trim(reason),'')='' then raise exception 'A reason is required'; end if;
  insert into subscriptions(user_id,plan_id,status,updated_at) values (uid,new_plan,'active',now())
  on conflict (user_id) do update set plan_id=excluded.plan_id, status='active', updated_at=now();
  update profiles set plan = case new_plan when 'pro' then 'Pro' else 'Free' end where id=uid;
  perform audit('user.plan','user',uid::text,reason,jsonb_build_object('plan',new_plan));
end $$;

-- Data export for privacy requests (UK GDPR / CCPA)
create or replace function public.admin_export_user(uid uuid, reason text) returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare r jsonb;
begin
  perform assert_staff(array['owner','admin','support']);
  select jsonb_build_object('exported_at',now(),'account',(select jsonb_build_object('email',email,'created_at',created_at) from auth.users where id=uid),
    'profile',(select to_jsonb(p) from profiles p where id=uid),
    'threads',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from threads t where owner_id=uid),
    'contacts',(select coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb) from contacts c where owner_id=uid),
    'rooms',(select coalesce(jsonb_agg(to_jsonb(m)),'[]'::jsonb) from rooms m where owner_id=uid)) into r;
  perform audit('user.export','user',uid::text,reason);
  return r;
end $$;

create or replace function public.admin_delete_user(uid uuid, reason text) returns void language plpgsql security definer set search_path = public, auth as $$
begin
  perform assert_staff(array['owner','admin']);
  if coalesce(trim(reason),'')='' then raise exception 'A reason is required'; end if;
  if exists(select 1 from staff where user_id=uid) then raise exception 'Remove staff access before deleting this account'; end if;
  perform audit('user.delete','user',uid::text,reason,(select jsonb_build_object('email',email) from auth.users where id=uid));
  delete from auth.users where id=uid;
end $$;

-- Moderation
create or replace function public.admin_reports(st text default 'open') returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform assert_staff(array['owner','admin','moderator','support']);
  return (select coalesce(jsonb_agg(x order by x->>'created_at' desc),'[]'::jsonb) from (
    select to_jsonb(r) || jsonb_build_object('reporter',(select jsonb_build_object('name',name,'handle',handle) from profiles where id=r.reporter_id),
      'target',(case r.target_type when 'profile' then (select jsonb_build_object('name',name,'handle',handle) from profiles where id::text=r.target_id)
                 when 'room' then (select jsonb_build_object('name',name) from rooms where id::text=r.target_id)
                 else (select jsonb_build_object('name',other_name) from threads where id::text=r.target_id) end)) x
    from reports r where st='all' or r.status=st or (st='open' and r.status='reviewing') limit 300) z);
end $$;

create or replace function public.admin_resolve_report(rid uuid, new_status text, reason text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_staff(array['owner','admin','moderator']);
  update reports set status=new_status, resolved_by=auth.uid(), resolved_at=case when new_status in ('actioned','dismissed') then now() end where id=rid;
  perform audit('report.'||new_status,'report',rid::text,reason);
end $$;

-- Rooms
create or replace function public.admin_rooms() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform assert_staff();
  return (select coalesce(jsonb_agg(x order by x->>'event_date' desc),'[]'::jsonb) from (
    select to_jsonb(m) || jsonb_build_object('owner',(select jsonb_build_object('name',name,'handle',handle) from profiles where id=m.owner_id),
      'threads',(select count(*) from threads t where t.room_id=m.id),'people',(select count(distinct owner_id) from threads t where t.room_id=m.id)) x
    from rooms m limit 500) z);
end $$;
create or replace function public.admin_delete_room(room uuid, reason text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_staff(array['owner','admin','moderator']);
  perform audit('room.delete','room',room::text,reason,(select jsonb_build_object('name',name) from rooms where id=room));
  delete from rooms where id=room;
end $$;

-- Revenue
create or replace function public.admin_subscriptions() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform assert_staff(array['owner','admin','finance']);
  return (select coalesce(jsonb_agg(to_jsonb(s) || jsonb_build_object('name',p.name,'handle',p.handle) order by s.updated_at desc),'[]'::jsonb)
    from subscriptions s left join profiles p on p.id=s.user_id);
end $$;

-- Plans and settings
create or replace function public.admin_update_plan(pid text, patch jsonb, reason text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_staff(array['owner','finance']);
  update plans set
    name=coalesce(patch->>'name',name),
    price_usd_month=coalesce((patch->>'price_usd_month')::numeric,price_usd_month), price_usd_year=coalesce((patch->>'price_usd_year')::numeric,price_usd_year),
    price_gbp_month=coalesce((patch->>'price_gbp_month')::numeric,price_gbp_month), price_gbp_year=coalesce((patch->>'price_gbp_year')::numeric,price_gbp_year),
    threads_per_month=case when patch ? 'threads_per_month' then (nullif(patch->>'threads_per_month',''))::int else threads_per_month end,
    active=coalesce((patch->>'active')::boolean,active)
  where id=pid;
  if pid='free' and patch ? 'threads_per_month' then
    insert into app_settings(key,value,updated_by,updated_at) values ('free_threads_per_month',to_jsonb((patch->>'threads_per_month')::int),auth.uid(),now())
    on conflict (key) do update set value=excluded.value, updated_by=excluded.updated_by, updated_at=now();
  end if;
  perform audit('plan.update','plan',pid,reason,patch);
end $$;

create or replace function public.admin_set_setting(k text, v jsonb, reason text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_staff(array['owner','admin']);
  if k='admin_require_mfa' then perform assert_staff(array['owner']); end if;
  insert into app_settings(key,value,updated_by,updated_at) values (k,v,auth.uid(),now())
  on conflict (key) do update set value=excluded.value, updated_by=excluded.updated_by, updated_at=now();
  perform audit('setting.'||k,'setting',k,reason,jsonb_build_object('value',v));
end $$;

-- Privacy requests
create or replace function public.admin_privacy() returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform assert_staff(array['owner','admin','support']);
  return (select coalesce(jsonb_agg(to_jsonb(r) || jsonb_build_object('name',p.name,'handle',p.handle,'account_email',u.email) order by r.created_at desc),'[]'::jsonb)
    from privacy_requests r left join profiles p on p.id=r.user_id left join auth.users u on u.id=r.user_id);
end $$;
create or replace function public.admin_set_privacy(rid uuid, new_status text, reason text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_staff(array['owner','admin','support']);
  update privacy_requests set status=new_status, handled_by=auth.uid(), handled_at=now() where id=rid;
  perform audit('privacy.'||new_status,'privacy',rid::text,reason);
end $$;

-- Staff management (owners only)
create or replace function public.admin_staff() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform assert_staff();
  return (select coalesce(jsonb_agg(to_jsonb(s) || jsonb_build_object('name',p.name) order by s.created_at),'[]'::jsonb) from staff s left join profiles p on p.id=s.user_id);
end $$;
create or replace function public.admin_set_staff(em text, new_role text, reason text) returns void language plpgsql security definer set search_path = public, auth as $$
declare uid uuid;
begin
  perform assert_staff(array['owner']);
  select id into uid from auth.users where lower(email)=lower(trim(em));
  if uid is null then raise exception 'No account uses that email yet. Ask them to sign up first.'; end if;
  if new_role is null or new_role='none' then
    if uid=auth.uid() then raise exception 'You cannot remove your own access'; end if;
    delete from staff where user_id=uid;
  else
    insert into staff(user_id,email,role) values (uid,lower(trim(em)),new_role) on conflict (user_id) do update set role=excluded.role;
  end if;
  if (select count(*) from staff where role='owner')=0 then raise exception 'There must be at least one owner'; end if;
  perform audit('staff.'||coalesce(new_role,'none'),'user',uid::text,reason,jsonb_build_object('email',em));
end $$;

-- Audit log reader (already readable by staff through row security; this adds names)
create or replace function public.admin_audit(lim int default 200) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform assert_staff();
  return (select coalesce(jsonb_agg(to_jsonb(l) || jsonb_build_object('actor',(select coalesce(p.name,s.email) from staff s left join profiles p on p.id=s.user_id where s.user_id=l.actor_id)) order by l.created_at desc),'[]'::jsonb)
    from (select * from audit_log order by created_at desc limit greatest(1,least(lim,1000))) l);
end $$;

-- Only signed-in users may call these; the functions themselves check staff roles
revoke all on function public.admin_stats(), public.admin_users(text,int,int), public.admin_user(uuid), public.admin_set_status(uuid,text,text),
  public.admin_set_plan(uuid,text,text), public.admin_export_user(uuid,text), public.admin_delete_user(uuid,text), public.admin_reports(text),
  public.admin_resolve_report(uuid,text,text), public.admin_rooms(), public.admin_delete_room(uuid,text), public.admin_subscriptions(),
  public.admin_update_plan(text,jsonb,text), public.admin_set_setting(text,jsonb,text), public.admin_privacy(), public.admin_set_privacy(uuid,text,text),
  public.admin_staff(), public.admin_set_staff(text,text,text), public.admin_audit(int), public.audit(text,text,text,text,jsonb) from public, anon;
grant execute on function public.admin_me(), public.admin_stats(), public.admin_users(text,int,int), public.admin_user(uuid), public.admin_set_status(uuid,text,text),
  public.admin_set_plan(uuid,text,text), public.admin_export_user(uuid,text), public.admin_delete_user(uuid,text), public.admin_reports(text),
  public.admin_resolve_report(uuid,text,text), public.admin_rooms(), public.admin_delete_room(uuid,text), public.admin_subscriptions(),
  public.admin_update_plan(text,jsonb,text), public.admin_set_setting(text,jsonb,text), public.admin_privacy(), public.admin_set_privacy(uuid,text,text),
  public.admin_staff(), public.admin_set_staff(text,text,text), public.admin_audit(int) to authenticated;
revoke execute on function public.audit(text,text,text,text,jsonb) from authenticated;

-- Staff may no longer write the audit log directly; only these functions do
drop policy if exists "staff write audit" on public.audit_log;
