import { getVehicleMeta, type VehicleType } from "@/data/vehicleTypes";

type Props = {
  tipo: VehicleType;
  className?: string;
  size?: "sm" | "md";
};

/**
 * Badge visual que mostra o tipo de veículo selecionado na inspeção.
 * Usado no topo das telas internas (cadastro, checklist, IA, resumo).
 */
export function VehicleTypeBadge({ tipo, className = "", size = "md" }: Props) {
  const meta = getVehicleMeta(tipo);
  const sizeClass = size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${meta.accentBorder} ${meta.accentBg} ${meta.accentText} font-semibold ${sizeClass} ${className}`}
    >
      <span aria-hidden>{meta.emoji}</span>
      <span>{meta.nome}</span>
    </span>
  );
}
