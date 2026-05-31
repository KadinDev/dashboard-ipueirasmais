-- Final commercial rules before the Expo app.
-- Home:
--   - Super highlight banners are managed in banners.
--   - Companies: featured first, then common, each group by created_at desc, limit 10.
--   - Events: featured first, then common, each group by starts_at asc, limit 10.
-- Lists:
--   - Companies: featured first, then alphabetical.
--   - Events: featured first, then starts_at asc.

alter table public.events
  add column if not exists show_add_to_calendar boolean not null default true;

alter table public.companies
  add column if not exists listing_paid_amount_cents integer not null default 3000 check (listing_paid_amount_cents >= 0),
  add column if not exists listing_payment_status public.payment_status not null default 'pending',
  add column if not exists listing_paid_until date,
  add column if not exists billing_notes text;

alter table public.events
  add column if not exists paid_amount_cents integer not null default 3000 check (paid_amount_cents >= 0),
  add column if not exists payment_status public.payment_status not null default 'pending',
  add column if not exists billing_notes text;

alter table public.banners
  add column if not exists paid_amount_cents integer not null default 0 check (paid_amount_cents >= 0),
  add column if not exists payment_status public.payment_status not null default 'pending',
  add column if not exists notes text;

create or replace view public.public_company_cards
with (security_invoker = false)
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
  phone.value as phone,
  c.created_at,
  (best_placement.placement_type = 'featured'::public.placement_kind) as is_featured
from public.companies c
left join public.categories cat on cat.id = c.category_id
left join public.media_assets logo on logo.id = c.logo_media_id
left join public.media_assets cover on cover.id = c.cover_media_id
left join lateral (
  select p.placement_type, p.priority, p.ends_at
  from public.placements p
  where p.entity_type = 'company'
    and p.entity_id = c.id
    and p.placement_type = 'featured'
    and p.is_active = true
    and p.starts_at <= now()
    and (p.ends_at is null or p.ends_at >= now())
  order by p.priority asc, p.created_at desc
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

create or replace view public.public_event_cards
with (security_invoker = false)
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
  coalesce(best_placement.priority, e.manual_priority) as placement_priority,
  e.created_at,
  (best_placement.placement_type = 'event_featured'::public.placement_kind) as is_featured
from public.events e
left join public.categories cat on cat.id = e.category_id
left join public.media_assets cover on cover.id = e.cover_media_id
left join lateral (
  select p.placement_type, p.priority
  from public.placements p
  where p.entity_type = 'event'
    and p.entity_id = e.id
    and p.placement_type = 'event_featured'
    and p.is_active = true
    and p.starts_at <= now()
    and (p.ends_at is null or p.ends_at >= now())
  order by p.priority asc, p.created_at desc
  limit 1
) best_placement on true
where e.status = 'published'
  and coalesce(e.ends_at, e.starts_at) >= now() - interval '6 hours';

drop view if exists public.public_event_details;

create view public.public_event_details
with (security_invoker = false)
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
  e.show_add_to_calendar,
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
    and p.placement_type = 'event_featured'
    and p.is_active = true
    and p.starts_at <= now()
    and (p.ends_at is null or p.ends_at >= now())
  order by p.priority asc
  limit 1
) best_placement on true
where e.status = 'published'
  and coalesce(e.ends_at, e.starts_at) >= now() - interval '6 hours';

create or replace view public.public_home_banners
with (security_invoker = false)
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
  b.manual_priority,
  b.starts_at,
  b.ends_at
from public.banners b
left join public.media_assets image on image.id = b.image_media_id
where b.status = 'published'
  and (b.starts_at is null or b.starts_at <= now())
  and (b.ends_at is null or b.ends_at >= now())
order by b.manual_priority asc, b.created_at desc;

create or replace function public.get_home_payload(p_city_slug text default 'ipueiras')
returns jsonb
language sql
stable
security definer
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
      select jsonb_agg(to_jsonb(c) order by c.is_featured desc, c.created_at desc)
      from (
        select *
        from public.public_company_cards c
        where c.city_id = (select id from selected_city)
        order by c.is_featured desc, c.created_at desc
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

create or replace function public.get_company_list(p_city_slug text default 'ipueiras', p_category_slug text default null)
returns setof public.public_company_cards
language sql
stable
security definer
set search_path = public
as $$
  select c.*
  from public.public_company_cards c
  join public.cities city on city.id = c.city_id
  where city.slug = p_city_slug
    and (p_category_slug is null or c.category_slug = p_category_slug)
  order by c.is_featured desc, lower(c.name) asc;
$$;

grant execute on function public.get_company_list(text, text) to anon, authenticated;

create or replace function public.get_event_list(p_city_slug text default 'ipueiras', p_category_slug text default null)
returns setof public.public_event_cards
language sql
stable
security definer
set search_path = public
as $$
  select e.*
  from public.public_event_cards e
  join public.cities city on city.id = e.city_id
  where city.slug = p_city_slug
    and (p_category_slug is null or e.category_slug = p_category_slug)
  order by e.is_featured desc, e.starts_at asc;
$$;

grant execute on function public.get_event_list(text, text) to anon, authenticated;

update public.plans
set is_active = false
where name in ('Empresa Super Destaque', 'Evento Super Destaque')
   or placement_type in ('super_featured', 'home_banner');

insert into public.plans (
  name,
  target_entity,
  placement_type,
  price_cents,
  duration_days,
  benefits,
  is_active
)
select
  plan_name,
  target_entity,
  placement_type,
  price_cents,
  duration_days,
  benefits,
  true
from (
  values
    (
      'Empresa comum',
      'company'::public.entity_kind,
      'basic'::public.placement_kind,
      3000,
      30,
      '["Aparece na tela Empresas", "Pode aparecer na Home se houver espaço"]'::jsonb
    ),
    (
      'Empresa destaque',
      'company'::public.entity_kind,
      'featured'::public.placement_kind,
      5000,
      30,
      '["Aparece antes das comuns", "Aparece na Home", "Aparece no detalhe das notícias"]'::jsonb
    ),
    (
      'Evento comum',
      'event'::public.entity_kind,
      'basic'::public.placement_kind,
      3000,
      null,
      '["Aparece na tela Eventos", "Pode aparecer na Home se houver espaço"]'::jsonb
    ),
    (
      'Evento destaque',
      'event'::public.entity_kind,
      'event_featured'::public.placement_kind,
      5000,
      null,
      '["Aparece antes dos comuns", "Aparece na Home", "Selo de destaque"]'::jsonb
    ),
    (
      'Banner super destaque',
      'banner'::public.entity_kind,
      'home_banner'::public.placement_kind,
      8000,
      null,
      '["Banner grande na Home", "Ideal para evento, promoção ou anúncio especial"]'::jsonb
    )
) as seed(plan_name, target_entity, placement_type, price_cents, duration_days, benefits)
where not exists (
  select 1
  from public.plans p
  where lower(p.name) = lower(seed.plan_name)
);
