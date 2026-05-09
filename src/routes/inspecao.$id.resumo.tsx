import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Download, Share2, ArrowLeft, Trash2, AlertTriangle, Sparkles, PenLine, CheckCircle2, AlertCircle, XCircle, Gauge, FileText, Award, TrendingUp, Calendar, Car } from "lucide-react";
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
        const tipoSalvo = normalizeVehicleType((insRes.data as { tipo_veiculo?: string }).tipo_veiculo);
        const itensAvaliados = (itRes.data as PdfItem[]).filter((i) => i.status);
        const res = calcularScore(
          itensAvaliados.map((i) => ({ categoria: i.categoria, status: i.status as StatusItem })),
          tipoSalvo,
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

  const corGradient: Record<string, string> = {
    success: "from-success/95 via-success to-success/85",
    warning: "from-warning/95 via-warning to-warning/85",
    destructive: "from-destructive/95 via-destructive to-destructive/85",
  };
  const corText: Record<string, string> = {
    success: "text-success-foreground",
    warning: "text-warning-foreground",
    destructive: "text-destructive-foreground",
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

  // Geometry for circular score gauge
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const scorePct = Math.max(0, Math.min(100, resultado.scoreTotal));
  const dashOffset = circumference - (scorePct / 100) * circumference;

  const totalAvaliados = resultado.totalOk + resultado.totalAtencao + resultado.totalGraves;
  const pctOk = totalAvaliados ? (resultado.totalOk / totalAvaliados) * 100 : 0;
  const pctAtencao = totalAvaliados ? (resultado.totalAtencao / totalAvaliados) * 100 : 0;
  const pctGraves = totalAvaliados ? (resultado.totalGraves / totalAvaliados) * 100 : 0;

  const dataInsp = (inspecao as { created_at?: string }).created_at
    ? new Date((inspecao as { created_at?: string }).created_at as string)
    : null;

  return (
    <div className="space-y-5 pb-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      {/* HERO CARD */}
      <Card className={`relative overflow-hidden border-0 bg-gradient-to-br shadow-elevated ${corGradient[resultado.classificacaoColor]} ${corText[resultado.classificacaoColor]}`}>
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-black/15 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "16px 16px",
          }}
        />

        <div className="relative p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <VehicleTypeBadge tipo={tipoVeiculo} size="sm" />
              <h1 className="mt-2 truncate text-2xl font-bold leading-tight">
                {inspecao.nome_veiculo || "Inspeção"}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs opacity-90">
                {inspecao.placa && (
                  <span className="inline-flex items-center gap-1"><Car className="h-3 w-3" /> {inspecao.placa}</span>
                )}
                {inspecao.km && <span>{Number(inspecao.km).toLocaleString("pt-BR")} km</span>}
                {dataInsp && (
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{dataInsp.toLocaleDateString("pt-BR")}</span>
                )}
              </div>
            </div>

            {/* Circular gauge */}
            <div className="relative shrink-0">
              <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
                <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="opacity-20" />
                <circle
                  cx="60" cy="60" r={radius}
                  fill="none" stroke="currentColor" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{ transition: "stroke-dashoffset 1s ease-out" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold leading-none">{resultado.scoreTotal}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">/ 100</div>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-white/15 p-3 ring-1 ring-white/20 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Classificação</div>
            </div>
            <div className="mt-0.5 text-xl font-bold">{resultado.classificacao}</div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span className="font-medium">{resultado.conclusao}</span>
            </div>
          </div>

          {totalAvaliados > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider opacity-80">
                <span>Distribuição dos itens</span>
                <span>{totalAvaliados} avaliados</span>
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/20">
                {pctOk > 0 && <div className="bg-white/95" style={{ width: `${pctOk}%` }} />}
                {pctAtencao > 0 && <div className="bg-white/60" style={{ width: `${pctAtencao}%` }} />}
                {pctGraves > 0 && <div className="bg-black/40" style={{ width: `${pctGraves}%` }} />}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* STAT CARDS */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="relative overflow-hidden border-success/20 bg-gradient-to-br from-success/5 to-success/10 p-3 transition-all active:scale-95 hover:shadow-card">
          <CheckCircle2 className="absolute -right-2 -top-2 h-12 w-12 text-success/15" />
          <div className="relative">
            <div className="text-2xl font-bold text-success">{resultado.totalOk}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">OK</div>
          </div>
        </Card>
        <Card className="relative overflow-hidden border-warning/20 bg-gradient-to-br from-warning/5 to-warning/10 p-3 transition-all active:scale-95 hover:shadow-card">
          <AlertCircle className="absolute -right-2 -top-2 h-12 w-12 text-warning/15" />
          <div className="relative">
            <div className="text-2xl font-bold text-warning">{resultado.totalAtencao}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Atenção</div>
          </div>
        </Card>
        <Card className="relative overflow-hidden border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10 p-3 transition-all active:scale-95 hover:shadow-card">
          <XCircle className="absolute -right-2 -top-2 h-12 w-12 text-destructive/15" />
          <div className="relative">
            <div className="text-2xl font-bold text-destructive">{resultado.totalGraves}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Graves</div>
          </div>
        </Card>
      </div>

      {resultado.alertas.length > 0 && (
        <Card className="overflow-hidden border-destructive/30 bg-gradient-to-br from-destructive/5 to-transparent p-0">
          <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-2.5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <div className="text-sm font-bold text-destructive">Alertas críticos</div>
            <span className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
              {resultado.alertas.length}
            </span>
          </div>
          <ul className="space-y-1.5 p-4 text-sm">
            {resultado.alertas.map((a, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={baixarPdf} disabled={gerando} className="gradient-primary text-primary-foreground shadow-card active:scale-95" size="lg">
          {gerando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          Gerar PDF
        </Button>
        <Button onClick={compartilharWhatsapp} variant="outline" size="lg" className="active:scale-95">
          <Share2 className="mr-2 h-4 w-4" /> WhatsApp
        </Button>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Detalhamento</h2>
        </div>
        <div className="space-y-3">
          {checklistAtivo.map((cat) => {
            const list = itensComStatus.filter((i) => i.categoria === cat.key);
            if (list.length === 0) return null;
            const okCount = list.filter((i) => i.status === "ok").length;
            const atCount = list.filter((i) => i.status === "atencao").length;
            const grCount = list.filter((i) => i.status === "grave").length;
            return (
              <Card key={cat.key} className="overflow-hidden border-border/60 shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b bg-gradient-to-r from-muted/60 to-muted/20 px-4 py-2.5">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="text-base">{cat.emoji}</span>
                    {cat.nome}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                    {okCount > 0 && <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-success">{okCount}</span>}
                    {atCount > 0 && <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-warning">{atCount}</span>}
                    {grCount > 0 && <span className="rounded-full bg-destructive/15 px-1.5 py-0.5 text-destructive">{grCount}</span>}
                  </div>
                </div>
                <div className="divide-y">
                  {list.map((i) => {
                    const isOk = i.status === "ok";
                    const isAt = i.status === "atencao";
                    const cor = isOk ? "text-success" : isAt ? "text-warning" : "text-destructive";
                    const bgBadge = isOk ? "bg-success/10" : isAt ? "bg-warning/10" : "bg-destructive/10";
                    const bgBorder = isOk ? "border-l-success/60" : isAt ? "border-l-warning/60" : "border-l-destructive/60";
                    const Icon = isOk ? CheckCircle2 : isAt ? AlertCircle : XCircle;
                    const lbl = isOk ? "OK" : isAt ? "Atenção" : "Grave";
                    return (
                      <div key={i.item_key} className={`border-l-2 ${bgBorder} p-3 text-sm`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium">{i.item_nome}</div>
                          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${cor} ${bgBadge}`}>
                            <Icon className="h-3 w-3" /> {lbl}
                          </span>
                        </div>
                        {i.observacao_usuario && (
                          <p className="mt-1.5 rounded-md bg-muted/60 px-2 py-1 text-xs text-muted-foreground">📝 {i.observacao_usuario}</p>
                        )}
                        {i.sugestao_sistema && i.status !== "ok" && (
                          <p className="mt-1.5 rounded-md bg-primary/5 px-2 py-1 text-xs text-muted-foreground">💡 {i.sugestao_sistema}</p>
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
                                  className="shrink-0 text-left transition-transform active:scale-95"
                                  title={f.legenda ?? undefined}
                                >
                                  <img
                                    src={f.url}
                                    alt={`evidência ${idx + 1}`}
                                    className="h-16 w-16 rounded-lg object-cover ring-1 ring-border"
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
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Danos detectados pela IA</h2>
              <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{danos.length}</span>
            </div>
            <Card className="divide-y overflow-hidden">
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

      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b bg-gradient-to-r from-primary/10 to-transparent px-4 py-3">
          <PenLine className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Assinaturas</h2>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
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
        <div className="border-t bg-muted/20 px-4 py-3">
          <Button
            onClick={salvarAssinaturas}
            disabled={salvandoAss}
            variant="outline"
            className="w-full active:scale-95"
          >
            {salvandoAss ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar assinaturas
          </Button>
        </div>
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
