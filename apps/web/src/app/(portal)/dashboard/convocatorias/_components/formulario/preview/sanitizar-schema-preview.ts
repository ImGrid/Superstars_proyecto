import type { SchemaDefinition } from "@superstars/shared";
import { sanitizeInformativo } from "@/lib/sanitize";

// El HTML de los bloques informativos se limpia en el backend AL GUARDAR. La vista
// previa muestra el schema tal como esta en el editor (con cambios sin guardar), asi
// que ese contenido todavia no paso por ningun filtro. Aqui se aplica la misma poda
// que hara el backend: cierra el riesgo de ejecutar HTML pegado por el operador y
// ademas hace la vista previa fiel (no muestra etiquetas que el guardado va a borrar).
export function sanitizarSchemaPreview(schema: SchemaDefinition): SchemaDefinition {
  return {
    ...schema,
    secciones: schema.secciones.map((seccion) => ({
      ...seccion,
      campos: seccion.campos.map((campo) =>
        campo.tipo === "informativo"
          ? { ...campo, contenido: sanitizeInformativo(campo.contenido) }
          : campo,
      ),
    })),
  };
}
