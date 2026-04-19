// Edge function: analisar-danos
// Recebe uma lista de URLs de fotos e usa Lovable AI (Gemini Vision) para detectar danos automotivos.
// Retorna um array estruturado de danos por foto.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type FotoInput = { foto_id: string; url: string; angulo?: string | null };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY não configurada" }, 500);
    }

    const body = await req.json();
    const fotos: FotoInput[] = body?.fotos ?? [];
    if (!Array.isArray(fotos) || fotos.length === 0) {
      return json({ error: "Envie ao menos uma foto" }, 400);
    }

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

    // Analisa uma foto por vez para manter prompts curtos e respostas estáveis.
    for (const foto of fotos) {
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
