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
  { key: "frontal", label: "Frente", dica: "Posicione-se a 2 m, capturando o veículo inteiro." },
  { key: "traseira", label: "Traseira", dica: "Inclua para-choque, lanternas e placa traseira." },
  { key: "lateral_esquerda", label: "Lateral esquerda", dica: "Toda a lateral, do farol à lanterna." },
  { key: "lateral_direita", label: "Lateral direita", dica: "Toda a lateral, do farol à lanterna." },
  { key: "diagonal_frente_esq", label: "Diagonal frente esq.", dica: "Mostra frente + lateral esquerda." },
  { key: "diagonal_tras_dir", label: "Diagonal traseira dir.", dica: "Mostra traseira + lateral direita." },
  { key: "detalhe", label: "Detalhe / zoom", dica: "Foto aproximada de algum ponto suspeito." },
] as const;

type FotoCapturada = {
  id: string;
  url: string;
  storage_path: string;
  angulo: string;
};

function InteligentePage() {
  const { id } = useParams({ from: "/inspecao/$id/inteligente" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [fotos, setFotos] = useState<FotoCapturada[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoFotoIA[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("fotos")
      .select("id, url, storage_path, angulo")
      .eq("inspecao_id", id)
      .not("angulo", "is", null)
      .then(({ data }) => {
        setFotos((data as FotoCapturada[]) || []);
        setLoading(false);
      });
  }, [id, user]);

  async function uploadAngulo(angulo: string, files: FileList | File[]) {
    if (!user) return;
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setUploading(angulo);
    try {
      for (const file of arr) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${id}/ia-${angulo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
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
            user_id: user.id,
            storage_path: path,
            url: pub.publicUrl,
            angulo,
          })
          .select("id, url, storage_path, angulo")
          .single();
        if (error) toast.error(error.message);
        else if (data) setFotos((p) => [...p, data as FotoCapturada]);
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
        <div>
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

      <div className="space-y-3">
        {ANGULOS.map((a) => {
          const fs = fotos.filter((f) => f.angulo === a.key);
          const isUp = uploading === a.key;
          return (
            <Card key={a.key} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="font-semibold">{a.label}</div>
                  <div className="text-xs text-muted-foreground">{a.dica}</div>
                </div>
                {fs.length > 0 && (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                    <Check className="inline h-3 w-3" /> {fs.length}
                  </span>
                )}
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
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {fs.map((f) => {
                    const danosFoto = resultados.find((r) => r.foto_id === f.id)?.danos ?? [];
                    return (
                      <div key={f.id} className="relative shrink-0">
                        <button type="button" onClick={() => setPreviewUrl(f.url)}>
                          <img src={f.url} alt={a.label} className="h-20 w-20 rounded-lg object-cover" loading="lazy" />
                        </button>
                        {danosFoto.length > 0 && (
                          <span className="absolute bottom-1 left-1 rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-bold text-destructive-foreground">
                            {danosFoto.length}
                          </span>
                        )}
                        <button
                          onClick={() => removerFoto(f)}
                          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
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
          <Button onClick={salvar} disabled={salvando || totalDanos === 0} size="lg" variant="default" className="flex-1">
            {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar e ver resumo
          </Button>
        )}
      </div>

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
