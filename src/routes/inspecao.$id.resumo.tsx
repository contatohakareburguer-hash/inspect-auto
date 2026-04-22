import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Download, Share2, ArrowLeft, Trash2, AlertTriangle, Sparkles, PenLine } from "lucide-react";
import { toast } from "sonner";
import { calcularScore, type StatusItem } from "@/lib/scoring";
import { getChecklist, normalizeVehicleType, type VehicleType } from "@/data/vehicleTypes";
import { VehicleTypeBadge } from "@/components/VehicleTypeBadge";
import { gerarPdfInspecao, type PdfInspecao, type PdfItem, type PdfFoto, type PdfDano } from "@/lib/pdf";
import { SEVERIDADE_LABEL, TIPO_LABEL } from "@/lib/ia";
import { signedUrls } from "@/lib/storage";
import { SignaturePad } from "@/components/SignaturePad";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/inspecao/$id/resumo")({
  head: () => ({
    meta: [
      { title: "Resumo da inspeção — InspectAuto" },
      { name: "description", content: "Score, classificação e relatório PDF da inspeção." },
    ],
  }),
  component: ResumoPage,
});

function ResumoPage() {
  const { id } = useParams({ from: "/inspecao/$id/resumo" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [inspecao, setInspecao] = useState<PdfInspecao | null>(null);
  const [itens, setItens] = useState<PdfItem[]>([]);
  const [fotos, setFotos] = useState<PdfFoto[]>([]);
  const [danos, setDanos] = useState<Array<{ id: string; tipo: string; severidade: string; localizacao: string | null; descricao: string | null; confianca: number | null; angulo: string | null; foto_id: string | null }>>([]);
  const [gerando, setGerando] = useState(false);
  const [assinaturaVistoriador, setAssinaturaVistoriador] = useState<string | null>(null);
  const [assinaturaCliente, setAssinaturaCliente] = useState<string | null>(null);
  const [nomeCliente, setNomeCliente] = useState("");
  const [salvandoAss, setSalvandoAss] = useState(false);
  const [tipoVeiculo, setTipoVeiculo] = useState<VehicleType>("carro");
  const checklistAtivo = getChecklist(tipoVeiculo);

  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("inspecoes").select("*").eq("id", id).single(),
      supabase
        .from("itens_checklist")
        .select("id, item_key, item_nome, categoria, status, observacao_usuario, sugestao_sistema")
        .eq("inspecao_id", id)
        .order("ordem"),
      supabase
        .from("fotos")
        .select("url, item_id, storage_path, ordem, legenda")
        .eq("inspecao_id", id)
        .order("ordem")
        .order("created_at"),
      supabase
        .from("danos_detectados")
        .select("id, tipo, severidade, localizacao, descricao, confianca, angulo, foto_id")
        .eq("inspecao_id", id)
        .order("created_at", { ascending: false }),
    ]).then(async ([insRes, itRes, foRes, daRes]) => {
      if (insRes.error) { toast.error("Erro ao carregar inspeção: " + insRes.error.message); setLoading(false); return; }
      if (itRes.error) toast.error("Erro ao carregar checklist: " + itRes.error.message);
      if (foRes.error) toast.error("Erro ao carregar fotos: " + foRes.error.message);
      if (daRes.error) toast.error("Erro ao carregar danos: " + daRes.error.message);

      if (insRes.data) {
        const ins = insRes.data as PdfInspecao & { assinatura_vistoriador?: string | null; assinatura_cliente?: string | null; nome_cliente?: string | null; tipo_veiculo?: string | null };
        setInspecao(ins);
        setTipoVeiculo(normalizeVehicleType(ins.tipo_veiculo));
        setAssinaturaVistoriador(ins.assinatura_vistoriador ?? null);
        setAssinaturaCliente(ins.assinatura_cliente ?? null);
        setNomeCliente(ins.nome_cliente ?? "");
      }
      setItens((itRes.data as PdfItem[]) || []);
      const fRows = ((foRes.data as Array<PdfFoto & { storage_path?: string }>) || []);
      const paths = fRows.map((f) => f.storage_path || "").filter(Boolean);
      const urlMap = await signedUrls(paths);
      setFotos(
        fRows.map((f) => ({
          ...f,
          url: (f.storage_path && urlMap[f.storage_path]) || "",
        })),
      );
      setDanos((daRes.data as any[]) || []);
      setLoading(false);

      // Salvar score e classificação no banco (calculado a partir dos itens)
      if (insRes.data && itRes.data) {
        const itensAvaliados = (itRes.data as PdfItem[]).filter((i) => i.status);
        const res = calcularScore(
          itensAvaliados.map((i) => ({ categoria: i.categoria, status: i.status as StatusItem }))
        );
        await supabase.from("inspecoes").update({
          score_total: res.scoreTotal,
          classificacao_final: res.classificacao,
          status: "finalizada",
        }).eq("id", id);
      }
    }).catch((e) => {
      toast.error("Erro inesperado ao carregar inspeção.");
      console.error(e);
      setLoading(false);
    });
  }, [id, user]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!inspecao) {
    return <p className="text-center text-muted-foreground">Inspeção não encontrada.</p>;
  }

  const itensComStatus = itens.filter((i) => i.status);
  const resultado = calcularScore(
    itensComStatus.map((i) => ({ categoria: i.categoria, status: i.status as StatusItem })),
    tipoVeiculo,
  );

  const corClass: Record<string, string> = {
    success: "bg-success text-success-foreground",
    warning: "bg-warning text-warning-foreground",
    destructive: "bg-destructive text-destructive-foreground",
  };

  async function baixarPdf() {
    if (!inspecao) return;
    setGerando(true);
    try {
      const blob = await gerarPdfInspecao({
        inspecao,
        itens,
        fotos,
        resultado,
        danos: danos as PdfDano[],
        assinaturaVistoriador,
        assinaturaCliente,
        nomeCliente,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inspecao-${(inspecao.placa || "veiculo").replace(/\s/g, "")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF gerado");
    } catch (e: any) {
      toast.error("Erro ao gerar PDF: " + e.message);
    } finally {
      setGerando(false);
    }
  }

  async function salvarAssinaturas() {
    setSalvandoAss(true);
    const { error } = await supabase
      .from("inspecoes")
      .update({
        assinatura_vistoriador: assinaturaVistoriador,
        assinatura_cliente: assinaturaCliente,
        nome_cliente: nomeCliente || null,
      })
      .eq("id", id);
    setSalvandoAss(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Assinaturas salvas");
  }

  async function compartilharWhatsapp() {
    const texto = `📋 Relatório de Inspeção Veicular\n\n🚗 ${inspecao!.nome_veiculo || ""} ${inspecao!.placa ? "(" + inspecao!.placa + ")" : ""}\n📊 Score: ${resultado.scoreTotal}\n🎯 Classificação: ${resultado.classificacao}\n💡 Recomendação: ${resultado.conclusao}\n\n✅ OK: ${resultado.totalOk}\n⚠️ Atenção: ${resultado.totalAtencao}\n❌ Graves: ${resultado.totalGraves}\n\nGerado por InspectAuto`;
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  }

  async function excluir() {
    const { error } = await supabase.from("inspecoes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Inspeção excluída");
      navigate({ to: "/" });
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <Link to="/" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="mb-1"><VehicleTypeBadge tipo={tipoVeiculo} size="sm" /></div>
        <h1 className="text-2xl font-bold">{inspecao.nome_veiculo || "Inspeção"}</h1>
        <p className="text-sm text-muted-foreground">
          {inspecao.placa && <>Placa {inspecao.placa} · </>}
          {inspecao.km && <>{Number(inspecao.km).toLocaleString("pt-BR")} km</>}
        </p>
      </div>

      <Card className={`p-6 shadow-elevated ${corClass[resultado.classificacaoColor]}`}>
        <div className="text-xs font-semibold uppercase opacity-80">Classificação</div>
        <div className="mt-1 text-3xl font-bold">{resultado.classificacao}</div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-xs opacity-80">Score total</div>
            <div className="text-4xl font-bold">{resultado.scoreTotal}</div>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-80">Recomendação</div>
            <div className="text-2xl font-bold">{resultado.conclusao}</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-success">{resultado.totalOk}</div>
          <div className="text-xs text-muted-foreground">OK</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-warning">{resultado.totalAtencao}</div>
          <div className="text-xs text-muted-foreground">Atenção</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-destructive">{resultado.totalGraves}</div>
          <div className="text-xs text-muted-foreground">Graves</div>
        </Card>
      </div>

      {resultado.alertas.length > 0 && (
        <Card className="p-4 border-l-4 border-l-destructive">
          <div className="mb-2 flex items-center gap-2 font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" /> Alertas críticos
          </div>
          <ul className="space-y-1 text-sm">
            {resultado.alertas.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={baixarPdf} disabled={gerando} className="gradient-primary text-primary-foreground" size="lg">
          {gerando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          PDF
        </Button>
        <Button onClick={compartilharWhatsapp} variant="outline" size="lg">
          <Share2 className="mr-2 h-4 w-4" /> WhatsApp
        </Button>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Detalhamento</h2>
        <div className="space-y-3">
          {checklistAtivo.map((cat) => {
            const list = itensComStatus.filter((i) => i.categoria === cat.key);
            if (list.length === 0) return null;
            return (
              <Card key={cat.key} className="overflow-hidden">
                <div className="border-b bg-muted/40 px-4 py-2 text-sm font-semibold">
                  {cat.emoji} {cat.nome}
                </div>
                <div className="divide-y">
                  {list.map((i) => {
                    const cor =
                      i.status === "ok"
                        ? "text-success"
                        : i.status === "atencao"
                        ? "text-warning"
                        : "text-destructive";
                    const lbl =
                      i.status === "ok" ? "OK" : i.status === "atencao" ? "Atenção" : "Grave";
                    return (
                      <div key={i.item_key} className="p-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium">{i.item_nome}</div>
                          <span className={`text-xs font-bold ${cor}`}>{lbl}</span>
                        </div>
                        {i.observacao_usuario && (
                          <p className="mt-1 text-xs text-muted-foreground">📝 {i.observacao_usuario}</p>
                        )}
                        {i.sugestao_sistema && i.status !== "ok" && (
                          <p className="mt-1 text-xs text-muted-foreground">💡 {i.sugestao_sistema}</p>
                        )}
                        {(() => {
                          const fs = fotos.filter((f) => f.item_id && f.item_id === (i as PdfItem & { id?: string }).id);
                          if (fs.length === 0) return null;
                          return (
                            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                              {fs.map((f, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setFotoPreview(f.url)}
                                  className="shrink-0 text-left"
                                  title={f.legenda ?? undefined}
                                >
                                  <img
                                    src={f.url}
                                    alt={`evidência ${idx + 1}`}
                                    className="h-16 w-16 rounded-md object-cover"
                                    loading="lazy"
                                  />
                                  {f.legenda && (
                                    <p className="mt-1 line-clamp-2 max-w-[64px] text-[9px] text-muted-foreground">
                                      {f.legenda}
                                    </p>
                                  )}
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>

        {danos.length > 0 && (
          <div className="mt-3">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-primary" /> Danos detectados pela IA
            </h2>
            <Card className="divide-y">
              {danos.map((d) => {
                const corSev =
                  d.severidade === "grave"
                    ? "bg-destructive text-destructive-foreground"
                    : d.severidade === "moderado"
                      ? "bg-warning text-warning-foreground"
                      : "bg-success text-success-foreground";
                return (
                  <div key={d.id} className="p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold">
                        {TIPO_LABEL[d.tipo] ?? d.tipo}
                        {d.localizacao && <span className="text-muted-foreground"> · {d.localizacao}</span>}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${corSev}`}>
                        {SEVERIDADE_LABEL[d.severidade] ?? d.severidade}
                      </span>
                    </div>
                    {d.descricao && <p className="mt-1 text-xs text-muted-foreground">{d.descricao}</p>}
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {d.confianca != null && <>Confiança {Math.round((d.confianca || 0) * 100)}%</>}
                      {d.angulo && <> · {d.angulo.replace(/_/g, " ")}</>}
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        )}
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <PenLine className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Assinaturas</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SignaturePad
            label="Vistoriador responsável"
            value={assinaturaVistoriador}
            onChange={setAssinaturaVistoriador}
          />
          <div className="space-y-2">
            <SignaturePad
              label="Cliente / proprietário"
              value={assinaturaCliente}
              onChange={setAssinaturaCliente}
            />
            <div>
              <Label htmlFor="nome_cliente" className="text-xs">Nome do cliente</Label>
              <Input
                id="nome_cliente"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                placeholder="Nome completo"
                className="h-9"
              />
            </div>
          </div>
        </div>
        <Button
          onClick={salvarAssinaturas}
          disabled={salvandoAss}
          variant="outline"
          className="mt-3 w-full"
        >
          {salvandoAss ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Salvar assinaturas
        </Button>
      </Card>

      <div className="flex gap-2 pt-4">
        <Button asChild variant="outline" className="flex-1">
          <Link to="/inspecao/$id/checklist" params={{ id }}>Editar checklist</Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir inspeção?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação é permanente. Todas as fotos e itens serão removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={excluir} className="bg-destructive text-destructive-foreground">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Dialog open={!!fotoPreview} onOpenChange={(o) => !o && setFotoPreview(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto</DialogTitle>
            <DialogDescription>Visualização ampliada</DialogDescription>
          </DialogHeader>
          {fotoPreview && (
            <img src={fotoPreview} alt="Foto ampliada" className="max-h-[80vh] w-full rounded-md object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
