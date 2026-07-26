import type { StatusItem } from "@/lib/scoring";

export type ItemRow = {
  id: string;
  item_key: string;
  status: StatusItem;
  observacao_usuario: string | null;
  sugestao_sistema: string | null;
};

export type FotoRow = {
  id: string;
  item_id: string | null;
  url: string;
  storage_path: string;
  ordem: number;
  legenda: string | null;
};
