-- Security Advisor cleanup for launch readiness.
--
-- 1) Move unaccent out of public.
-- 2) Keep public-media downloadable by public URL, but prevent listing objects.
-- 3) Make read-only public RPCs run as SECURITY INVOKER.
--
-- SECURITY DEFINER remains intentional for:
-- - public.is_admin(): checks admin profile under RLS.
-- - public.track_click(): lets anon record sanitized metrics without table insert access.
-- - public.upsert_push_token(): lets the app register Expo push tokens safely.

create schema if not exists extensions;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'unaccent') then
    alter extension unaccent set schema extensions;
  end if;
end $$;

drop policy if exists "Public can read public media" on storage.objects;

do $$
declare
  function_signature text;
  function_signatures text[] := array[
    'public.get_home_payload(text)',
    'public.get_company_list(text,text)',
    'public.get_event_list(text,text)',
    'public.get_random_featured_company_for_news(uuid)',
    'public.get_promotion_list(text,text)',
    'public.get_job_list(text,text)',
    'public.get_alert_list(text,text)',
    'public.get_city_update_list(text,text)',
    'public.get_pharmacy_duty_list(text)',
    'public.get_happening_now_summary(text)',
    'public.get_useful_services(text)',
    'public.get_app_version_config(text,text)'
  ];
begin
  foreach function_signature in array function_signatures loop
    if to_regprocedure(function_signature) is not null then
      execute format('alter function %s security invoker', function_signature);
    end if;
  end loop;
end $$;
