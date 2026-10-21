-- Introthread migration 005: Users screen (filters, counts, pending accounts, activity, staff notes)
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to re-run.

-- Private staff notes about a person (never shown to the person)
create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists admin_notes_user_idx on public.admin_notes(user_id, created_at desc);
alter table public.admin_notes enable row level security;
-- no policies: only the functions below can read or write notes

-- Emails are shown in full only to roles that need them
create or replace function public.admin_mask_email(e text) returns text language sql stable security definer set search_path = public as $$
  select case when e is null then null
    when public.is_staff(array['owner','admin','support']) then e
    else left(split_part(e,'@',1),1) || '***@' || split_part(e,'@',2) end;
$$;

-- Users list with search, filters, sorting, paging and overview counts.
-- Includes people who signed up but have not finished their profile (pending).
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

-- One person: activity, Threads (minimal details only), notes
create or replace function public.admin_user_more(uid uuid) returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform assert_staff();
  return jsonb_build_object(
    'email', (select admin_mask_email(email) from auth.users where id=uid),
    'signed_up', (select created_at from auth.users where id=uid),
    'has_profile', exists(select 1 from profiles where id=uid),
    'threads', (select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'created_at',t.created_at,
        'other', split_part(coalesce(t.other_name,''),' ',1) || coalesce(' ' || left(nullif(split_part(t.other_name,' ',2),''),1) || '.',''),
        'confirmed',t.confirmed,'mine',t.mine is not null,'theirs',t.theirs is not null,'resolved',t.resolved_at is not null,
        'room',(select name from rooms m where m.id=t.room_id)) order by t.created_at desc),'[]'::jsonb)
        from (select * from threads where owner_id=uid order by created_at desc limit 50) t),
    'events', (select coalesce(jsonb_agg(jsonb_build_object('kind',e.kind,'at',e.at) order by e.at desc),'[]'::jsonb)
        from (select e.kind, e.at from thread_events e join threads t on t.id=e.thread_id where t.owner_id=uid order by e.at desc limit 30) e),
    'audit', (select coalesce(jsonb_agg(jsonb_build_object('action',l.action,'reason',l.reason,'created_at',l.created_at,
        'actor',(select coalesce(p.name,s.email) from staff s left join profiles p on p.id=s.user_id where s.user_id=l.actor_id)) order by l.created_at desc),'[]'::jsonb)
        from (select * from audit_log where target_id=uid::text order by created_at desc limit 30) l),
    'notes', (select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'body',n.body,'created_at',n.created_at,'mine',n.author_id=auth.uid(),
        'author',(select coalesce(p.name,s.email) from staff s left join profiles p on p.id=s.user_id where s.user_id=n.author_id)) order by n.created_at desc),'[]'::jsonb)
        from admin_notes n where n.user_id=uid),
    'contacts', (select count(*) from contacts where owner_id=uid),
    'rooms', (select count(*) from rooms where owner_id=uid)
  );
end $$;

create or replace function public.admin_add_note(uid uuid, body text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_staff();
  insert into admin_notes(user_id,author_id,body) values (uid,auth.uid(),trim(body));
  perform audit('user.note','user',uid::text,'Added a staff note');
end $$;

create or replace function public.admin_delete_note(nid uuid) returns void language plpgsql security definer set search_path = public as $$
declare u uuid;
begin
  perform assert_staff();
  select user_id into u from admin_notes where id=nid and (author_id=auth.uid() or public.is_staff(array['owner','admin']));
  if u is null then raise exception 'You can only delete your own notes'; end if;
  delete from admin_notes where id=nid;
  perform audit('user.note.delete','user',u::text,'Deleted a staff note');
end $$;

-- Record actions that happen outside the database (login link, password reset, invite, export)
create or replace function public.admin_log(act text, uid uuid, reason text, details jsonb default '{}'::jsonb) returns void language plpgsql security definer set search_path = public as $$
begin
  if act in ('users.export') then perform assert_staff(array['owner','admin']);
  else perform assert_staff(array['owner','admin','support']); end if;
  if act not in ('user.login_link','user.password_reset','user.invite','users.export') then raise exception 'Unknown action'; end if;
  perform audit(act,'user',coalesce(uid::text,''),reason,details);
end $$;

-- Full email for actions that send mail (owner, admin, support only)
create or replace function public.admin_user_email(uid uuid) returns text language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform assert_staff(array['owner','admin','support']);
  return (select email from auth.users where id=uid);
end $$;

revoke all on function public.admin_users2(text,text,text,text,text,int,int), public.admin_user_more(uuid), public.admin_add_note(uuid,text),
  public.admin_delete_note(uuid), public.admin_log(text,uuid,text,jsonb), public.admin_user_email(uuid), public.admin_mask_email(text) from public, anon;
grant execute on function public.admin_users2(text,text,text,text,text,int,int), public.admin_user_more(uuid), public.admin_add_note(uuid,text),
  public.admin_delete_note(uuid), public.admin_log(text,uuid,text,jsonb), public.admin_user_email(uuid) to authenticated;
