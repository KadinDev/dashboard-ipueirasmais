# Supabase - Guia da Cidade

Esta pasta contém a primeira modelagem do banco para o app público e o dashboard administrativo.

## Ordem de execução

No Supabase SQL Editor, rode os arquivos nesta ordem:

1. `migrations/001_core_schema.sql`
2. `migrations/002_security_rls.sql`
3. `migrations/003_public_views.sql`
4. `migrations/004_storage.sql`
5. `migrations/005_public_rpc.sql`
6. `migrations/006_mobile_app_adjustments.sql`
7. `migrations/007_mvp_simplified_monetization.sql`
8. `migrations/008_final_commercial_rules.sql`
9. `seed.sql` opcional, para dados iniciais de Ipueiras e planos
10. `seed_all_categories.sql` opcional, para categorias completas

## Ideia central

O app mobile não terá login. Ele deve consumir principalmente as views públicas:

- `public_company_cards`
- `public_company_details`
- `public_event_cards`
- `public_event_details`
- `public_home_banners`
- `public_news_cards`

Para a tela inicial, prefira a RPC `get_home_payload('ipueiras')`, que busca banners super destaque, até 10 empresas, até 10 eventos, últimas 5 notícias e notificações internas em uma única chamada.

Para listas do app, prefira:

- `get_company_list('ipueiras', null)` ou `get_company_list('ipueiras', 'restaurantes')`
- `get_event_list('ipueiras', null)` ou `get_event_list('ipueiras', 'festas')`

O dashboard web terá login com Supabase Auth. Somente usuários cadastrados em `admin_profiles` com `is_active = true` conseguem criar, editar ou apagar dados.

## Destaques e monetização

Os destaques ficam na tabela `placements`, separada de empresas e eventos. Isso permite vender planos diferentes sem alterar as tabelas principais.

Exemplos:

- Empresa básica: `entity_type = company`, `placement_type = basic`
- Empresa destaque: `entity_type = company`, `placement_type = featured`
- Evento destaque: `entity_type = event`, `placement_type = event_featured`
- Evento super destaque: `entity_type = event`, `placement_type = super_featured`

Campos importantes:

- `starts_at`
- `ends_at`
- `priority`
- `paid_amount_cents`
- `payment_status`
- `is_active`

## Economia no banco

Para manter o Supabase barato:

- O app deve usar as views prontas em vez de fazer muitos joins.
- Use paginação nas listas.
- Não use realtime no app público.
- Suba imagens comprimidas e use thumbnails.
- Registre métricas de clique apenas para ações importantes.
- Prefira cache no app com TanStack Query.

## Primeiro admin

Depois de criar seu usuário no Supabase Auth, insira seu ID em `admin_profiles`.

Exemplo:

```sql
insert into public.admin_profiles (id, display_name, role)
values ('COLE_AQUI_O_AUTH_UID', 'Ricardo', 'owner');
```

Sem esse registro, o dashboard não terá permissão de administração.
