import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";

const BUCKET = "inspecao-fotos";
// URL lifetime: 2h. Renovação automática acontece 10min antes do vencimento.
const EXPIRES_IN = 60 * 60 * 2;
const RENEW_BEFORE_MS = 10 * 60 * 1000; // renovar 10min antes

export async function signedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, EXPIRES_IN);
  if (error || !data?.signedUrl) return "";
  return data.signedUrl;
}

export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, EXPIRES_IN);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}

/**
 * Hook que mantém URLs assinadas sempre válidas, renovando-as automaticamente
 * RENEW_BEFORE_MS antes do vencimento. Retorna um mapa path → URL atualizada.
 */
export function useSignedUrls(paths: string[]): Record<string, string> {
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathsKey = paths.join("|");

  useEffect(() => {
    if (paths.length === 0) { setUrlMap({}); return; }

    async function refresh() {
      const map = await signedUrls(paths);
      setUrlMap(map);
      // Agendar próxima renovação antes do vencimento
      const renewIn = EXPIRES_IN * 1000 - RENEW_BEFORE_MS;
      timerRef.current = setTimeout(refresh, renewIn);
    }

    refresh();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathsKey]);

  return urlMap;
}
