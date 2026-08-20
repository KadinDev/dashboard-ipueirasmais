# Ipueiras+ Dashboard

Dashboard administrativo e backend Supabase do **Ipueiras+**, um aplicativo local para divulgar empresas, eventos, notícias, promoções, vagas, avisos, serviços úteis e conteúdos importantes da cidade.

Este repositório contém o painel oficial do administrador e os SQLs necessários para criar e manter o backend no Supabase.

## Stack

- React
- TypeScript
- Vite
- styled-components
- Supabase
- PostgreSQL

## O Que Este Sistema Faz

O dashboard permite administrar:

- Resumo geral do app.
- Empresas.
- Eventos.
- Promoções.
- Vagas de emprego.
- Avisos da Prefeitura.
- Novidades da cidade.
- Notícias.
- Serviços úteis e farmácia de plantão.
- Achados e perdidos.
- Classificados.
- Banners da Home.
- Destaques pagos.
- Notificações internas.
- Push notifications.
- Solicitações recebidas pelo portal público e pelo painel da Prefeitura.
- Conteúdos expirados.
- Versão mínima/opcional do app.
- Métricas de cliques, quando o app estiver registrando eventos.

O app final é público e não exige login do usuário. O login existe apenas no dashboard administrativo e nos painéis auxiliares.

## Estrutura

```txt
src/
  App.tsx
  lib/
    format.ts
    supabase.ts
    types.ts
  styles/
    GlobalStyle.ts
    ui.ts

supabase/
  migrations/
  tests/
  seed_all_categories.sql
  README.md
```

## Configuração Local

Crie um arquivo `.env` na raiz:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

Instale as dependências:

```bash
npm install
```

Rode localmente:

```bash
npm run dev
```

Acesse:

```txt
http://localhost:5173
```

Build de produção:

```bash
npm run build
```

Preview do build:

```bash
npm run preview
```

## Deploy Na Vercel

Configuração recomendada:

```txt
Framework: Vite
Build Command: npm run build
Output Directory: dist
```

Variáveis de ambiente na Vercel:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

Não envie `.env`, `node_modules` ou `dist` como arquivos de produção manual. A Vercel gera o `dist` automaticamente no deploy.

## Configuração Do Supabase

Em um projeto Supabase novo, rode as migrations em ordem:

```txt
supabase/migrations/001_core_schema.sql
supabase/migrations/002_security_rls.sql
supabase/migrations/003_public_views.sql
supabase/migrations/004_storage.sql
supabase/migrations/005_public_rpc.sql
supabase/migrations/006_mobile_app_adjustments.sql
supabase/migrations/007_mvp_simplified_monetization.sql
supabase/migrations/008_final_commercial_rules.sql
supabase/migrations/009_happening_now.sql
supabase/migrations/010_seed_happening_now_categories.sql
supabase/migrations/011_push_notifications.sql
supabase/migrations/012_useful_services_and_app_versions.sql
supabase/migrations/013_fix_public_views_security_invoker.sql
supabase/migrations/014_fix_set_updated_at_search_path.sql
supabase/migrations/015_security_advisor_cleanup.sql
supabase/migrations/016_public_active_placements_policy.sql
supabase/migrations/017_paginated_company_list.sql
supabase/migrations/018_lost_found_and_classifieds.sql
supabase/migrations/019_submission_portals.sql
supabase/migrations/020_fix_today_events_local_timezone.sql
```

Depois rode as categorias:

```txt
supabase/seed_all_categories.sql
```

Testes opcionais:

```txt
supabase/tests/final_flow_checks.sql
```

## Primeiro Admin

1. Crie um usuário no Supabase Auth.
2. Copie o UID do usuário.
3. Rode:

```sql
insert into public.admin_profiles (id, display_name, role, is_active)
values ('COLE_AQUI_O_AUTH_UID', 'Ricardo', 'owner', true)
on conflict (id) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  is_active = true,
  updated_at = now();
```

Somente usuários ativos em `admin_profiles` conseguem administrar o dashboard oficial.

## Regras Comerciais

### Empresa comum

- Valor sugerido: R$ 30/mês.
- Cadastro em: `Empresas`.
- Aparece na tela de empresas.
- Controle interno: valor mensal, status de pagamento, pago até e observações de cobrança.

### Empresa destaque

- Valor sugerido: R$ 50/mês.
- Cadastro comercial em: `Destaques`.
- Continua sendo uma empresa normal, mas aparece como destaque enquanto o período estiver ativo.

### Evento comum

- Valor sugerido: R$ 30 por evento.
- Cadastro em: `Eventos`.
- Aparece conforme data do evento.

### Evento destaque

- Valor sugerido: R$ 50 por evento.
- Cadastro comercial em: `Destaques`.
- Aparece com prioridade enquanto o destaque estiver ativo.

### Banner Super Destaque

- Valor sugerido: R$ 80.
- Cadastro em: `Banners`.
- Usado para anúncios de alta visibilidade na Home.
- Pode divulgar empresa, evento, promoção ou campanha específica.

## Regras De Exibição No App

### Home

A Home deve consumir:

```sql
get_home_payload('ipueiras')
```

Retorna:

- `city`
- `happening_now`
- `super_banners`
- `home_events`
- `home_companies`
- `latest_news`
- `notifications`

