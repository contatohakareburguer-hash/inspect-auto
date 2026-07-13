import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Car, AlertCircle, DollarSign, MapPin, Calendar, Palette, Hash } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/consulta-placa")({
  head: () => ({
    meta: [
      { title: "Consulta de placa — InspectAuto" },
      { name: "description", content: "Consulte dados do veículo e tabela FIPE pela placa." },
    ],
  }),
  component: ConsultaPlacaPage,
});

const PLACA_REGEX = /^[A-Z]{3}[0-9][0-9A-Z][0-9]{2}$/;

type FipeItem = {
  modelo?: string;
  texto_valor?: string;
  valor?: string;
  mes_referencia?: string;
  codigo_fipe?: string;
  score?: number | string;
};

type ConsultaResult = {
  marca?: string;
  modelo?: string;
  MARCA?: string;
  MODELO?: string;
  extra?: { versao?: string };
  ano?: string | number;
  anoModelo?: string | number;
  cor?: string;
  municipio?: string;
  uf?: string;
  situacao?: string;
  chassi?: string;
  fipe?: { dados?: FipeItem[] };
  [k: string]: unknown;
};

function formatPlacaInput(v: string) {
  const clean = v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 7);
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)}-${clean.slice(3)}`;
}

function ConsultaPlacaPage() {
  const [placa, setPlaca] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConsultaResult | null>(null);

  const placaLimpa = placa.replace(/[^A-Z0-9]/g, "");
  const placaValida = PLACA_REGEX.test(placaLimpa);

  async function consultar() {
    if (!placaValida) {
      setError("Placa inválida. Use o formato AAA-0A00 (Mercosul) ou AAA-0000.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("consulta-placa", {
        body: { placa: placaLimpa },
      });

      if (fnError) {
        // Erro de rede/HTTP: tenta ler mensagem do corpo
        const ctx = (fnError as { context?: Response }).context;
        let msg = fnError.message || "Erro ao consultar placa.";
        if (ctx && typeof ctx.json === "function") {
          try {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          } catch { /* noop */ }
        }
        setError(msg);
        toast.error(msg);
        return;
      }

      if (data?.error) {
        setError(data.error);
        toast.error(data.error);
        return;
      }

      setResult(data as ConsultaResult);
      toast.success("Consulta realizada com sucesso");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const fipeOrdenada = (result?.fipe?.dados ?? [])
    .slice()
    .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Consulta de placa</h1>
        <p className="text-sm text-muted-foreground">
          Informe a placa do veículo para obter dados oficiais e tabela FIPE.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <div>
          <Label htmlFor="placa">Placa do veículo</Label>
          <div className="mt-1.5 flex gap-2">
            <Input
              id="placa"
              value={placa}
              onChange={(e) => setPlaca(formatPlacaInput(e.target.value))}
              placeholder="AAA-0A00"
              className="uppercase font-mono text-lg tracking-widest"
              maxLength={8}
              inputMode="text"
              autoCapitalize="characters"
              onKeyDown={(e) => {
                if (e.key === "Enter" && placaValida && !loading) consultar();
              }}
            />
            <Button
              onClick={consultar}
              disabled={!placaValida || loading}
              className="gradient-primary text-primary-foreground"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-1 hidden sm:inline">Consultar</span>
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Formato aceito: <span className="font-mono">AAA-0A00</span> (Mercosul) ou <span className="font-mono">AAA-0000</span>.
          </p>
        </div>
      </Card>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <div>
              <div className="font-medium text-destructive">Não foi possível consultar</div>
              <div className="text-sm text-muted-foreground">{error}</div>
            </div>
          </div>
        </Card>
      )}

      {loading && !result && (
        <Card className="p-8 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Consultando placa...</p>
        </Card>
      )}

      {result && (
        <>
          <Card className="overflow-hidden">
            <div className="gradient-primary text-primary-foreground p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/15 p-2 backdrop-blur-sm">
                  <Car className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wide opacity-80">Veículo</div>
                  <div className="text-lg font-bold leading-tight truncate">
                    {(result.MARCA ?? result.marca) || "—"} {(result.MODELO ?? result.modelo) || ""}
                  </div>
                  {result.extra?.versao && (
                    <div className="text-xs opacity-90 truncate">{result.extra.versao}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
              <InfoField icon={<Calendar className="h-4 w-4" />} label="Ano" value={result.ano} />
              <InfoField icon={<Calendar className="h-4 w-4" />} label="Ano modelo" value={result.anoModelo} />
              <InfoField icon={<Palette className="h-4 w-4" />} label="Cor" value={result.cor} />
              <InfoField
                icon={<MapPin className="h-4 w-4" />}
                label="Município / UF"
                value={[result.municipio, result.uf].filter(Boolean).join(" / ") || undefined}
              />
              <InfoField icon={<AlertCircle className="h-4 w-4" />} label="Situação" value={result.situacao} />
              <InfoField icon={<Hash className="h-4 w-4" />} label="Chassi" value={result.chassi} mono />
            </div>
          </Card>

          {fipeOrdenada.length > 0 && (
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Tabela FIPE</h2>
                <Badge variant="secondary" className="ml-auto">
                  {fipeOrdenada.length} {fipeOrdenada.length === 1 ? "resultado" : "resultados"}
                </Badge>
              </div>
              <div className="space-y-2.5">
                {fipeOrdenada.map((item, i) => (
                  <div
                    key={`${item.codigo_fipe ?? i}-${i}`}
                    className={`rounded-lg border p-3 ${i === 0 ? "border-primary/40 bg-primary/5" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium leading-tight">{item.modelo || "—"}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {item.codigo_fipe && (
                            <span className="font-mono">FIPE: {item.codigo_fipe}</span>
                          )}
                          {item.mes_referencia && <span>Ref: {item.mes_referencia}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-primary">
                          {item.texto_valor || item.valor || "—"}
                        </div>
                        {i === 0 && fipeOrdenada.length > 1 && (
                          <Badge variant="outline" className="mt-1 text-[10px]">Melhor match</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function InfoField({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | number | null;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-1 text-sm font-medium break-words ${mono ? "font-mono text-xs" : ""}`}>
        {value !== undefined && value !== null && value !== "" ? String(value) : "—"}
      </div>
    </div>
  );
}
