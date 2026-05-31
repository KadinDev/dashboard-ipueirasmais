# Ipueiras+ Admin & Supabase Backend

Projeto base do **Ipueiras+**, um app local para divulgação de empresas, eventos, notícias e banners da cidade.

Este repositório contém:

- Backend modelado para Supabase.
- Dashboard administrativo web em React + TypeScript.
- Regras de monetização para empresas, eventos, destaques e banners.
- SQLs de criação, ajustes e testes do banco.

## Stack

- React
- TypeScript
- Vite
- styled-components
- Supabase
- PostgreSQL

## Estrutura

````txt
src/
  App.tsx
  lib/
  styles/

supabase/
  migrations/
  tests/
  seed_all_categories.sql



## Dashboard Admin

O dashboard permite administrar:

- Empresas
- Eventos
- Notícias
- Destaques pagos
- Banners super destaque
- Notificações internas
- Métricas de cliques

O dashboard usa login via Supabase Auth. Apenas usuários cadastrados na tabela `admin_profiles` conseguem administrar.

## Regras Comerciais

### Empresa comum

Valor padrão:

```txt
R$ 30 por mês
````

Cadastrada em:

```txt
Empresas
```

Campos de controle:

- Valor mensal
- Status de pagamento
- Pago até
- Observações de cobrança

### Empresa destaque

Valor sugerido:

```txt
R$ 50 por mês
```

Cadastrada em:

```txt
Destaques
```

Aparece antes das empresas comuns e tem mais visibilidade no app.

### Evento comum

Valor padrão:

```txt
R$ 30 por evento
```

Cadastrado em:

```txt
Eventos
```

Campos de controle:

- Valor do cadastro
- Status de pagamento
- Observações de cobrança

### Evento destaque

Valor sugerido:

```txt
R$ 50 por evento
```

Cadastrado em:

```txt
Destaques
```

Aparece antes dos eventos comuns e tem selo/posição de destaque.

### Banner super destaque

Valor padrão:

```txt
R$ 80
```

Cadastrado em:

```txt
Banners
```

Usado para anúncios especiais na Home, como eventos grandes, promoções ou empresas que pagaram por mais visibilidade.

## Organização no App

### Home

A Home será alimentada por:

```sql
get_home_payload('ipueiras')
```

Ela retorna:

- `super_banners`: banners ativos da Home.
- `home_companies`: até 10 empresas, com destaques primeiro.
- `home_events`: até 10 eventos, com destaques primeiro.
- `latest_news`: últimas 5 notícias.
- `notifications`: notificações internas.

### Tela Empresas

Usa:

```sql
get_company_list('ipueiras', null)
```

Ordenação:

1. Empresas destaque.
2. Empresas comuns.
3. Ordem alfabética dentro de cada grupo.

### Tela Eventos

Usa:

```sql
get_event_list('ipueiras', null)
```

Ordenação:

1. Eventos destaque.
2. Eventos comuns.
3. Data mais próxima dentro de cada grupo.

## Configuração do Dashboard

Crie um arquivo `.env` na raiz do projeto:

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

Build:

```bash
npm run build
```

## Configuração do Supabase

Em um projeto Supabase novo, rode os SQLs na ordem:

```txt
supabase/migrations/001_core_schema.sql
supabase/migrations/002_security_rls.sql
supabase/migrations/003_public_views.sql
supabase/migrations/004_storage.sql
supabase/migrations/005_public_rpc.sql
supabase/migrations/006_mobile_app_adjustments.sql
supabase/migrations/007_mvp_simplified_monetization.sql
supabase/migrations/008_final_commercial_rules.sql
supabase/seed_all_categories.sql
```

Depois rode os testes opcionais:

```txt
supabase/tests/final_flow_checks.sql
```

## Criar Primeiro Admin

1. Crie um usuário em Supabase Auth.
2. Copie o UID do usuário.
3. Rode:

```sql
insert into public.admin_profiles (id, display_name, role, is_active)
values ('COLE_AQUI_O_AUTH_UID', 'Ipueiras+', 'owner', true)
on conflict (id) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  is_active = true,
  updated_at = now();
```

## Storage

O projeto usa o bucket:

```txt
public-media
```

Ele armazena imagens de:

- empresas;
- eventos;
- notícias;
- banners.

Leitura pública é permitida. Upload, edição e exclusão são restritos ao admin.

## Notificações Internas

As notificações internas aparecem no sino dentro do app.

Elas não são push notifications do celular.

Podem apontar para:

- notícia;
- evento;
- aviso sem destino.

## Observações

- Arquivar não apaga o registro, apenas oculta do app.
- O projeto está preparado para um Supabase por cidade.
- Para outra cidade, recomenda-se criar outro projeto Supabase e rodar os mesmos SQLs.
- O app Expo será desenvolvido consumindo as views e RPCs públicas já preparadas.
