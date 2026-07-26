import { ShieldAlert, ShieldCheck, Gauge } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LAUDO_CAMPOS,
  NIVEL_RISCO_LABEL,
  nivelRisco,
  type LaudoRisco,
} from "@/lib/laudoRisco";

const NIVEL_STYLES: Record<string, { ring: string; bg: string; text: string; badge: string }> = {
  baixo: {
    ring: "stroke-success",
    bg: "bg-success/10",
    text: "text-success",
    badge: "bg-success/15 text-success border-success/30",
  },
  moderado: {
    ring: "stroke-warning",
    bg: "bg-warning/10",
    text: "text-warning",
    badge: "bg-warning/15 text-warning border-warning/30",
  },
  alto: {
    ring: "stroke-destructive",
    bg: "bg-destructive/10",
    text: "text-destructive",
    badge: "bg-destructive/15 text-destructive border-destructive/30",
  },
  critico: {
    ring: "stroke-destructive",
    bg: "bg-destructive/15",
    text: "text-destructive",
    badge: "bg-destructive/20 text-destructive border-destructive/40",
  },
};

type Props = {
  laudo: LaudoRisco;
  /** Data de geração (opcional) para exibir no cabeçalho. */
  geradoEm?: string | null;
};

/**
 * Exibe o laudo de análise de risco para seguradora, com medidor de risco,
 * identificação do veículo, itens avaliados e conclusão.
 */
export function LaudoRiscoCard({ laudo, geradoEm }: Props) {
  const risco = Math.min(100, Math.max(0, Math.round(laudo.risco_seguradora ?? 0)));
  const nivel = nivelRisco(risco);
  const style = NIVEL_STYLES[nivel];

  const circunferencia = 2 * Math.PI * 42;
  const traco = (risco / 100) * circunferencia;

  const identificacao = [
    { label: "Marca", value: laudo.marca },
    { label: "Modelo", value: laudo.modelo },
    { label: "Ano", value: laudo.ano_veiculo },
    { label: "Cor", value: laudo.cor },
  ];

  return (
    <div className="space-y-4">
      {/* Medidor de risco */}
      <Card className={`overflow-hidden border-0 p-5 ${style.bg}`}>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="relative h-28 w-28 shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                strokeWidth="9"
                className="stroke-muted-foreground/20"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={`${traco} ${circunferencia}`}
                className={style.ring}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-extrabold leading-none ${style.text}`}>{risco}%</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">risco</span>
            </div>
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              {nivel === "baixo" ? (
                <ShieldCheck className={`h-5 w-5 ${style.text}`} />
              ) : (
                <ShieldAlert className={`h-5 w-5 ${style.text}`} />
              )}
              <h3 className="text-lg font-bold">Laudo de análise de risco</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Avaliação assistida por IA para apoio à decisão de seguradoras e compradores.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge variant="outline" className={style.badge}>
                {NIVEL_RISCO_LABEL[nivel]}
              </Badge>
              {geradoEm && (
                <span className="text-xs text-muted-foreground">
                  Gerado em {new Date(geradoEm).toLocaleString("pt-BR")}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Identificação */}
      <Card className="p-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Gauge className="h-4 w-4 text-primary" />
          Identificação pela IA
        </h4>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {identificacao.map((c) => (
            <div key={c.label} className="rounded-lg bg-muted/50 p-3">
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{c.label}</dt>
              <dd className="mt-0.5 break-words text-sm font-semibold">{c.value || "N/A"}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Itens avaliados */}
      <Card className="divide-y p-0">
        {LAUDO_CAMPOS.map((campo) => (
          <div key={campo.key} className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {campo.label}
            </p>
            <p className="mt-1 text-sm leading-relaxed">{laudo[campo.key] || "N/A"}</p>
          </div>
        ))}
      </Card>

      {/* Conclusão */}
      <Card className="border-l-4 border-l-primary p-4">
        <h4 className="text-sm font-semibold text-primary">Conclusão do laudo</h4>
        <p className="mt-2 text-sm leading-relaxed">{laudo.conclusao || "N/A"}</p>
      </Card>
    </div>
  );
}
