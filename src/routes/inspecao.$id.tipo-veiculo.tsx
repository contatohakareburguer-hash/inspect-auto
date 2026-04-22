import { createFileRoute, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  VEHICLE_TYPE_LIST,
  LAST_VEHICLE_TYPE_KEY,
  normalizeVehicleType,
  type VehicleType,
} from "@/data/vehicleTypes";

const searchSchema = z.object({
  modo: z.enum(["checklist", "ia"]).optional(),
});

export const Route = createFileRoute("/inspecao/$id/tipo-veiculo")({
  head: () => ({
    meta: [
      { title: "Tipo de veículo — InspectAuto" },
      { name: "description", content: "Escolha o tipo de veículo para iniciar a inspeção." },
    ],
  }),
  validateSearch: searchSchema,
  component: TipoVeiculoPage,
});

function TipoVeiculoPage() {
  const { id } = useParams({ from: "/inspecao/$id/tipo-veiculo" });
  const { modo } = useSearch({ from: "/inspecao/$id/tipo-veiculo" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selecionado, setSelecionado] = useState<VehicleType>("carro");
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  // Carrega tipo já salvo OU lembra a última escolha do usuário
  useEffect(() => {
    if (!user) return;
    supabase
      .from("inspecoes")
      .select("tipo_veiculo")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        const salvo = (data as { tipo_veiculo?: string } | null)?.tipo_veiculo;
        if (salvo) {
          setSelecionado(normalizeVehicleType(salvo));
        } else if (typeof window !== "undefined") {
          const last = localStorage.getItem(LAST_VEHICLE_TYPE_KEY);
          if (last) setSelecionado(normalizeVehicleType(last));
        }
        setCarregando(false);
      });
  }, [id, user]);

  async function continuar() {
    setSalvando(true);
    const { error } = await supabase
      .from("inspecoes")
      .update({ tipo_veiculo: selecionado })
      .eq("id", id);
    setSalvando(false);
    if (error) {
      toast.error("Erro ao salvar tipo: " + error.message);
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(LAST_VEHICLE_TYPE_KEY, selecionado);
    }
    if (modo === "ia") {
      navigate({ to: "/inspecao/$id/inteligente", params: { id } });
    } else {
      navigate({ to: "/inspecao/$id/veiculo", params: { id } });
    }
  }

  if (carregando) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Qual é o tipo de veículo?</h1>
        <p className="text-sm text-muted-foreground">
          Escolha o tipo para carregar o checklist apropriado.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {VEHICLE_TYPE_LIST.map((tipo) => {
          const ativo = selecionado === tipo.key;
          return (
            <button
              key={tipo.key}
              type="button"
              onClick={() => setSelecionado(tipo.key)}
              className="text-left"
            >
              <Card
                className={`relative flex h-full flex-col items-center gap-2 p-5 transition-all active:scale-[0.99] ${
                  ativo
                    ? `${tipo.accentBorder} ${tipo.accentBg} border-2 shadow-elevated`
                    : "border hover:border-foreground/30"
                }`}
              >
                {ativo && (
                  <div className={`absolute right-2 top-2 rounded-full bg-background p-1 ${tipo.accentText}`}>
                    <Check className="h-4 w-4" />
                  </div>
                )}
                <div className="text-5xl">{tipo.emoji}</div>
                <div className={`text-base font-bold ${ativo ? tipo.accentText : ""}`}>{tipo.nome}</div>
                <p className="text-center text-xs text-muted-foreground">{tipo.descricao}</p>
              </Card>
            </button>
          );
        })}
      </div>

      <Button
        onClick={continuar}
        disabled={salvando}
        size="lg"
        className="w-full gradient-primary text-primary-foreground"
      >
        {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Continuar <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
