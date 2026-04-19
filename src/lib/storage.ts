import { supabase } from "@/integrations/supabase/client";

const BUCKET = "inspecao-fotos";
// Signed URL lifetime (seconds). 1h is enough for a session of viewing/uploading.
const EXPIRES_IN = 60 * 60;

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
