import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Loader2, Check, Search, AlertCircle, DollarSign, Info } from "lucide-react";
import { toast } from "sonner";
import { normalizeVehicleType, type VehicleType } from "@/data/vehicleTypes";
import { VehicleTypeBadge } from "@/components/VehicleTypeBadge";

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

type FipeItem = {
  texto_modelo?: string;
  modelo?: string;
  texto_valor?: string;
  valor?: string;
  codigo_fipe?: string;
  mes_referencia?: string;
  sigla_combustivel?: string;
  score?: number | string;
};

type PlacaData = {
  marca?: string;
  MARCA?: string;
  modelo?: string;
  MODELO?: string;
  marcaModelo?: string;
  MARCA_MODELO?: string;
  submodelo?: string;
  SUBMODELO?: string;
  VERSAO?: string;
  ano?: string | number;
  anoModelo?: string | number;
  cor?: string;
  chassi?: string;
  municipio?: string;
  uf?: string;
  situacao?: string;
  origem?: string;
  extra?: {
    versao?: string;
    ano_fabricacao?: string | number;
    combustivel?: string;
    caixa_cambio?: string;
    tipo_carroceria?: string;
    tipo_veiculo?: string;
    quantidade_passageiro?: string | number;
    quantidade_portas?: string | number;
  };
  fipe?: { dados?: FipeItem[] };
};

const PLACA_REGEX = /^[A-Z]{3}[0-9][0-9A-Z][0-9]{2}$/;

