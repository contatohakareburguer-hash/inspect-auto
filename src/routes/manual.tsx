import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  Rocket,
  Camera,
  Sparkles,
  PenLine,
  FileText,
  HelpCircle,
  Car,
} from "lucide-react";

export const Route = createFileRoute("/manual")({
  head: () => ({
    meta: [
      { title: "Manual do usuário — InspectAuto" },
      {
        name: "description",
        content: "Guia completo de uso do InspectAuto: como cadastrar veículos, fazer checklist, usar IA, assinaturas e gerar PDF.",
      },
    ],
  }),
  component: Manual,
});

function Manual() {
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <BookOpen className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Manual do usuário</h1>
          <p className="text-sm text-muted-foreground">
            Tudo que você precisa para usar o InspectAuto com confiança.
          </p>
        </div>
      </header>

      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <Rocket className="h-4 w-4 text-primary" /> Sumário
        </h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Primeiros passos</li>
          <li>Tipos de veículo</li>
          <li>Nova inspeção (modo manual)</li>
          <li>Inspeção Inteligente (IA)</li>
          <li>Fotos e legendas</li>
          <li>Assinaturas</li>
          <li>Relatório PDF</li>
          <li>Perguntas frequentes</li>
        </ol>
      </Card>

      <Accordion type="single" collapsible defaultValue="passos" className="space-y-2">
        <AccordionItem value="passos" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" /> 1. Primeiros passos
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Faça login com seu e-mail ou conta Google.</p>
            <p>2. Na tela inicial, toque em <strong>Iniciar inspeção</strong> ou <strong>Iniciar com IA</strong>.</p>
            <p>3. Use o menu lateral (☰) para navegar entre Início, Histórico, Manual e Configurações.</p>
            <p className="rounded-md bg-muted/50 p-2 text-xs">
              💡 Instale o app no celular usando o botão "Instalar" para acesso rápido como aplicativo nativo.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tipos" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <Car className="h-4 w-4 text-primary" /> 2. Tipos de veículo
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
            <p>Antes de cada inspeção, escolha o tipo:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>🚗 <strong>Carro</strong> — checklist completo de veículo de passeio.</li>
              <li>🏍️ <strong>Moto</strong> — itens específicos: corrente, suspensão, escapamento.</li>
              <li>🚛 <strong>Caminhão</strong> — freios pneumáticos, eixos, baú e cabine.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="manual" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> 3. Nova inspeção (modo manual)
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Preencha os dados do veículo: placa, marca, modelo, cor, KM e vistoriador responsável.</p>
            <p>2. Percorra cada categoria do checklist (Lataria, Motor, Pneus, etc).</p>
            <p>3. Para cada item: marque <strong>OK / Atenção / Crítico</strong>, adicione observação e fotos.</p>
            <p>4. Ao final, vá ao Resumo para revisar score, assinar e exportar PDF.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="ia" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> 4. Inspeção Inteligente (IA)
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
            <p>Tire fotos guiadas (frente, traseira, laterais) e a IA detecta automaticamente:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Riscos e arranhões</li>
              <li>Amassados e batidas</li>
              <li>Trincas em vidros e faróis</li>
            </ul>
            <p className="rounded-md bg-muted/50 p-2 text-xs">
              ⚡ Dica: ilumine bem o veículo e mantenha o celular paralelo à carroceria para melhor detecção.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="fotos" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" /> 5. Fotos e legendas
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
            <p>Cada item aceita <strong>múltiplas fotos</strong>. Toque no ícone de lápis (✏️) na miniatura para adicionar uma legenda — ex: <em>"risco profundo na porta dianteira"</em>.</p>
            <p>As legendas aparecem no relatório PDF abaixo de cada foto.</p>
            <p>Você pode reordenar fotos arrastando a miniatura.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="assinatura" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-primary" /> 6. Assinaturas
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
            <p>Na tela de Resumo, colete duas assinaturas obrigatórias para validar o laudo:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Vistoriador responsável</strong> — quem realizou a inspeção.</li>
              <li><strong>Cliente / Proprietário</strong> — quem entrega ou recebe o veículo.</li>
            </ul>
            <p>Ambas aparecem ao final do PDF, com nome impresso.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="pdf" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> 7. Relatório PDF
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
            <p>O relatório consolida: dados do veículo, checklist por categoria, observações, fotos com legendas, score final, classificação e assinaturas.</p>
            <p>Compartilhe pelo WhatsApp, e-mail ou imprima diretamente do navegador.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="faq" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-left">
            <span className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" /> 8. Perguntas frequentes
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">Funciona offline?</p>
              <p>Parcialmente. O app abre offline, mas envio de fotos e geração de PDF requerem internet.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Posso editar uma inspeção finalizada?</p>
              <p>Não. Após finalizar, ela vira somente leitura. Crie uma nova se precisar revisar.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Quantas fotos por item?</p>
              <p>Sem limite. Recomendamos 3 a 5 por item crítico.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Como recupero minha senha?</p>
              <p>Na tela de login, toque em "Esqueci minha senha" e siga o e-mail de recuperação.</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
