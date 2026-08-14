-- Guia da Cidade - core Supabase schema
-- Public mobile app, private admin dashboard.

create extension if not exists pgcrypto;
create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;

create type public.content_status as enum ('draft', 'published', 'paused', 'archived');
create type public.category_kind as enum ('company', 'event', 'news');
create type public.entity_kind as enum ('company', 'event', 'news', 'banner');
create type public.placement_kind as enum (
  'basic',
  'featured',
  'super_featured',
  'home_banner',
  'event_featured'
);
create type public.contact_kind as enum (
  'whatsapp',
  'phone',
  'instagram',
  'website',
  'maps',
  'email'
);
create type public.click_kind as enum (
  'view',
  'whatsapp',
  'phone',
  'instagram',
  'maps',
  'share',
  'ticket',
  'website'
);
create type public.payment_status as enum ('pending', 'paid', 'overdue', 'cancelled', 'refunded');

create table public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state_code char(2) not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  city_id uuid references public.cities(id) on delete cascade,
  kind public.category_kind not null,
  name text not null,
  slug text not null,
  icon_name text,
  color_hex text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, kind, slug)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'public-media',
  storage_path text not null,
  public_url text,
  alt_text text,
  width integer,
  height integer,
  size_bytes integer,
  blurhash text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (bucket, storage_path)
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null,
  subtitle text,
  short_description text,
  description text,
  logo_media_id uuid references public.media_assets(id) on delete set null,
  cover_media_id uuid references public.media_assets(id) on delete set null,
  rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  address_line text,
  neighborhood text,
  postal_code text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  status public.content_status not null default 'draft',
  manual_priority integer not null default 100,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, slug)
);

create table public.company_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kind public.contact_kind not null,
  label text,
  value text not null,
  is_primary boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table public.company_hours (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  note text,
  unique (company_id, day_of_week)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  slug text not null,
  short_description text,
  description text,
  cover_media_id uuid references public.media_assets(id) on delete set null,
  venue_name text,
  address_line text,
  neighborhood text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_free boolean not null default true,
  price_label text,
  ticket_url text,
  whatsapp text,
  age_rating text,
  status public.content_status not null default 'draft',
  manual_priority integer not null default 100,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, slug)
);

create table public.news (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  slug text not null,
  excerpt text,
  body text,
  cover_media_id uuid references public.media_assets(id) on delete set null,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, slug)
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_entity public.entity_kind not null,
  placement_type public.placement_kind not null,
  price_cents integer not null default 0 check (price_cents >= 0),
  duration_days integer check (duration_days is null or duration_days > 0),
  benefits jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.placements (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  entity_type public.entity_kind not null,
  entity_id uuid not null,
  plan_id uuid references public.plans(id) on delete set null,
  placement_type public.placement_kind not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  priority integer not null default 100,
  paid_amount_cents integer not null default 0 check (paid_amount_cents >= 0),
  payment_status public.payment_status not null default 'pending',
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (entity_type in ('company', 'event', 'banner')),
  check (ends_at is null or ends_at > starts_at)
);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  title text not null,
  subtitle text,
  image_media_id uuid references public.media_assets(id) on delete set null,
  action_label text,
  action_url text,
  target_entity public.entity_kind,
  target_entity_id uuid,
  status public.content_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  manual_priority integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active_background_image boolean not null default true,
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.click_events (
  id bigint generated always as identity primary key,
  city_id uuid references public.cities(id) on delete set null,
  entity_type public.entity_kind not null,
  entity_id uuid not null,
  click_type public.click_kind not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger admin_profiles_set_updated_at
before update on public.admin_profiles
for each row execute function public.set_updated_at();

create trigger cities_set_updated_at
before update on public.cities
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger news_set_updated_at
before update on public.news
for each row execute function public.set_updated_at();

create trigger plans_set_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

create trigger placements_set_updated_at
before update on public.placements
for each row execute function public.set_updated_at();

create trigger banners_set_updated_at
before update on public.banners
for each row execute function public.set_updated_at();

create index cities_active_slug_idx on public.cities (is_active, slug);
create index categories_lookup_idx on public.categories (city_id, kind, is_active, sort_order);
create index companies_public_idx on public.companies (city_id, status, manual_priority, name);
create index companies_category_idx on public.companies (category_id) where status = 'published';
create index companies_search_idx on public.companies using gin (
  to_tsvector('portuguese', coalesce(name, '') || ' ' || coalesce(subtitle, '') || ' ' || coalesce(short_description, ''))
);
create index company_contacts_company_idx on public.company_contacts (company_id, kind, sort_order);
create index events_public_idx on public.events (city_id, status, starts_at, manual_priority);
create index events_category_idx on public.events (category_id) where status = 'published';
create index events_search_idx on public.events using gin (
  to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(venue_name, ''))
);
create index news_public_idx on public.news (city_id, status, published_at desc);
create index placements_active_idx on public.placements (
  city_id,
  entity_type,
  entity_id,
  placement_type,
  is_active,
  starts_at,
  ends_at,
  priority
);
create index banners_public_idx on public.banners (city_id, status, starts_at, ends_at, manual_priority);
create index click_events_rollup_idx on public.click_events (occurred_at, entity_type, entity_id, click_type);
