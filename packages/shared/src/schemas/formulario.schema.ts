import { z } from 'zod';

// Tipos de campo del formulario dinamico (9 tipos segun docs/formulario_registro.txt)
export const tiposCampoFormulario = [
  'texto_corto',
  'texto_largo',
  'numerico',
  'seleccion_unica',
  'seleccion_multiple',
  'tabla',
  'archivo',
  'si_no',
  'texto_url',
] as const;

export const tipoCampoSchema = z.enum(tiposCampoFormulario);

// Definicion de un campo dentro del schema_definition JSONB
export const formFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  tipo: tipoCampoSchema,
  requerido: z.boolean().default(false),
  seccion: z.string().optional(),
  orden: z.number().int().positive(),
  opciones: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
});

// Schema completo del formulario (schema_definition JSONB)
export const schemaDefinitionSchema = z.object({
  secciones: z.array(z.object({
    id: z.string().min(1),
    titulo: z.string().min(1),
    orden: z.number().int().positive(),
  })),
  campos: z.array(formFieldSchema),
});

// Crear formulario dinamico (chk_formulario_version: version >= 1)
export const createFormularioSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  schemaDefinition: schemaDefinitionSchema,
});

// Actualizar formulario (solo en estado borrador del concurso)
export const updateFormularioSchema = createFormularioSchema.partial();

export type TipoCampoFormulario = z.infer<typeof tipoCampoSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
export type SchemaDefinition = z.infer<typeof schemaDefinitionSchema>;
export type CreateFormularioDto = z.infer<typeof createFormularioSchema>;
export type UpdateFormularioDto = z.infer<typeof updateFormularioSchema>;
