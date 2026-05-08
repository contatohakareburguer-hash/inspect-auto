import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, FileText, Calendar, Activity, AlertTriangle, Loader2 } from "lucide-react";

type Insp = {
  id: string;
  status: string;
  score_total: number;
  created_at: string;
  tipo_veiculo: string | null;
};

type Item = { categoria: string; status: string | null };

const VEHICLE_COLORS: Record<string, string> = {
  carro: "hsl(var(--primary))",
  moto: "hsl(217 91% 60%)",
  caminhao: "hsl(25 95% 53%)",
};

const VEHICLE_LABELS: Record<string, string> = {
  carro: "Carros",
  moto: "Motos",
  caminhao: "Caminhões",
};

function useChartsData() {
  const { user } = useAuth();
  const [inspecoes, setInspecoes] = useState<Insp[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from("inspecoes")
        .select("id, status, score_total, created_at, tipo_veiculo")
        .order("created_at", { ascending: false }),
      supabase
        .from("itens_checklist")
        .select("categoria, status")
        .in("status", ["atencao", "critico"]),
    ]).then(([insRes, itRes]) => {
      setInspecoes((insRes.data as Insp[]) || []);
      setItens((itRes.data as Item[]) || []);
      setLoading(false);
    });
  }, [user]);

  return { inspecoes, itens, loading };
}

export function DashboardCharts() {
  const { inspecoes, itens, loading } = useChartsData();

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const total = inspecoes.length;
  const finalizadas = inspecoes.filter((i) => i.status === "finalizada");
  const scoreMedio =
    finalizadas.length > 0
      ? Math.round(finalizadas.reduce((s, i) => s + (i.score_total || 0), 0) / finalizadas.length)
      : 0;
  const inicioMes = startOfMonth(new Date()).getTime();
  const noMes = inspecoes.filter((i) => new Date(i.created_at).getTime() >= inicioMes).length;

  const tipos: Record<string, number> = {};
  inspecoes.forEach((i) => {
    const t = i.tipo_veiculo || "carro";
    tipos[t] = (tipos[t] || 0) + 1;
  });
  const tipoData = Object.entries(tipos).map(([k, v]) => ({
    name: VEHICLE_LABELS[k] || k,
    value: v,
    color: VEHICLE_COLORS[k] || "hsl(var(--muted))",
  }));

  const cat: Record<string, number> = {};
  itens.forEach((it) => {
    cat[it.categoria] = (cat[it.categoria] || 0) + 1;
  });
  const topProblemas = Object.entries(cat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([categoria, qtd]) => ({ categoria, qtd }));
  const maxProblema = topProblemas[0]?.qtd || 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={<FileText />} label="Total" value={total} />
        <Kpi icon={<Calendar />} label="No mês" value={noMes} />
        <Kpi icon={<TrendingUp />} label="Finalizadas" value={finalizadas.length} />
        <Kpi icon={<Activity />} label="Score médio" value={scoreMedio} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Por tipo de veículo</h3>
          <div className="h-48">
            {tipoData.length === 0 ? (
              <EmptyMini />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tipoData} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={3}>
                    {tipoData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
            {tipoData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-muted-foreground">
                  {d.name} <strong className="text-foreground">{d.value}</strong>
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-warning" /> Top problemas detectados
          </h3>
          {topProblemas.length === 0 ? (
            <EmptyMini text="Nenhum problema registrado" />
          ) : (
            <div className="space-y-3">
              {topProblemas.map((p) => (
                <div key={p.categoria}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium capitalize">{p.categoria}</span>
                    <span className="text-muted-foreground">{p.qtd}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-warning to-destructive transition-all"
                      style={{ width: `${(p.qtd / maxProblema) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export function AdvancedCharts() {
  const { inspecoes, loading } = useChartsData();

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const finalizadas = inspecoes.filter((i) => i.status === "finalizada");
  const scoreMedio =
    finalizadas.length > 0
      ? Math.round(finalizadas.reduce((s, i) => s + (i.score_total || 0), 0) / finalizadas.length)
      : 0;

  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = startOfMonth(subMonths(new Date(), 5 - i));
    return { key: format(d, "yyyy-MM"), label: format(d, "MMM", { locale: ptBR }), total: 0 };
  });
  inspecoes.forEach((i) => {
    const k = format(new Date(i.created_at), "yyyy-MM");
    const m = meses.find((x) => x.key === k);
    if (m) m.total += 1;
  });

  const gaugeData = [{ name: "score", value: scoreMedio, fill: scoreColor(scoreMedio) }];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Inspeções por mês</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={meses}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Score médio das inspeções</h3>
        <div className="relative h-48">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="70%"
              outerRadius="100%"
              data={gaugeData}
              startAngle={180}
              endAngle={0}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar background dataKey="value" cornerRadius={10} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-4">
            <div className="text-3xl font-bold">{scoreMedio}</div>
            <div className="text-xs text-muted-foreground">{scoreLabel(scoreMedio)}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        <span className="text-[11px]">{label}</span>
      </div>
      <div className="mt-1.5 text-2xl font-bold">{value}</div>
    </Card>
  );
}

function EmptyMini({ text = "Sem dados ainda" }: { text?: string }) {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      {text}
    </div>
  );
}

function scoreColor(score: number) {
  if (score >= 80) return "hsl(var(--success))";
  if (score >= 50) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Saudável";
  if (score >= 50) return "Risco moderado";
  if (score > 0) return "Alto risco";
  return "Sem dados";
}
