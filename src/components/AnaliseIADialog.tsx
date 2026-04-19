import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  analisarDanosIA,
  salvarDanos,
  SEVERIDADE_LABEL,
  TIPO_LABEL,
  type ResultadoFotoIA,
} from "@/lib/ia";

type FotoEntrada = { id: string; url: string; angulo?: string | null };

export function AnaliseIADialog({
  open,
  onOpenChange,
  fotos,
  inspecaoId,
  itemId,
  userId,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fotos: FotoEntrada[];
  inspecaoId: string;
  itemId?: string | null;
  userId: string;
  onSalvo?: (totalDanos: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<ResultadoFotoIA[]>([]);
  const [salvando, setSalvando] = useState(false);

  async function rodar() {
    setLoading(true);
    setResultados([]);
    try {
      const r = await analisarDanosIA(
        fotos.map((f) => ({ foto_id: f.id, url: f.url, angulo: f.angulo ?? null })),
      );
      setResultados(r);
      const total = r.reduce((acc, x) => acc + x.danos.length, 0);
      if (total === 0) toast.success("Nenhum dano detectado nas fotos analisadas.");
      else toast.success(`${total} dano${total > 1 ? "s" : ""} detectado${total > 1 ? "s" : ""}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao analisar");
    } finally {
      setLoading(false);
    }
  }

  async function salvar() {
    setSalvando(true);
    try {
      const { count } = await salvarDanos({
        user_id: userId,
        inspecao_id: inspecaoId,
        item_id: itemId ?? null,
        resultados,
      });
      toast.success(count > 0 ? "Danos registrados na inspeção." : "Nada a salvar.");
      onSalvo?.(count);
      onOpenChange(false);
      setResultados([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  const totalDanos = resultados.reduce((acc, r) => acc + r.danos.length, 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!loading && !salvando) onOpenChange(o);
        if (!o) setResultados([]);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Análise com IA
          </DialogTitle>
          <DialogDescription>
            {fotos.length} foto{fotos.length > 1 ? "s" : ""} ser{fotos.length > 1 ? "ão" : "á"} analisada{fotos.length > 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        {resultados.length === 0 ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              A IA vai detectar riscos, amassados, trincas, ferrugem e outros danos visíveis.
              Os resultados podem ser revisados antes de salvar.
            </div>
            <Button onClick={rodar} disabled={loading || fotos.length === 0} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Iniciar análise
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-medium">
              {totalDanos === 0 ? "Nenhum dano detectado." : `${totalDanos} dano${totalDanos > 1 ? "s" : ""} encontrado${totalDanos > 1 ? "s" : ""}:`}
            </div>
            <div className="max-h-[40vh] space-y-3 overflow-y-auto pr-1">
              {resultados.map((r, idx) => {
                const foto = fotos.find((f) => f.id === r.foto_id);
                return (
                  <div key={r.foto_id + idx} className="rounded-lg border p-2">
                    <div className="flex gap-3">
                      {foto && (
                        <img
                          src={foto.url}
                          alt="foto"
                          className="h-16 w-16 shrink-0 rounded object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1 text-xs">
                        {r.angulo && (
                          <div className="font-medium capitalize">{r.angulo.replace(/_/g, " ")}</div>
                        )}
                        {r.danos.length === 0 ? (
                          <div className="text-muted-foreground">Sem danos.</div>
                        ) : (
                          <ul className="space-y-1.5">
                            {r.danos.map((d, i) => (
                              <li key={i} className="rounded bg-muted/50 p-1.5">
                                <div className="flex items-center gap-1.5 font-semibold">
                                  <SeverityBadge severidade={d.severidade} />
                                  <span>{TIPO_LABEL[d.tipo] ?? d.tipo}</span>
                                  <span className="text-muted-foreground">· {d.localizacao}</span>
                                </div>
                                <div className="text-muted-foreground">{d.descricao}</div>
                                <div className="mt-0.5 text-[10px] text-muted-foreground">
                                  Confiança: {Math.round(d.confianca * 100)}%
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setResultados([])} disabled={salvando}>
                Refazer
              </Button>
              <Button className="flex-1" onClick={salvar} disabled={salvando || totalDanos === 0}>
                {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar danos
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