### Empresas

RPC:

```sql
get_company_list('ipueiras', null, null, 20, 0)
```

Regras:

- Empresas publicadas.
- Busca opcional no servidor.
- Paginação por `limit` e `offset`.
- Empresas destaque primeiro.
- Depois ordem alfabética.

### Eventos

RPC:

```sql
get_event_list('ipueiras', null)
```

Regras:

- Eventos publicados.
- Eventos destaque primeiro.
- Depois data mais próxima.
- Evento passado deixa de aparecer automaticamente após o fim, com tolerância de 6 horas.
- Se `ends_at` estiver vazio, a expiração usa `starts_at`.

### Promoções

RPC:

```sql
get_promotion_list('ipueiras', null)
```

Regras:

- Promoções publicadas.
- Promoções de empresas destaque aparecem primeiro.
- Se `valid_until` passar, deixa de aparecer automaticamente.
- Se `valid_until` estiver vazio, permanece até ser arquivada ou excluída.

### Farmácia De Plantão

RPC:

```sql
get_pharmacy_duty_list('ipueiras')
```

Regras:

- Mostra plantões publicados.
- Farmácia aberta agora aparece primeiro.
- Plantão vencido deixa de aparecer depois do fim, com tolerância de 6 horas.

### Achados E Perdidos

RPC:

```sql
get_lost_found_list('ipueiras', null)
```

Regras:

- Não expira automaticamente.
- Sai do app quando for arquivado ou excluído.

### Classificados

RPC:

```sql
get_classified_list('ipueiras')
```

Regras:

- Se `valid_until` passar, deixa de aparecer automaticamente.
- Se `valid_until` estiver vazio, permanece até ser arquivado ou excluído.

## Conteúdos Que Expiram Automaticamente

Saem do app automaticamente:

- Eventos após o fim, com tolerância de 6 horas.
- Promoções após `valid_until`, quando preenchido.
- Plantões de farmácia após o fim, com tolerância de 6 horas.
- Classificados após `valid_until`, quando preenchido.
- Banners após `ends_at`.
- Destaques pagos após `ends_at`.

Não expiram automaticamente:

- Empresas comuns.
- Notícias.
- Avisos.
- Novidades.
- Vagas.
- Achados e perdidos.
- Notificações internas.

## Solicitações

A aba `Solicitações` é uma triagem.

Ela recebe envios de dois sistemas auxiliares:

- Portal público de envios.
- Painel da Prefeitura.

Nada enviado por esses canais aparece automaticamente no app. O administrador revisa, entra em contato se necessário e cadastra manualmente no dashboard oficial.

## Painel Da Prefeitura

A Prefeitura não acessa o dashboard oficial.

Usuários da Prefeitura são liberados em:

```txt
city_hall_profiles
```

Exemplo:

```sql
insert into public.city_hall_profiles (id, city_id, display_name, department, is_active)
select
  'AUTH_UID_DA_PREFEITURA',
  id,
  'Prefeitura de Ipueiras',
  'Comunicação',
  true
from public.cities
where slug = 'ipueiras'
on conflict (id) do update set
  city_id = excluded.city_id,
  display_name = excluded.display_name,
  department = excluded.department,
  is_active = true;
```

Se esse SQL falhar por RLS, rode usando o usuário admin/owner correto ou uma role com permissão suficiente no Supabase.

## Storage

Buckets usados:

- `public-media`: imagens oficiais do app.
- `submission-media`: imagens enviadas pelo portal público e painel da Prefeitura.

As imagens enviadas pelo dashboard são comprimidas antes do upload para economizar Storage e banda do Supabase.

## Notificações

### Notificações Internas

São mensagens exibidas dentro do app, normalmente no sino da Home.

Uso recomendado:

- Manutenção.
- Atualização do app.
- Recados internos do Ipueiras+.

### Push Notifications

São notificações enviadas ao dispositivo do usuário.

Uso recomendado:

- Avisos urgentes da Prefeitura.
- Campanhas pagas de empresas, eventos ou promoções.

Push deve ser usado com cuidado para não incomodar usuários.

## Versão Do App

A aba `Versão app` permite configurar:

- Última versão disponível.
- Versão mínima obrigatória.
- Mensagem de atualização.
- Link Android.
- Link iOS.
- Atualização opcional ou obrigatória.

Isso permite avisar usuários sobre novas versões sem publicar uma mudança no backend.

## Segurança

- O app usa acesso público apenas para views/RPCs de leitura.
- Operações de escrita são protegidas por RLS.
- O dashboard exige login Supabase Auth.
- O admin precisa existir em `admin_profiles`.
- Painel da Prefeitura usa `city_hall_profiles`.
- Buckets públicos servem imagens, mas upload/edição devem ser controlados por policy.

## Observações De Produção

- Recomenda-se usar um Supabase separado por cidade.
- Para ambiente de teste, crie outro projeto Supabase e outro dashboard apontando para ele.
- Não misture dados de teste com produção.
- Antes de publicar mudanças, rode `npm run build`.
- Antes de subir para a Vercel, configure as variáveis de ambiente no painel da Vercel.
- Arquivar oculta do app sem apagar o histórico.
- Excluir remove definitivamente o registro.
