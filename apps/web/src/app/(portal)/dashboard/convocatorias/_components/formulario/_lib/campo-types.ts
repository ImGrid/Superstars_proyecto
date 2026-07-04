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
  Info,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TipoCampoFormulario } from "@superstars/shared";

// "contenido" agrupa los campos que no capturan dato (solo muestran informacion)
type CategoriaCampo = "texto" | "seleccion" | "datos" | "contenido";

export interface CampoTypeInfo {
  label: string;
  icon: LucideIcon;
  categoria: CategoriaCampo;
}

// mapa tipo -> metadata visual
export const campoTypeMap: Record<TipoCampoFormulario, CampoTypeInfo> = {
  texto_corto: { label: "Texto corto", icon: Type, categoria: "texto" },
  texto_largo: { label: "Texto largo", icon: AlignLeft, categoria: "texto" },
  numerico: { label: "Numérico", icon: Hash, categoria: "texto" },
  texto_url: { label: "URL", icon: Link, categoria: "texto" },
  seleccion_unica: { label: "Selección única", icon: CircleDot, categoria: "seleccion" },
  seleccion_multiple: { label: "Selección múltiple", icon: ListChecks, categoria: "seleccion" },
  si_no: { label: "Si / No", icon: ToggleLeft, categoria: "seleccion" },
  tabla: { label: "Tabla", icon: Table2, categoria: "datos" },
  archivo: { label: "Archivo", icon: Upload, categoria: "datos" },
  informativo: { label: "Bloque informativo", icon: Info, categoria: "contenido" },
};

// categorias para el popover de agregar campo
export const categorias = [
  { key: "texto" as const, label: "Texto" },
  { key: "seleccion" as const, label: "Selección" },
  { key: "datos" as const, label: "Datos" },
  { key: "contenido" as const, label: "Contenido" },
];

// tipos agrupados por categoria
export function getCamposByCategoria(categoria: CategoriaCampo) {
  return (Object.entries(campoTypeMap) as [TipoCampoFormulario, CampoTypeInfo][])
    .filter(([, info]) => info.categoria === categoria)
    .map(([tipo, info]) => ({ tipo, ...info }));
}
