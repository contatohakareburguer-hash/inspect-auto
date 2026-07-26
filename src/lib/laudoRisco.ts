import { supabase } from "@/integrations/supabase/client";

/**
 * Laudo de análise de risco gerado por IA a partir das fotos do veículo.
 * Base conceitual: relatório de inspeção para seguradora (condições gerais,
 * pontos críticos, percentual de risco e conclusão).
 */
export type LaudoRisco = {
  marca: string;
  modelo: string;
  ano_veiculo: string;
  cor: string;
  condicoes_gerais: string;
  frente_veiculo: string;
  para_brisa: string;
  traseira_veiculo: string;
  danos_nao_visiveis: string;
  quilometragem: string;
  pneus: string;
  painel: string;
  risco_seguradora: number;
  conclusao: string;
};

export type LaudoRiscoRow = LaudoRisco & {
  id: string;
  inspecao_id: string | null;
  origem: string;
  created_at: string;
};

export const LAUDO_CAMPOS: Array<{ key: keyof LaudoRisco; label: string }> = [
  { key: "condicoes_gerais", label: "Condições gerais" },
  { key: "frente_veiculo", label: "Frente do veículo" },
  { key: "para_brisa", label: "Para-brisa" },
  { key: "traseira_veiculo", label: "Traseira do veículo" },
  { key: "pneus", label: "Pneus" },
  { key: "painel", label: "Painel" },
  { key: "quilometragem", label: "Quilometragem" },
  { key: "danos_nao_visiveis", label: "Danos não visíveis / indícios" },
];

export type NivelRisco = "baixo" | "moderado" | "alto" | "critico";

export function nivelRisco(valor: number): NivelRisco {
  if (valor <= 25) return "baixo";
  if (valor <= 50) return "moderado";
  if (valor <= 75) return "alto";
  return "critico";
}

export const NIVEL_RISCO_LABEL: Record<NivelRisco, string> = {
  baixo: "Risco baixo",
  moderado: "Risco moderado",
  alto: "Risco alto",
  critico: "Risco crítico",
};

async function invokeAnaliseRisco(body: Record<string, unknown>): Promise<LaudoRisco> {
  const { data: sessionRes } = await supabase.auth.getSession();
  const accessToken = sessionRes.session?.access_token ?? "";

  const { data, error } = await supabase.functions.invoke("analise-risco", {
    body,
    headers: accessToken ? { "x-user-jwt": accessToken } : undefined,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (!data?.laudo) throw new Error("A IA não retornou um laudo válido.");
  return data.laudo as LaudoRisco;
}

/** Gera laudo a partir de fotos já salvas na inspeção. */
export function gerarLaudoPorFotos(fotoIds: string[]) {
  return invokeAnaliseRisco({ foto_ids: fotoIds });
}

/** Gera laudo a partir de imagens avulsas (data URLs), sem vínculo com inspeção. */
export function gerarLaudoPorImagens(dataUrls: string[]) {
  return invokeAnaliseRisco({ imagens: dataUrls });
}

export async function salvarLaudo(params: {
  user_id: string;
  inspecao_id?: string | null;
  origem: "inspecao" | "avulso";
  laudo: LaudoRisco;
  fotos_ids?: string[];
}): Promise<LaudoRiscoRow> {
  const { data, error } = await supabase
    .from("laudos_risco")
    .insert({
      user_id: params.user_id,
      inspecao_id: params.inspecao_id ?? null,
      origem: params.origem,
      fotos_ids: params.fotos_ids ?? [],
      ...params.laudo,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as LaudoRiscoRow;
}

export async function buscarLaudoDaInspecao(inspecaoId: string): Promise<LaudoRiscoRow | null> {
  const { data, error } = await supabase
    .from("laudos_risco")
    .select("*")
    .eq("inspecao_id", inspecaoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as LaudoRiscoRow) ?? null;
}

export async function excluirLaudo(id: string) {
  const { error } = await supabase.from("laudos_risco").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Converte um File em data URL para envio direto à IA (fluxo avulso). */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Falha ao ler a imagem"));
    reader.readAsDataURL(file);
  });
}
