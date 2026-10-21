-- 013: Fix "column reference is ambiguous" errors on the Users and Audit log screens
-- A function parameter had the same name as a column (plan in admin_users2; actor and outcome in admin_audit2),
-- so Postgres could not tell which one was meant. Every reference is now qualified. Behaviour is unchanged.
-- Run once in the Supabase SQL Editor. Safe to run again.

create or replace function public.admin_users2(q text default '', plan text default 'all', st text default 'all',
  sort text default 'joined', dir text default 'desc', lim int default 10, off int default 0)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare r jsonb; qq text := coalesce(trim(q),'');
begin
  perform assert_staff();
  with base as (
    select u.id, u.email, u.created_at as signed_up, u.last_sign_in_at, u.email_confirmed_at is not null as confirmed_email,
      p.id is not null as has_profile, coalesce(p.name, u.raw_user_meta_data->>'full_name', split_part(u.email,'@',1)) as name,
      p.handle, p.role, p.company, p.city, coalesce(p.created_at, u.created_at) as created_at,
      coalesce(s.plan_id,'free') as plan, coalesce(a.status,'active') as acct,
      case when coalesce(a.status,'active') <> 'active' then a.status
           when p.id is null or u.email_confirmed_at is null then 'pending' else 'active' end as status,
      (select count(*) from threads t where t.owner_id=u.id) as threads,
      (select count(*) from reports rp where rp.target_type='profile' and rp.target_id=u.id::text and rp.status in ('open','reviewing')) as reports,
      (select role from staff st where st.user_id=u.id) as staff
    from auth.users u left join profiles p on p.id=u.id left join subscriptions s on s.user_id=u.id left join account_status a on a.user_id=u.id
  ), f as (
    select * from base where
      (qq='' or name ilike '%'||qq||'%' or handle ilike '%'||qq||'%' or email ilike '%'||qq||'%' or company ilike '%'||qq||'%')
      and (admin_users2.plan='all' or base.plan=admin_users2.plan)
      and (st='all' or status=st)
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'counts', (select jsonb_build_object(
        'total', count(*),
        'new_month', count(*) filter (where signed_up >= date_trunc('month', now())),
        'active_30d', count(*) filter (where status='active' and last_sign_in_at >= now()-interval '30 days'),
        'suspended', count(*) filter (where status in ('suspended','banned')),
        'pending', count(*) filter (where status='pending')) from base),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('id',id,'email',admin_mask_email(email),'name',name,'handle',handle,'role',role,'company',company,'city',city,
        'created_at',created_at,'last_sign_in_at',last_sign_in_at,'confirmed_email',confirmed_email,'has_profile',has_profile,
        'plan',z.plan,'status',status,'threads',threads,'reports',reports,'staff',staff)) from (
        select * from f order by
          case when sort='name' and dir='asc' then lower(name) end asc,
          case when sort='name' and dir='desc' then lower(name) end desc,
          case when sort='threads' and dir='asc' then threads end asc,
          case when sort='threads' and dir='desc' then threads end desc,
          case when sort='last' and dir='asc' then last_sign_in_at end asc nulls first,
          case when sort='last' and dir='desc' then last_sign_in_at end desc nulls last,
          case when sort='joined' and dir='asc' then created_at end asc,
          created_at desc
        limit greatest(1,least(lim,5000)) offset greatest(0,off)) z),'[]'::jsonb)
  ) into r;
  return r;
end $$;


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
