import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  initial?: string | null;
  imageUrl?: string | null;
  onClose: () => void;
  onSave: (legenda: string | null) => void;
};

export function PhotoCaptionDialog({ open, initial, imageUrl, onClose, onSave }: Props) {
  const [text, setText] = useState(initial ?? "");

  useEffect(() => {
    if (open) setText(initial ?? "");
  }, [open, initial]);

  function salvar() {
    const t = text.trim();
    onSave(t.length === 0 ? null : t.slice(0, 280));
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Legenda da foto</DialogTitle>
          <DialogDescription>
            Anote um detalhe para esta foto (ex: "risco profundo na porta dianteira").
          </DialogDescription>
        </DialogHeader>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Pré-visualização"
            className="max-h-48 w-full rounded-md object-contain bg-muted"
          />
        )}
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Descreva o detalhe..."
          rows={3}
          maxLength={280}
        />
        <div className="text-right text-[10px] text-muted-foreground">{text.length}/280</div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={onClose} className="sm:flex-1">Cancelar</Button>
          <Button onClick={salvar} className="sm:flex-1">Salvar legenda</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
