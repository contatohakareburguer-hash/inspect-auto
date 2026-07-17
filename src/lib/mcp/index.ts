import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listInspectionsTool from "./tools/list-inspections";
import getInspectionTool from "./tools/get-inspection";
import searchInspectionsTool from "./tools/search-inspections";
import statsTool from "./tools/stats";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "inspect-auto-mcp",
  title: "Inspect Auto",
  version: "0.1.0",
  instructions:
    "Ferramentas para consultar inspeções veiculares do vistoriador autenticado no Inspect Auto. Use `list_inspections` para listar, `search_inspections` para buscar por placa/marca/modelo, `get_inspection` para detalhes completos (checklist + fotos) e `get_stats` para o resumo do vistoriador.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listInspectionsTool, searchInspectionsTool, getInspectionTool, statsTool],
});
