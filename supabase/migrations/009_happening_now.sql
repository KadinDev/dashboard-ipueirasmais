-- Happening Now module.
-- Adds daily utility content for the mobile app:
-- promotions, jobs, alerts, city updates and pharmacy duty support.

alter type public.category_kind add value if not exists 'promotion';
alter type public.category_kind add value if not exists 'job';
alter type public.category_kind add value if not exists 'alert';
alter type public.category_kind add value if not exists 'city_update';
alter type public.category_kind add value if not exists 'pharmacy';

alter type public.entity_kind add value if not exists 'promotion';
alter type public.entity_kind add value if not exists 'job';
alter type public.entity_kind add value if not exists 'alert';
alter type public.entity_kind add value if not exists 'city_update';
alter type public.entity_kind add value if not exists 'pharmacy';

alter type public.click_kind add value if not exists 'banner';
alter type public.click_kind add value if not exists 'route';

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  company_id uuid references public.companies(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  slug text not null,
  description text,
  old_price_cents integer check (old_price_cents is null or old_price_cents >= 0),
  new_price_cents integer check (new_price_cents is null or new_price_cents >= 0),
  price_label text,
  valid_until timestamptz,
  whatsapp text,
  image_media_id uuid references public.media_assets(id) on delete set null,
  status public.content_status not null default 'draft',
  manual_priority integer not null default 100,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, slug)
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  company_id uuid references public.companies(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  slug text not null,
  company_name text,
  location_label text,
  contract_type text,
  salary_label text,
  description text,
  requirements text,
  application_url text,
  whatsapp text,
  status public.content_status not null default 'draft',
  manual_priority integer not null default 100,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, slug)
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  slug text not null,
  summary text,
  body text,
  importance text not null default 'normal' check (importance in ('normal', 'important', 'urgent')),
  affected_areas text,
  expected_resolution text,
  image_media_id uuid references public.media_assets(id) on delete set null,
  status public.content_status not null default 'draft',
  manual_priority integer not null default 100,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, slug)
);

create table if not exists public.city_updates (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  related_entity_type public.entity_kind,
  related_entity_id uuid,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  slug text not null,
  summary text,
  body text,
  image_media_id uuid references public.media_assets(id) on delete set null,
  status public.content_status not null default 'draft',
  manual_priority integer not null default 100,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, slug)
);

create table if not exists public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  company_id uuid references public.companies(id) on delete set null,
  name text not null,
  slug text not null,
  whatsapp text,
  phone text,
  address_line text,
  neighborhood text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  logo_media_id uuid references public.media_assets(id) on delete set null,
  status public.content_status not null default 'draft',
  manual_priority integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, slug)
);

