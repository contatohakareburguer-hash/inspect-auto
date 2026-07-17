import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_stats",
  title: "Estatísticas do vistoriador",
  description: "Retorna um resumo das inspeções do usuário: totais, finalizadas, em andamento, score médio e distribuição por tipo de veículo.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("inspecoes")
      .select("status, score_total, tipo_veiculo");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = data ?? [];
    const finalizadas = rows.filter((r) => r.status === "finalizada");
    const scores = finalizadas.map((r) => r.score_total).filter((v): v is number => typeof v === "number");
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const porTipo: Record<string, number> = {};
    for (const r of rows) {
      const key = r.tipo_veiculo ?? "carro";
      porTipo[key] = (porTipo[key] ?? 0) + 1;
    }
    const summary = {
      total: rows.length,
      finalizadas: finalizadas.length,
      em_andamento: rows.length - finalizadas.length,
      score_medio: avg,
      por_tipo_veiculo: porTipo,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
