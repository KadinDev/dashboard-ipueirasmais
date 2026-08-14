-- Useful services and app version control.
-- Keeps emergency/contact information editable from the dashboard and lets the
-- app show optional or mandatory update prompts without publishing new content.

create table if not exists public.useful_services (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  service_type text not null check (
    service_type in (
      'pharmacy',
      'hospital',
      'samu',
      'police',
      'firefighters',
      'city_hall',
      'enel',
      'cagece',
      'other'
    )
  ),
  name text not null,
  phone text,
  whatsapp text,
  address_line text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  note text,
  status public.content_status not null default 'published',
  manual_priority integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists useful_services_city_type_status_idx
on public.useful_services (city_id, service_type, status, manual_priority, name);

drop trigger if exists useful_services_set_updated_at on public.useful_services;
create trigger useful_services_set_updated_at
before update on public.useful_services
for each row execute function public.set_updated_at();

alter table public.useful_services enable row level security;

drop policy if exists "Public can read published useful services" on public.useful_services;
create policy "Public can read published useful services"
on public.useful_services for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Admins can manage useful services" on public.useful_services;
create policy "Admins can manage useful services"
on public.useful_services for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace view public.public_useful_services
with (security_invoker = true)
as
select
  s.id,
  s.city_id,
  s.service_type,
  s.name,
  s.phone,
  s.whatsapp,
  s.address_line,
  s.latitude,
  s.longitude,
  s.note,
  s.manual_priority,
  s.created_at,
  s.updated_at
from public.useful_services s
where s.status = 'published';

grant select on public.public_useful_services to anon, authenticated;

create or replace function public.get_useful_services(
  p_city_slug text default 'ipueiras'
)
returns setof public.public_useful_services
language sql
stable
security invoker
set search_path = public
as $$
  select s.*
  from public.public_useful_services s
  join public.cities city on city.id = s.city_id
  where city.slug = p_city_slug
  order by s.manual_priority asc, s.name asc;
$$;

grant execute on function public.get_useful_services(text) to anon, authenticated;

create table if not exists public.app_versions (
  id uuid primary key default gen_random_uuid(),
  city_id uuid references public.cities(id) on delete restrict,
  platform text not null default 'all' check (platform in ('all', 'android', 'ios')),
  latest_version text not null,
  minimum_version text not null,
  message text not null default 'Uma nova versão do Ipueiras+ está disponível.',
  android_url text,
  ios_url text,
  update_required boolean not null default false,
  status public.content_status not null default 'published',
  manual_priority integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_versions_city_status_idx
on public.app_versions (city_id, status, platform, manual_priority);

drop trigger if exists app_versions_set_updated_at on public.app_versions;
create trigger app_versions_set_updated_at
before update on public.app_versions
for each row execute function public.set_updated_at();

alter table public.app_versions enable row level security;

drop policy if exists "Public can read published app versions" on public.app_versions;
create policy "Public can read published app versions"
on public.app_versions for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Admins can manage app versions" on public.app_versions;
create policy "Admins can manage app versions"
on public.app_versions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.get_app_version_config(
  p_city_slug text default 'ipueiras',
  p_platform text default 'all'
)
returns table (
  id uuid,
  platform text,
  latest_version text,
  minimum_version text,
  message text,
  android_url text,
  ios_url text,
  update_required boolean,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    v.id,
    v.platform,
    v.latest_version,
    v.minimum_version,
    v.message,
    v.android_url,
    v.ios_url,
    v.update_required,
    v.updated_at
  from public.app_versions v
  left join public.cities city on city.id = v.city_id
  where v.status = 'published'
    and (v.city_id is null or city.slug = p_city_slug)
    and (v.platform = 'all' or v.platform = p_platform)
  order by
    case when v.platform = p_platform then 1 else 2 end,
    v.manual_priority asc,
    v.updated_at desc
  limit 1;
$$;

grant execute on function public.get_app_version_config(text, text) to anon, authenticated;