create table if not exists public.pharmacy_duty_shifts (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists promotions_city_status_published_idx
  on public.promotions (city_id, status, published_at desc);
create index if not exists promotions_company_idx
  on public.promotions (company_id);
create index if not exists jobs_city_status_published_idx
  on public.jobs (city_id, status, published_at desc);
create index if not exists alerts_city_status_published_idx
  on public.alerts (city_id, status, published_at desc);
create index if not exists city_updates_city_status_published_idx
  on public.city_updates (city_id, status, published_at desc);
create index if not exists pharmacy_shifts_city_period_idx
  on public.pharmacy_duty_shifts (city_id, starts_at, ends_at);

drop trigger if exists promotions_set_updated_at on public.promotions;
create trigger promotions_set_updated_at
before update on public.promotions
for each row execute function public.set_updated_at();

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

drop trigger if exists alerts_set_updated_at on public.alerts;
create trigger alerts_set_updated_at
before update on public.alerts
for each row execute function public.set_updated_at();

drop trigger if exists city_updates_set_updated_at on public.city_updates;
create trigger city_updates_set_updated_at
before update on public.city_updates
for each row execute function public.set_updated_at();

drop trigger if exists pharmacies_set_updated_at on public.pharmacies;
create trigger pharmacies_set_updated_at
before update on public.pharmacies
for each row execute function public.set_updated_at();

drop trigger if exists pharmacy_duty_shifts_set_updated_at on public.pharmacy_duty_shifts;
create trigger pharmacy_duty_shifts_set_updated_at
before update on public.pharmacy_duty_shifts
for each row execute function public.set_updated_at();

alter table public.promotions enable row level security;
alter table public.jobs enable row level security;
alter table public.alerts enable row level security;
alter table public.city_updates enable row level security;
alter table public.pharmacies enable row level security;
alter table public.pharmacy_duty_shifts enable row level security;

drop policy if exists "Public can read published promotions" on public.promotions;
create policy "Public can read published promotions"
on public.promotions for select
to anon, authenticated
using (
  status = 'published'
  and (valid_until is null or valid_until >= now())
);

drop policy if exists "Admins can manage promotions" on public.promotions;
create policy "Admins can manage promotions"
on public.promotions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public can read published jobs" on public.jobs;
create policy "Public can read published jobs"
on public.jobs for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Admins can manage jobs" on public.jobs;
create policy "Admins can manage jobs"
on public.jobs for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public can read published alerts" on public.alerts;
create policy "Public can read published alerts"
on public.alerts for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Admins can manage alerts" on public.alerts;
create policy "Admins can manage alerts"
on public.alerts for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public can read published city updates" on public.city_updates;
create policy "Public can read published city updates"
on public.city_updates for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Admins can manage city updates" on public.city_updates;
create policy "Admins can manage city updates"
on public.city_updates for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public can read published pharmacies" on public.pharmacies;
create policy "Public can read published pharmacies"
on public.pharmacies for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Admins can manage pharmacies" on public.pharmacies;
create policy "Admins can manage pharmacies"
on public.pharmacies for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public can read active pharmacy duty shifts" on public.pharmacy_duty_shifts;
create policy "Public can read active pharmacy duty shifts"
on public.pharmacy_duty_shifts for select
to anon, authenticated
using (
  status = 'published'
  and ends_at >= now() - interval '6 hours'
);

drop policy if exists "Admins can manage pharmacy duty shifts" on public.pharmacy_duty_shifts;
create policy "Admins can manage pharmacy duty shifts"
on public.pharmacy_duty_shifts for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace view public.public_promotion_cards
with (security_invoker = true)
as
select
  p.id,
  p.city_id,
  p.company_id,
  p.category_id,
  cat.name as category_name,
  cat.slug as category_slug,
  p.title,
  p.slug,
  p.description,
  p.old_price_cents,
  p.new_price_cents,
  p.price_label,
  p.valid_until,
  p.whatsapp,
  image.public_url as image_url,
  c.name as company_name,
  coalesce(company_placement.is_featured, false) as company_is_featured,
  p.manual_priority,
  p.published_at,
  p.created_at
from public.promotions p
left join public.categories cat on cat.id = p.category_id
left join public.media_assets image on image.id = p.image_media_id
left join public.companies c on c.id = p.company_id
left join lateral (
  select true as is_featured
  from public.placements pl
  where pl.entity_type = 'company'
    and pl.entity_id = p.company_id
    and pl.placement_type = 'featured'
    and pl.is_active = true
    and pl.starts_at <= now()
    and (pl.ends_at is null or pl.ends_at >= now())
  limit 1
) company_placement on true
where p.status = 'published'
  and (p.valid_until is null or p.valid_until >= now());

create or replace view public.public_job_cards
with (security_invoker = true)
as
select
  j.id,
  j.city_id,
  j.company_id,
  j.category_id,
  cat.name as category_name,
  cat.slug as category_slug,
  j.title,
  j.slug,
  coalesce(j.company_name, c.name) as company_name,
  j.location_label,
  j.contract_type,
  j.salary_label,
  j.description,
  j.requirements,
  j.application_url,
  j.whatsapp,
  j.manual_priority,
  j.published_at,
  j.created_at
from public.jobs j
left join public.categories cat on cat.id = j.category_id
left join public.companies c on c.id = j.company_id
where j.status = 'published';

create or replace view public.public_alert_cards
with (security_invoker = true)
as
select
  a.id,
  a.city_id,
  a.category_id,
  cat.name as category_name,
  cat.slug as category_slug,
  a.title,
  a.slug,
  a.summary,
  a.importance,
  image.public_url as image_url,
  a.manual_priority,
  a.published_at,
  a.created_at
from public.alerts a
left join public.categories cat on cat.id = a.category_id
left join public.media_assets image on image.id = a.image_media_id
where a.status = 'published';

create or replace view public.public_alert_details
with (security_invoker = true)
as
select
  a.id,
  a.city_id,
  a.category_id,
  cat.name as category_name,
  cat.slug as category_slug,
  a.title,
  a.slug,
  a.summary,
  a.body,
  a.importance,
  a.affected_areas,
  a.expected_resolution,
  image.public_url as image_url,
  a.published_at,
  a.created_at
from public.alerts a
left join public.categories cat on cat.id = a.category_id
left join public.media_assets image on image.id = a.image_media_id
where a.status = 'published';

create or replace view public.public_city_update_cards
with (security_invoker = true)
as
select
  u.id,
  u.city_id,
  u.related_entity_type,
  u.related_entity_id,
  u.category_id,
  cat.name as category_name,
  cat.slug as category_slug,
  u.title,
  u.slug,
  u.summary,
  u.body,
  image.public_url as image_url,
  u.manual_priority,
  u.published_at,
  u.created_at
from public.city_updates u
left join public.categories cat on cat.id = u.category_id
left join public.media_assets image on image.id = u.image_media_id
where u.status = 'published';

create or replace view public.public_pharmacy_duty
with (security_invoker = true)
as
select
  s.id as shift_id,
  s.city_id,
  s.starts_at,
  s.ends_at,
  s.note,
  p.id as pharmacy_id,
  p.company_id,
  p.name,
  p.slug,
  p.whatsapp,
  p.phone,
  p.address_line,
  p.neighborhood,
  p.latitude,
  p.longitude,
  logo.public_url as logo_url,
  p.manual_priority
from public.pharmacy_duty_shifts s
join public.pharmacies p on p.id = s.pharmacy_id
left join public.media_assets logo on logo.id = p.logo_media_id
where s.status = 'published'
  and p.status = 'published'
  and s.ends_at >= now() - interval '6 hours';

grant select on public.public_promotion_cards to anon, authenticated;
grant select on public.public_job_cards to anon, authenticated;
grant select on public.public_alert_cards to anon, authenticated;
grant select on public.public_alert_details to anon, authenticated;
grant select on public.public_city_update_cards to anon, authenticated;
grant select on public.public_pharmacy_duty to anon, authenticated;

create or replace function public.get_promotion_list(
  p_city_slug text default 'ipueiras',
  p_category_slug text default null
)
returns setof public.public_promotion_cards
language sql
stable
security invoker
set search_path = public
as $$
  select p.*
  from public.public_promotion_cards p
  join public.cities city on city.id = p.city_id
  where city.slug = p_city_slug
    and (p_category_slug is null or p.category_slug = p_category_slug)
  order by p.company_is_featured desc, p.manual_priority asc, p.created_at desc;
$$;

create or replace function public.get_job_list(
  p_city_slug text default 'ipueiras',
  p_category_slug text default null
)
returns setof public.public_job_cards
language sql
stable
security invoker
set search_path = public
as $$
  select j.*
  from public.public_job_cards j
  join public.cities city on city.id = j.city_id
  where city.slug = p_city_slug
    and (p_category_slug is null or j.category_slug = p_category_slug)
  order by j.manual_priority asc, j.published_at desc nulls last, j.created_at desc;
$$;

create or replace function public.get_alert_list(
  p_city_slug text default 'ipueiras',
  p_category_slug text default null
)
returns setof public.public_alert_cards
language sql
stable
security invoker
set search_path = public
as $$
  select a.*
  from public.public_alert_cards a
  join public.cities city on city.id = a.city_id
  where city.slug = p_city_slug
    and (p_category_slug is null or a.category_slug = p_category_slug)
  order by
    case a.importance when 'urgent' then 1 when 'important' then 2 else 3 end,
    a.manual_priority asc,
    a.published_at desc nulls last,
    a.created_at desc;
$$;

create or replace function public.get_city_update_list(
  p_city_slug text default 'ipueiras',
  p_category_slug text default null
)
returns setof public.public_city_update_cards
language sql
stable
security invoker
set search_path = public
as $$
  select u.*
  from public.public_city_update_cards u
  join public.cities city on city.id = u.city_id
  where city.slug = p_city_slug
    and (p_category_slug is null or u.category_slug = p_category_slug)
  order by u.manual_priority asc, u.published_at desc nulls last, u.created_at desc;
$$;

create or replace function public.get_pharmacy_duty_list(
  p_city_slug text default 'ipueiras'
)
returns setof public.public_pharmacy_duty
language sql
stable
security invoker
set search_path = public
as $$
  select p.*
  from public.public_pharmacy_duty p
  join public.cities city on city.id = p.city_id
  where city.slug = p_city_slug
  order by
    case when p.starts_at <= now() and p.ends_at >= now() then 1 else 2 end,
    p.starts_at asc,
    p.manual_priority asc;
$$;

grant execute on function public.get_promotion_list(text, text) to anon, authenticated;
grant execute on function public.get_job_list(text, text) to anon, authenticated;
grant execute on function public.get_alert_list(text, text) to anon, authenticated;
grant execute on function public.get_city_update_list(text, text) to anon, authenticated;
grant execute on function public.get_pharmacy_duty_list(text) to anon, authenticated;

create or replace function public.get_happening_now_summary(p_city_slug text default 'ipueiras')
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with selected_city as (
    select id
    from public.cities
    where slug = p_city_slug
      and is_active = true
    limit 1
  ),
  today_range as (
    select
      date_trunc('day', now()) as starts_at,
      date_trunc('day', now()) + interval '1 day' as ends_at
  )
  select jsonb_build_object(
    'promotions_count', (
      select count(*)::integer
      from public.promotions p
      where p.city_id = (select id from selected_city)
        and p.status = 'published'
        and (p.valid_until is null or p.valid_until >= now())
    ),
    'today_events_count', (
      select count(*)::integer
      from public.events e, today_range t
      where e.city_id = (select id from selected_city)
        and e.status = 'published'
        and e.starts_at >= t.starts_at
        and e.starts_at < t.ends_at
    ),
    'jobs_count', (
      select count(*)::integer
      from public.jobs j
      where j.city_id = (select id from selected_city)
        and j.status = 'published'
    ),
    'alerts_count', (
      select count(*)::integer
      from public.alerts a
      where a.city_id = (select id from selected_city)
        and a.status = 'published'
    ),
    'updates_count', (
      select count(*)::integer
      from public.city_updates u
      where u.city_id = (select id from selected_city)
        and u.status = 'published'
    ),
    'pharmacy_duty_count', (
      select count(*)::integer
      from public.public_pharmacy_duty p
      where p.city_id = (select id from selected_city)
        and p.starts_at <= now()
        and p.ends_at >= now()
    )
  );
$$;

grant execute on function public.get_happening_now_summary(text) to anon, authenticated;

create or replace function public.get_home_payload(p_city_slug text default 'ipueiras')
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with selected_city as (
    select id, name, state_code, slug
    from public.cities
    where slug = p_city_slug
      and is_active = true
    limit 1
  )
  select jsonb_build_object(
    'city', (
      select to_jsonb(sc) from selected_city sc
    ),
    'happening_now', public.get_happening_now_summary(p_city_slug),
    'super_banners', coalesce((
      select jsonb_agg(to_jsonb(b) order by b.manual_priority asc)
      from (
        select *
        from public.public_home_banners b
        where b.city_id = (select id from selected_city)
        limit 5
      ) b
    ), '[]'::jsonb),
    'home_companies', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.created_at desc)
      from (
        select *
        from public.public_company_cards c
        where c.city_id = (select id from selected_city)
        order by c.created_at desc
        limit 10
      ) c
    ), '[]'::jsonb),
    'home_events', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.is_featured desc, e.starts_at asc)
      from (
        select *
        from public.public_event_cards e
        where e.city_id = (select id from selected_city)
        order by e.is_featured desc, e.starts_at asc
        limit 10
      ) e
    ), '[]'::jsonb),
    'latest_news', coalesce((
      select jsonb_agg(to_jsonb(n) order by n.published_at desc nulls last)
      from (
        select *
        from public.public_news_cards n
        where n.city_id = (select id from selected_city)
        order by n.published_at desc nulls last
        limit 5
      ) n
    ), '[]'::jsonb),
    'notifications', coalesce((
      select jsonb_agg(to_jsonb(n) order by n.published_at desc nulls last)
      from (
        select *
        from public.public_notifications n
        where n.city_id = (select id from selected_city)
        order by n.published_at desc nulls last
        limit 20
      ) n
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.get_home_payload(text) to anon, authenticated;

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
  if p_entity_type::text not in (
    'company',
    'event',
    'news',
    'banner',
    'promotion',
    'job',
    'alert',
    'city_update',
    'pharmacy'
  ) then
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
