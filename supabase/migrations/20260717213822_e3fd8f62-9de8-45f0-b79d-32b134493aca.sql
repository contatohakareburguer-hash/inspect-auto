
-- profiles: add WITH CHECK to UPDATE and scope to authenticated
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- inspecoes
DROP POLICY IF EXISTS "Users view own inspecoes" ON public.inspecoes;
DROP POLICY IF EXISTS "Users insert own inspecoes" ON public.inspecoes;
DROP POLICY IF EXISTS "Users update own inspecoes" ON public.inspecoes;
DROP POLICY IF EXISTS "Users delete own inspecoes" ON public.inspecoes;
CREATE POLICY "Users view own inspecoes" ON public.inspecoes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own inspecoes" ON public.inspecoes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own inspecoes" ON public.inspecoes
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own inspecoes" ON public.inspecoes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- fotos
DROP POLICY IF EXISTS "Users view own fotos" ON public.fotos;
DROP POLICY IF EXISTS "Users insert own fotos" ON public.fotos;
DROP POLICY IF EXISTS "Users update own fotos" ON public.fotos;
DROP POLICY IF EXISTS "Users delete own fotos" ON public.fotos;
CREATE POLICY "Users view own fotos" ON public.fotos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own fotos" ON public.fotos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own fotos" ON public.fotos
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own fotos" ON public.fotos
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- itens_checklist
DROP POLICY IF EXISTS "Users view own itens" ON public.itens_checklist;
DROP POLICY IF EXISTS "Users insert own itens" ON public.itens_checklist;
DROP POLICY IF EXISTS "Users update own itens" ON public.itens_checklist;
DROP POLICY IF EXISTS "Users delete own itens" ON public.itens_checklist;
CREATE POLICY "Users view own itens" ON public.itens_checklist
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own itens" ON public.itens_checklist
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own itens" ON public.itens_checklist
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own itens" ON public.itens_checklist
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- danos_detectados
DROP POLICY IF EXISTS "Users view own danos" ON public.danos_detectados;
DROP POLICY IF EXISTS "Users insert own danos" ON public.danos_detectados;
DROP POLICY IF EXISTS "Users update own danos" ON public.danos_detectados;
DROP POLICY IF EXISTS "Users delete own danos" ON public.danos_detectados;
CREATE POLICY "Users view own danos" ON public.danos_detectados
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own danos" ON public.danos_detectados
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own danos" ON public.danos_detectados
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own danos" ON public.danos_detectados
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
