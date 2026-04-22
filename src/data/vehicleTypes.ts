// Tipos de veículo suportados pelo InspectAuto.
// Estrutura modular: cada tipo tem seu próprio checklist, ícone e tema visual.

import type { ChecklistCategoria } from "./checklist";
import { CHECKLIST as CARRO_CHECKLIST, CATEGORIAS_CRITICAS as CARRO_CRITICAS } from "./checklist";
import { CHECKLIST_MOTO, CATEGORIAS_CRITICAS_MOTO } from "./checklists/moto";
import { CHECKLIST_CAMINHAO, CATEGORIAS_CRITICAS_CAMINHAO } from "./checklists/caminhao";

export type VehicleType = "carro" | "moto" | "caminhao";

export type VehicleTypeMeta = {
  key: VehicleType;
  nome: string;
  emoji: string;
  descricao: string;
  /** Cor de destaque sutil (classe Tailwind) — usada em badges e headers */
  accentBg: string;
  accentText: string;
  accentBorder: string;
};

export const VEHICLE_TYPES: Record<VehicleType, VehicleTypeMeta> = {
  carro: {
    key: "carro",
    nome: "Carro",
    emoji: "🚗",
    descricao: "Inspeção completa de veículos de passeio",
    accentBg: "bg-primary/10",
    accentText: "text-primary",
    accentBorder: "border-primary/30",
  },
  moto: {
    key: "moto",
    nome: "Moto",
    emoji: "🏍️",
    descricao: "Inspeção de motocicletas e scooters",
    accentBg: "bg-blue-500/10",
    accentText: "text-blue-600 dark:text-blue-400",
    accentBorder: "border-blue-500/30",
  },
  caminhao: {
    key: "caminhao",
    nome: "Caminhão",
    emoji: "🚛",
    descricao: "Inspeção robusta de caminhões e utilitários pesados",
    accentBg: "bg-orange-500/10",
    accentText: "text-orange-600 dark:text-orange-400",
    accentBorder: "border-orange-500/30",
  },
};

export const VEHICLE_TYPE_LIST: VehicleTypeMeta[] = [
  VEHICLE_TYPES.carro,
  VEHICLE_TYPES.moto,
  VEHICLE_TYPES.caminhao,
];

/** Normaliza qualquer valor recebido para um VehicleType válido (default carro) */
export function normalizeVehicleType(value: unknown): VehicleType {
  if (value === "moto" || value === "caminhao" || value === "carro") return value;
  return "carro";
}

/** Retorna o checklist apropriado para o tipo de veículo */
export function getChecklist(tipo: VehicleType): ChecklistCategoria[] {
  switch (tipo) {
    case "moto":
      return CHECKLIST_MOTO;
    case "caminhao":
      return CHECKLIST_CAMINHAO;
    case "carro":
    default:
      return CARRO_CHECKLIST;
  }
}

/** Retorna as categorias críticas (regras inteligentes de score) por tipo */
export function getCategoriasCriticas(tipo: VehicleType): string[] {
  switch (tipo) {
    case "moto":
      return CATEGORIAS_CRITICAS_MOTO;
    case "caminhao":
      return CATEGORIAS_CRITICAS_CAMINHAO;
    case "carro":
    default:
      return CARRO_CRITICAS;
  }
}

/** Total de itens do checklist por tipo */
export function getTotalItens(tipo: VehicleType): number {
  return getChecklist(tipo).reduce((sum, cat) => sum + cat.itens.length, 0);
}

export function getVehicleMeta(tipo: VehicleType): VehicleTypeMeta {
  return VEHICLE_TYPES[tipo] || VEHICLE_TYPES.carro;
}

/** Chave do localStorage para lembrar a última escolha do usuário */
export const LAST_VEHICLE_TYPE_KEY = "inspectauto:last_vehicle_type";
