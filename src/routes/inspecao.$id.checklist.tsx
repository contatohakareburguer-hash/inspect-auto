import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CHECKLIST, TOTAL_ITENS, type ChecklistItem } from "@/data/checklist";
import { calcularScore, STATUS_LABEL, type StatusItem } from "@/lib/scoring";
import { Loader2, Camera, ImagePlus, Lightbulb, Check, X, AlertTriangle, Eye, ChevronDown, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AnaliseIADialog } from "@/components/AnaliseIADialog";

export const Route = createFileRoute("/inspecao/$id/checklist")({
  head: () => ({
    meta: [
      { title: "Checklist — InspectAuto" },
      { name: "description", content: "Checklist guiado de inspeção veicular." },
    ],
  }),
  component: ChecklistPage,
});

type ItemRow = {
  id: string;
  item_key: string;
  status: StatusItem;
  observacao_usuario: string | null;
  sugestao_sistema: string | null;
};

type FotoRow = {
  id: string;
  item_id: string | null;
  url: string;
};

function ChecklistPage() {
  const { id } = useParams({ from: "/inspecao/$id/checklist" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<Record<string, ItemRow>>({});
  const [fotos, setFotos] = useState<FotoRow[]>([]);
  const [openCat, setOpenCat] = useState<string | null>(CHECKLIST[0].key);
  const [exemploItem, setExemploItem] = useState<ChecklistItem | null>(null);
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from("itens_checklist")
        .select("id, item_key, status, observacao_usuario, sugestao_sistema")
        .eq("inspecao_id", id),
      supabase.from("fotos").select("id, item_id, url").eq("inspecao_id", id),
    ]).then(([itensRes, fotosRes]) => {
      const map: Record<string, ItemRow> = {};
      (itensRes.data as ItemRow[] | null)?.forEach((r) => {
        map[r.item_key] = r;
      });
      setItens(map);
      setFotos((fotosRes.data as FotoRow[]) || []);
      setLoading(false);
    });
  }, [id, user]);

  async function setStatus(cat: string, item: ChecklistItem, status: StatusItem) {
    if (!user) return;
    const existing = itens[item.key];
    setSavingMap((m) => ({ ...m, [item.key]: true }));

    if (existing) {
      const { error } = await supabase
        .from("itens_checklist")
        .update({
          status,
          sugestao_sistema: status && status !== "ok" ? item.sugestao : null,
        })
        .eq("id", existing.id);
      if (error) toast.error(error.message);
      else
        setItens((p) => ({
          ...p,
          [item.key]: { ...existing, status, sugestao_sistema: status && status !== "ok" ? item.sugestao : null },
        }));
    } else {
      const ordem = CHECKLIST.flatMap((c) => c.itens).findIndex((i) => i.key === item.key);
      const { data, error } = await supabase
        .from("itens_checklist")
        .insert({
          inspecao_id: id,
          user_id: user.id,
          categoria: cat,
          item_key: item.key,
          item_nome: item.nome,
          status,
          sugestao_sistema: status && status !== "ok" ? item.sugestao : null,
          ordem,
        })
        .select("id, item_key, status, observacao_usuario, sugestao_sistema")
        .single();
      if (error) toast.error(error.message);
      else if (data) setItens((p) => ({ ...p, [item.key]: data as ItemRow }));
    }
    setSavingMap((m) => ({ ...m, [item.key]: false }));
  }

  const obsTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  function setObs(item: ChecklistItem, value: string) {
    const existing = itens[item.key];
    if (!existing) {
      // ainda não tem status — guarda local apenas
      setItens((p) => ({
        ...p,
        [item.key]: {
          id: "",
          item_key: item.key,
          status: null,
          observacao_usuario: value,
          sugestao_sistema: null,
        },
      }));
      return;
    }
    setItens((p) => ({ ...p, [item.key]: { ...existing, observacao_usuario: value } }));
    if (obsTimers.current[item.key]) clearTimeout(obsTimers.current[item.key]);
    obsTimers.current[item.key] = setTimeout(async () => {
      await supabase
        .from("itens_checklist")
        .update({ observacao_usuario: value })
        .eq("id", existing.id);
    }, 600);
  }

  const sugTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  function setSugestao(item: ChecklistItem, value: string) {
    const existing = itens[item.key];
    if (!existing) return;
    setItens((p) => ({ ...p, [item.key]: { ...existing, sugestao_sistema: value } }));
    if (sugTimers.current[item.key]) clearTimeout(sugTimers.current[item.key]);
    sugTimers.current[item.key] = setTimeout(async () => {
      await supabase
        .from("itens_checklist")
        .update({ sugestao_sistema: value })
        .eq("id", existing.id);
    }, 600);
  }

  async function uploadFotos(item: ChecklistItem, files: FileList | File[]) {
    if (!user) return;
    const existing = itens[item.key];
    if (!existing || !existing.id) {
      toast.error("Selecione um status (OK/Atenção/Grave) antes de adicionar foto.");
      return;
    }
    const arr = Array.from(files);
    if (arr.length === 0) return;
    let ok = 0;
    for (const file of arr) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${id}/${item.key}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("inspecao-fotos").upload(path, file);
      if (upErr) {
        toast.error(upErr.message);
        continue;
      }
      const { data: pub } = supabase.storage.from("inspecao-fotos").getPublicUrl(path);
      const { data, error } = await supabase
        .from("fotos")
        .insert({
          inspecao_id: id,
          item_id: existing.id,
          user_id: user.id,
          storage_path: path,
          url: pub.publicUrl,
        })
        .select("id, item_id, url")
        .single();
      if (error) toast.error(error.message);
      else if (data) {
        setFotos((p) => [...p, data as FotoRow]);
        ok++;
      }
    }
    if (ok > 0) toast.success(ok === 1 ? "Foto adicionada" : `${ok} fotos adicionadas`);
  }

  async function removerFoto(foto: FotoRow) {
    await supabase.storage.from("inspecao-fotos").remove([foto.url.split("/inspecao-fotos/")[1] || ""]);
    await supabase.from("fotos").delete().eq("id", foto.id);
    setFotos((p) => p.filter((f) => f.id !== foto.id));
  }

  async function finalizar() {
    const all: { categoria: string; status: StatusItem }[] = Object.values(itens)
      .filter((i) => i.status)
      .map((i) => {
        const cat = CHECKLIST.find((c) => c.itens.some((it) => it.key === i.item_key))?.key || "";
        return { categoria: cat, status: i.status };
      });

    if (all.length === 0) {
      toast.error("Avalie pelo menos um item antes de finalizar.");
      return;
    }

    const r = calcularScore(all);
    const { error } = await supabase
      .from("inspecoes")
      .update({
        score_total: r.scoreTotal,
        classificacao_final: r.classificacao,
        conclusao: r.conclusao,
        status: "finalizada",
        finalizada_em: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/inspecao/$id/resumo", params: { id } });
  }

  const totalAvaliado = Object.values(itens).filter((i) => i.status).length;
  const progress = Math.round((totalAvaliado / TOTAL_ITENS) * 100);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Checklist</h1>
        <p className="text-sm text-muted-foreground">
          {totalAvaliado} de {TOTAL_ITENS} itens avaliados
        </p>
        <Progress value={progress} className="mt-2 h-2" />
      </div>

      <div className="space-y-3">
        {CHECKLIST.map((cat) => {
          const isOpen = openCat === cat.key;
          const avalCat = cat.itens.filter((it) => itens[it.key]?.status).length;
          return (
            <Card key={cat.key} className="overflow-hidden">
              <button
                onClick={() => setOpenCat(isOpen ? null : cat.key)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-accent/50"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{cat.emoji}</div>
                  <div>
                    <div className="font-semibold">{cat.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {avalCat} de {cat.itens.length} avaliados
                    </div>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="border-t bg-muted/30 p-4 space-y-4">
                  {cat.itens.map((it) => {
                    const row = itens[it.key];
                    const fotosItem = fotos.filter((f) => f.item_id === row?.id);
                    return (
                      <Card key={it.key} className="p-4 shadow-card">
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-semibold">{it.nome}</div>
                            <button
                              onClick={() => setExemploItem(it)}
                              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                              <Eye className="h-3 w-3" /> Ver exemplo
                            </button>
                          </div>
                          {savingMap[it.key] && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <StatusButton
                            active={row?.status === "ok"}
                            color="success"
                            icon={<Check className="h-4 w-4" />}
                            label="OK"
                            onClick={() => setStatus(cat.key, it, "ok")}
                          />
                          <StatusButton
                            active={row?.status === "atencao"}
                            color="warning"
                            icon={<AlertTriangle className="h-4 w-4" />}
                            label="Atenção"
                            onClick={() => setStatus(cat.key, it, "atencao")}
                          />
                          <StatusButton
                            active={row?.status === "grave"}
                            color="destructive"
                            icon={<X className="h-4 w-4" />}
                            label="Grave"
                            onClick={() => setStatus(cat.key, it, "grave")}
                          />
                        </div>

                        <Textarea
                          placeholder="Observação (opcional)..."
                          value={row?.observacao_usuario || ""}
                          onChange={(e) => setObs(it, e.target.value)}
                          className="mt-3 min-h-[60px] resize-none text-sm"
                        />

                        {row?.status && row.status !== "ok" && (
                          <div className="mt-3 rounded-lg bg-accent/50 p-3">
                            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-accent-foreground">
                              <Lightbulb className="h-3.5 w-3.5" /> Sugestão (editável)
                            </div>
                            <Textarea
                              value={row.sugestao_sistema || ""}
                              onChange={(e) => setSugestao(it, e.target.value)}
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
                                if (fs && fs.length) uploadFotos(it, fs);
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
                                if (fs && fs.length) uploadFotos(it, fs);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          {fotosItem.length > 0 && (
                            <span className="text-xs text-muted-foreground">{fotosItem.length} foto{fotosItem.length > 1 ? "s" : ""}</span>
                          )}
                        </div>
                        {fotosItem.length > 0 && (
                          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                            {fotosItem.map((f) => (
                              <div key={f.id} className="relative shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setFotoPreview(f.url)}
                                  className="block"
                                >
                                  <img
                                    src={f.url}
                                    alt="evidência"
                                    className="h-20 w-20 rounded-lg object-cover"
                                    loading="lazy"
                                  />
                                </button>
                                <button
                                  onClick={() => removerFoto(f)}
                                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                                  aria-label="Remover foto"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Button onClick={finalizar} className="w-full gradient-primary text-primary-foreground" size="lg">
        Finalizar e ver resumo <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      <Dialog open={!!exemploItem} onOpenChange={(o) => !o && setExemploItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{exemploItem?.nome}</DialogTitle>
            <DialogDescription>Como avaliar este item</DialogDescription>
          </DialogHeader>
          {exemploItem && (
            <div className="space-y-3 text-sm">
              <Section titulo="O que observar">{exemploItem.oQueObservar}</Section>
              <Section titulo="Exemplo prático">{exemploItem.exemplo}</Section>
              <Section titulo="Consequência">{exemploItem.consequencia}</Section>
              <Section titulo="Sugestão">{exemploItem.sugestao}</Section>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!fotoPreview} onOpenChange={(o) => !o && setFotoPreview(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto</DialogTitle>
            <DialogDescription>Visualização ampliada da foto</DialogDescription>
          </DialogHeader>
          {fotoPreview && (
            <img src={fotoPreview} alt="Foto ampliada" className="max-h-[80vh] w-full rounded-md object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
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

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{titulo}</div>
      <p className="mt-1">{children}</p>
    </div>
  );
}
