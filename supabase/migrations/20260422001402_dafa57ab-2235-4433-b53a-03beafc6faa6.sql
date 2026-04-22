ALTER TABLE public.inspecoes
ADD COLUMN IF NOT EXISTS tipo_veiculo TEXT NOT NULL DEFAULT 'carro';

ALTER TABLE public.inspecoes
DROP CONSTRAINT IF EXISTS inspecoes_tipo_veiculo_check;

ALTER TABLE public.inspecoes
ADD CONSTRAINT inspecoes_tipo_veiculo_check
CHECK (tipo_veiculo IN ('carro', 'moto', 'caminhao'));

CREATE INDEX IF NOT EXISTS idx_inspecoes_tipo_veiculo ON public.inspecoes(tipo_veiculo);