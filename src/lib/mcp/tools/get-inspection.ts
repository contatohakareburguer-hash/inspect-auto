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
  name: "get_inspection",
  title: "Detalhar inspeção",
  description: "Retorna os dados completos de uma inspeção, com itens do checklist e fotos vinculadas.",
  inputSchema: {
    inspection_id: z.string().uuid().describe("ID da inspeção."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ inspection_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const [inspecao, itens, fotos] = await Promise.all([
      sb.from("inspecoes").select("*").eq("id", inspection_id).maybeSingle(),
      sb.from("itens_checklist").select("*").eq("inspecao_id", inspection_id).order("categoria").order("ordem"),
      sb.from("fotos").select("id, item_id, url, legenda, angulo, created_at").eq("inspecao_id", inspection_id).order("created_at"),
    ]);
    if (inspecao.error) return { content: [{ type: "text", text: inspecao.error.message }], isError: true };
    if (!inspecao.data) return { content: [{ type: "text", text: "Inspeção não encontrada" }], isError: true };
    const payload = { inspecao: inspecao.data, itens: itens.data ?? [], fotos: fotos.data ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
