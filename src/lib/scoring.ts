import { CATEGORIAS_CRITICAS } from "@/data/checklist";

export type StatusItem = "ok" | "atencao" | "grave" | null;

export type ItemScore = {
  categoria: string;
  status: StatusItem;
};

export type ResultadoScore = {
  scoreTotal: number;
  classificacao: "Saudável" | "Risco moderado" | "Alto risco";
  classificacaoColor: "success" | "warning" | "destructive";
  conclusao: "Comprar" | "Negociar" | "Evitar";
  conclusaoCor: "success" | "warning" | "destructive";
  alertas: string[];
  totalGraves: number;
  totalAtencao: number;
  totalOk: number;
  totalAvaliado: number;
};

export function calcularScore(itens: ItemScore[]): ResultadoScore {
  let score = 0;
  let graves = 0;
  let atencao = 0;
  let ok = 0;
  const alertas: string[] = [];
  const gravesPorCategoria: Record<string, number> = {};

  for (const it of itens) {
    if (it.status === "ok") {
      ok++;
    } else if (it.status === "atencao") {
      score += 1;
      atencao++;
    } else if (it.status === "grave") {
      score += 3;
      graves++;
      gravesPorCategoria[it.categoria] = (gravesPorCategoria[it.categoria] || 0) + 1;
    }
  }

  // Regras inteligentes
  let forcaAltoRisco = false;
  let forcaEvitar = false;

  if ((gravesPorCategoria["motor"] || 0) >= 1) {
    alertas.push("⚠️ Problema GRAVE no motor — risco alto automático.");
    forcaAltoRisco = true;
  }
  if ((gravesPorCategoria["estrutura"] || 0) >= 1) {
    alertas.push("🚫 Problema GRAVE estrutural — recomendação: NÃO COMPRAR.");
    forcaAltoRisco = true;
    forcaEvitar = true;
  }
  if ((gravesPorCategoria["freios"] || 0) >= 1) {
    alertas.push("⚠️ Problema GRAVE nos freios — risco à segurança.");
    forcaAltoRisco = true;
  }
  if (graves >= 3) {
    alertas.push("🚨 Múltiplos problemas graves — alerta crítico.");
    forcaAltoRisco = true;
  }

  let classificacao: ResultadoScore["classificacao"];
  let classificacaoColor: ResultadoScore["classificacaoColor"];
  if (forcaAltoRisco || score >= 16) {
    classificacao = "Alto risco";
    classificacaoColor = "destructive";
  } else if (score >= 6) {
    classificacao = "Risco moderado";
    classificacaoColor = "warning";
  } else {
    classificacao = "Saudável";
    classificacaoColor = "success";
  }

  let conclusao: ResultadoScore["conclusao"];
  let conclusaoCor: ResultadoScore["conclusaoCor"];
  if (forcaEvitar || classificacao === "Alto risco") {
    conclusao = "Evitar";
    conclusaoCor = "destructive";
  } else if (classificacao === "Risco moderado") {
    conclusao = "Negociar";
    conclusaoCor = "warning";
  } else {
    conclusao = "Comprar";
    conclusaoCor = "success";
  }

  return {
    scoreTotal: score,
    classificacao,
    classificacaoColor,
    conclusao,
    conclusaoCor,
    alertas,
    totalGraves: graves,
    totalAtencao: atencao,
    totalOk: ok,
    totalAvaliado: ok + atencao + graves,
  };
}

export const STATUS_LABEL: Record<NonNullable<StatusItem>, string> = {
  ok: "OK",
  atencao: "Atenção",
  grave: "Grave",
};

export const STATUS_COLOR: Record<NonNullable<StatusItem>, "success" | "warning" | "destructive"> = {
  ok: "success",
  atencao: "warning",
  grave: "destructive",
};

export { CATEGORIAS_CRITICAS };
