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
import { signedUrls } from "@/lib/storage";
import { compressImage } from "@/lib/imageCompress";
import { SortablePhotoGrid } from "@/components/SortablePhotoGrid";
import { persistPhotoOrder } from "@/lib/photoOrder";

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
  storage_path: string;
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
  const [iaItem, setIaItem] = useState<{ itemId: string; fotos: FotoRow[] } | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from("itens_checklist")
        .select("id, item_key, status, observacao_usuario, sugestao_sistema")
        .eq("inspecao_id", id),
      supabase.from("fotos").select("id, item_id, url, storage_path").eq("inspecao_id", id),
    ]).then(async ([itensRes, fotosRes]) => {
      const map: Record<string, ItemRow> = {};
      (itensRes.data as ItemRow[] | null)?.forEach((r) => {
        map[r.item_key] = r;
      });
      setItens(map);
      const rows = (fotosRes.data as FotoRow[]) || [];
      // Refresh signed URLs from storage_path (bucket is private)
      const urlMap = await signedUrls(rows.map((r) => r.storage_path).filter(Boolean));
      setFotos(rows.map((r) => ({ ...r, url: urlMap[r.storage_path] || r.url })));
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

  /**
   * Garante que o item existe no banco antes de receber fotos.
   * Cria com status null se necessário — o vistoriador pode anexar evidências
   * antes mesmo de classificar como OK/Atenção/Grave.
   */
  async function garantirItem(cat: string, item: ChecklistItem): Promise<ItemRow | null> {
    if (!user) return null;
    const existing = itens[item.key];
    if (existing && existing.id) return existing;
    const ordem = CHECKLIST.flatMap((c) => c.itens).findIndex((i) => i.key === item.key);
    const { data, error } = await supabase
      .from("itens_checklist")
      .insert({
        inspecao_id: id,
        user_id: user.id,
        categoria: cat,
        item_key: item.key,
        item_nome: item.nome,
        status: null,
        observacao_usuario: existing?.observacao_usuario ?? null,
        ordem,
      })
      .select("id, item_key, status, observacao_usuario, sugestao_sistema")
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    const row = data as ItemRow;
    setItens((p) => ({ ...p, [item.key]: row }));
    return row;
  }

  async function uploadFotos(cat: string, item: ChecklistItem, files: FileList | File[]) {
    if (!user) return;
    const arr = Array.from(files);
    if (arr.length === 0) return;

    const MAX_MB = 15; // bruto, antes da compressão
    for (const f of arr) {
      if (!f.type.startsWith("image/")) {
        toast.error(`"${f.name}" não é uma imagem.`);
        return;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        toast.error(`"${f.name}" excede ${MAX_MB}MB.`);
        return;
      }
    }

    const itemRow = await garantirItem(cat, item);
    if (!itemRow) return;

    setSavingMap((m) => ({ ...m, [item.key]: true }));
    const tid = toast.loading(arr.length === 1 ? "Enviando foto..." : `Enviando ${arr.length} fotos...`);

    // Faz cada arquivo: comprime → upload → URL assinada → insert no banco.
    // Roda em paralelo (Promise.all) — muito mais rápido que sequencial e
    // evita o app "travar" entre fotos no celular.
    const tarefas = arr.map(async (rawFile) => {
      try {
        const file = await compressImage(rawFile);
        const ext = "jpg";
        const path = `${user.id}/${id}/${item.key}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("inspecao-fotos")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage
          .from("inspecao-fotos")
          .createSignedUrl(path, 60 * 60);
        const signedUrlStr = signed?.signedUrl ?? "";
        const { data, error } = await supabase
          .from("fotos")
          .insert({
            inspecao_id: id,
            item_id: itemRow.id,
            user_id: user.id,
            storage_path: path,
            url: signedUrlStr,
          })
          .select("id, item_id, url, storage_path")
          .single();
        if (error) throw error;
        return data as FotoRow;
      } catch (e) {
        console.error("upload falhou:", e);
        return null;
      }
    });

    const resultados = await Promise.all(tarefas);
    const novas = resultados.filter((r): r is FotoRow => r !== null);
    if (novas.length > 0) setFotos((p) => [...p, ...novas]);

    toast.dismiss(tid);
    if (novas.length === arr.length) {
      toast.success(novas.length === 1 ? "Foto adicionada" : `${novas.length} fotos adicionadas`);
    } else if (novas.length > 0) {
      toast.warning(`${novas.length} de ${arr.length} fotos enviadas.`);
    } else {
      toast.error("Falha no envio. Tente novamente.");
    }
    setSavingMap((m) => ({ ...m, [item.key]: false }));
  }

  async function removerFoto(foto: FotoRow) {
    if (foto.storage_path) {
      await supabase.storage.from("inspecao-fotos").remove([foto.storage_path]);
    }
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
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Checklist</h1>
            <p className="text-sm text-muted-foreground">
              {totalAvaliado} de {TOTAL_ITENS} itens avaliados
            </p>
          </div>
          <Link
            to="/inspecao/$id/inteligente"
            params={{ id }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
          >
            <Sparkles className="h-3.5 w-3.5" /> Modo IA
          </Link>
        </div>
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
                                if (fs && fs.length) uploadFotos(cat.key, it, fs);
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
                                if (fs && fs.length) uploadFotos(cat.key, it, fs);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          {fotosItem.length > 0 && (
                            <span className="text-xs text-muted-foreground">{fotosItem.length} foto{fotosItem.length > 1 ? "s" : ""}</span>
                          )}
                          {fotosItem.length > 0 && row?.id && (
                            <button
                              type="button"
                              onClick={() => setIaItem({ itemId: row.id, fotos: fotosItem })}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
                            >
                              <Sparkles className="h-3.5 w-3.5" /> Analisar com IA
                            </button>
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

      {iaItem && user && (
        <AnaliseIADialog
          open={!!iaItem}
          onOpenChange={(o) => !o && setIaItem(null)}
          fotos={iaItem.fotos.map((f) => ({ id: f.id, url: f.url }))}
          inspecaoId={id}
          itemId={iaItem.itemId}
          userId={user.id}
        />
      )}

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
