import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import {
  Loader2,
  Camera,
  ImagePlus,
  Check,
  X,
  Sparkles,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { analisarDanosIA, salvarDanos, SEVERIDADE_LABEL, TIPO_LABEL, type ResultadoFotoIA } from "@/lib/ia";
import { signedUrls } from "@/lib/storage";
import { compressImage } from "@/lib/imageCompress";
import { SortablePhotoGrid } from "@/components/SortablePhotoGrid";
import { persistPhotoOrder } from "@/lib/photoOrder";
import { PhotoCaptionDialog } from "@/components/PhotoCaptionDialog";
import { normalizeVehicleType, type VehicleType } from "@/data/vehicleTypes";
import { VehicleTypeBadge } from "@/components/VehicleTypeBadge";

export const Route = createFileRoute("/inspecao/$id/inteligente")({
  head: () => ({
    meta: [
      { title: "Inspeção Inteligente — InspectAuto" },
      { name: "description", content: "Captura guiada de fotos com análise automática por IA." },
    ],
  }),
  component: InteligentePage,
});

const ANGULOS = [
  { key: "frontal", label: "Frente", grupo: "Exterior", dica: "Posicione-se a 2 m, capturando o veículo inteiro." },
  { key: "traseira", label: "Traseira", grupo: "Exterior", dica: "Inclua para-choque, lanternas e placa traseira." },
  { key: "lateral_esquerda", label: "Lateral esquerda", grupo: "Exterior", dica: "Toda a lateral, do farol à lanterna." },
  { key: "lateral_direita", label: "Lateral direita", grupo: "Exterior", dica: "Toda a lateral, do farol à lanterna." },
  { key: "diagonal_frente_esq", label: "Diagonal frente esq.", grupo: "Exterior", dica: "Mostra frente + lateral esquerda." },
  { key: "diagonal_tras_dir", label: "Diagonal traseira dir.", grupo: "Exterior", dica: "Mostra traseira + lateral direita." },
  { key: "teto", label: "Teto", grupo: "Exterior", dica: "Capture o teto se possível (de cima ou de uma rampa)." },
  { key: "rodas", label: "Rodas e pneus", grupo: "Exterior", dica: "Aproxime-se de cada roda, mostrando aro e banda do pneu." },
  { key: "painel", label: "Painel", grupo: "Interior", dica: "Mostre painel completo com odômetro ligado." },
  { key: "bancos_dianteiros", label: "Bancos dianteiros", grupo: "Interior", dica: "Estado dos estofados, costuras e regulagens." },
  { key: "bancos_traseiros", label: "Bancos traseiros", grupo: "Interior", dica: "Bancos de trás, encosto e cintos." },
  { key: "porta_malas", label: "Porta-malas", grupo: "Interior", dica: "Forração, estepe, ferramentas e fundo." },
  { key: "motor", label: "Motor", grupo: "Mecânica", dica: "Capô aberto: motor, fluidos e mangueiras." },
  { key: "detalhe", label: "Detalhe / zoom", grupo: "Outros", dica: "Foto aproximada de algum ponto suspeito." },
] as const;

const GRUPOS = ["Exterior", "Interior", "Mecânica", "Outros"] as const;

/** Mini diagrama SVG top-view do carro indicando de onde fotografar */
function AnguloSvg({ angulo }: { angulo: string }) {
  // Corpo do carro (vista de cima): retângulo arredondado centralizado em 60x40
  const car = { x: 18, y: 10, w: 44, h: 28, rx: 6 };
  // Seta de câmera: posição e rotação por ângulo
  const arrows: Record<string, { cx: number; cy: number; rot: number }> = {
    frontal:           { cx: 40, cy: 2,  rot: 180 },
    traseira:          { cx: 40, cy: 58, rot: 0   },
    lateral_esquerda:  { cx: 2,  cy: 28, rot: 90  },
    lateral_direita:   { cx: 78, cy: 28, rot: 270 },
    diagonal_frente_esq: { cx: 6,  cy: 4,  rot: 135 },
    diagonal_tras_dir:   { cx: 74, cy: 52, rot: 315 },
    teto:              { cx: 40, cy: 24, rot: 0   },
    rodas:             { cx: 18, cy: 40, rot: 270 },
    painel:            { cx: 40, cy: 18, rot: 180 },
    bancos_dianteiros: { cx: 40, cy: 22, rot: 180 },
    bancos_traseiros:  { cx: 40, cy: 38, rot: 0   },
    porta_malas:       { cx: 40, cy: 50, rot: 0   },
    motor:             { cx: 40, cy: 14, rot: 180 },
    detalhe:           { cx: 40, cy: 28, rot: 0   },
  };
  const arr = arrows[angulo] ?? arrows.frontal;
  const isInterior = ["painel", "bancos_dianteiros", "bancos_traseiros", "porta_malas", "motor"].includes(angulo);

  return (
    <svg viewBox="0 0 80 60" width="64" height="48" aria-hidden="true" style={{ flexShrink: 0 }}>
      {/* Sombra do carro */}
      <rect x={car.x + 1} y={car.y + 2} width={car.w} height={car.h} rx={car.rx} fill="rgba(0,0,0,0.08)" />
      {/* Corpo */}
      <rect x={car.x} y={car.y} width={car.w} height={car.h} rx={car.rx}
        fill={isInterior ? "#fde68a" : "#c7d2fe"}
        stroke={isInterior ? "#d97706" : "#6366f1"} strokeWidth="1.5" />
      {/* Capô/tampa do porta-malas (linha horizontal) */}
      <line x1={car.x + 4} y1={car.y + 8} x2={car.x + car.w - 4} y2={car.y + 8} stroke="#6366f1" strokeWidth="1" opacity="0.5" />
      <line x1={car.x + 4} y1={car.y + car.h - 8} x2={car.x + car.w - 4} y2={car.y + car.h - 8} stroke="#6366f1" strokeWidth="1" opacity="0.5" />
      {/* Câmera / posição do fotógrafo */}
      {angulo === "detalhe" ? (
        /* Para detalhe: ícone de lupa centralizado */
        <g transform={`translate(${arr.cx}, ${arr.cy})`}>
          <circle cx="0" cy="0" r="5" fill="none" stroke="#f59e0b" strokeWidth="1.8" />
          <line x1="3.5" y1="3.5" x2="6" y2="6" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      ) : isInterior ? (
        /* Para interior: ícone de câmera dentro do carro */
        <g transform={`translate(${arr.cx}, ${arr.cy})`}>
          <circle cx="0" cy="0" r="3.5" fill="#dc2626" />
          <circle cx="0" cy="0" r="1.5" fill="#fef2f2" />
        </g>
      ) : (
        /* Seta apontando para o carro */
        <g transform={`translate(${arr.cx}, ${arr.cy}) rotate(${arr.rot})`}>
          <polygon points="0,-5 4,3 0,1 -4,3" fill="#f59e0b" />
        </g>
      )}
    </svg>
  );
}

type FotoCapturada = {
  id: string;
  url: string;
  storage_path: string;
  angulo: string;
  ordem: number;
  legenda: string | null;
};

function InteligentePage() {
  const { id } = useParams({ from: "/inspecao/$id/inteligente" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tipoVeiculo, setTipoVeiculo] = useState<VehicleType>("carro");
  const [fotos, setFotos] = useState<FotoCapturada[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoFotoIA[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [legendaFoto, setLegendaFoto] = useState<FotoCapturada | null>(null);

  useEffect(() => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    Promise.all([
      supabase.from("inspecoes").select("tipo_veiculo").eq("id", id).single(),
      supabase
        .from("fotos")
        .select("id, url, storage_path, angulo, ordem, legenda")
        .eq("inspecao_id", id)
        .not("angulo", "is", null)
        .order("ordem")
        .order("created_at"),
    ]).then(async ([insRes, fotosRes]) => {
      setTipoVeiculo(normalizeVehicleType((insRes.data as { tipo_veiculo?: string } | null)?.tipo_veiculo));
      const rows = (fotosRes.data as FotoCapturada[]) || [];
      const urlMap = await signedUrls(rows.map((r) => r.storage_path).filter(Boolean));
      setFotos(rows.map((r) => ({ ...r, url: urlMap[r.storage_path] || r.url })));
      setLoading(false);
    });
  }, [id, user]);

  async function uploadAngulo(angulo: string, files: FileList | File[]) {
    if (!user) return;
    const arr = Array.from(files);
    if (arr.length === 0) return;

    const MAX_MB = 15; // bruto, antes da compressão
    for (const file of arr) {
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" não é uma imagem válida.`);
        return;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        toast.error(`"${file.name}" excede ${MAX_MB}MB. Reduza o tamanho e tente novamente.`);
        return;
      }
    }

    setUploading(angulo);
    const tid = toast.loading(arr.length === 1 ? "Enviando foto..." : `Enviando ${arr.length} fotos...`);

    // Próximo índice de ordem dentro do ângulo (começa de 0).
    const baseOrdem = fotos.filter((f) => f.angulo === angulo).length;

    // Comprime + faz upload de cada arquivo em paralelo (mais rápido e estável no celular).
    const tarefas = arr.map(async (rawFile, idx) => {
      try {
        const file = await compressImage(rawFile);
        const path = `${user.id}/${id}/ia-${angulo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
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
            user_id: user.id,
            storage_path: path,
            url: signedUrlStr,
            angulo,
            ordem: baseOrdem + idx,
          })
          .select("id, url, storage_path, angulo, ordem, legenda")
          .single();
        if (error) throw error;
        return data as FotoCapturada;
      } catch (e) {
        console.error("upload IA falhou:", e);
        return null;
      }
    });

    try {
      const resultados = await Promise.all(tarefas);
      const novas = resultados.filter((r): r is FotoCapturada => r !== null);
      if (novas.length > 0) setFotos((p) => [...p, ...novas]);
      toast.dismiss(tid);
      if (novas.length === arr.length) {
        toast.success(novas.length === 1 ? "Foto adicionada" : `${novas.length} fotos adicionadas`);
      } else if (novas.length > 0) {
        toast.warning(`${novas.length} de ${arr.length} fotos enviadas.`);
      } else {
        toast.error("Falha no envio. Tente novamente.");
      }
    } finally {
      setUploading(null);
    }
  }

  async function removerFoto(foto: FotoCapturada) {
    await supabase.storage.from("inspecao-fotos").remove([foto.storage_path]);
    await supabase.from("fotos").delete().eq("id", foto.id);
    setFotos((p) => p.filter((f) => f.id !== foto.id));
    setResultados((p) => p.filter((r) => r.foto_id !== foto.id));
  }

  async function salvarLegenda(foto: FotoCapturada, legenda: string | null) {
    const { error } = await supabase.from("fotos").update({ legenda }).eq("id", foto.id);
    if (error) {
      toast.error("Erro ao salvar legenda");
      return;
    }
    setFotos((p) => p.map((f) => (f.id === foto.id ? { ...f, legenda } : f)));
    toast.success(legenda ? "Legenda salva" : "Legenda removida");
  }

  async function rodarAnalise() {
    if (fotos.length === 0) {
      toast.error("Capture ao menos uma foto.");
      return;
    }
    setAnalisando(true);
    setResultados([]);
    try {
      const r = await analisarDanosIA(
        fotos.map((f) => ({ foto_id: f.id, url: f.url, angulo: f.angulo })),
      );
      setResultados(r);
      const total = r.reduce((acc, x) => acc + x.danos.length, 0);
      if (total === 0) toast.success("Nenhum dano detectado.");
      else toast.success(`${total} dano${total > 1 ? "s" : ""} detectado${total > 1 ? "s" : ""}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao analisar");
    } finally {
      setAnalisando(false);
    }
  }

  async function salvar() {
    if (!user) return;
    setSalvando(true);
    try {
      const { count } = await salvarDanos({
        user_id: user.id,
        inspecao_id: id,
        item_id: null,
        resultados,
      });
      toast.success(count > 0 ? `${count} dano(s) registrado(s).` : "Nada a salvar.");
      navigate({ to: "/inspecao/$id/resumo", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  const totalDanos = resultados.reduce((acc, r) => acc + r.danos.length, 0);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link to="/inspecao/$id/checklist" params={{ id }} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="mb-1"><VehicleTypeBadge tipo={tipoVeiculo} size="sm" /></div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Inspeção Inteligente
          </h1>
          <p className="text-sm text-muted-foreground">Capture as fotos guiadas e a IA detecta os danos.</p>
        </div>
      </div>

      <Card className="p-3">
        <div className="text-xs text-muted-foreground">
          {fotos.length === 0
            ? "Comece capturando ao menos a frente, traseira e laterais."
            : `${fotos.length} foto${fotos.length > 1 ? "s" : ""} capturada${fotos.length > 1 ? "s" : ""}.`}
        </div>
      </Card>

      <div className="space-y-5">
        {GRUPOS.map((grupo) => {
          const angulosDoGrupo = ANGULOS.filter((a) => a.grupo === grupo);
          if (angulosDoGrupo.length === 0) return null;
          const totalGrupo = angulosDoGrupo.reduce(
            (acc, a) => acc + fotos.filter((f) => f.angulo === a.key).length,
            0,
          );
          return (
            <section key={grupo} className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-1">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{grupo}</h2>
                <span className="text-[10px] text-muted-foreground">{totalGrupo} foto{totalGrupo !== 1 ? "s" : ""}</span>
              </div>
              {angulosDoGrupo.map((a) => {
                const fs = fotos
                  .filter((f) => f.angulo === a.key)
                  .sort((x, y) => x.ordem - y.ordem);
                const isUp = uploading === a.key;
                return (
                  <Card key={a.key} className="p-4">
                    <div className="flex items-start gap-3">
                      <AnguloSvg angulo={a.key} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold">{a.label}</div>
                          {fs.length > 0 && (
                            <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success shrink-0">
                              <Check className="inline h-3 w-3" /> {fs.length}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{a.dica}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-3 py-2 text-xs font-medium hover:bg-accent">
                        {isUp ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Camera className="h-3.5 w-3.5" />
                        )}
                        Câmera
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          multiple
                          className="hidden"
                          disabled={isUp}
                          onChange={(e) => {
                            const fl = e.target.files;
                            if (fl && fl.length) uploadAngulo(a.key, fl);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-3 py-2 text-xs font-medium hover:bg-accent">
                        <ImagePlus className="h-3.5 w-3.5" /> Galeria
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          disabled={isUp}
                          onChange={(e) => {
                            const fl = e.target.files;
                            if (fl && fl.length) uploadAngulo(a.key, fl);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>

                    {fs.length > 0 && (
                      <div className="mt-3">
                        <SortablePhotoGrid
                          photos={fs}
                          alt={a.label}
                          onPreview={(f) => setPreviewUrl(f.url)}
                          onRemove={(f) => removerFoto(f)}
                          onEditCaption={(f) => setLegendaFoto(f)}
                          renderBadge={(f) => {
                            const danosFoto = resultados.find((r) => r.foto_id === f.id)?.danos ?? [];
                            if (danosFoto.length === 0) return null;
                            return (
                              <span className="pointer-events-none absolute top-1 left-1 rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-bold text-destructive-foreground">
                                {danosFoto.length}
                              </span>
                            );
                          }}
                          onReorder={(next) => {
                            const otherIds = new Set(fs.map((f) => f.id));
                            setFotos((prev) => [
                              ...prev.filter((f) => !otherIds.has(f.id)),
                              ...next.map((f, idx) => ({ ...f, ordem: idx })),
                            ]);
                            void persistPhotoOrder(next.map((f) => f.id));
                          }}
                        />
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Toque no lápis para legendar · segure e arraste para reordenar
                        </p>
                      </div>
                    )}
                  </Card>
                );
              })}
            </section>
          );
        })}
      </div>

      {resultados.length > 0 && (
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">
              Resultado da IA · {totalDanos} dano{totalDanos !== 1 ? "s" : ""}
            </h2>
          </div>
          {totalDanos === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum dano visível detectado.</p>
          ) : (
            <ul className="space-y-2">
              {resultados.flatMap((r, ridx) =>
                r.danos.map((d, didx) => (
                  <li key={`${ridx}-${didx}`} className="flex items-start gap-2 rounded-lg bg-muted/50 p-2 text-xs">
                    <SeverityBadge severidade={d.severidade} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">
                        {TIPO_LABEL[d.tipo] ?? d.tipo} · {d.localizacao}
                      </div>
                      <div className="text-muted-foreground">{d.descricao}</div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        Confiança {Math.round(d.confianca * 100)}%
                        {r.angulo ? ` · ${r.angulo.replace(/_/g, " ")}` : ""}
                      </div>
                    </div>
                  </li>
                )),
              )}
            </ul>
          )}
        </Card>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={rodarAnalise}
          disabled={analisando || fotos.length === 0}
          className="flex-1 gradient-primary text-primary-foreground"
          size="lg"
        >
          {analisando ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" /> {resultados.length > 0 ? "Refazer análise" : "Analisar com IA"}
            </>
          )}
        </Button>
        {resultados.length > 0 && (
          <Button onClick={salvar} disabled={salvando} size="lg" variant="default" className="flex-1">
            {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar e ver resumo
          </Button>
        )}
      </div>

      <PhotoCaptionDialog
        open={!!legendaFoto}
        initial={legendaFoto?.legenda ?? null}
        imageUrl={legendaFoto?.url ?? null}
        onClose={() => setLegendaFoto(null)}
        onSave={(legenda) => {
          if (legendaFoto) void salvarLegenda(legendaFoto, legenda);
        }}
      />

      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto</DialogTitle>
            <DialogDescription>Visualização ampliada</DialogDescription>
          </DialogHeader>
          {previewUrl && <img src={previewUrl} alt="Foto" className="max-h-[80vh] w-full rounded-md object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SeverityBadge({ severidade }: { severidade: string }) {
  const cor =
    severidade === "grave"
      ? "bg-destructive text-destructive-foreground"
      : severidade === "moderado"
        ? "bg-warning text-warning-foreground"
        : "bg-success text-success-foreground";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${cor}`}>
      <AlertTriangle className="h-2.5 w-2.5" />
      {SEVERIDADE_LABEL[severidade] ?? severidade}
    </span>
  );
}
