CREATE TABLE public.laudos_risco (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inspecao_id uuid REFERENCES public.inspecoes(id) ON DELETE CASCADE,
  origem text NOT NULL DEFAULT 'inspecao',
  marca text,
  modelo text,
  ano_veiculo text,
  cor text,
  condicoes_gerais text,
  frente_veiculo text,
  para_brisa text,
  traseira_veiculo text,
  danos_nao_visiveis text,
  quilometragem text,
  pneus text,
  painel text,
  risco_seguradora integer,
  conclusao text,
  fotos_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.laudos_risco TO authenticated;
GRANT ALL ON public.laudos_risco TO service_role;

ALTER TABLE public.laudos_risco ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios veem seus proprios laudos"
  ON public.laudos_risco FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios criam seus proprios laudos"
  ON public.laudos_risco FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios atualizam seus proprios laudos"
  ON public.laudos_risco FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios excluem seus proprios laudos"
  ON public.laudos_risco FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_laudos_risco_user ON public.laudos_risco (user_id, created_at DESC);
CREATE INDEX idx_laudos_risco_inspecao ON public.laudos_risco (inspecao_id);

CREATE TRIGGER update_laudos_risco_updated_at
  BEFORE UPDATE ON public.laudos_risco
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();