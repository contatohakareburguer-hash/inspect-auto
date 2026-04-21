ALTER TABLE public.fotos ADD COLUMN IF NOT EXISTS legenda TEXT;
ALTER TABLE public.inspecoes ADD COLUMN IF NOT EXISTS assinatura_vistoriador TEXT;
ALTER TABLE public.inspecoes ADD COLUMN IF NOT EXISTS assinatura_cliente TEXT;
ALTER TABLE public.inspecoes ADD COLUMN IF NOT EXISTS nome_cliente TEXT;