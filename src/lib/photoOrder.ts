import { supabase } from "@/integrations/supabase/client";

/**
 * Persiste a nova ordem de uma lista de fotos em batch.
 * Cada foto recebe `ordem = índice` na lista informada.
 * Falhas individuais não bloqueiam as demais — retorna o número de sucessos.
 */
export async function persistPhotoOrder(photoIds: string[]): Promise<number> {
  if (photoIds.length === 0) return 0;
  const updates = photoIds.map((id, idx) =>
    supabase.from("fotos").update({ ordem: idx }).eq("id", id),
  );
  const results = await Promise.all(updates);
  return results.filter((r) => !r.error).length;
}
