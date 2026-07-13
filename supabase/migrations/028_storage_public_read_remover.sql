-- Substituída por 029_storage_admin_select.sql (SELECT só para admin; corrige upload com upsert).

DROP POLICY IF EXISTS "storage_public_read" ON storage.objects;
