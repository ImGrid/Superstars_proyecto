import type { SchemaDefinition } from '../schemas/formulario.schema';
import { DEFAULT_TEMPLATE } from '../constants/default-template';

// valida que campos fijos que aun existen no hayan cambiado de tipo
export function validateTemplateIntegrity(schema: SchemaDefinition): string[] {
  const errors: string[] = [];

  const seccionesById = new Map(schema.secciones.map(s => [s.id, s]));

  for (const tplSeccion of DEFAULT_TEMPLATE.secciones) {
    const seccion = seccionesById.get(tplSeccion.id);
    // si la seccion fue eliminada, es valido
    if (!seccion) continue;

    // verificar campos fijos que aun existen en la seccion
    const camposById = new Map(seccion.campos.map(c => [c.id, c]));

    for (const tplCampo of tplSeccion.campos) {
      const campo = camposById.get(tplCampo.id);
      // si el campo fue eliminado, es valido
      if (!campo) continue;

      // el tipo no puede cambiar (si quiere otro tipo, debe eliminar y crear uno nuevo)
      if (campo.tipo !== tplCampo.tipo) {
        errors.push(`El campo "${tplCampo.etiqueta}" (${tplCampo.id}) no puede cambiar de tipo (${tplCampo.tipo} -> ${campo.tipo})`);
      }
    }
  }

  return errors;
}