function formatPlaca(v: string) {
  const clean = v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 7);
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)}-${clean.slice(3)}`;
}

function parseFipeValor(v?: string): number | null {
  if (!v) return null;
  const n = Number(v.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function VeiculoForm() {
  const { id } = useParams({ from: "/inspecao/$id/veiculo" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingFlag, setSavingFlag] = useState<"idle" | "saving" | "saved">("idle");
  const [tipoVeiculo, setTipoVeiculo] = useState<VehicleType>("carro");
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
  const [buscandoPlaca, setBuscandoPlaca] = useState(false);
  const [erroPlaca, setErroPlaca] = useState<string | null>(null);
  const [placaData, setPlacaData] = useState<PlacaData | null>(null);
  const ultimaPlacaBuscada = useRef<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("inspecoes")
      .select("nome_veiculo, marca, modelo, ano, cor, placa, km, preco_pedido, vendedor, tipo_veiculo")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else if (data) {
          const d = data as typeof data & { tipo_veiculo?: string };
          setTipoVeiculo(normalizeVehicleType(d.tipo_veiculo));
          setForm({
            nome_veiculo: data.nome_veiculo || "",
            marca: data.marca || "",
            modelo: data.modelo || "",
            ano: data.ano ? String(data.ano) : "",
            cor: data.cor || "",
            placa: data.placa ? formatPlaca(data.placa) : "",
            km: data.km ? String(data.km) : "",
            preco_pedido: data.preco_pedido ? String(data.preco_pedido) : "",
            vendedor: data.vendedor || "",
          });
        }
        setLoading(false);
      });
  }, [id, user]);

  function update<K extends keyof Form>(key: K, value: string) {
    const updated = { ...form, [key]: value };
    setForm(updated);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSavingFlag("saving");
    debounceRef.current = setTimeout(() => salvar(updated), 600);
  }

  async function salvar(f: Form) {
    const payload = {
      nome_veiculo: f.nome_veiculo || `${f.marca} ${f.modelo}`.trim() || "Sem nome",
      marca: f.marca || null,
      modelo: f.modelo || null,
      ano: f.ano ? Number(f.ano) : null,
      cor: f.cor || null,
      placa: f.placa.replace(/[^A-Z0-9]/gi, "").toUpperCase() || "",
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

  async function buscarPlaca() {
    const placaLimpa = form.placa.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (!PLACA_REGEX.test(placaLimpa)) {
      setErroPlaca("Placa inválida. Use o formato AAA-0A00 ou AAA-0000.");
      return;
    }
    if (placaLimpa === ultimaPlacaBuscada.current && placaData) return;

    setBuscandoPlaca(true);
    setErroPlaca(null);
    try {
      const { data, error } = await supabase.functions.invoke("consulta-placa", {
        body: { placa: placaLimpa },
      });
      if (error) {
        const ctx = (error as { context?: Response }).context;
        let msg = error.message || "Erro ao consultar placa.";
        if (ctx && typeof ctx.json === "function") {
          try {
            const b = await ctx.json();
            if (b?.error) msg = b.error;
          } catch { /* noop */ }
        }
        setErroPlaca(msg);
        return;
      }
      if (data?.error) {
        setErroPlaca(data.error);
        return;
      }
      ultimaPlacaBuscada.current = placaLimpa;
      const d = data as PlacaData;
      setPlacaData(d);

      // Extrai campos
      const marca = d.MARCA ?? d.marca ?? "";
      let modelo = d.MODELO ?? d.modelo ?? "";
      // Se veio "marcaModelo" combinado e não modelo puro, remover marca do início
      const marcaModelo = d.MARCA_MODELO ?? d.marcaModelo ?? "";
      if (!modelo && marcaModelo) {
        modelo = marca && marcaModelo.toUpperCase().startsWith(marca.toUpperCase())
          ? marcaModelo.slice(marca.length).trim()
          : marcaModelo;
      }
      const ano = d.anoModelo ?? d.ano ?? "";
      const cor = d.cor ?? "";

      // FIPE - maior score
      const fipeOrdenada = (d.fipe?.dados ?? [])
        .slice()
        .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));
      const melhorFipe = fipeOrdenada[0];
      const valorFipe = parseFipeValor(melhorFipe?.texto_valor || melhorFipe?.valor);

      const preenchido: Form = {
        ...form,
        marca: form.marca || String(marca || ""),
        modelo: form.modelo || String(modelo || ""),
        ano: form.ano || (ano ? String(ano) : ""),
        cor: form.cor || String(cor || ""),
        preco_pedido: form.preco_pedido || (valorFipe ? String(valorFipe) : ""),
      };
      setForm(preenchido);
      salvar(preenchido);
      toast.success("Dados do veículo preenchidos");
    } catch (e) {
      setErroPlaca(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setBuscandoPlaca(false);
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

  const fipeOrdenada = (placaData?.fipe?.dados ?? [])
    .slice()
    .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));

  const extras = placaData?.extra ?? {};
  const versao = extras.versao ?? placaData?.SUBMODELO ?? placaData?.submodelo ?? placaData?.VERSAO;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1"><VehicleTypeBadge tipo={tipoVeiculo} size="sm" /></div>
          <h1 className="text-2xl font-bold">Cadastro do veículo</h1>
          <p className="text-sm text-muted-foreground">Preencha os dados — tudo é salvo automaticamente</p>
        </div>
        {savingFlag === "saving" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {savingFlag === "saved" && <Check className="h-4 w-4 text-success" />}
      </div>

      <Card className="p-5 space-y-4">
        <div>
          <Label htmlFor="placa">Placa *</Label>
          <div className="mt-1.5 flex gap-2">
            <div className="relative flex-1">
              <Input
                id="placa"
                value={form.placa}
                onChange={(e) => update("placa", formatPlaca(e.target.value))}
                onBlur={() => {
                  const p = form.placa.replace(/[^A-Z0-9]/gi, "").toUpperCase();
                  if (PLACA_REGEX.test(p) && p !== ultimaPlacaBuscada.current) buscarPlaca();
                }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); buscarPlaca(); } }}
                placeholder="AAA-0A00"
                className="uppercase font-mono tracking-widest pr-9"
                maxLength={8}
                autoCapitalize="characters"
              />
              {buscandoPlaca && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={buscarPlaca}
              disabled={buscandoPlaca}
              title="Buscar dados pela placa"
            >
              {buscandoPlaca ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-1 hidden sm:inline">Buscar</span>
            </Button>
          </div>
          {erroPlaca && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{erroPlaca} Você pode preencher os campos manualmente.</span>
            </div>
          )}
        </div>

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
            <Label htmlFor="km">KM</Label>
            <Input id="km" type="number" value={form.km} onChange={(e) => update("km", e.target.value)} placeholder="80000" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="preco">Preço pedido (R$)</Label>
            <Input id="preco" type="number" value={form.preco_pedido} onChange={(e) => update("preco_pedido", e.target.value)} placeholder="65000" />
          </div>
          <div>
            <Label htmlFor="vendedor">Vistoriador responsável</Label>
            <Input id="vendedor" value={form.vendedor} onChange={(e) => update("vendedor", e.target.value)} placeholder="Nome / contato" />
          </div>
        </div>
      </Card>

      {placaData && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold">Dados adicionais do veículo</h2>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <InfoField label="Versão" value={versao} />
            <InfoField label="Ano fabricação" value={extras.ano_fabricacao} />
            <InfoField label="Chassi" value={placaData.chassi} mono />
            <InfoField label="Combustível" value={extras.combustivel} />
            <InfoField label="Câmbio" value={extras.caixa_cambio} />
            <InfoField label="Carroceria" value={extras.tipo_carroceria} />
            <InfoField
              label="Município/UF"
              value={[placaData.municipio, placaData.uf].filter(Boolean).join(" / ") || undefined}
            />
            <InfoField label="Situação" value={placaData.situacao} />
            <InfoField label="Tipo" value={extras.tipo_veiculo} />
            <InfoField label="Origem" value={placaData.origem} />
            <InfoField label="Portas" value={extras.quantidade_portas} />
            <InfoField label="Passageiros" value={extras.quantidade_passageiro} />
          </div>
        </Card>
      )}

      {fipeOrdenada.length > 0 && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold">Valor FIPE</h2>
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
                    <div className="text-sm font-medium leading-tight">
                      {item.texto_modelo || item.modelo || "—"}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      {item.codigo_fipe && <span className="font-mono">FIPE: {item.codigo_fipe}</span>}
                      {item.mes_referencia && <span>Ref: {item.mes_referencia}</span>}
                      {item.sigla_combustivel && <span>Comb: {item.sigla_combustivel}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-primary">
                      {item.texto_valor || item.valor || "—"}
                    </div>
                    {i === 0 && (
                      <Badge variant="outline" className="mt-1 text-[10px]">Sugerido</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Button
        onClick={avancar}
        className="w-full gradient-primary text-primary-foreground"
        size="lg"
        disabled={!form.marca || !form.placa}
      >
        Iniciar checklist <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function InfoField({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
}) {
  const has = value !== undefined && value !== null && value !== "";
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-medium break-words ${mono ? "font-mono text-xs" : ""}`}>
        {has ? String(value) : "—"}
      </div>
    </div>
  );
}
