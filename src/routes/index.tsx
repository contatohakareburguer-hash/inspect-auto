import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Car, FileText, TrendingUp, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { InstallAppButton } from "@/lib/pwa";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — InspectAuto" },
      { name: "description", content: "Suas inspeções veiculares em um só lugar." },
    ],
  }),
  component: Dashboard,
});

type InspecaoRow = {
  id: string;
  nome_veiculo: string | null;
  placa: string | null;
  score_total: number;
  classificacao_final: string | null;
  status: string;
  created_at: string;
};

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inspecoes, setInspecoes] = useState<InspecaoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("inspecoes")
      .select("id, nome_veiculo, placa, score_total, classificacao_final, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setInspecoes((data as InspecaoRow[]) || []);
        setLoading(false);
      });
  }, [user]);

  async function novaInspecao() {
    if (!user) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("inspecoes")
      .insert({ user_id: user.id, nome_veiculo: "", placa: "" })
      .select("id")
      .single();
    setCreating(false);
    if (error || !data) {
      toast.error(error?.message || "Erro ao criar");
      return;
    }
    navigate({ to: "/inspecao/$id/veiculo", params: { id: data.id } });
  }

  const total = inspecoes.length;
  const finalizadas = inspecoes.filter((i) => i.status === "finalizada").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Olá, {user?.user_metadata?.full_name?.split(" ")[0] || "inspetor"}!</h1>
          <p className="text-sm text-muted-foreground">Pronto para uma nova inspeção?</p>
        </div>
        <InstallAppButton className="shrink-0" />
      </div>

      <Card className="p-6 gradient-primary text-primary-foreground shadow-elevated">
        <h2 className="text-lg font-semibold">Nova inspeção</h2>
        <p className="mt-1 text-sm opacity-90">Avalie um veículo passo a passo com checklist profissional.</p>
        <Button
          onClick={novaInspecao}
          disabled={creating}
          variant="secondary"
          size="lg"
          className="mt-4 w-full sm:w-auto"
        >
          {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Iniciar inspeção
        </Button>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span className="text-xs">Total recente</span>
          </div>
          <div className="mt-2 text-2xl font-bold">{total}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">Finalizadas</span>
          </div>
          <div className="mt-2 text-2xl font-bold">{finalizadas}</div>
        </Card>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Últimas inspeções</h2>
          <Link to="/historico" className="text-sm font-medium text-primary hover:underline">
            Ver tudo
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : inspecoes.length === 0 ? (
          <Card className="p-8 text-center">
            <Car className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Você ainda não tem inspeções.</p>
            <p className="text-xs text-muted-foreground">Clique em "Iniciar inspeção" para começar.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {inspecoes.map((i) => (
              <InspecaoCard key={i.id} insp={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InspecaoCard({ insp }: { insp: InspecaoRow }) {
  const navigate = useNavigate();
  const corClass =
    insp.classificacao_final === "Saudável"
      ? "bg-success text-success-foreground"
      : insp.classificacao_final === "Risco moderado"
      ? "bg-warning text-warning-foreground"
      : insp.classificacao_final === "Alto risco"
      ? "bg-destructive text-destructive-foreground"
      : "bg-muted text-muted-foreground";

  function abrir() {
    if (insp.status === "finalizada") {
      navigate({ to: "/inspecao/$id/resumo", params: { id: insp.id } });
    } else {
      navigate({ to: "/inspecao/$id/checklist", params: { id: insp.id } });
    }
  }

  return (
    <Card
      onClick={abrir}
      className="cursor-pointer p-4 shadow-card transition-all hover:shadow-elevated active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">
            {insp.nome_veiculo || "Sem nome"}{" "}
            {insp.placa && <span className="text-muted-foreground">· {insp.placa}</span>}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {format(new Date(insp.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
          </div>
        </div>
        <div className="text-right">
          {insp.status === "finalizada" ? (
            <>
              <div className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${corClass}`}>
                {insp.classificacao_final}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Score {insp.score_total}</div>
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
}
