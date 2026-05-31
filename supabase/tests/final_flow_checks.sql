-- Run after migrations/seeds to confirm the public app flow.

select 'plans' as check_name, name, target_entity, placement_type, price_cents, is_active
from public.plans
where name in (
  'Empresa comum',
  'Empresa destaque',
  'Evento comum',
  'Evento destaque',
  'Banner super destaque'
)
order by target_entity, price_cents;

select 'home_payload_keys' as check_name, jsonb_object_keys(public.get_home_payload('ipueiras')) as key;

select 'company_list_order' as check_name, id, name, is_featured, created_at
from public.get_company_list('ipueiras', null)
limit 10;

select 'event_list_order' as check_name, id, title, is_featured, starts_at
from public.get_event_list('ipueiras', null)
limit 10;
