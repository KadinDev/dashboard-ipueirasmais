-- Public read models for the mobile app.
-- Prefer these views in the app to reduce joins, payload size and duplicated logic.

create or replace view public.public_company_cards
with (security_invoker = true)
as
select
  c.id,
  c.city_id,
  c.category_id,
  cat.name as category_name,
  cat.slug as category_slug,
  c.name,
  c.slug,
  c.subtitle,
  c.short_description,
  c.rating,
  c.rating_count,
  c.neighborhood,
  logo.public_url as logo_url,
  cover.public_url as cover_url,
  coalesce(best_placement.placement_type, 'basic'::public.placement_kind) as placement_type,
  coalesce(best_placement.priority, c.manual_priority) as placement_priority,
  best_placement.ends_at as placement_ends_at,
  whatsapp.value as whatsapp,
  phone.value as phone
from public.companies c
left join public.categories cat on cat.id = c.category_id
left join public.media_assets logo on logo.id = c.logo_media_id
left join public.media_assets cover on cover.id = c.cover_media_id
left join lateral (
  select p.placement_type, p.priority, p.ends_at
  from public.placements p
  where p.entity_type = 'company'
    and p.entity_id = c.id
    and p.is_active = true
    and p.starts_at <= now()
    and (p.ends_at is null or p.ends_at >= now())
  order by
    case p.placement_type
      when 'super_featured' then 1
      when 'featured' then 2
      when 'home_banner' then 3
      else 9
    end,
    p.priority asc,
    p.created_at desc
  limit 1
) best_placement on true
left join lateral (
  select cc.value
  from public.company_contacts cc
  where cc.company_id = c.id and cc.kind = 'whatsapp'
  order by cc.is_primary desc, cc.sort_order asc
  limit 1
) whatsapp on true
left join lateral (
  select cc.value
  from public.company_contacts cc
  where cc.company_id = c.id and cc.kind = 'phone'
  order by cc.is_primary desc, cc.sort_order asc
  limit 1
) phone on true
where c.status = 'published';

create or replace view public.public_company_details
with (security_invoker = true)
as
select
  c.id,
  c.city_id,
  c.category_id,
  c.name,
  c.slug,
  c.subtitle,
  c.short_description,
  c.description,
  c.rating,
  c.rating_count,
  c.address_line,
  c.neighborhood,
  c.postal_code,
  c.latitude,
  c.longitude,
  cat.name as category_name,
  cat.slug as category_slug,
  logo.public_url as logo_url,
  cover.public_url as cover_url,
  coalesce(best_placement.placement_type, 'basic'::public.placement_kind) as placement_type,
  coalesce(
    jsonb_agg(
      distinct jsonb_build_object(
        'kind', cc.kind,
        'label', cc.label,
        'value', cc.value,
        'is_primary', cc.is_primary,
        'sort_order', cc.sort_order
      )
    ) filter (where cc.id is not null),
    '[]'::jsonb
  ) as contacts,
  coalesce(
    jsonb_agg(
      distinct jsonb_build_object(
        'day_of_week', ch.day_of_week,
        'opens_at', ch.opens_at,
        'closes_at', ch.closes_at,
        'is_closed', ch.is_closed,
        'note', ch.note
      )
    ) filter (where ch.id is not null),
    '[]'::jsonb
  ) as hours
from public.companies c
left join public.categories cat on cat.id = c.category_id
left join public.media_assets logo on logo.id = c.logo_media_id
left join public.media_assets cover on cover.id = c.cover_media_id
left join public.company_contacts cc on cc.company_id = c.id
left join public.company_hours ch on ch.company_id = c.id
left join lateral (
  select p.placement_type
  from public.placements p
  where p.entity_type = 'company'
    and p.entity_id = c.id
    and p.is_active = true
    and p.starts_at <= now()
    and (p.ends_at is null or p.ends_at >= now())
  order by
    case p.placement_type
      when 'super_featured' then 1
      when 'featured' then 2
      else 9
    end,
    p.priority asc
  limit 1
) best_placement on true
where c.status = 'published'
group by c.id, cat.name, cat.slug, logo.public_url, cover.public_url, best_placement.placement_type;

