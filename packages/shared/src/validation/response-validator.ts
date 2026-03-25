import { z, type ZodTypeAny } from 'zod';
import type { SchemaDefinition, FormField } from '../schemas/formulario.schema';

export type ValidationMode = 'draft' | 'submit';

// Genera un schema Zod dinamico a partir del schema_definition del formulario
export function buildResponseSchema(
  schema: SchemaDefinition,
  mode: ValidationMode,
): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};

  // Campos estan anidados dentro de secciones
  const allCampos = schema.secciones.flatMap(s => s.campos);

  for (const campo of allCampos) {
    let fieldSchema = buildFieldValidator(campo);

    // Draft: todo opcional (guardar parcial). Submit: solo no-requeridos opcionales
    if (mode === 'draft' || !campo.requerido) {
      fieldSchema = fieldSchema.optional().nullable() as unknown as ZodTypeAny;
    }

    shape[campo.id] = fieldSchema;

    // Campo auxiliar "__otra" para selecciones con permiteOtra
    if (
      (campo.tipo === 'seleccion_unica' || campo.tipo === 'seleccion_multiple') &&
      campo.permiteOtra
    ) {
      shape[`${campo.id}__otra`] = z.string().optional().nullable();
    }
  }

  // Draft: passthrough extras (schema pudo cambiar). Submit: strip extras
  return mode === 'draft'
    ? z.object(shape).passthrough()
    : z.object(shape).strip();
}

// Construye el validador Zod para un campo segun su tipo
function buildFieldValidator(campo: FormField): ZodTypeAny {
  switch (campo.tipo) {
    case 'texto_corto': {
      let s = z.string().min(1, 'Campo obligatorio');
      if (campo.maxLength) {
        s = s.max(campo.maxLength);
      }
      return s;
    }

    case 'texto_largo': {
      if (campo.maxPalabras) {
        const max = campo.maxPalabras;
        return z.string().min(1, 'Campo obligatorio').refine(
          (val) => val.split(/\s+/).filter(Boolean).length <= max,
          { message: `Maximo ${max} palabras` },
        );
      }
      return z.string().min(1, 'Campo obligatorio');
    }

    case 'numerico': {
      let n = z.number({ invalid_type_error: 'Debe ser un numero' });
      if (campo.min !== undefined) n = n.min(campo.min);
      if (campo.max !== undefined) n = n.max(campo.max);
      return n;
    }

    case 'seleccion_unica': {
      if (campo.permiteOtra) {
        // Acepta cualquier string (opciones definidas + "__otra__")
        return z.string().min(1, 'Seleccione una opcion');
      }
      const valores = campo.opciones.map(o => o.valor) as [string, ...string[]];
      return z.enum(valores);
    }

    case 'seleccion_multiple': {
      const baseItem = campo.permiteOtra
        ? z.string().min(1)
        : z.enum(campo.opciones.map(o => o.valor) as [string, ...string[]]);
      let arr = z.array(baseItem);
      if (campo.minSelecciones) arr = arr.min(campo.minSelecciones);
      if (campo.maxSelecciones) arr = arr.max(campo.maxSelecciones);
      return arr;
    }

    case 'tabla': {
      // Cada fila es un objeto con las columnas definidas
      const rowShape: Record<string, ZodTypeAny> = {};
      for (const col of campo.columnas) {
        const colValidator = col.tipo === 'numerico'
          ? z.union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/, 'Debe ser un numero')])
          : z.string();
        rowShape[col.id] = col.requerido ? colValidator : colValidator.optional().nullable();
      }
      return z.array(z.object(rowShape)).min(1, 'La tabla debe tener al menos una fila');
    }

    case 'archivo': {
      // response_data guarda IDs de archivo_postulacion (number[])
      return z.array(z.number().int().positive()).min(1).max(campo.maxArchivos);
    }

    case 'si_no':
      return z.boolean();

    case 'texto_url':
      return z.string().url('Debe ser una URL valida');

    default:
      return z.unknown();
  }
}
