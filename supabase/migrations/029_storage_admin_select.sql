-- Upload com upsert exige SELECT (além de INSERT/UPDATE) em storage.objects.
-- A policy storage_public_read permitia listagem por qualquer cliente (alerta do Supabase).
-- Substituímos por SELECT restrito a admins autenticados no bucket public-assets.

DROP POLICY IF EXISTS "storage_public_read" ON storage.objects;

CREATE POLICY "storage_public_assets_admin_select" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'public-assets' AND public."ehAdmin"());

-- Garante escopo correto nas demais operações de admin no bucket público
DROP POLICY IF EXISTS "storage_admin_update" ON storage.objects;
CREATE POLICY "storage_admin_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id IN ('public-assets', 'private-docs') AND public."ehAdmin"())
  WITH CHECK (bucket_id IN ('public-assets', 'private-docs') AND public."ehAdmin"());

DROP POLICY IF EXISTS "storage_admin_delete" ON storage.objects;
CREATE POLICY "storage_admin_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id IN ('public-assets', 'private-docs') AND public."ehAdmin"());

DROP POLICY IF EXISTS "storage_admin_insert" ON storage.objects;
CREATE POLICY "storage_admin_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('public-assets', 'private-docs') AND public."ehAdmin"());