create or replace view public.public_event_cards
with (security_invoker = true)
as
select
  e.id,
  e.city_id,
  e.category_id,
  cat.name as category_name,
  cat.slug as category_slug,
  e.title,
  e.slug,
  e.short_description,
  e.venue_name,
  e.neighborhood,
  e.starts_at,
  e.ends_at,
  e.is_free,
  e.price_label,
  cover.public_url as cover_url,
  coalesce(best_placement.placement_type, 'basic'::public.placement_kind) as placement_type,
  coalesce(best_placement.priority, e.manual_priority) as placement_priority
from public.events e
left join public.categories cat on cat.id = e.category_id
left join public.media_assets cover on cover.id = e.cover_media_id
left join lateral (
  select p.placement_type, p.priority
  from public.placements p
  where p.entity_type = 'event'
    and p.entity_id = e.id
    and p.is_active = true
    and p.starts_at <= now()
    and (p.ends_at is null or p.ends_at >= now())
  order by
    case p.placement_type
      when 'super_featured' then 1
      when 'event_featured' then 2
      when 'featured' then 3
      else 9
    end,
    p.priority asc,
    p.created_at desc
  limit 1
) best_placement on true
where e.status = 'published'
  and coalesce(e.ends_at, e.starts_at) >= now() - interval '6 hours';

create or replace view public.public_event_details
with (security_invoker = true)
as
select
  e.id,
  e.city_id,
  e.category_id,
  e.title,
  e.slug,
  e.short_description,
  e.description,
  e.venue_name,
  e.address_line,
  e.neighborhood,
  e.latitude,
  e.longitude,
  e.starts_at,
  e.ends_at,
  e.is_free,
  e.price_label,
  e.ticket_url,
  e.whatsapp,
  e.age_rating,
  cat.name as category_name,
  cat.slug as category_slug,
  cover.public_url as cover_url,
  coalesce(best_placement.placement_type, 'basic'::public.placement_kind) as placement_type
from public.events e
left join public.categories cat on cat.id = e.category_id
left join public.media_assets cover on cover.id = e.cover_media_id
left join lateral (
  select p.placement_type
  from public.placements p
  where p.entity_type = 'event'
    and p.entity_id = e.id
    and p.is_active = true
    and p.starts_at <= now()
    and (p.ends_at is null or p.ends_at >= now())
  order by
    case p.placement_type
      when 'super_featured' then 1
      when 'event_featured' then 2
      when 'featured' then 3
      else 9
    end,
    p.priority asc
  limit 1
) best_placement on true
where e.status = 'published'
  and coalesce(e.ends_at, e.starts_at) >= now() - interval '6 hours';

create or replace view public.public_home_banners
with (security_invoker = true)
as
select
  b.id,
  b.city_id,
  b.title,
  b.subtitle,
  image.public_url as image_url,
  b.action_label,
  b.action_url,
  b.target_entity,
  b.target_entity_id,
  b.manual_priority
from public.banners b
left join public.media_assets image on image.id = b.image_media_id
where b.status = 'published'
  and (b.starts_at is null or b.starts_at <= now())
  and (b.ends_at is null or b.ends_at >= now())
order by b.manual_priority asc, b.created_at desc;

create or replace view public.public_news_cards
with (security_invoker = true)
as
select
  n.id,
  n.city_id,
  n.category_id,
  cat.name as category_name,
  n.title,
  n.slug,
  n.excerpt,
  cover.public_url as cover_url,
  n.published_at
from public.news n
left join public.categories cat on cat.id = n.category_id
left join public.media_assets cover on cover.id = n.cover_media_id
where n.status = 'published'
order by n.published_at desc nulls last, n.created_at desc;

create or replace view public.admin_click_summary_daily
with (security_invoker = true)
as
select
  date_trunc('day', occurred_at)::date as day,
  city_id,
  entity_type,
  entity_id,
  click_type,
  count(*)::integer as total
from public.click_events
group by 1, 2, 3, 4, 5;

grant select on public.public_company_cards to anon, authenticated;
grant select on public.public_company_details to anon, authenticated;
grant select on public.public_event_cards to anon, authenticated;
grant select on public.public_event_details to anon, authenticated;
grant select on public.public_home_banners to anon, authenticated;
grant select on public.public_news_cards to anon, authenticated;
grant select on public.admin_click_summary_daily to authenticated;
