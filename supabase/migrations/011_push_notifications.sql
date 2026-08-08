-- Push notifications foundation for Expo Push Service.
-- App users do not log in, so the app registers an installation token through
-- the public upsert_push_token RPC. Admins manage campaigns from the dashboard.

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete cascade,
  installation_id text not null,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android', 'web', 'unknown')),
  device_name text,
  app_version text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, installation_id)
);

create index if not exists push_tokens_city_enabled_idx
on public.push_tokens (city_id, enabled, last_seen_at desc);

create index if not exists push_tokens_expo_token_idx
on public.push_tokens (expo_push_token);

drop trigger if exists push_tokens_set_updated_at on public.push_tokens;
create trigger push_tokens_set_updated_at
before update on public.push_tokens
for each row execute function public.set_updated_at();

create table if not exists public.push_campaigns (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete cascade,
  notification_id uuid references public.notifications(id) on delete set null,
  title text not null,
  body text not null,
  entity_type public.entity_kind,
  entity_id uuid,
  audience text not null default 'all'
    check (audience in ('all', 'alerts', 'commercial')),
  send_status text not null default 'draft'
    check (send_status in ('draft', 'pending', 'sending', 'sent', 'failed', 'cancelled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  target_count integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  paid_amount_cents integer not null default 0,
  payment_status public.payment_status not null default 'paid',
  billing_notes text,
  provider_response jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_campaigns_city_status_idx
on public.push_campaigns (city_id, send_status, scheduled_at nulls first, created_at desc);

drop trigger if exists push_campaigns_set_updated_at on public.push_campaigns;
create trigger push_campaigns_set_updated_at
before update on public.push_campaigns
for each row execute function public.set_updated_at();

create table if not exists public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.push_campaigns(id) on delete cascade,
  push_token_id uuid references public.push_tokens(id) on delete set null,
  expo_push_token text not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'receipt_ok', 'receipt_failed')),
  ticket_id text,
  error_message text,
  receipt jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_deliveries_campaign_idx
on public.push_deliveries (campaign_id, status);

drop trigger if exists push_deliveries_set_updated_at on public.push_deliveries;
create trigger push_deliveries_set_updated_at
before update on public.push_deliveries
for each row execute function public.set_updated_at();

alter table public.push_tokens enable row level security;
alter table public.push_campaigns enable row level security;
alter table public.push_deliveries enable row level security;

drop policy if exists "Admins can manage push tokens" on public.push_tokens;
drop policy if exists "Admins can manage push campaigns" on public.push_campaigns;
drop policy if exists "Admins can manage push deliveries" on public.push_deliveries;

create policy "Admins can manage push tokens"
on public.push_tokens for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage push campaigns"
on public.push_campaigns for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage push deliveries"
on public.push_deliveries for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.upsert_push_token(
  p_city_slug text,
  p_installation_id text,
  p_expo_push_token text,
  p_platform text default 'unknown',
  p_device_name text default null,
  p_app_version text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_city_id uuid;
  v_token_id uuid;
begin
  select id into v_city_id
  from public.cities
  where slug = p_city_slug
  limit 1;

  if v_city_id is null then
    raise exception 'City not found for slug %', p_city_slug;
  end if;

  insert into public.push_tokens (
    city_id,
    installation_id,
    expo_push_token,
    platform,
    device_name,
    app_version,
    enabled,
    last_seen_at
  )
  values (
    v_city_id,
    p_installation_id,
    p_expo_push_token,
    coalesce(nullif(p_platform, ''), 'unknown'),
    p_device_name,
    p_app_version,
    true,
    now()
  )
  on conflict (city_id, installation_id)
  do update set
    expo_push_token = excluded.expo_push_token,
    platform = excluded.platform,
    device_name = excluded.device_name,
    app_version = excluded.app_version,
    enabled = true,
    last_seen_at = now()
  returning id into v_token_id;

  return v_token_id;
end;
$$;

grant execute on function public.upsert_push_token(text, text, text, text, text, text)
to anon, authenticated;
