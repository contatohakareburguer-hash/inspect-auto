import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { ChecklistItem, ChecklistCategoria } from "@/data/checklist";
import { getChecklist, normalizeVehicleType, type VehicleType } from "@/data/vehicleTypes";
import { calcularScore, type StatusItem } from "@/lib/scoring";
import { Loader2, ArrowRight, ArrowLeft, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AnaliseIADialog } from "@/components/AnaliseIADialog";
import { signedUrls } from "@/lib/storage";
import { compressImage } from "@/lib/imageCompress";
import { persistPhotoOrder } from "@/lib/photoOrder";
import { PhotoCaptionDialog } from "@/components/PhotoCaptionDialog";
import { VehicleTypeBadge } from "@/components/VehicleTypeBadge";
import { WizardProgress } from "@/components/checklist/WizardProgress";
import { ChecklistSecao } from "@/components/checklist/ChecklistSecao";
import type { ChecklistItemHandlers } from "@/components/checklist/ChecklistItemCard";
import type { FotoRow, ItemRow } from "@/components/checklist/types";

export const Route = createFileRoute("/inspecao/$id/checklist")({
  head: () => ({
    meta: [
      { title: "Checklist — InspectAuto" },
      { name: "description", content: "Checklist guiado de inspeção veicular em etapas." },
    ],
  }),
  component: ChecklistPage,
});

const wizardStorageKey = (inspecaoId: string) => `inspectauto:wizard:${inspecaoId}`;

