-- Aplicar apenas no projeto Ipueiras+ conferido. Nao exclui dados ou buckets.
-- Desativa envios dos dois portais experimentais; dashboard continua autorizado.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DROP POLICY IF EXISTS "Public can create submission requests" ON public.submission_requests;
REVOKE INSERT ON public.submission_requests FROM anon;
-- authenticated preserva INSERT, mas somente is_admin() passa pela policy restante.
DROP POLICY IF EXISTS "City hall can create submissions" ON public.city_hall_submissions;
DROP POLICY IF EXISTS "City hall can edit pending own submissions" ON public.city_hall_submissions;
DROP POLICY IF EXISTS "Public can upload submission media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload submission media" ON storage.objects;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE (schemaname = 'public' AND tablename IN ('submission_requests', 'city_hall_submissions')
      AND cmd IN ('INSERT', 'UPDATE', 'ALL') AND coalesce(with_check, '') <> 'is_admin()')
      OR (schemaname = 'storage' AND tablename = 'objects'
        AND policyname IN ('Public can upload submission media', 'Authenticated can upload submission media'))
  ) THEN
    RAISE EXCEPTION 'Politica inesperada: revisar antes de desativar os portais.';
  END IF;
END $$;
COMMIT;
