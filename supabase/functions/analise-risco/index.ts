// Edge function: analise-risco
// Gera um laudo de análise de risco para seguradora a partir de fotos do veículo,
// usando Lovable AI (Gemini Vision).
//
// Dois modos de entrada:
//  1) { foto_ids: string[] }  -> fotos já salvas na inspeção (ownership validado via RLS,
//                                URLs assinadas geradas server-side).
//  2) { imagens: string[] }   -> data URLs enviadas na hora (análise avulsa, não persistida).
//
// Nunca aceita URLs externas arbitrárias.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ALLOWED_ORIGIN = Deno.env.get("APP_URL") ?? "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-jwt",
};

const MAX_IMAGENS = 12;
const MAX_DATA_URL_BYTES = 4 * 1024 * 1024; // ~4MB por imagem em base64
const SIGNED_URL_EXPIRES = 300;
const BUCKET = "inspecao-fotos";
const DATA_URL_REGEX = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/;

const SYSTEM_PROMPT = `Você é um inspetor de seguros sênior, responsável por realizar inspeções veiculares detalhadas e emitir laudos que auxiliam uma seguradora na avaliação de risco antes de fechar contrato.

Analise TODAS as fotos fornecidas como um único veículo e produza um laudo técnico.

Regras obrigatórias:
- Inclua apenas informações nas quais você tenha pelo menos 90% de certeza com base nas fotos.
- Nunca invente dados. Se algo não for identificável ou não se aplicar, retorne exatamente "N/A".
- Se não houver certeza sobre o ano, retorne "Não identificado".
- Seja específico: cite a localização exata das avarias e o tamanho aproximado quando possível.
- O campo risco_seguradora é um número inteiro de 0 a 100, onde 0 = risco mínimo (veículo impecável) e 100 = risco máximo (veículo em péssimo estado ou com indícios de sinistro).
- Se as fotos forem insuficientes para um laudo, retorne na conclusão: "Dados insuficientes para gerar um laudo." e risco_seguradora igual a 50.
- Escreva em português do Brasil, com linguagem técnica e objetiva.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY não configurada" }, 500);
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Supabase env não configurado" }, 500);
    }

    // 1) Autenticação (mesmo padrão das demais functions: verify_jwt=false + validação manual)
    const customJwt = req.headers.get("x-user-jwt") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = customJwt
      ? `Bearer ${customJwt}`
      : authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader
        : authHeader
          ? `Bearer ${authHeader}`
          : "";
    if (!bearer) return json({ error: "Não autenticado" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: bearer } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Não autenticado" }, 401);
    const userId = userData.user.id;

    // 2) Entrada
    const body = await req.json().catch(() => ({}));
    const fotoIds: string[] = Array.isArray(body?.foto_ids)
      ? Array.from(new Set(body.foto_ids.filter((v: unknown) => typeof v === "string" && v)))
      : [];
    const imagensIn: string[] = Array.isArray(body?.imagens)
      ? body.imagens.filter((v: unknown) => typeof v === "string")
      : [];

    const urls: string[] = [];

    if (fotoIds.length > 0) {
      const { data: fotosDb, error: fotosErr } = await userClient
        .from("fotos")
        .select("id, storage_path, user_id")
        .in("id", fotoIds.slice(0, MAX_IMAGENS));
      if (fotosErr) return json({ error: fotosErr.message }, 500);
      const owned = (fotosDb ?? []).filter((f) => f.user_id === userId);
      if (owned.length === 0) return json({ error: "Nenhuma foto válida do usuário" }, 403);

      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: signed, error: signErr } = await adminClient.storage
        .from(BUCKET)
        .createSignedUrls(owned.map((f) => f.storage_path), SIGNED_URL_EXPIRES);
      if (signErr || !signed) return json({ error: "Falha ao gerar URLs" }, 500);
      for (const s of signed) if (s.signedUrl) urls.push(s.signedUrl);
    } else if (imagensIn.length > 0) {
      for (const img of imagensIn.slice(0, MAX_IMAGENS)) {
        if (!DATA_URL_REGEX.test(img)) return json({ error: "Formato de imagem inválido" }, 400);
        if (img.length > MAX_DATA_URL_BYTES) {
          return json({ error: "Imagem muito grande. Reduza a resolução e tente novamente." }, 400);
        }
        urls.push(img);
      }
    }

    if (urls.length === 0) return json({ error: "Envie ao menos uma foto" }, 400);

    // 3) Chamada ao Lovable AI Gateway com tool calling (saída estruturada)
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analise as ${urls.length} foto(s) abaixo do mesmo veículo e emita o laudo de análise de risco para a seguradora.`,
              },
              ...urls.map((url) => ({ type: "image_url", image_url: { url } })),
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "registrar_laudo",
              description: "Registra o laudo de análise de risco do veículo.",
              parameters: {
                type: "object",
                properties: {
                  marca: { type: "string" },
                  modelo: { type: "string" },
                  ano_veiculo: { type: "string" },
                  cor: { type: "string" },
                  condicoes_gerais: { type: "string" },
                  frente_veiculo: { type: "string" },
                  para_brisa: { type: "string" },
                  traseira_veiculo: { type: "string" },
                  danos_nao_visiveis: { type: "string" },
                  quilometragem: { type: "string" },
                  pneus: { type: "string" },
                  painel: { type: "string" },
                  risco_seguradora: { type: "integer" },
                  conclusao: { type: "string" },
                },
                required: [
                  "marca",
                  "modelo",
                  "ano_veiculo",
                  "cor",
                  "condicoes_gerais",
                  "frente_veiculo",
                  "para_brisa",
                  "traseira_veiculo",
                  "danos_nao_visiveis",
                  "quilometragem",
                  "pneus",
                  "painel",
                  "risco_seguradora",
                  "conclusao",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "registrar_laudo" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return json({ error: "Limite de uso da IA atingido. Tente novamente em instantes." }, 429);
      }
      if (aiResp.status === 402) {
        return json({ error: "Créditos de IA insuficientes. Adicione créditos no workspace." }, 402);
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return json({ error: "Falha ao gerar o laudo. Tente novamente." }, 502);
    }

    const data = await aiResp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      console.error("Resposta sem tool_call:", JSON.stringify(data).slice(0, 800));
      return json({ error: "A IA não retornou um laudo válido. Tente novamente." }, 502);
    }

    let laudo: Record<string, unknown>;
    try {
      laudo = JSON.parse(args);
    } catch (e) {
      console.error("JSON parse error:", e);
      return json({ error: "Laudo em formato inválido. Tente novamente." }, 502);
    }

    const risco = Number(laudo.risco_seguradora);
    laudo.risco_seguradora = Number.isFinite(risco) ? Math.min(100, Math.max(0, Math.round(risco))) : 50;

    return json({ laudo, fotos_analisadas: urls.length });
  } catch (e) {
    console.error("analise-risco error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
