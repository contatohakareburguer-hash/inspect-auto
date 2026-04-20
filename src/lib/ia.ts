import { supabase } from "@/integrations/supabase/client";

export type DanoIA = {
  tipo: string;
  severidade: "leve" | "moderado" | "grave" | string;
  localizacao: string;
  descricao: string;
  confianca: number;
};

export type ResultadoFotoIA = {
  foto_id: string;
  angulo?: string | null;
  danos: DanoIA[];
};

export async function analisarDanosIA(
  fotos: { foto_id: string; url?: string; angulo?: string | null }[],
): Promise<ResultadoFotoIA[]> {
  // Apenas foto_id é enviado; o servidor valida ownership e gera a URL assinada.
  const payload = fotos.map((f) => ({ foto_id: f.foto_id }));

  // O gateway da edge function está com verify_jwt=false (necessário porque
  // tokens ES256 atuais não são suportados pelo verificador legado). Para
  // manter a autenticação real, encaminhamos o JWT do usuário em um header
  // próprio que a função valida via supabase-js (fluxo "manual" de auth).
  const { data: sessionRes } = await supabase.auth.getSession();
  const accessToken = sessionRes.session?.access_token ?? "";

  const { data, error } = await supabase.functions.invoke("analisar-danos", {
    body: { fotos: payload },
    headers: accessToken ? { "x-user-jwt": accessToken } : undefined,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return (data?.resultados ?? []) as ResultadoFotoIA[];
}

export async function salvarDanos(params: {
  user_id: string;
  inspecao_id: string;
  item_id?: string | null;
  resultados: ResultadoFotoIA[];
}) {
  const rows = params.resultados.flatMap((r) =>
    r.danos.map((d) => ({
      user_id: params.user_id,
      inspecao_id: params.inspecao_id,
      foto_id: r.foto_id,
      item_id: params.item_id ?? null,
      tipo: d.tipo,
      severidade: d.severidade,
      localizacao: d.localizacao,
      descricao: d.descricao,
      confianca: d.confianca,
      angulo: r.angulo ?? null,
    })),
  );
  if (rows.length === 0) return { count: 0 };
  // Marca fotos como analisadas
  const fotoIds = Array.from(new Set(params.resultados.map((r) => r.foto_id)));
  await supabase
    .from("fotos")
    .update({ analisada_em: new Date().toISOString() })
    .in("id", fotoIds);
  const { error } = await supabase.from("danos_detectados").insert(rows);
  if (error) throw new Error(error.message);
  return { count: rows.length };
}

export const SEVERIDADE_LABEL: Record<string, string> = {
  leve: "Leve",
  moderado: "Moderado",
  grave: "Grave",
};

export const TIPO_LABEL: Record<string, string> = {
  risco: "Risco",
  amassado: "Amassado",
  trinca: "Trinca",
  ferrugem: "Ferrugem",
  desalinhamento: "Desalinhamento",
  vidro_quebrado: "Vidro quebrado",
  farol_quebrado: "Farol quebrado",
  outro: "Outro",
};
