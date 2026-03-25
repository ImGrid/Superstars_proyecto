import { z } from 'zod';

// 9 tipos de campo (docs/formulario_registro.txt + docs/02_entidades_y_relaciones.md)
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

// Opcion para campos de seleccion (valor + label visible)
const opcionSchema = z.object({
  valor: z.string().min(1),
  label: z.string().min(1),
});

// Columna de tabla (definida por el responsable)
const columnaTablaSchema = z.object({
  id: z.string().min(1),
  titulo: z.string().min(1),
  tipo: z.enum(['texto_corto', 'numerico']),
  requerido: z.boolean().default(false),
});

// Fila fija de tabla (predefinida por el responsable, ej: 2023, 2024, 2025)
const filaFijaSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
});

// Auto-relleno: mapeo de campo a tabla de BD
const autoRellenoSchema = z.object({
  tabla: z.enum(['empresa', 'usuario']),
  campo: z.string().min(1),
});

// Propiedades comunes a todos los campos
const campoBase = {
  id: z.string().min(1),
  etiqueta: z.string().min(1),
  descripcion: z.string().optional(),
  requerido: z.boolean().default(false),
  orden: z.number().int().positive(),
  // Template flags
  fijo: z.boolean().default(false),
  // Auto-relleno desde BD
  autoRelleno: autoRellenoSchema.optional(),
};

// --- Variantes por tipo (discriminated union) ---

const campoTextoCortoSchema = z.object({
  ...campoBase,
  tipo: z.literal('texto_corto'),
  placeholder: z.string().optional(),
  maxLength: z.number().int().positive().optional(),
});

const campoTextoLargoSchema = z.object({
  ...campoBase,
  tipo: z.literal('texto_largo'),
  placeholder: z.string().optional(),
  maxPalabras: z.number().int().positive().optional(),
  filas: z.number().int().positive().default(4),
});

const campoNumericoSchema = z.object({
  ...campoBase,
  tipo: z.literal('numerico'),
  placeholder: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

const campoSeleccionUnicaSchema = z.object({
  ...campoBase,
  tipo: z.literal('seleccion_unica'),
  opciones: z.array(opcionSchema).min(2),
  permiteOtra: z.boolean().default(false),
  display: z.enum(['radio', 'dropdown']).default('dropdown'),
});

const campoSeleccionMultipleSchema = z.object({
  ...campoBase,
  tipo: z.literal('seleccion_multiple'),
  opciones: z.array(opcionSchema).min(2),
  permiteOtra: z.boolean().default(false),
  minSelecciones: z.number().int().min(0).optional(),
  maxSelecciones: z.number().int().positive().optional(),
});

const campoTablaSchema = z.object({
  ...campoBase,
  tipo: z.literal('tabla'),
  columnas: z.array(columnaTablaSchema).min(1),
  filasIniciales: z.number().int().positive().default(3),
  filasFijas: z.array(filaFijaSchema).optional(),
  filasDinamicas: z.boolean().default(false),
});

const campoArchivoSchema = z.object({
  ...campoBase,
  tipo: z.literal('archivo'),
  tiposPermitidos: z.array(z.string()).default(['.pdf']),
  maxTamanoMb: z.number().positive().default(10),
  maxArchivos: z.number().int().positive().default(1),
});

const campoSiNoSchema = z.object({
  ...campoBase,
  tipo: z.literal('si_no'),
  labelSi: z.string().default('Si'),
  labelNo: z.string().default('No'),
});

const campoTextoUrlSchema = z.object({
  ...campoBase,
  tipo: z.literal('texto_url'),
  placeholder: z.string().optional(),
});

// Union discriminada por "tipo" (O(1) routing, errores claros)
export const formFieldSchema = z.discriminatedUnion('tipo', [
  campoTextoCortoSchema,
  campoTextoLargoSchema,
  campoNumericoSchema,
  campoSeleccionUnicaSchema,
  campoSeleccionMultipleSchema,
  campoTablaSchema,
  campoArchivoSchema,
  campoSiNoSchema,
  campoTextoUrlSchema,
]);

// Seccion del formulario (contiene sus campos anidados)
export const seccionSchema = z.object({
  id: z.string().min(1),
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
  orden: z.number().int().positive(),
  fija: z.boolean().default(false),
  campos: z.array(formFieldSchema),
});

// Schema completo del formulario (schema_definition JSONB)
export const schemaDefinitionSchema = z.object({
  secciones: z.array(seccionSchema).min(1),
}).refine(
  (data) => {
    const secIds = data.secciones.map(s => s.id);
    return new Set(secIds).size === secIds.length;
  },
  { message: 'Los IDs de secciones deben ser unicos' },
).refine(
  (data) => {
    const fieldIds = data.secciones.flatMap(s => s.campos.map(c => c.id));
    return new Set(fieldIds).size === fieldIds.length;
  },
  { message: 'Los IDs de campos deben ser unicos en todo el formulario' },
);

// Crear formulario dinamico
export const createFormularioSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  schemaDefinition: schemaDefinitionSchema,
});

// Actualizar formulario (solo en estado borrador del concurso)
export const updateFormularioSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  schemaDefinition: schemaDefinitionSchema.optional(),
  version: z.number().int().positive(),
});

// Tipos exportados
export type TipoCampoFormulario = z.infer<typeof tipoCampoSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
export type Seccion = z.infer<typeof seccionSchema>;
export type SchemaDefinition = z.infer<typeof schemaDefinitionSchema>;
export type CreateFormularioDto = z.infer<typeof createFormularioSchema>;
export type UpdateFormularioDto = z.infer<typeof updateFormularioSchema>;
export type OpcionCampo = z.infer<typeof opcionSchema>;
export type ColumnaTabla = z.infer<typeof columnaTablaSchema>;
export type AutoRelleno = z.infer<typeof autoRellenoSchema>;

// GET /concursos/:concursoId/formulario, POST, PUT
export interface FormularioResponse {
  id: number;
  concursoId: number;
  nombre: string;
  descripcion: string | null;
  schemaDefinition: SchemaDefinition;
  version: number;
  createdAt: string;
  updatedAt: string;
}
