
-- Função utilitária de timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  email TEXT,
  tipo_login TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar perfil quando user se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email, tipo_login)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ INSPECOES ============
CREATE TABLE public.inspecoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_veiculo TEXT NOT NULL DEFAULT '',
  placa TEXT NOT NULL DEFAULT '',
  km INTEGER,
  ano INTEGER,
  marca TEXT,
  modelo TEXT,
  cor TEXT,
  preco_pedido NUMERIC,
  vendedor TEXT,
  observacoes_gerais TEXT,
  score_total INTEGER NOT NULL DEFAULT 0,
  classificacao_final TEXT,
  conclusao TEXT,
  status TEXT NOT NULL DEFAULT 'em_andamento',
  finalizada_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inspecoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own inspecoes" ON public.inspecoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own inspecoes" ON public.inspecoes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own inspecoes" ON public.inspecoes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own inspecoes" ON public.inspecoes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_inspecoes_user_created ON public.inspecoes(user_id, created_at DESC);
CREATE INDEX idx_inspecoes_placa ON public.inspecoes(placa);

CREATE TRIGGER trg_inspecoes_updated_at BEFORE UPDATE ON public.inspecoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ITENS_CHECKLIST ============
CREATE TABLE public.itens_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspecao_id UUID NOT NULL REFERENCES public.inspecoes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  item_key TEXT NOT NULL,
  item_nome TEXT NOT NULL,
  status TEXT,
  observacao_usuario TEXT,
  sugestao_sistema TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(inspecao_id, item_key)
);

ALTER TABLE public.itens_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own itens" ON public.itens_checklist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own itens" ON public.itens_checklist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own itens" ON public.itens_checklist FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own itens" ON public.itens_checklist FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_itens_inspecao ON public.itens_checklist(inspecao_id, ordem);

CREATE TRIGGER trg_itens_updated_at BEFORE UPDATE ON public.itens_checklist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ FOTOS ============
CREATE TABLE public.fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspecao_id UUID NOT NULL REFERENCES public.inspecoes(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.itens_checklist(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own fotos" ON public.fotos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own fotos" ON public.fotos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own fotos" ON public.fotos FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_fotos_item ON public.fotos(item_id);
CREATE INDEX idx_fotos_inspecao ON public.fotos(inspecao_id);

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public) VALUES ('inspecao-fotos', 'inspecao-fotos', true);

CREATE POLICY "Public read inspecao-fotos" ON storage.objects FOR SELECT USING (bucket_id = 'inspecao-fotos');
CREATE POLICY "Users upload own inspecao-fotos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'inspecao-fotos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own inspecao-fotos" ON storage.objects FOR DELETE
  USING (bucket_id = 'inspecao-fotos' AND auth.uid()::text = (storage.foldername(name))[1]);
