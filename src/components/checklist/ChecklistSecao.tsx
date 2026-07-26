import type { ChecklistCategoria, ChecklistItem } from "@/data/checklist";
import { ChecklistItemCard, type ChecklistItemHandlers } from "./ChecklistItemCard";
import type { FotoRow, ItemRow } from "./types";

type ChecklistSecaoProps = {
  categoria: ChecklistCategoria;
  /** estado da seção dentro do objeto global de avaliação */
  dados: {
    itens: Record<string, ItemRow>;
    fotos: FotoRow[];
    savingMap: Record<string, boolean>;
  };
  atualizarDados: ChecklistItemHandlers;
};

/**
 * Uma etapa (seção) do assistente de avaliação: renderiza apenas
 * os itens da categoria correspondente.
 */
export function ChecklistSecao({ categoria, dados, atualizarDados }: ChecklistSecaoProps) {
  return (
    <div className="space-y-4">
      {categoria.itens.map((item: ChecklistItem) => {
        const row = dados.itens[item.key];
        const fotosItem = dados.fotos
          .filter((f) => row?.id && f.item_id === row.id)
          .sort((a, b) => a.ordem - b.ordem);
        return (
          <ChecklistItemCard
            key={item.key}
            categoriaKey={categoria.key}
            item={item}
            dados={{ row, fotos: fotosItem, salvando: !!dados.savingMap[item.key] }}
            atualizarDados={atualizarDados}
          />
        );
      })}
    </div>
  );
}
