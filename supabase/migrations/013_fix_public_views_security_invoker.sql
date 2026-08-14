-- Fix existing public views flagged by Supabase as Security Definer View.
-- security_invoker=true makes the view run with the caller permissions/RLS.

alter view if exists public.public_company_cards set (security_invoker = true);
alter view if exists public.public_company_details set (security_invoker = true);
alter view if exists public.public_event_cards set (security_invoker = true);
alter view if exists public.public_event_details set (security_invoker = true);
alter view if exists public.public_home_banners set (security_invoker = true);
alter view if exists public.public_news_cards set (security_invoker = true);
alter view if exists public.public_notifications set (security_invoker = true);

alter view if exists public.public_promotion_cards set (security_invoker = true);
alter view if exists public.public_job_cards set (security_invoker = true);
alter view if exists public.public_alert_cards set (security_invoker = true);
alter view if exists public.public_alert_details set (security_invoker = true);
alter view if exists public.public_city_update_cards set (security_invoker = true);
alter view if exists public.public_pharmacy_duty set (security_invoker = true);
alter view if exists public.public_useful_services set (security_invoker = true);
