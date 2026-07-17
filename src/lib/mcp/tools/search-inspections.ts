import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "search_inspections",
  title: "Buscar inspeções",
  description: "Busca inspeções do usuário por placa, marca ou modelo (correspondência parcial, case-insensitive).",
  inputSchema: {
    query: z.string().min(1).describe("Trecho da placa, marca ou modelo."),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const term = `%${query}%`;
    const { data, error } = await supabaseForUser(ctx)
      .from("inspecoes")
      .select("id, placa, marca, modelo, ano, tipo_veiculo, status, score_total, created_at")
      .or(`placa.ilike.${term},marca.ilike.${term},modelo.ilike.${term}`)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { results: data ?? [] },
    };
  },
});
