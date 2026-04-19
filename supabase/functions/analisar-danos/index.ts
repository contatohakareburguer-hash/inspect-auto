// Edge function: analisar-danos
// Recebe uma lista de foto_ids do usuário autenticado e usa Lovable AI (Gemini Vision)
// para detectar danos automotivos. URLs são derivadas server-side a partir do storage_path
// validado no banco — clientes NÃO podem submeter URLs externas.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FOTOS_POR_REQUEST = 20;
const SIGNED_URL_EXPIRES = 300; // 5min — somente para o gateway de IA buscar
const BUCKET = "inspecao-fotos";

type FotoInput = { foto_id: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    // 1) Authenticate caller
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Não autenticado" }, 401);
    }
    const userId = userData.user.id;

    // 2) Validate input
    const body = await req.json().catch(() => ({}));
    const fotosIn: FotoInput[] = Array.isArray(body?.fotos) ? body.fotos : [];
    if (fotosIn.length === 0) return json({ error: "Envie ao menos uma foto" }, 400);
    if (fotosIn.length > MAX_FOTOS_POR_REQUEST) {
      return json({ error: `Máximo de ${MAX_FOTOS_POR_REQUEST} fotos por requisição` }, 400);
    }
    const fotoIds = Array.from(
      new Set(
        fotosIn
          .map((f) => (typeof f?.foto_id === "string" ? f.foto_id : ""))
          .filter((s) => s.length > 0),
      ),
    );
    if (fotoIds.length === 0) return json({ error: "foto_id inválido" }, 400);

    // 3) Verify ownership of each foto_id and load storage_path/angulo using user JWT (RLS protects)
    const { data: fotosDb, error: fotosErr } = await userClient
      .from("fotos")
      .select("id, storage_path, angulo, user_id")
      .in("id", fotoIds);
    if (fotosErr) return json({ error: fotosErr.message }, 500);
    const owned = (fotosDb ?? []).filter((f) => f.user_id === userId);
    if (owned.length === 0) {
      return json({ error: "Nenhuma foto válida do usuário" }, 403);
    }

    // 4) Generate short-lived signed URLs server-side (service role) so the AI gateway can fetch
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const paths = owned.map((f) => f.storage_path);
    const { data: signed, error: signErr } = await adminClient.storage
      .from(BUCKET)
      .createSignedUrls(paths, SIGNED_URL_EXPIRES);
    if (signErr || !signed) return json({ error: "Falha ao gerar URLs" }, 500);
    const urlByPath: Record<string, string> = {};
    for (const s of signed) if (s.path && s.signedUrl) urlByPath[s.path] = s.signedUrl;

    const trabalhos = owned
      .map((f) => ({ foto_id: f.id, angulo: f.angulo, url: urlByPath[f.storage_path] }))
      .filter((f) => !!f.url);

    const resultados: Array<{
      foto_id: string;
      angulo?: string | null;
      danos: Array<{
        tipo: string;
        severidade: string;
        localizacao: string;
        descricao: string;
        confianca: number;
      }>;
    }> = [];

    // 5) Analisa uma foto por vez para manter prompts curtos e respostas estáveis.
    for (const foto of trabalhos) {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "Você é um perito em vistoria veicular. Analise a foto e identifique APENAS danos visíveis na carroceria/lataria/vidros/rodas (riscos, amassados, trincas, ferrugem, peças desalinhadas, faróis quebrados). Se não houver dano visível, retorne lista vazia. Não invente. Use português do Brasil.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Ângulo da foto: ${foto.angulo || "não informado"}. Identifique danos com tipo, severidade (leve/moderado/grave), localização no veículo (ex: para-choque dianteiro, porta dianteira esquerda) e nível de confiança (0 a 1).`,
                },
                { type: "image_url", image_url: { url: foto.url } },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "registrar_danos",
                description: "Registra a lista de danos detectados na imagem.",
                parameters: {
                  type: "object",
                  properties: {
                    danos: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          tipo: {
                            type: "string",
                            enum: ["risco", "amassado", "trinca", "ferrugem", "desalinhamento", "vidro_quebrado", "farol_quebrado", "outro"],
                          },
                          severidade: { type: "string", enum: ["leve", "moderado", "grave"] },
                          localizacao: { type: "string" },
                          descricao: { type: "string" },
                          confianca: { type: "number", minimum: 0, maximum: 1 },
                        },
                        required: ["tipo", "severidade", "localizacao", "descricao", "confianca"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["danos"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "registrar_danos" } },
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
        resultados.push({ foto_id: foto.foto_id, angulo: foto.angulo, danos: [] });
        continue;
      }

      const data = await aiResp.json();
      const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
      let danos: any[] = [];
      if (toolCall?.function?.arguments) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          danos = Array.isArray(args?.danos) ? args.danos : [];
        } catch (e) {
          console.error("JSON parse error:", e);
        }
      }
      resultados.push({ foto_id: foto.foto_id, angulo: foto.angulo, danos });
    }

    return json({ resultados });
  } catch (e) {
    console.error("analisar-danos error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
