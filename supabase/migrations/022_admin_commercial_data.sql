-- Etapa aditiva: instalar ANTES de publicar o ajuste do dashboard.
-- Dados comerciais continuam nas tabelas existentes; sem copias ou perdas.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.admin_list_commercial_data(p_resource text)
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Acesso exclusivo de administrador ativo' USING ERRCODE = '42501';
  END IF;

  -- Consultas estaticas: parametro nunca vira SQL executavel.
  CASE p_resource
    WHEN 'companies' THEN
      RETURN QUERY SELECT to_jsonb(t) FROM public.companies t ORDER BY t.manual_priority, t.name, t.id;
    WHEN 'events' THEN
      RETURN QUERY SELECT to_jsonb(t) FROM public.events t ORDER BY t.starts_at, t.id;
    WHEN 'banners' THEN
      RETURN QUERY SELECT to_jsonb(t) FROM public.banners t ORDER BY t.manual_priority, t.id;
    WHEN 'placements' THEN
      RETURN QUERY SELECT to_jsonb(t) FROM public.placements t ORDER BY t.created_at DESC, t.id;
    ELSE
      RAISE EXCEPTION 'Recurso administrativo invalido' USING ERRCODE = '22023';
  END CASE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_commercial_data(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_commercial_data(text) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
