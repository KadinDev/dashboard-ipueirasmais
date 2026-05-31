-- MVP monetization simplification:
-- Companies: common paid listing or featured.
-- Events: free listing or featured.
-- Internal notifications for the bell icon.
-- Sponsored company card for news details.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  title text not null,
  body text,
  entity_type public.entity_kind,
  entity_id uuid,
  image_media_id uuid references public.media_assets(id) on delete set null,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists notifications_set_updated_at on public.notifications;

create trigger notifications_set_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

create index if not exists notifications_public_idx
on public.notifications (city_id, status, published_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Public can read published notifications" on public.notifications;
drop policy if exists "Admins can manage notifications" on public.notifications;

create policy "Public can read published notifications"
on public.notifications for select
to anon, authenticated
using (status = 'published');

create policy "Admins can manage notifications"
on public.notifications for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace view public.public_notifications
with (security_invoker = false)
as
select
  n.id,
  n.city_id,
  n.title,
  n.body,
  n.entity_type,
  n.entity_id,
  image.public_url as image_url,
  n.published_at
from public.notifications n
left join public.media_assets image on image.id = n.image_media_id
where n.status = 'published'
order by n.published_at desc nulls last, n.created_at desc;

grant select on public.public_notifications to anon, authenticated;

create or replace function public.get_random_featured_company_for_news(
  p_city_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(c)
  from public.public_company_cards c
  where c.city_id = p_city_id
    and c.placement_type = 'featured'
  order by random()
  limit 1;
$$;

grant execute on function public.get_random_featured_company_for_news(uuid) to anon, authenticated;

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
    'featured_companies', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.placement_priority asc, c.name asc)
      from (
        select *
        from public.public_company_cards c
        where c.city_id = (select id from selected_city)
          and c.placement_type = 'featured'
        order by c.placement_priority asc, c.name asc
        limit 5
      ) c
    ), '[]'::jsonb),
    'featured_events', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.starts_at asc)
      from (
        select *
        from public.public_event_cards e
        where e.city_id = (select id from selected_city)
          and e.placement_type = 'event_featured'
        order by e.starts_at asc
        limit 5
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

update public.plans
set is_active = false
where placement_type in ('super_featured', 'home_banner')
   or name ilike '%super%';
