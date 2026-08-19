-- Corrige "Eventos Hoje" para usar o dia local de Ipueiras/Fortaleza.
-- Antes, a contagem usava date_trunc('day', now()) em UTC. Perto da noite no
-- Brasil, o UTC já podia estar no dia seguinte e contar eventos de amanhã.

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
      (
        date_trunc('day', now() at time zone 'America/Fortaleza')
        at time zone 'America/Fortaleza'
      ) as starts_at,
      (
        date_trunc('day', now() at time zone 'America/Fortaleza')
        + interval '1 day'
      ) at time zone 'America/Fortaleza' as ends_at
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
      from public.public_event_cards e, today_range t
      where e.city_id = (select id from selected_city)
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
