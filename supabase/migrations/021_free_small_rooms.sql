-- 021_free_small_rooms.sql (v76, 23 Oct 2026)
-- One free Room a month for up to 20 people (owner's decision). Bigger or extra Rooms still
-- need a Room pass ($199). A Room counts as free when its attendance limit is 20 or less and
-- no Room pass was used for it. Staff are exempt. Safe to re-run. Replaces the 020 trigger body.

create or replace function public.rooms_need_pass() returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  if public.is_staff() then return new; end if;
  if public.room_cap(new.location) <= 20 and not exists (
       select 1 from rooms r
       where r.owner_id = new.owner_id
         and r.created_at >= date_trunc('month', now())
         and public.room_cap(r.location) <= 20
         and not exists (select 1 from room_passes p where p.room_id = r.id)
     ) then
    return new;
  end if;
  select id into pid from room_passes where user_id = new.owner_id and used_at is null order by created_at limit 1 for update skip locked;
  if pid is null then raise exception 'room_pass_required' using errcode = 'P0001', hint = 'Buy a Room pass to create this Room.'; end if;
  update room_passes set used_at = now(), room_id = new.id where id = pid;
  return new;
end $$;
drop trigger if exists rooms_need_pass on public.rooms;
create trigger rooms_need_pass before insert on public.rooms for each row execute function public.rooms_need_pass();

-- A free Room cannot later be raised above 20 people without a Room pass.
create or replace function public.rooms_free_cap_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_staff() then return new; end if;
  if public.room_cap(new.location) > 20 and public.room_cap(old.location) <= 20
     and not exists (select 1 from room_passes where room_id = new.id) then
    raise exception 'room_pass_required' using errcode = 'P0001', hint = 'Free events are limited to 20 people. Buy a Room pass for a bigger event.';
  end if;
  return new;
end $$;
drop trigger if exists rooms_free_cap_guard on public.rooms;
create trigger rooms_free_cap_guard before update of location on public.rooms for each row execute function public.rooms_free_cap_guard();
