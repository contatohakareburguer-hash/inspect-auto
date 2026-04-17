import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/inspecao/$id/veiculo")({
  head: () => ({
    meta: [
      { title: "Cadastro do veículo — InspectAuto" },
      { name: "description", content: "Informações do veículo a ser inspecionado." },
    ],
  }),
  component: VeiculoForm,
});

type Form = {
  nome_veiculo: string;
  marca: string;
  modelo: string;
  ano: string;
  cor: string;
  placa: string;
  km: string;
  preco_pedido: string;
  vendedor: string;
};

function VeiculoForm() {
  const { id } = useParams({ from: "/inspecao/$id/veiculo" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingFlag, setSavingFlag] = useState<"idle" | "saving" | "saved">("idle");
  const [form, setForm] = useState<Form>({
    nome_veiculo: "",
    marca: "",
    modelo: "",
    ano: "",
    cor: "",
    placa: "",
    km: "",
    preco_pedido: "",
    vendedor: "",
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("inspecoes")
      .select("nome_veiculo, marca, modelo, ano, cor, placa, km, preco_pedido, vendedor")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else if (data) {
          setForm({
            nome_veiculo: data.nome_veiculo || "",
            marca: data.marca || "",
            modelo: data.modelo || "",
            ano: data.ano ? String(data.ano) : "",
            cor: data.cor || "",
            placa: data.placa || "",
            km: data.km ? String(data.km) : "",
            preco_pedido: data.preco_pedido ? String(data.preco_pedido) : "",
            vendedor: data.vendedor || "",
          });
        }
        setLoading(false);
      });
  }, [id, user]);

  function update<K extends keyof Form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSavingFlag("saving");
    debounceRef.current = setTimeout(() => salvar({ ...form, [key]: value }), 600);
  }

  async function salvar(f: Form) {
    const payload = {
      nome_veiculo: f.nome_veiculo || `${f.marca} ${f.modelo}`.trim() || "Sem nome",
      marca: f.marca || null,
      modelo: f.modelo || null,
      ano: f.ano ? Number(f.ano) : null,
      cor: f.cor || null,
      placa: f.placa.toUpperCase() || "",
      km: f.km ? Number(f.km) : null,
      preco_pedido: f.preco_pedido ? Number(f.preco_pedido) : null,
      vendedor: f.vendedor || null,
    };
    const { error } = await supabase.from("inspecoes").update(payload).eq("id", id);
    if (error) {
      toast.error("Erro ao salvar");
      setSavingFlag("idle");
    } else {
      setSavingFlag("saved");
      setTimeout(() => setSavingFlag("idle"), 1500);
    }
  }

  async function avancar() {
    await salvar(form);
    navigate({ to: "/inspecao/$id/checklist", params: { id } });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cadastro do veículo</h1>
          <p className="text-sm text-muted-foreground">Preencha os dados — tudo é salvo automaticamente</p>
        </div>
        {savingFlag === "saving" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {savingFlag === "saved" && <Check className="h-4 w-4 text-success" />}
      </div>

      <Card className="p-5 space-y-4">
        <div>
          <Label htmlFor="marca">Marca *</Label>
          <Input id="marca" value={form.marca} onChange={(e) => update("marca", e.target.value)} placeholder="Ex: Toyota" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="modelo">Modelo</Label>
            <Input id="modelo" value={form.modelo} onChange={(e) => update("modelo", e.target.value)} placeholder="Corolla" />
          </div>
          <div>
            <Label htmlFor="ano">Ano</Label>
            <Input id="ano" type="number" value={form.ano} onChange={(e) => update("ano", e.target.value)} placeholder="2020" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="cor">Cor</Label>
            <Input id="cor" value={form.cor} onChange={(e) => update("cor", e.target.value)} placeholder="Prata" />
          </div>
          <div>
            <Label htmlFor="placa">Placa *</Label>
            <Input
              id="placa"
              value={form.placa}
              onChange={(e) => update("placa", e.target.value.toUpperCase())}
              placeholder="ABC-1D23"
              className="uppercase"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="km">KM</Label>
            <Input id="km" type="number" value={form.km} onChange={(e) => update("km", e.target.value)} placeholder="80000" />
          </div>
          <div>
            <Label htmlFor="preco">Preço pedido (R$)</Label>
            <Input id="preco" type="number" value={form.preco_pedido} onChange={(e) => update("preco_pedido", e.target.value)} placeholder="65000" />
          </div>
        </div>
        <div>
          <Label htmlFor="vendedor">Vendedor / contato</Label>
          <Input id="vendedor" value={form.vendedor} onChange={(e) => update("vendedor", e.target.value)} placeholder="Nome ou telefone" />
        </div>
      </Card>

      <Button onClick={avancar} className="w-full gradient-primary text-primary-foreground" size="lg" disabled={!form.marca || !form.placa}>
        Iniciar checklist <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
