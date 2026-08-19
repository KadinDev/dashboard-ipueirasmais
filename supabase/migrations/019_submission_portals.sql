-- Public submission portal + City Hall submission panel.
--
-- These tables are inboxes only. They do not publish content to the app.
-- The official admin reviews the request and then creates the final content
-- in the existing official tables.

create table if not exists public.submission_requests (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  content_type text not null check (
    content_type in (
      'company',
      'event',
      'job',
      'promotion',
      'classified',
      'lost_found'
    )
  ),
  requester_name text not null,
  requester_whatsapp text not null,
  requester_email text,
  title text not null,
  description text,
  payload jsonb not null default '{}'::jsonb,
  image_urls text[] not null default '{}',
  status text not null default 'pending' check (
    status in ('pending', 'reviewing', 'contacted', 'approved', 'rejected', 'archived')
  ),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.city_hall_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  city_id uuid not null references public.cities(id) on delete restrict,
  display_name text not null,
  department text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.city_hall_submissions (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  content_type text not null check (content_type in ('alert', 'news')),
  title text not null,
  summary text,
  body text,
  payload jsonb not null default '{}'::jsonb,
  image_urls text[] not null default '{}',
  status text not null default 'pending' check (
    status in ('pending', 'reviewing', 'approved', 'rejected', 'archived')
  ),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists submission_requests_city_status_created_idx
  on public.submission_requests (city_id, status, created_at desc);
create index if not exists submission_requests_type_idx
  on public.submission_requests (content_type, created_at desc);
create index if not exists city_hall_profiles_city_idx
  on public.city_hall_profiles (city_id, is_active);
create index if not exists city_hall_submissions_city_status_created_idx
  on public.city_hall_submissions (city_id, status, created_at desc);
create index if not exists city_hall_submissions_created_by_idx
  on public.city_hall_submissions (created_by, created_at desc);

drop trigger if exists submission_requests_set_updated_at on public.submission_requests;
create trigger submission_requests_set_updated_at
before update on public.submission_requests
for each row execute function public.set_updated_at();

drop trigger if exists city_hall_profiles_set_updated_at on public.city_hall_profiles;
create trigger city_hall_profiles_set_updated_at
before update on public.city_hall_profiles
for each row execute function public.set_updated_at();

drop trigger if exists city_hall_submissions_set_updated_at on public.city_hall_submissions;
create trigger city_hall_submissions_set_updated_at
before update on public.city_hall_submissions
for each row execute function public.set_updated_at();

alter table public.submission_requests enable row level security;
alter table public.city_hall_profiles enable row level security;
alter table public.city_hall_submissions enable row level security;

drop policy if exists "Public can create submission requests" on public.submission_requests;
create policy "Public can create submission requests"
on public.submission_requests for insert
to anon, authenticated
with check (
  status = 'pending'
  and char_length(requester_name) between 2 and 120
  and char_length(requester_whatsapp) between 8 and 30
  and char_length(title) between 2 and 160
  and coalesce(array_length(image_urls, 1), 0) <= 4
);

drop policy if exists "Admins can manage submission requests" on public.submission_requests;
create policy "Admins can manage submission requests"
on public.submission_requests for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "City hall users can read own profile" on public.city_hall_profiles;
create policy "City hall users can read own profile"
on public.city_hall_profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "Admins can manage city hall profiles" on public.city_hall_profiles;
create policy "Admins can manage city hall profiles"
on public.city_hall_profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "City hall can create submissions" on public.city_hall_submissions;
create policy "City hall can create submissions"
on public.city_hall_submissions for insert
to authenticated
with check (
  status = 'pending'
  and created_by = auth.uid()
  and exists (
    select 1
    from public.city_hall_profiles profile
    where profile.id = auth.uid()
      and profile.city_id = city_hall_submissions.city_id
      and profile.is_active = true
  )
);

drop policy if exists "City hall can read own submissions" on public.city_hall_submissions;
create policy "City hall can read own submissions"
on public.city_hall_submissions for select
to authenticated
using (
  public.is_admin()
  or (
    created_by = auth.uid()
    and exists (
      select 1
      from public.city_hall_profiles profile
      where profile.id = auth.uid()
        and profile.city_id = city_hall_submissions.city_id
        and profile.is_active = true
    )
  )
);

drop policy if exists "City hall can edit pending own submissions" on public.city_hall_submissions;
create policy "City hall can edit pending own submissions"
on public.city_hall_submissions for update
to authenticated
using (
  status = 'pending'
  and created_by = auth.uid()
)
with check (
  status = 'pending'
  and created_by = auth.uid()
);

drop policy if exists "Admins can manage city hall submissions" on public.city_hall_submissions;
create policy "Admins can manage city hall submissions"
on public.city_hall_submissions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submission-media',
  'submission-media',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can upload submission media" on storage.objects;
drop policy if exists "Authenticated can upload submission media" on storage.objects;
drop policy if exists "Admins can delete submission media" on storage.objects;

create policy "Public can upload submission media"
on storage.objects for insert
to anon
with check (
  bucket_id = 'submission-media'
  and lower(name) ~ '\.(webp|jpeg|jpg|png)$'
);

create policy "Authenticated can upload submission media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'submission-media'
  and lower(name) ~ '\.(webp|jpeg|jpg|png)$'
);

create policy "Admins can delete submission media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'submission-media'
  and public.is_admin()
);
