ALTER TABLE public.fotos
ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_fotos_item_ordem
ON public.fotos (item_id, ordem, created_at);

CREATE INDEX IF NOT EXISTS idx_fotos_inspecao_ordem
ON public.fotos (inspecao_id, ordem, created_at);

-- Backfill: ordena fotos existentes por created_at dentro de cada item
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY inspecao_id, COALESCE(item_id::text, '_sem_item')
           ORDER BY created_at
         ) - 1 AS new_ordem
  FROM public.fotos
)
UPDATE public.fotos f
SET ordem = r.new_ordem
FROM ranked r
WHERE f.id = r.id AND f.ordem = 0;