import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Sparkles, Trash2, X, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { compressImage } from "@/lib/imageCompress";
import { LaudoRiscoCard } from "@/components/LaudoRiscoCard";
import {
  fileToDataUrl,
  gerarLaudoPorImagens,
  salvarLaudo,
  type LaudoRisco,
} from "@/lib/laudoRisco";

const MAX_FOTOS = 12;

export const Route = createFileRoute("/analise-risco")({
  head: () => ({
    meta: [
      { title: "Análise de risco por IA — InspectAuto" },
      {
        name: "description",
        content:
          "Envie fotos de um veículo e receba em segundos um laudo de análise de risco para seguradora, gerado por inteligência artificial.",
      },
      { property: "og:title", content: "Análise de risco por IA — InspectAuto" },
      {
        property: "og:description",
        content:
          "Laudo de risco veicular gerado por IA a partir das fotos: condições gerais, avarias, pneus, painel e percentual de risco.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnaliseRiscoPage,
});

type Item = { id: string; file: File; preview: string };

function AnaliseRiscoPage() {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [analisando, setAnalisando] = useState(false);
  const [laudo, setLaudo] = useState<LaudoRisco | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function adicionar(files: FileList | null) {
    if (!files || files.length === 0) return;
    const restante = MAX_FOTOS - itens.length;
    if (restante <= 0) {
      toast.error(`Máximo de ${MAX_FOTOS} fotos por análise.`);
      return;
    }
    const selecionadas = Array.from(files).slice(0, restante);
    const novos: Item[] = [];
    for (const file of selecionadas) {
      const comprimida = await compressImage(file, { maxDim: 1280, quality: 0.75 });
      novos.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file: comprimida,
        preview: URL.createObjectURL(comprimida),
      });
    }
    setItens((prev) => [...prev, ...novos]);
    setLaudo(null);
    setSalvo(false);
  }

  function remover(id: string) {
    setItens((prev) => {
      const alvo = prev.find((i) => i.id === id);
      if (alvo) URL.revokeObjectURL(alvo.preview);
      return prev.filter((i) => i.id !== id);
    });
  }

  function limpar() {
    itens.forEach((i) => URL.revokeObjectURL(i.preview));
    setItens([]);
    setLaudo(null);
    setSalvo(false);
  }

  async function analisar() {
    if (itens.length === 0) return;
    setAnalisando(true);
    setLaudo(null);
    setSalvo(false);
    try {
      const dataUrls = await Promise.all(itens.map((i) => fileToDataUrl(i.file)));
      const resultado = await gerarLaudoPorImagens(dataUrls);
      setLaudo(resultado);
      toast.success("Laudo gerado com sucesso");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar o laudo");
    } finally {
      setAnalisando(false);
    }
  }

  async function salvar() {
    if (!laudo || !user) return;
    setSalvando(true);
    try {
      await salvarLaudo({ user_id: user.id, origem: "avulso", laudo });
      setSalvo(true);
      toast.success("Laudo salvo no seu histórico");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar o laudo");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header className="space-y-1.5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Análise de risco por IA</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Envie as fotos do veículo e receba um laudo técnico com o percentual de risco para
          seguradora. Ideal para uma avaliação rápida, sem abrir uma inspeção completa.
        </p>
      </header>

      <Card className="p-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void adicionar(e.target.files);
            e.target.value = "";
          }}
        />

        {itens.length === 0 ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary hover:bg-primary/5"
          >
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium">Adicionar fotos do veículo</span>
            <span className="text-xs text-muted-foreground">
              Câmera ou galeria · até {MAX_FOTOS} fotos
            </span>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {itens.map((item) => (
                <div key={item.id} className="group relative aspect-square overflow-hidden rounded-lg border">
                  <img
                    src={item.preview}
                    alt="Foto do veículo para análise de risco"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <button
                    type="button"
                    onClick={() => remover(item.id)}
                    aria-label="Remover foto"
                    className="absolute right-1 top-1 rounded-full bg-background/90 p-1.5 shadow-sm"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {itens.length < MAX_FOTOS && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[11px]">Adicionar</span>
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => void analisar()}
                disabled={analisando}
                className="h-12 flex-1 text-base"
              >
                {analisando ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analisando {itens.length} foto(s)…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Gerar laudo de risco
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={limpar}
                disabled={analisando}
                className="h-12 sm:w-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            </div>
          </div>
        )}
      </Card>

      {analisando && (
        <Card className="flex items-center gap-3 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div className="text-sm">
            <p className="font-medium">A IA está avaliando as fotos…</p>
            <p className="text-muted-foreground">Isso costuma levar de 10 a 30 segundos.</p>
          </div>
        </Card>
      )}

      {laudo && (
        <section className="space-y-4">
          <LaudoRiscoCard laudo={laudo} />
          <Button
            variant="outline"
            className="h-12 w-full"
            onClick={() => void salvar()}
            disabled={salvando || salvo}
          >
            {salvando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando…
              </>
            ) : salvo ? (
              "Laudo salvo"
            ) : (
              "Salvar laudo no histórico"
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Laudo gerado por inteligência artificial com base apenas nas imagens enviadas. Serve
            como apoio à decisão e não substitui um laudo cautelar oficial.
          </p>
        </section>
      )}
    </div>
  );
}
