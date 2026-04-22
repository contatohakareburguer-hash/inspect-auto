import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Car } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getVehicleMeta, normalizeVehicleType } from "@/data/vehicleTypes";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — InspectAuto" },
      { name: "description", content: "Todas as suas inspeções, com busca por placa e nome do veículo." },
    ],
  }),
  component: Historico,
});

type Row = {
  id: string;
  nome_veiculo: string | null;
  placa: string | null;
  score_total: number;
  classificacao_final: string | null;
  status: string;
  created_at: string;
  tipo_veiculo: string | null;
};

function Historico() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("inspecoes")
      .select("id, nome_veiculo, placa, score_total, classificacao_final, status, created_at, tipo_veiculo")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows((data as Row[]) || []);
        setLoading(false);
      });
  }, [user]);

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const term = q.toLowerCase();
    return (
      (r.nome_veiculo || "").toLowerCase().includes(term) ||
      (r.placa || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Histórico</h1>
        <p className="text-sm text-muted-foreground">Todas as suas inspeções</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por placa ou nome do veículo..."
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <Car className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {rows.length === 0 ? "Nenhuma inspeção ainda." : "Nenhum resultado para sua busca."}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const corClass =
              r.classificacao_final === "Saudável"
                ? "bg-success text-success-foreground"
                : r.classificacao_final === "Risco moderado"
                ? "bg-warning text-warning-foreground"
                : r.classificacao_final === "Alto risco"
                ? "bg-destructive text-destructive-foreground"
                : "bg-muted text-muted-foreground";
            return (
              <Card
                key={r.id}
                onClick={() =>
                  navigate({
                    to: r.status === "finalizada" ? "/inspecao/$id/resumo" : "/inspecao/$id/checklist",
                    params: { id: r.id },
                  })
                }
                className="cursor-pointer p-4 shadow-card transition-all hover:shadow-elevated active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate font-semibold">
                      <span aria-hidden>{getVehicleMeta(normalizeVehicleType(r.tipo_veiculo)).emoji}</span>
                      <span className="truncate">{r.nome_veiculo || "Sem nome"}</span>
                      {r.placa && <span className="text-muted-foreground">· {r.placa}</span>}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                  <div className="text-right">
                    {r.status === "finalizada" ? (
                      <>
                        <div className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${corClass}`}>
                          {r.classificacao_final}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">Score {r.score_total}</div>
                      </>
                    ) : (
                      <div className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                        Em andamento
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
