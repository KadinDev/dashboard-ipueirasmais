-- Row Level Security.
-- The mobile app can only read published public views/tables.
-- Only authenticated admins listed in admin_profiles can mutate data.

alter table public.admin_profiles enable row level security;
alter table public.cities enable row level security;
alter table public.categories enable row level security;
alter table public.media_assets enable row level security;
alter table public.companies enable row level security;
alter table public.company_contacts enable row level security;
alter table public.company_hours enable row level security;
alter table public.events enable row level security;
alter table public.news enable row level security;
alter table public.plans enable row level security;
alter table public.placements enable row level security;
alter table public.banners enable row level security;
alter table public.click_events enable row level security;
alter table public.app_settings enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles ap
    where ap.id = auth.uid()
      and ap.is_active = true
      and ap.role in ('owner', 'admin')
  );
$$;

create policy "Admins can read admin profiles"
on public.admin_profiles for select
to authenticated
using (public.is_admin());

create policy "Admins can manage admin profiles"
on public.admin_profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read active cities"
on public.cities for select
to anon, authenticated
using (is_active = true);

create policy "Admins can manage cities"
on public.cities for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read active categories"
on public.categories for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1 from public.cities c
    where c.id = categories.city_id
      and c.is_active = true
  )
);

create policy "Admins can manage categories"
on public.categories for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read media"
on public.media_assets for select
to anon, authenticated
using (true);

create policy "Admins can manage media"
on public.media_assets for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read published companies"
on public.companies for select
to anon, authenticated
using (status = 'published');

create policy "Admins can manage companies"
on public.companies for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read contacts for published companies"
on public.company_contacts for select
to anon, authenticated
using (
  exists (
    select 1 from public.companies c
    where c.id = company_contacts.company_id
      and c.status = 'published'
  )
);

create policy "Admins can manage company contacts"
on public.company_contacts for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read hours for published companies"
on public.company_hours for select
to anon, authenticated
using (
  exists (
    select 1 from public.companies c
    where c.id = company_hours.company_id
      and c.status = 'published'
  )
);

create policy "Admins can manage company hours"
on public.company_hours for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read published future events"
on public.events for select
to anon, authenticated
using (
  status = 'published'
  and coalesce(ends_at, starts_at) >= now() - interval '6 hours'
);

create policy "Admins can manage events"
on public.events for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read published news"
on public.news for select
to anon, authenticated
using (status = 'published');

create policy "Admins can manage news"
on public.news for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read active plans"
on public.plans for select
to anon, authenticated
using (is_active = true);

create policy "Admins can manage plans"
on public.plans for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage placements"
on public.placements for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read active published banners"
on public.banners for select
to anon, authenticated
using (
  status = 'published'
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

create policy "Admins can manage banners"
on public.banners for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can read click events"
on public.click_events for select
to authenticated
using (public.is_admin());

create policy "Admins can manage settings"
on public.app_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read public settings"
on public.app_settings for select
to anon, authenticated
using (key like 'public.%');

create or replace function public.track_click(
  p_city_id uuid,
  p_entity_type public.entity_kind,
  p_entity_id uuid,
  p_click_type public.click_kind,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_entity_type not in ('company', 'event', 'news', 'banner') then
    raise exception 'Invalid entity type';
  end if;

  insert into public.click_events (
    city_id,
    entity_type,
    entity_id,
    click_type,
    metadata
  )
  values (
    p_city_id,
    p_entity_type,
    p_entity_id,
    p_click_type,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

grant execute on function public.track_click(uuid, public.entity_kind, uuid, public.click_kind, jsonb) to anon, authenticated;
