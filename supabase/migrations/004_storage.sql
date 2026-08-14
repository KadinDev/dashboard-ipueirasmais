-- Public media bucket for app images.
-- Files are publicly readable by direct public URL, but only admins can
-- upload/update/delete. We intentionally do not grant public SELECT on
-- storage.objects to avoid bucket listing through the Storage API.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-media',
  'public-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can upload public media" on storage.objects;
drop policy if exists "Admins can update public media" on storage.objects;
drop policy if exists "Admins can delete public media" on storage.objects;

create policy "Admins can upload public media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'public-media'
  and public.is_admin()
);

create policy "Admins can update public media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'public-media'
  and public.is_admin()
)
with check (
  bucket_id = 'public-media'
  and public.is_admin()
);

create policy "Admins can delete public media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'public-media'
  and public.is_admin()
);
