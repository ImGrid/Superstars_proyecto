import type { SchemaDefinition } from "@superstars/shared";

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
      warnings.push({ itemId: sec.id, message: "ID de seccion duplicado", severity: "error" });
    }
    allSecIds.add(sec.id);

    // seccion sin titulo
    if (!sec.titulo.trim()) {
      warnings.push({ itemId: sec.id, message: "La seccion no tiene titulo", severity: "error" });
    }

    // seccion sin campos
    if (sec.campos.length === 0) {
      warnings.push({ itemId: sec.id, message: "La seccion no tiene campos", severity: "warning" });
    }

    for (const campo of sec.campos) {
      // ids de campo duplicados
      if (allFieldIds.has(campo.id)) {
        warnings.push({ itemId: campo.id, message: "ID de campo duplicado", severity: "error" });
      }
      allFieldIds.add(campo.id);

      // campo sin etiqueta
      if (!campo.etiqueta.trim()) {
        warnings.push({ itemId: campo.id, message: "El campo no tiene etiqueta", severity: "error" });
      }

      // seleccion con < 2 opciones
      if (
        (campo.tipo === "seleccion_unica" || campo.tipo === "seleccion_multiple") &&
        campo.opciones.length < 2
      ) {
        warnings.push({
          itemId: campo.id,
          message: "La seleccion necesita al menos 2 opciones",
          severity: "error",
        });
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
