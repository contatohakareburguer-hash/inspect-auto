// Edge function: consulta-placa
// Consulta dados do veículo pela placa usando a API Placas (wdapi2.com.br).
// O token fica em variável de ambiente API_PLACAS_TOKEN.

const ALLOWED_ORIGIN = Deno.env.get("APP_URL") ?? "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLACA_REGEX = /^[A-Z]{3}[0-9][0-9A-Z][0-9]{2}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  try {
    const token = Deno.env.get("API_PLACAS_TOKEN");
    if (!token) return json({ error: "API_PLACAS_TOKEN não configurado" }, 500);

    const body = await req.json().catch(() => ({}));
    const raw = typeof body?.placa === "string" ? body.placa : "";
    const placa = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    if (!PLACA_REGEX.test(placa)) {
      return json(
        { error: "Placa inválida. Use o formato AAA0A00 (Mercosul) ou AAA0000." },
        400,
      );
    }

    const url = `https://wdapi2.com.br/consulta/${placa}/${token}`;
    const resp = await fetch(url, { method: "GET" });

    // Trata códigos de erro documentados pela API
    if (!resp.ok) {
      const messages: Record<number, string> = {
        400: "Requisição incorreta na consulta da placa.",
        401: "Placa inválida ou não encontrada na base.",
        402: "Token da API inválido ou expirado.",
        406: "Nenhum resultado encontrado para esta placa.",
        429: "Limite de consultas atingido. Tente novamente mais tarde.",
      };
      const msg = messages[resp.status] ?? `Erro na consulta (HTTP ${resp.status}).`;
      return json({ error: msg, status: resp.status }, resp.status);
    }

    const data = await resp.json();
    return json(data);
  } catch (e) {
    console.error("consulta-placa error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
