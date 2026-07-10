import type { SchemaDefinition } from "@superstars/shared";
import { esCampoDeDato } from "@superstars/shared";

export interface BuilderWarning {
  itemId: string;
  message: string;
  severity: "error" | "warning";
}

// valida el schema y retorna errores/warnings en tiempo real
export function validateSchema(schema: SchemaDefinition): BuilderWarning[] {
  const warnings: BuilderWarning[] = [];
  const allFieldIds = new Set<string>();
  const allSecIds = new Set<string>();

  for (const sec of schema.secciones) {
    // ids de seccion duplicados
    if (allSecIds.has(sec.id)) {
      warnings.push({ itemId: sec.id, message: "ID de sección duplicado", severity: "error" });
    }
    allSecIds.add(sec.id);

    // seccion sin titulo
    if (!sec.titulo.trim()) {
      warnings.push({ itemId: sec.id, message: "La sección no tiene título", severity: "error" });
    }

    // seccion sin campos
    if (sec.campos.length === 0) {
      warnings.push({ itemId: sec.id, message: "La sección no tiene campos", severity: "warning" });
    }

    for (const campo of sec.campos) {
      // ids de campo duplicados
      if (allFieldIds.has(campo.id)) {
        warnings.push({ itemId: campo.id, message: "ID de campo duplicado", severity: "error" });
      }
      allFieldIds.add(campo.id);

      // campo de dato sin etiqueta (los informativos no llevan etiqueta)
      if (esCampoDeDato(campo) && !campo.etiqueta?.trim()) {
        warnings.push({ itemId: campo.id, message: "El campo no tiene etiqueta", severity: "error" });
      }

      // seleccion unica necesita al menos 2 opciones (un radio de 1 no aplica)
      if (campo.tipo === "seleccion_unica" && campo.opciones.length < 2) {
        warnings.push({
          itemId: campo.id,
          message: "La selección necesita al menos 2 opciones",
          severity: "error",
        });
      }

      // seleccion multiple necesita al menos 1 opcion
      if (campo.tipo === "seleccion_multiple" && campo.opciones.length < 1) {
        warnings.push({
          itemId: campo.id,
          message: "La selección necesita al menos 1 opción",
          severity: "error",
        });
      }

      // opciones vacias o repetidas en los campos de seleccion
      if (campo.tipo === "seleccion_unica" || campo.tipo === "seleccion_multiple") {
        const labels = campo.opciones.map((o) => o.label.trim().toLowerCase());
        if (labels.some((l) => l === "")) {
          warnings.push({
            itemId: campo.id,
            message: "Hay opciones sin texto",
            severity: "error",
          });
        }
        if (new Set(labels).size !== labels.length) {
          warnings.push({
            itemId: campo.id,
            message: "Hay opciones repetidas",
            severity: "error",
          });
        }
      }

      // tabla sin columnas
      if (campo.tipo === "tabla" && campo.columnas.length < 1) {
        warnings.push({
          itemId: campo.id,
          message: "La tabla necesita al menos 1 columna",
          severity: "error",
        });
      }
    }
  }

  return warnings;
}

// helpers
export function hasErrors(warnings: BuilderWarning[]): boolean {
  return warnings.some((w) => w.severity === "error");
}

export function getWarningsForItem(warnings: BuilderWarning[], itemId: string): BuilderWarning[] {
  return warnings.filter((w) => w.itemId === itemId);
}
