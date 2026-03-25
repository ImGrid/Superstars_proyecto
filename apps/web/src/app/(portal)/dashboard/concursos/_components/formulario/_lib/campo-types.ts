import {
  Type,
  AlignLeft,
  Hash,
  Link,
  CircleDot,
  ListChecks,
  ToggleLeft,
  Table2,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TipoCampoFormulario } from "@superstars/shared";

export interface CampoTypeInfo {
  label: string;
  icon: LucideIcon;
  categoria: "texto" | "seleccion" | "datos";
}

// mapa tipo -> metadata visual
export const campoTypeMap: Record<TipoCampoFormulario, CampoTypeInfo> = {
  texto_corto: { label: "Texto corto", icon: Type, categoria: "texto" },
  texto_largo: { label: "Texto largo", icon: AlignLeft, categoria: "texto" },
  numerico: { label: "Numerico", icon: Hash, categoria: "texto" },
  texto_url: { label: "URL", icon: Link, categoria: "texto" },
  seleccion_unica: { label: "Seleccion unica", icon: CircleDot, categoria: "seleccion" },
  seleccion_multiple: { label: "Seleccion multiple", icon: ListChecks, categoria: "seleccion" },
  si_no: { label: "Si / No", icon: ToggleLeft, categoria: "seleccion" },
  tabla: { label: "Tabla", icon: Table2, categoria: "datos" },
  archivo: { label: "Archivo", icon: Upload, categoria: "datos" },
};

// categorias para el popover de agregar campo
export const categorias = [
  { key: "texto" as const, label: "Texto" },
  { key: "seleccion" as const, label: "Seleccion" },
  { key: "datos" as const, label: "Datos" },
];

// tipos agrupados por categoria
export function getCamposByCategoria(categoria: "texto" | "seleccion" | "datos") {
  return (Object.entries(campoTypeMap) as [TipoCampoFormulario, CampoTypeInfo][])
    .filter(([, info]) => info.categoria === categoria)
    .map(([tipo, info]) => ({ tipo, ...info }));
}
