-- Fix Supabase Security Advisor warning: Function Search Path Mutable.
-- The trigger function does not depend on tables, but keeping search_path fixed
-- avoids unsafe resolution through user-controlled schemas.

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
