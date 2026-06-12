INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets', 'public-assets', true, 5242880,
  ARRAY['image/jpeg','image/png','image/webp']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('private-docs', 'private-docs', false, 20971520)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "storage_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'public-assets');

CREATE POLICY "storage_admin_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id IN ('public-assets','private-docs') AND public."ehAdmin"());
CREATE POLICY "storage_admin_update" ON storage.objects FOR UPDATE
  USING (public."ehAdmin"()) WITH CHECK (public."ehAdmin"());
CREATE POLICY "storage_admin_delete" ON storage.objects FOR DELETE
  USING (public."ehAdmin"());

CREATE POLICY "storage_private_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'private-docs' AND public."ehAdmin"());
