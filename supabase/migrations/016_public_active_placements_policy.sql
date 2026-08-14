-- Allows the public mobile app to resolve active company/event highlights after
-- public views/RPCs were moved to SECURITY INVOKER.

drop policy if exists "Public can read active placements" on public.placements;

create policy "Public can read active placements"
on public.placements for select
to anon, authenticated
using (
  is_active = true
  and starts_at <= now()
  and (ends_at is null or ends_at >= now())
);
