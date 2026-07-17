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
  name: "list_inspections",
  title: "Listar inspeções",
  description: "Lista as inspeções veiculares do usuário autenticado, ordenadas pela mais recente.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Máximo de inspeções (padrão 20)."),
    status: z.enum(["em_andamento", "finalizada"]).optional().describe("Filtrar por status."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    let query = supabaseForUser(ctx)
      .from("inspecoes")
      .select("id, placa, marca, modelo, ano, tipo_veiculo, status, score_total, classificacao_final, created_at, finalizada_em")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { inspections: data ?? [] },
    };
  },
});
