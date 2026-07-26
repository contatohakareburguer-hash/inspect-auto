import { Progress } from "@/components/ui/progress";

type WizardProgressProps = {
  etapaAtual: number;
  totalEtapas: number;
  tituloEtapa: string;
  emojiEtapa?: string;
  /** Percentual concluído da avaliação (itens preenchidos) */
  percentualPreenchido: number;
};

/**
 * Barra de progresso do assistente de avaliação.
 * Mostra etapa atual, total de etapas e percentual concluído.
 */
export function WizardProgress({
  etapaAtual,
  totalEtapas,
  tituloEtapa,
  emojiEtapa,
  percentualPreenchido,
}: WizardProgressProps) {
  const percentualEtapas = totalEtapas > 0 ? Math.round((etapaAtual / totalEtapas) * 100) : 0;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Etapa {etapaAtual} de {totalEtapas}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            {emojiEtapa && <span className="text-xl leading-none">{emojiEtapa}</span>}
            <h2 className="truncate text-base font-bold">{tituloEtapa}</h2>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-bold text-primary">{percentualEtapas}%</div>
          <div className="text-[10px] text-muted-foreground">concluído</div>
        </div>
      </div>

      <Progress value={percentualEtapas} className="mt-3 h-2" aria-label="Progresso das etapas" />

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Itens avaliados</span>
        <span className="font-medium">{percentualPreenchido}%</span>
      </div>
      <Progress value={percentualPreenchido} className="mt-1 h-1" aria-label="Itens avaliados" />
    </div>
  );
}
