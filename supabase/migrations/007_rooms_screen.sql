-- 007: Rooms screen (admin redesign, screen 4 of 9)
-- Run once in the Supabase SQL Editor. Safe to run again. No table changes.
-- Room details (type, times, format, access, limit, topics, description) are kept the way the app
-- already stores them: as JSON after a "\n@@" marker inside rooms.location.

create or replace function public.room_meta(loc text) returns jsonb language plpgsql immutable as $$
begin
  if loc is null or position(E'\n@@' in loc) = 0 then return '{}'::jsonb; end if;
  return substr(loc, position(E'\n@@' in loc) + 3)::jsonb;
exception when others then return '{}'::jsonb;
end $$;

create or replace function public.room_place(loc text) returns text language sql immutable as $$
  select case when loc is null then '' when position(E'\n@@' in loc) > 0 then left(loc, position(E'\n@@' in loc) - 1) else loc end
$$;

create or replace function public.room_status(d date, meta jsonb) returns text language sql stable as $$
  select case when d > current_date then 'upcoming'
              when d = current_date or coalesce(meta->>'kind','') = 'community' then 'live'
              else 'past' end
$$;

-- List with counts, search, filters, sort
create or replace function public.admin_rooms2(q text default '', st text default 'all', kind text default 'all',
  dr text default 'any', sort text default 'new', lim int default 25, off int default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare res jsonb;
begin
  perform assert_staff();
  with base as (
    select m.id, m.owner_id, m.name, m.event_date, m.code, m.created_at,
      public.room_place(m.location) as place, public.room_meta(m.location) as meta,
      (select jsonb_build_object('id', p.id, 'name', p.name, 'handle', p.handle) from profiles p where p.id = m.owner_id) as owner,
      (select count(*) from threads t where t.room_id = m.id) as threads,
      (select count(*) from threads t where t.room_id = m.id and t.confirmed) as confirmed,
      (select count(distinct t.owner_id) from threads t where t.room_id = m.id) as people
    from rooms m
  ), b2 as (select b.*, public.room_status(b.event_date, b.meta) as status, coalesce(nullif(b.meta->>'kind',''), 'event') as rkind from base b),
  f as (
    select * from b2 where (st = 'all' or b2.status = st)
      and (kind = 'all' or b2.rkind = kind)
      and (dr = 'any'
        or (dr = 'next30' and b2.event_date between current_date and current_date + 30)
        or (dr = 'month' and date_trunc('month', b2.event_date) = date_trunc('month', current_date))
        or (dr = 'past30' and b2.event_date between current_date - 30 and current_date)
        or (dr = 'past90' and b2.event_date between current_date - 90 and current_date))
      and (coalesce(q,'') = '' or concat_ws(' ', b2.name, b2.place, b2.code, b2.meta->>'desc', b2.meta->>'platform', b2.owner->>'name', b2.owner->>'handle') ilike '%' || q || '%')
  )
  select jsonb_build_object(
    'counts', jsonb_build_object(
      'total', (select count(*) from rooms),
      'attendees', (select count(distinct t.owner_id) from threads t where t.room_id is not null),
      'connections', (select count(*) from threads t where t.room_id is not null),
      'active', (select count(*) from b2 where status = 'live'),
      'upcoming', (select count(*) from b2 where status = 'upcoming'),
      'links_used', (select count(distinct t.room_id) from threads t where t.room_id is not null)),
    'total', (select count(*) from f),
    'rows', coalesce((select jsonb_agg(to_jsonb(z)) from (
      select * from f order by
        case when sort = 'date' then event_date end desc,
        case when sort = 'soon' then case when event_date >= current_date then 0 else 1 end end,
        case when sort = 'soon' then event_date end asc,
        case when sort = 'threads' then threads end desc,
        case when sort = 'name' then lower(name) end asc,
        case when sort = 'old' then created_at end asc,
        created_at desc
      limit greatest(1, least(lim, 200)) offset greatest(off, 0)) z), '[]'::jsonb)
  ) into res;
  return res;
end $$;

-- One Room in full
create or replace function public.admin_room_detail(rid uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m rooms; res jsonb;
begin
  perform assert_staff();
  select * into m from rooms where id = rid;
  if m.id is null then raise exception 'Room not found'; end if;
  select jsonb_build_object(
    'room', jsonb_build_object('id', m.id, 'name', m.name, 'event_date', m.event_date, 'code', m.code, 'created_at', m.created_at,
       'place', public.room_place(m.location), 'meta', public.room_meta(m.location),
       'status', public.room_status(m.event_date, public.room_meta(m.location))),
    'owner', (select jsonb_build_object('id', p.id, 'name', p.name, 'handle', p.handle, 'company', p.company,
       'status', coalesce((select status from account_status where user_id = p.id), 'active')) from profiles p where p.id = m.owner_id),
    'stats', (select jsonb_build_object('threads', count(*), 'people', count(distinct owner_id),
       'confirmed', count(*) filter (where confirmed),
       'answered', count(*) filter (where mine is not null and theirs is not null),
       'meet', count(*) filter (where mine = 'meet' and theirs = 'meet'),
       'intro', count(*) filter (where mine = 'intro' and theirs = 'intro'),
       'resolved', count(*) filter (where resolved_at is not null)) from threads where room_id = m.id),
    'attendees', coalesce((select jsonb_agg(a order by a->>'last' desc) from (
       select jsonb_build_object('id', t.owner_id, 'name', p.name, 'handle', p.handle, 'threads', count(*),
         'confirmed', count(*) filter (where t.confirmed), 'last', max(t.created_at)) a
       from threads t left join profiles p on p.id = t.owner_id where t.room_id = m.id group by t.owner_id, p.name, p.handle limit 200) x), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(r order by r->>'created_at' desc) from (
       select jsonb_build_object('created_at', t.created_at, 'by', p.name,
         'other', split_part(t.other_name,' ',1) || coalesce(' ' || left(nullif(split_part(t.other_name,' ',2),''),1) || '.', ''),
         'confirmed', t.confirmed, 'answered', t.mine is not null and t.theirs is not null, 'resolved', t.resolved_at is not null) r
       from threads t left join profiles p on p.id = t.owner_id where t.room_id = m.id order by t.created_at desc limit 30) y), '[]'::jsonb),
    'reports', (select count(*) from reports where target_type = 'room' and target_id = m.id::text),
    'reports_open', (select count(*) from reports where target_type = 'room' and target_id = m.id::text and status in ('open','reviewing')),
    'history', coalesce((select jsonb_agg(jsonb_build_object('action', a.action, 'reason', a.reason, 'created_at', a.created_at,
       'actor', (select name from profiles where id = a.actor_id)) order by a.created_at desc)
       from (select * from audit_log where target_type = 'room' and target_id = m.id::text order by created_at desc limit 30) a), '[]'::jsonb)
  ) into res;
  return res;
end $$;

-- Create (rid null) or edit a Room. The organiser can be any user, found by email or handle.
create or replace function public.admin_room_save(rid uuid, owner_ref text, p_name text, p_date date, p_place text, p_meta jsonb, reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare oid uuid; c text; n int := 0; m rooms;
begin
  perform assert_staff(array['owner','admin','moderator','support']);
  if coalesce(trim(p_name),'') = '' then raise exception 'Add a Room name'; end if;
  if p_date is null then raise exception 'Add a date'; end if;
  if coalesce(trim(reason),'') = '' then raise exception 'A reason is required'; end if;
  if coalesce(trim(owner_ref),'') <> '' then
    select u.id into oid from auth.users u left join profiles p on p.id = u.id
      where lower(u.email) = lower(trim(owner_ref)) or p.handle = lower(trim(both '@' from trim(owner_ref))) limit 1;
    if oid is null then raise exception 'No user found with that email or handle'; end if;
  end if;
  if rid is null then
    oid := coalesce(oid, auth.uid());
    loop
      c := upper(left(regexp_replace(p_name, '[^A-Za-z]', '', 'g') || 'ROOM', 3)) || (10 + floor(random() * 89))::int::text;
      if n > 20 then c := c || (floor(random() * 9))::int::text; end if;
      exit when not exists(select 1 from rooms where code = c);
      n := n + 1;
      if n > 60 then raise exception 'Could not make a unique code. Try again.'; end if;
    end loop;
    insert into rooms(owner_id, name, event_date, location, code)
      values (oid, trim(p_name), p_date, coalesce(trim(p_place),'') || E'\n@@' || coalesce(p_meta,'{}'::jsonb)::text, c) returning * into m;
    perform audit('room.create', 'room', m.id::text, reason, jsonb_build_object('name', m.name, 'owner', oid, 'code', c));
  else
    update rooms set name = trim(p_name), event_date = p_date, owner_id = coalesce(oid, owner_id),
      location = coalesce(trim(p_place),'') || E'\n@@' || (public.room_meta(location) || coalesce(p_meta,'{}'::jsonb))::text
      where id = rid returning * into m;
    if m.id is null then raise exception 'Room not found'; end if;
    perform audit('room.update', 'room', rid::text, reason, jsonb_build_object('name', m.name, 'owner_changed', oid is not null));
  end if;
  return jsonb_build_object('id', m.id, 'code', m.code);
end $$;

-- Staff record when they copy a link or download a QR code (optional, for the history)
create or replace function public.admin_room_log(rid uuid, act text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform assert_staff();
  if act not in ('room.qr','room.link','room.export') then raise exception 'Unknown action'; end if;
  perform audit(act, 'room', rid::text, null);
end $$;

revoke all on function public.admin_rooms2(text,text,text,text,text,int,int), public.admin_room_detail(uuid),
  public.admin_room_save(uuid,text,text,date,text,jsonb,text), public.admin_room_log(uuid,text) from public, anon;
grant execute on function public.admin_rooms2(text,text,text,text,text,int,int), public.admin_room_detail(uuid),
  public.admin_room_save(uuid,text,text,date,text,jsonb,text), public.admin_room_log(uuid,text) to authenticated;
