-- Lost and found + simple classifieds for the first app launch.

alter type public.category_kind add value if not exists 'classified';
alter type public.entity_kind add value if not exists 'lost_found';
alter type public.entity_kind add value if not exists 'classified';

create table if not exists public.lost_found_items (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  title text not null,
  slug text not null,
  item_type text not null default 'lost' check (item_type in ('lost', 'found')),
  description text,
  contact_label text,
  image_media_id uuid references public.media_assets(id) on delete set null,
  occurred_at timestamptz,
  status public.content_status not null default 'draft',
  manual_priority integer not null default 100,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, slug)
);

create table if not exists public.classifieds (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  title text not null,
  slug text not null,
  description text,
  price_label text,
  whatsapp text,
  cover_media_id uuid references public.media_assets(id) on delete set null,
  photo_1_media_id uuid references public.media_assets(id) on delete set null,
  photo_2_media_id uuid references public.media_assets(id) on delete set null,
  photo_3_media_id uuid references public.media_assets(id) on delete set null,
  valid_until timestamptz,
  status public.content_status not null default 'draft',
  manual_priority integer not null default 100,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, slug)
);

create index if not exists lost_found_city_status_published_idx
  on public.lost_found_items (city_id, status, published_at desc);
create index if not exists lost_found_city_type_idx
  on public.lost_found_items (city_id, item_type, status);
create index if not exists classifieds_city_status_published_idx
  on public.classifieds (city_id, status, published_at desc);
create index if not exists classifieds_valid_until_idx
  on public.classifieds (valid_until) where status = 'published';

drop trigger if exists lost_found_items_set_updated_at on public.lost_found_items;
create trigger lost_found_items_set_updated_at
before update on public.lost_found_items
for each row execute function public.set_updated_at();

drop trigger if exists classifieds_set_updated_at on public.classifieds;
create trigger classifieds_set_updated_at
before update on public.classifieds
for each row execute function public.set_updated_at();

alter table public.lost_found_items enable row level security;
alter table public.classifieds enable row level security;

drop policy if exists "Public can read published lost found items" on public.lost_found_items;
create policy "Public can read published lost found items"
on public.lost_found_items for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Admins can manage lost found items" on public.lost_found_items;
create policy "Admins can manage lost found items"
on public.lost_found_items for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public can read published classifieds" on public.classifieds;
create policy "Public can read published classifieds"
on public.classifieds for select
to anon, authenticated
using (
  status = 'published'
  and (valid_until is null or valid_until >= now())
);

drop policy if exists "Admins can manage classifieds" on public.classifieds;
create policy "Admins can manage classifieds"
on public.classifieds for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace view public.public_lost_found_cards
with (security_invoker = true)
as
select
  l.id,
  l.city_id,
  l.title,
  l.slug,
  l.item_type,
  l.description,
  l.contact_label,
  image.public_url as image_url,
  l.occurred_at,
  l.manual_priority,
  l.published_at,
  l.created_at
from public.lost_found_items l
left join public.media_assets image on image.id = l.image_media_id
where l.status = 'published';

create or replace view public.public_classified_cards
with (security_invoker = true)
as
select
  c.id,
  c.city_id,
  c.title,
  c.slug,
  c.description,
  c.price_label,
  c.whatsapp,
  cover.public_url as cover_url,
  photo_1.public_url as photo_1_url,
  photo_2.public_url as photo_2_url,
  photo_3.public_url as photo_3_url,
  c.valid_until,
  c.manual_priority,
  c.published_at,
  c.created_at
from public.classifieds c
left join public.media_assets cover on cover.id = c.cover_media_id
left join public.media_assets photo_1 on photo_1.id = c.photo_1_media_id
left join public.media_assets photo_2 on photo_2.id = c.photo_2_media_id
left join public.media_assets photo_3 on photo_3.id = c.photo_3_media_id
where c.status = 'published'
  and (c.valid_until is null or c.valid_until >= now());

grant select on public.public_lost_found_cards to anon, authenticated;
grant select on public.public_classified_cards to anon, authenticated;

create or replace function public.get_lost_found_list(
  p_city_slug text default 'ipueiras',
  p_item_type text default null
)
returns setof public.public_lost_found_cards
language sql
stable
security invoker
set search_path = public
as $$
  select l.*
  from public.public_lost_found_cards l
  join public.cities city on city.id = l.city_id
  where city.slug = p_city_slug
    and (p_item_type is null or l.item_type = p_item_type)
  order by l.manual_priority asc, l.published_at desc nulls last, l.created_at desc;
$$;

create or replace function public.get_classified_list(
  p_city_slug text default 'ipueiras'
)
returns setof public.public_classified_cards
language sql
stable
security invoker
set search_path = public
as $$
  select c.*
  from public.public_classified_cards c
  join public.cities city on city.id = c.city_id
  where city.slug = p_city_slug
  order by c.manual_priority asc, c.published_at desc nulls last, c.created_at desc;
$$;

grant execute on function public.get_lost_found_list(text, text) to anon, authenticated;
grant execute on function public.get_classified_list(text) to anon, authenticated;

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
    ),
    'lost_found_count', (
      select count(*)::integer
      from public.lost_found_items l
      where l.city_id = (select id from selected_city)
        and l.status = 'published'
    ),
    'classifieds_count', (
      select count(*)::integer
      from public.classifieds c
      where c.city_id = (select id from selected_city)
        and c.status = 'published'
        and (c.valid_until is null or c.valid_until >= now())
    )
  );
$$;

grant execute on function public.get_happening_now_summary(text) to anon, authenticated;

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
    'pharmacy',
    'lost_found',
    'classified'
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
