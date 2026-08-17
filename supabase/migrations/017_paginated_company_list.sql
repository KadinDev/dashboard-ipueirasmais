-- Paginate public company list for the mobile app.
--
-- The Companies screen can load the first 20 companies and then request
-- the next pages with p_offset = 20, 40, 60...

drop function if exists public.get_company_list(text, text);
drop function if exists public.get_company_list(text, text, integer, integer);
drop function if exists public.get_company_list(text, text, text, integer, integer);

create or replace function public.get_company_list(
  p_city_slug text default 'ipueiras',
  p_category_slug text default null,
  p_search text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns setof public.public_company_cards
language sql
stable
security invoker
set search_path = public
as $$
  select c.*
  from public.public_company_cards c
  join public.companies company on company.id = c.id
  join public.cities city on city.id = c.city_id
  where city.slug = p_city_slug
    and (p_category_slug is null or c.category_slug = p_category_slug)
    and (
      nullif(trim(p_search), '') is null
      or lower(coalesce(c.name, '')) like '%' || lower(trim(p_search)) || '%'
      or lower(coalesce(company.description, '')) like '%' || lower(trim(p_search)) || '%'
      or lower(coalesce(c.short_description, '')) like '%' || lower(trim(p_search)) || '%'
      or lower(coalesce(c.subtitle, '')) like '%' || lower(trim(p_search)) || '%'
      or lower(coalesce(c.category_name, '')) like '%' || lower(trim(p_search)) || '%'
    )
  order by
    coalesce(c.is_featured, false) desc,
    case
      when coalesce(c.is_featured, false)
      then c.placement_priority
    end asc nulls last,
    lower(c.name) asc,
    c.id asc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.get_company_list(text, text, text, integer, integer) to anon, authenticated;
