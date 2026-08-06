-- Seed categories for the Happening Now module.
-- Run this after 009_happening_now.sql so the new enum values are committed.

with city as (
  select id
  from public.cities
  where slug = 'ipueiras'
),
rows (kind, name, slug, icon_name, color_hex, sort_order) as (
  values
    ('promotion'::public.category_kind, 'Restaurantes', 'restaurantes', 'utensils', '#ff7a00', 10),
    ('promotion'::public.category_kind, 'Mercados', 'mercados', 'shopping-cart', '#22c55e', 20),
    ('promotion'::public.category_kind, 'Lojas', 'lojas', 'shopping-bag', '#a855f7', 30),
    ('promotion'::public.category_kind, 'Serviços', 'servicos', 'wrench', '#2563eb', 40),
    ('promotion'::public.category_kind, 'Outras', 'outras', 'badge-percent', '#f97316', 999),

    ('job'::public.category_kind, 'Novas', 'novas', 'briefcase', '#2563eb', 10),
    ('job'::public.category_kind, 'Tempo integral', 'tempo-integral', 'clock', '#22c55e', 20),
    ('job'::public.category_kind, 'Meio período', 'meio-periodo', 'clock-3', '#f97316', 30),
    ('job'::public.category_kind, 'Serviços', 'servicos', 'wrench', '#a855f7', 40),
    ('job'::public.category_kind, 'Outras', 'outras', 'briefcase', '#64748b', 999),

    ('alert'::public.category_kind, 'Prefeitura', 'prefeitura', 'megaphone', '#f97316', 10),
    ('alert'::public.category_kind, 'Saúde', 'saude', 'heart-pulse', '#ef4444', 20),
    ('alert'::public.category_kind, 'Água', 'agua', 'droplets', '#38bdf8', 30),
    ('alert'::public.category_kind, 'Limpeza', 'limpeza', 'trash-2', '#22c55e', 40),
    ('alert'::public.category_kind, 'Trânsito', 'transito', 'traffic-cone', '#eab308', 50),
    ('alert'::public.category_kind, 'Outros', 'outros', 'alert-triangle', '#8b5cf6', 999),

    ('city_update'::public.category_kind, 'Cidade', 'cidade', 'sparkles', '#eab308', 10),
    ('city_update'::public.category_kind, 'Empresas', 'empresas', 'building-2', '#ff7a00', 20),
    ('city_update'::public.category_kind, 'Eventos', 'eventos', 'calendar-days', '#a855f7', 30),
    ('city_update'::public.category_kind, 'Promoções', 'promocoes', 'badge-percent', '#22c55e', 40),
    ('city_update'::public.category_kind, 'Vagas', 'vagas', 'briefcase', '#2563eb', 50),
    ('city_update'::public.category_kind, 'Outras', 'outras', 'sparkles', '#8b5cf6', 999),

    ('pharmacy'::public.category_kind, 'Plantão', 'plantao', 'cross', '#22c55e', 10)
)
insert into public.categories (
  city_id,
  kind,
  name,
  slug,
  icon_name,
  color_hex,
  sort_order,
  is_active
)
select
  city.id,
  rows.kind,
  rows.name,
  rows.slug,
  rows.icon_name,
  rows.color_hex,
  rows.sort_order,
  true
from city
cross join rows
on conflict (city_id, kind, slug) do update set
  name = excluded.name,
  icon_name = excluded.icon_name,
  color_hex = excluded.color_hex,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();
