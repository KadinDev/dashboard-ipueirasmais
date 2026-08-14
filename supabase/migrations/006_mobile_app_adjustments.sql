-- Adjustments for the first Expo app version.
-- Ratings are optional and the home payload includes the latest news.

alter table public.companies
  alter column rating drop not null,
  alter column rating drop default,
  alter column rating_count drop not null,
  alter column rating_count drop default;

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
    'categories', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'kind', c.kind,
          'name', c.name,
          'slug', c.slug,
          'icon_name', c.icon_name,
          'color_hex', c.color_hex,
          'sort_order', c.sort_order
        )
        order by c.kind, c.sort_order, c.name
      )
      from public.categories c
      join selected_city sc on sc.id = c.city_id
      where c.is_active = true
    ), '[]'::jsonb),
    'banners', coalesce((
      select jsonb_agg(to_jsonb(b) order by b.manual_priority asc)
      from (
        select *
        from public.public_home_banners b
        where b.city_id = (select id from selected_city)
        limit 5
      ) b
    ), '[]'::jsonb),
    'featured_companies', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.placement_priority asc, c.name asc)
      from (
        select *
        from public.public_company_cards c
        where c.city_id = (select id from selected_city)
          and c.placement_type in ('featured', 'super_featured')
        order by
          case c.placement_type
            when 'super_featured' then 1
            when 'featured' then 2
            else 9
          end,
          c.placement_priority asc,
          c.name asc
        limit 10
      ) c
    ), '[]'::jsonb),
    'upcoming_events', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.starts_at asc)
      from (
        select *
        from public.public_event_cards e
        where e.city_id = (select id from selected_city)
        order by
          case e.placement_type
            when 'super_featured' then 1
            when 'event_featured' then 2
            when 'featured' then 3
            else 9
          end,
          e.starts_at asc
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
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.get_home_payload(text) to anon, authenticated;
