-- Tabela para armazenar danos detectados pela IA
CREATE TABLE public.danos_detectados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  inspecao_id UUID NOT NULL REFERENCES public.inspecoes(id) ON DELETE CASCADE,
  foto_id UUID REFERENCES public.fotos(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.itens_checklist(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  severidade TEXT NOT NULL,
  localizacao TEXT,
  descricao TEXT,
  confianca NUMERIC,
  bounding_box JSONB,
  angulo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_danos_inspecao ON public.danos_detectados(inspecao_id);
CREATE INDEX idx_danos_foto ON public.danos_detectados(foto_id);
CREATE INDEX idx_danos_user ON public.danos_detectados(user_id);

ALTER TABLE public.danos_detectados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own danos"
  ON public.danos_detectados FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own danos"
  ON public.danos_detectados FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own danos"
  ON public.danos_detectados FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own danos"
  ON public.danos_detectados FOR DELETE
  USING (auth.uid() = user_id);

-- Adiciona coluna 'angulo' em fotos para suportar captura guiada (opcional, não quebra nada existente)
ALTER TABLE public.fotos ADD COLUMN IF NOT EXISTS angulo TEXT;
ALTER TABLE public.fotos ADD COLUMN IF NOT EXISTS analisada_em TIMESTAMPTZ;