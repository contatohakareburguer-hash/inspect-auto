import { createFileRoute } from "@tanstack/react-router";
import { AdvancedCharts } from "@/components/DashboardCharts";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/estatisticas")({
  head: () => ({
    meta: [
      { title: "Estatísticas — InspectAuto" },
      { name: "description", content: "Inspeções por mês e score médio das inspeções." },
    ],
  }),
  component: Estatisticas,
});

function Estatisticas() {
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <BarChart3 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Estatísticas</h1>
          <p className="text-sm text-muted-foreground">Inspeções por mês e score médio.</p>
        </div>
      </header>
      <AdvancedCharts />
    </div>
  );
}
