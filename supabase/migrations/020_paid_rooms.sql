-- 020_paid_rooms.sql (v71, 23 Oct 2026)
-- Every new Room needs a Room pass ($199 per event), matching the published price card.
-- Before: an account's first Room was free (migration 014). Existing Rooms are not touched.
-- Staff are still exempt. Safe to re-run.

create or replace function public.rooms_need_pass() returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  if public.is_staff() then return new; end if;
  select id into pid from room_passes where user_id = new.owner_id and used_at is null order by created_at limit 1 for update skip locked;
  if pid is null then raise exception 'room_pass_required' using errcode = 'P0001', hint = 'Buy a Room pass to create a Room.'; end if;
  update room_passes set used_at = now(), room_id = new.id where id = pid;
  return new;
end $$;
drop trigger if exists rooms_need_pass on public.rooms;
create trigger rooms_need_pass before insert on public.rooms for each row execute function public.rooms_need_pass();
