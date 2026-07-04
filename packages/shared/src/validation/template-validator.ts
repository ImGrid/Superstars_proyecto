import type { SchemaDefinition } from '../schemas/formulario.schema';

// valida que los campos de una plantilla de REFERENCIA que aun existen en el schema
// no hayan cambiado de tipo. La referencia es el schema previo de la categoria (o la
// plantilla con la que se creo), NO una plantilla global fija: cada categoria puede
// tener su propia plantilla, con ids reutilizados pero de distinto tipo.
export function validateTemplateIntegrity(
  schema: SchemaDefinition,
  referencia: SchemaDefinition,
): string[] {
  const errors: string[] = [];

  const seccionesById = new Map(schema.secciones.map(s => [s.id, s]));

  for (const refSeccion of referencia.secciones) {
    const seccion = seccionesById.get(refSeccion.id);
    // si la seccion fue eliminada, es valido
    if (!seccion) continue;

    // verificar campos que aun existen en la seccion
    const camposById = new Map(seccion.campos.map(c => [c.id, c]));

    for (const refCampo of refSeccion.campos) {
      const campo = camposById.get(refCampo.id);
      // si el campo fue eliminado, es valido
      if (!campo) continue;

      // el tipo no puede cambiar (si quiere otro tipo, debe eliminar y crear uno nuevo)
      if (campo.tipo !== refCampo.tipo) {
        errors.push(`El campo "${refCampo.etiqueta ?? refCampo.id}" (${refCampo.id}) no puede cambiar de tipo (${refCampo.tipo} -> ${campo.tipo})`);
      }
    }
  }

  return errors;
}
