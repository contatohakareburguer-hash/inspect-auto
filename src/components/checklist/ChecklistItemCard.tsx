import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Camera, ImagePlus, Lightbulb, Check, X, AlertTriangle, Eye, Sparkles } from "lucide-react";
import type { ChecklistItem } from "@/data/checklist";
import type { StatusItem } from "@/lib/scoring";
import { SortablePhotoGrid } from "@/components/SortablePhotoGrid";
import type { FotoRow, ItemRow } from "./types";

export type ChecklistItemHandlers = {
  setStatus: (categoria: string, item: ChecklistItem, status: StatusItem) => void;
  setObs: (item: ChecklistItem, value: string) => void;
  setSugestao: (item: ChecklistItem, value: string) => void;
  uploadFotos: (categoria: string, item: ChecklistItem, files: FileList | File[]) => void;
  removerFoto: (foto: FotoRow) => void;
  reordenarFotos: (fotosItem: FotoRow[], next: FotoRow[]) => void;
  abrirExemplo: (item: ChecklistItem) => void;
  abrirPreview: (foto: FotoRow) => void;
  abrirLegenda: (foto: FotoRow) => void;
  abrirIA: (itemId: string, fotos: FotoRow[]) => void;
};

type ChecklistItemCardProps = {
  categoriaKey: string;
  item: ChecklistItem;
  /** dados do item nesta seção */
  dados: { row?: ItemRow; fotos: FotoRow[]; salvando: boolean };
  /** ações que atualizam os dados no estado global */
  atualizarDados: ChecklistItemHandlers;
};

export function ChecklistItemCard({
  categoriaKey,
  item,
  dados,
  atualizarDados,
}: ChecklistItemCardProps) {
  const { row, fotos: fotosItem, salvando } = dados;

  return (
    <Card className="p-4 shadow-card">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="font-semibold">{item.nome}</div>
          <button
            onClick={() => atualizarDados.abrirExemplo(item)}
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Eye className="h-3 w-3" /> Ver exemplo
          </button>
        </div>
        {salvando && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatusButton
          active={row?.status === "ok"}
          color="success"
          icon={<Check className="h-4 w-4" />}
          label="OK"
          onClick={() => atualizarDados.setStatus(categoriaKey, item, "ok")}
        />
        <StatusButton
          active={row?.status === "atencao"}
          color="warning"
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Atenção"
          onClick={() => atualizarDados.setStatus(categoriaKey, item, "atencao")}
        />
        <StatusButton
          active={row?.status === "grave"}
          color="destructive"
          icon={<X className="h-4 w-4" />}
          label="Grave"
          onClick={() => atualizarDados.setStatus(categoriaKey, item, "grave")}
        />
      </div>

      <Textarea
        placeholder="Observação (opcional)..."
        value={row?.observacao_usuario || ""}
        onChange={(e) => atualizarDados.setObs(item, e.target.value)}
        className="mt-3 min-h-[60px] resize-none text-sm"
      />

      {row?.status && row.status !== "ok" && (
        <div className="mt-3 rounded-lg bg-accent/50 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-accent-foreground">
            <Lightbulb className="h-3.5 w-3.5" /> Sugestão (editável)
          </div>
          <Textarea
            value={row.sugestao_sistema || ""}
            onChange={(e) => atualizarDados.setSugestao(item, e.target.value)}
            className="min-h-[50px] resize-none border-0 bg-background text-sm"
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent">
          <Camera className="h-3.5 w-3.5" /> Tirar foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => {
              const fs = e.target.files;
              if (fs && fs.length) atualizarDados.uploadFotos(categoriaKey, item, fs);
              e.target.value = "";
            }}
          />
        </label>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent">
          <ImagePlus className="h-3.5 w-3.5" /> Galeria
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const fs = e.target.files;
              if (fs && fs.length) atualizarDados.uploadFotos(categoriaKey, item, fs);
              e.target.value = "";
            }}
          />
        </label>
        {fotosItem.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {fotosItem.length} foto{fotosItem.length > 1 ? "s" : ""}
          </span>
        )}
        {fotosItem.length > 0 && row?.id && (
          <button
            type="button"
            onClick={() => atualizarDados.abrirIA(row.id, fotosItem)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <Sparkles className="h-3.5 w-3.5" /> Analisar com IA
          </button>
        )}
      </div>

      {fotosItem.length > 0 && (
        <div className="mt-2">
          <SortablePhotoGrid
            photos={fotosItem}
            onPreview={(f) => atualizarDados.abrirPreview(f)}
            onRemove={(f) => atualizarDados.removerFoto(f)}
            onEditCaption={(f) => atualizarDados.abrirLegenda(f)}
            onReorder={(next) => atualizarDados.reordenarFotos(fotosItem, next)}
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Toque no lápis para legendar · segure e arraste para reordenar
          </p>
        </div>
      )}
    </Card>
  );
}

function StatusButton({
  active,
  color,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  color: "success" | "warning" | "destructive";
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  const colorMap = {
    success: "bg-success text-success-foreground border-success",
    warning: "bg-warning text-warning-foreground border-warning",
    destructive: "bg-destructive text-destructive-foreground border-destructive",
  };
  const inactiveBorder = {
    success: "hover:border-success hover:text-success",
    warning: "hover:border-warning hover:text-warning",
    destructive: "hover:border-destructive hover:text-destructive",
  };
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 px-2 py-2.5 text-xs font-semibold transition-all ${
        active ? colorMap[color] + " shadow-card" : "bg-background text-muted-foreground " + inactiveBorder[color]
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
