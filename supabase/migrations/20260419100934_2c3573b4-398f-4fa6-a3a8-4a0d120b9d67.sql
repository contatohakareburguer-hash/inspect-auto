-- 1) Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'inspecao-fotos';

-- 2) Drop overly-permissive policies on storage.objects for this bucket
DROP POLICY IF EXISTS "Public read inspecao-fotos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view inspecao-fotos" ON storage.objects;

-- 3) Owner-scoped policies (folder name == auth.uid())
DROP POLICY IF EXISTS "Users read own inspecao-fotos" ON storage.objects;
CREATE POLICY "Users read own inspecao-fotos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspecao-fotos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users insert own inspecao-fotos" ON storage.objects;
CREATE POLICY "Users insert own inspecao-fotos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inspecao-fotos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users update own inspecao-fotos" ON storage.objects;
CREATE POLICY "Users update own inspecao-fotos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'inspecao-fotos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users delete own inspecao-fotos" ON storage.objects;
CREATE POLICY "Users delete own inspecao-fotos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'inspecao-fotos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4) Add UPDATE policy to public.fotos (used by IA flow to mark analisada_em)
DROP POLICY IF EXISTS "Users update own fotos" ON public.fotos;
CREATE POLICY "Users update own fotos"
ON public.fotos FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