function ChecklistPage() {
  const { id } = useParams({ from: "/inspecao/$id/checklist" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tipoVeiculo, setTipoVeiculo] = useState<VehicleType>("carro");
  const checklist: ChecklistCategoria[] = getChecklist(tipoVeiculo);
  const totalSecoes = checklist.length;
  const totalItens = checklist.reduce((s, c) => s + c.itens.length, 0);

  // Estado global da avaliação (uma entrada por seção é derivada de `itens`)
  const [itens, setItens] = useState<Record<string, ItemRow>>({});
  const [fotos, setFotos] = useState<FotoRow[]>([]);
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});

  const [secaoAtual, setSecaoAtual] = useState(1);
  const [erroValidacao, setErroValidacao] = useState<string[] | null>(null);
  const [finalizando, setFinalizando] = useState(false);

  const [exemploItem, setExemploItem] = useState<ChecklistItem | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [legendaFoto, setLegendaFoto] = useState<FotoRow | null>(null);
  const [iaItem, setIaItem] = useState<{ itemId: string; fotos: FotoRow[] } | null>(null);

  // Restaura a etapa em andamento (persistência temporária local)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(wizardStorageKey(id));
    if (!raw) return;
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 1) setSecaoAtual(parsed);
  }, [id]);

  // Salva automaticamente a etapa atual
  useEffect(() => {
    if (typeof window === "undefined" || loading) return;
    window.localStorage.setItem(wizardStorageKey(id), String(secaoAtual));
  }, [id, secaoAtual, loading]);

  // Ajusta a etapa caso o checklist do tipo tenha menos seções
  useEffect(() => {
    if (totalSecoes > 0 && secaoAtual > totalSecoes) setSecaoAtual(totalSecoes);
  }, [totalSecoes, secaoAtual]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("inspecoes").select("tipo_veiculo").eq("id", id).single(),
      supabase
        .from("itens_checklist")
        .select("id, item_key, status, observacao_usuario, sugestao_sistema")
        .eq("inspecao_id", id),
      supabase
        .from("fotos")
        .select("id, item_id, url, storage_path, ordem, legenda")
        .eq("inspecao_id", id)
        .order("ordem")
        .order("created_at"),
    ]).then(async ([insRes, itensRes, fotosRes]) => {
      const tipo = normalizeVehicleType((insRes.data as { tipo_veiculo?: string } | null)?.tipo_veiculo);
      setTipoVeiculo(tipo);
      const map: Record<string, ItemRow> = {};
      (itensRes.data as ItemRow[] | null)?.forEach((r) => {
        map[r.item_key] = r;
      });
      setItens(map);
      const rows = (fotosRes.data as FotoRow[]) || [];
      const urlMap = await signedUrls(rows.map((r) => r.storage_path).filter(Boolean));
      setFotos(rows.map((r) => ({ ...r, url: urlMap[r.storage_path] || r.url })));
      setLoading(false);
    });
  }, [id, user]);

  async function setStatus(cat: string, item: ChecklistItem, status: StatusItem) {
    if (!user) return;
    const existing = itens[item.key];
    setSavingMap((m) => ({ ...m, [item.key]: true }));

    if (existing && existing.id) {
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
      const ordem = checklist.flatMap((c: ChecklistCategoria) => c.itens).findIndex((i: ChecklistItem) => i.key === item.key);
      const { data, error } = await supabase
        .from("itens_checklist")
        .insert({
          inspecao_id: id,
          user_id: user.id,
          categoria: cat,
          item_key: item.key,
          item_nome: item.nome,
          status,
          observacao_usuario: existing?.observacao_usuario ?? null,
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
    if (!existing.id) return;
    if (obsTimers.current[item.key]) clearTimeout(obsTimers.current[item.key]);
    obsTimers.current[item.key] = setTimeout(async () => {
      await supabase.from("itens_checklist").update({ observacao_usuario: value }).eq("id", existing.id);
    }, 600);
  }

  const sugTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  function setSugestao(item: ChecklistItem, value: string) {
    const existing = itens[item.key];
    if (!existing) return;
    setItens((p) => ({ ...p, [item.key]: { ...existing, sugestao_sistema: value } }));
    if (sugTimers.current[item.key]) clearTimeout(sugTimers.current[item.key]);
    sugTimers.current[item.key] = setTimeout(async () => {
      await supabase.from("itens_checklist").update({ sugestao_sistema: value }).eq("id", existing.id);
    }, 600);
  }

  /**
   * Garante que o item existe no banco antes de receber fotos.
   */
  async function garantirItem(cat: string, item: ChecklistItem): Promise<ItemRow | null> {
    if (!user) return null;
    const existing = itens[item.key];
    if (existing && existing.id) return existing;
    const ordem = checklist.flatMap((c: ChecklistCategoria) => c.itens).findIndex((i: ChecklistItem) => i.key === item.key);
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

    const baseOrdem = fotos.filter((f) => f.item_id === itemRow.id).length;

    const tarefas = arr.map(async (rawFile, idx) => {
      try {
        const file = await compressImage(rawFile);
        const ext = "jpg";
        const path = `${user.id}/${id}/${item.key}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("inspecao-fotos")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("inspecao-fotos").createSignedUrl(path, 60 * 60);
        const signedUrlStr = signed?.signedUrl ?? "";
        const { data, error } = await supabase
          .from("fotos")
          .insert({
            inspecao_id: id,
            item_id: itemRow.id,
            user_id: user.id,
            storage_path: path,
            url: signedUrlStr,
            ordem: baseOrdem + idx,
          })
          .select("id, item_id, url, storage_path, ordem, legenda")
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

  async function salvarLegenda(foto: FotoRow, legenda: string | null) {
    const { error } = await supabase.from("fotos").update({ legenda }).eq("id", foto.id);
    if (error) {
      toast.error("Erro ao salvar legenda");
      return;
    }
    setFotos((p) => p.map((f) => (f.id === foto.id ? { ...f, legenda } : f)));
    toast.success(legenda ? "Legenda salva" : "Legenda removida");
  }

  async function finalizarAvaliacao() {
    const all: { categoria: string; status: StatusItem }[] = Object.values(itens)
      .filter((i) => i.status)
      .map((i) => {
        const cat =
          checklist.find((c: ChecklistCategoria) => c.itens.some((it: ChecklistItem) => it.key === i.item_key))?.key || "";
        return { categoria: cat, status: i.status };
      });

    if (all.length === 0) {
      toast.error("Avalie pelo menos um item antes de finalizar.");
      return;
    }

    setFinalizando(true);
    const r = calcularScore(all, tipoVeiculo);
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
    setFinalizando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (typeof window !== "undefined") window.localStorage.removeItem(wizardStorageKey(id));
    navigate({ to: "/inspecao/$id/resumo", params: { id } });
  }

  const categoria = checklist[secaoAtual - 1];

  const pendentesSecao = useMemo(() => {
    if (!categoria) return [];
    return categoria.itens.filter((it) => !itens[it.key]?.status).map((it) => it.nome);
  }, [categoria, itens]);

  const totalAvaliado = Object.values(itens).filter((i) => i.status).length;
  const percentualPreenchido = totalItens > 0 ? Math.round((totalAvaliado / totalItens) * 100) : 0;

  function proximaSecao() {
    if (pendentesSecao.length > 0) {
      setErroValidacao(pendentesSecao);
      toast.error("Avalie todos os itens desta etapa para continuar.");
      return;
    }
    setErroValidacao(null);
    if (secaoAtual < totalSecoes) {
      setSecaoAtual(secaoAtual + 1);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      void finalizarAvaliacao();
    }
  }

  function secaoAnterior() {
    setErroValidacao(null);
    if (secaoAtual > 1) {
      setSecaoAtual(secaoAtual - 1);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const atualizarDados: ChecklistItemHandlers = {
    setStatus: (cat, item, status) => {
      setErroValidacao(null);
      void setStatus(cat, item, status);
    },
    setObs,
    setSugestao,
    uploadFotos: (cat, item, files) => void uploadFotos(cat, item, files),
    removerFoto: (foto) => void removerFoto(foto),
    reordenarFotos: (fotosItem, next) => {
      const ids = new Set(fotosItem.map((f) => f.id));
      setFotos((prev) => [...prev.filter((f) => !ids.has(f.id)), ...next.map((f, idx) => ({ ...f, ordem: idx }))]);
      void persistPhotoOrder(next.map((f) => f.id));
    },
    abrirExemplo: (item) => setExemploItem(item),
    abrirPreview: (foto) => setFotoPreview(foto.url),
    abrirLegenda: (foto) => setLegendaFoto(foto),
    abrirIA: (itemId, fotosItem) => setIaItem({ itemId, fotos: fotosItem }),
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const ultimaEtapa = secaoAtual >= totalSecoes;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="mb-1">
            <VehicleTypeBadge tipo={tipoVeiculo} size="sm" />
          </div>
          <h1 className="text-2xl font-bold">Checklist</h1>
          <p className="text-sm text-muted-foreground">
            {totalAvaliado} de {totalItens} itens avaliados
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

      {categoria && (
        <WizardProgress
          etapaAtual={secaoAtual}
          totalEtapas={totalSecoes}
          tituloEtapa={categoria.nome}
          emojiEtapa={categoria.emoji}
          percentualPreenchido={percentualPreenchido}
        />
      )}

      {erroValidacao && erroValidacao.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="text-sm">
              <p className="font-semibold text-destructive">
                {erroValidacao.length} item{erroValidacao.length > 1 ? "s" : ""} sem avaliação nesta etapa
              </p>
              <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                {erroValidacao.map((nome) => (
                  <li key={nome}>{nome}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {categoria && (
        <ChecklistSecao
          key={categoria.key}
          categoria={categoria}
          dados={{ itens, fotos, savingMap }}
          atualizarDados={atualizarDados}
        />
      )}

      {pendentesSecao.length === 0 && categoria && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> Etapa concluída — os dados são salvos automaticamente
        </div>
      )}

      <div className="sticky bottom-20 z-10 flex gap-2 rounded-xl border bg-card/95 p-3 shadow-card backdrop-blur sm:bottom-4">
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          onClick={secaoAnterior}
          disabled={secaoAtual === 1 || finalizando}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button
          size="lg"
          className="flex-1 gradient-primary text-primary-foreground"
          onClick={proximaSecao}
          disabled={finalizando}
        >
          {finalizando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : ultimaEtapa ? (
            <>Finalizar avaliação <ArrowRight className="ml-2 h-4 w-4" /></>
          ) : (
            <>Próxima <ArrowRight className="ml-2 h-4 w-4" /></>
          )}
        </Button>
      </div>

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

      <PhotoCaptionDialog
        open={!!legendaFoto}
        initial={legendaFoto?.legenda ?? null}
        imageUrl={legendaFoto?.url ?? null}
        onClose={() => setLegendaFoto(null)}
        onSave={(legenda) => {
          if (legendaFoto) void salvarLegenda(legendaFoto, legenda);
        }}
      />

      <Dialog open={!!fotoPreview} onOpenChange={(o) => !o && setFotoPreview(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto</DialogTitle>
            <DialogDescription>Visualização ampliada da foto</DialogDescription>
          </DialogHeader>
          {fotoPreview && <img src={fotoPreview} alt="Foto ampliada" className="max-h-[80vh] w-full rounded-md object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
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
