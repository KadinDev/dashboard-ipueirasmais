insert into public.cities (name, state_code, slug, is_active)
values ('Ipueiras', 'CE', 'ipueiras', true)
on conflict (slug) do update set
  name = excluded.name,
  state_code = excluded.state_code,
  is_active = true,
  updated_at = now();

with city as (
  select id
  from public.cities
  where slug = 'ipueiras'
),
rows (kind, name, slug, icon_name, color_hex, sort_order) as (
  values
    ('company'::public.category_kind, 'Restaurantes', 'restaurantes', 'utensils', '#ff7a00', 10),
    ('company'::public.category_kind, 'Lanchonetes', 'lanchonetes', 'sandwich', '#f97316', 20),
    ('company'::public.category_kind, 'Pizzarias', 'pizzarias', 'pizza', '#ef4444', 30),
    ('company'::public.category_kind, 'Mercados', 'mercados', 'shopping-cart', '#22c55e', 40),
    ('company'::public.category_kind, 'Farmácias', 'farmacias', 'cross', '#22c55e', 50),
    ('company'::public.category_kind, 'Saúde', 'saude', 'heart-pulse', '#10b981', 60),
    ('company'::public.category_kind, 'Academias', 'academias', 'dumbbell', '#3b82f6', 70),
    ('company'::public.category_kind, 'Beleza', 'beleza', 'sparkles', '#ec4899', 80),
    ('company'::public.category_kind, 'Moda', 'moda', 'shirt', '#a855f7', 90),
    ('company'::public.category_kind, 'Lojas', 'lojas', 'shopping-bag', '#7c3aed', 100),
    ('company'::public.category_kind, 'Serviços', 'servicos', 'wrench', '#2563eb', 110),
    ('company'::public.category_kind, 'Oficinas', 'oficinas', 'settings', '#64748b', 120),
    ('company'::public.category_kind, 'Autopeças', 'autopecas', 'car', '#0ea5e9', 130),
    ('company'::public.category_kind, 'Construção', 'construcao', 'hammer', '#eab308', 140),
    ('company'::public.category_kind, 'Educação', 'educacao', 'graduation-cap', '#06b6d4', 150),
    ('company'::public.category_kind, 'Pets', 'pets', 'paw-print', '#84cc16', 160),
    ('company'::public.category_kind, 'Bares', 'bares', 'beer', '#f59e0b', 170),
    ('company'::public.category_kind, 'Outros', 'outros', 'map-pin', '#8b5cf6', 999),

    ('event'::public.category_kind, 'Festas', 'festas', 'music', '#a855f7', 10),
    ('event'::public.category_kind, 'Shows', 'shows', 'mic-2', '#f97316', 20),
    ('event'::public.category_kind, 'Esportes', 'esportes', 'trophy', '#22c55e', 30),
    ('event'::public.category_kind, 'Religiosos', 'religiosos', 'church', '#38bdf8', 40),
    ('event'::public.category_kind, 'Comunitários', 'comunitarios', 'users', '#10b981', 50),
    ('event'::public.category_kind, 'Culturais', 'culturais', 'landmark', '#eab308', 60),
    ('event'::public.category_kind, 'Outros', 'outros', 'calendar-days', '#8b5cf6', 999),

    ('news'::public.category_kind, 'Cidade', 'cidade', 'newspaper', '#38bdf8', 10),
    ('news'::public.category_kind, 'Política', 'politica', 'landmark', '#f97316', 20),
    ('news'::public.category_kind, 'Esportes', 'esportes', 'trophy', '#22c55e', 30),
    ('news'::public.category_kind, 'Saúde', 'saude', 'heart-pulse', '#10b981', 40),
    ('news'::public.category_kind, 'Educação', 'educacao', 'graduation-cap', '#06b6d4', 50),
    ('news'::public.category_kind, 'Cultura', 'cultura', 'music', '#a855f7', 60),
    ('news'::public.category_kind, 'Utilidade pública', 'utilidade-publica', 'megaphone', '#eab308', 70),
    ('news'::public.category_kind, 'Outras', 'outras', 'newspaper', '#8b5cf6', 999)
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
