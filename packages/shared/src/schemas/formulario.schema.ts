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
  'informativo',
] as const;

// Variantes visuales del campo informativo (solo presentacion, no captura dato)
export const variantesInformativo = ['parrafo', 'subtitulo', 'nota', 'advertencia', 'detalle'] as const;
export const varianteInformativoSchema = z.enum(variantesInformativo);

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

// Visibilidad condicional: el campo solo se muestra si otro campo del mismo
// formulario tiene cierto valor. Nacio para el video: se preguntaba "¿tiene una
// presentacion o video?" y el recuadro para subirlo salia igual respondiera que
// si o que no, con lo que la pregunta no servia para nada.
// Un campo escondido no se pide, no se valida y no cuenta para el 100%.
const mostrarSiSchema = z.object({
  // id del campo del que depende
  campo: z.string().min(1),
  // valor que debe tener ese campo para que este se muestre
  igual: z.union([z.string(), z.number(), z.boolean()]),
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
  // Si esta presente, el campo solo se muestra cuando se cumple la condicion
  mostrarSi: mostrarSiSchema.optional(),
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
  // min(1): un grupo de una sola casilla es un opt-in valido (ej. un ambito con
  // un unico enunciado). seleccion_unica si exige min(2) (un radio de 1 no aplica).
  opciones: z.array(opcionSchema).min(1),
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

// Campo informativo: solo presentacion (texto/HTML de solo lectura). NO captura
// dato, NO entra en response_data, NUNCA es requerido. `etiqueta` es opcional
// (el texto va en `contenido`); en la variante `detalle` sirve como resumen visible.
const campoInformativoSchema = z.object({
  ...campoBase,
  // El informativo no captura dato: etiqueta y requerido son opcionales
  // (requerido nunca aplica; se mantiene en el tipo para el acceso al union).
  etiqueta: z.string().optional(),
  requerido: z.boolean().optional(),
  tipo: z.literal('informativo'),
  variante: varianteInformativoSchema.default('parrafo'),
  // Texto plano o HTML sanitizado (se sanitiza en el backend al guardar)
  contenido: z.string().min(1),
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
  campoInformativoSchema,
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
  { message: 'Los IDs de secciones deben ser únicos' },
).refine(
  (data) => {
    const fieldIds = data.secciones.flatMap(s => s.campos.map(c => c.id));
    return new Set(fieldIds).size === fieldIds.length;
  },
  { message: 'Los IDs de campos deben ser únicos en todo el formulario' },
).refine(
  // Tabla con filas predefinidas (filasFijas) NO puede ser también dinámica.
  // Las filas predefinidas implican estructura cerrada (ej: años 2023, 2024, 2025).
  (data) => {
    for (const seccion of data.secciones) {
      for (const campo of seccion.campos) {
        if (
          campo.tipo === 'tabla' &&
          campo.filasFijas &&
          campo.filasFijas.length > 0 &&
          campo.filasDinamicas
        ) {
          return false;
        }
      }
    }
    return true;
  },
  {
    message: 'Una tabla no puede tener filas predefinidas y filas dinámicas al mismo tiempo',
  },
);

// Crear formulario dinamico
export const createFormularioSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  schemaDefinition: schemaDefinitionSchema,
});

// Actualizar formulario (solo en estado borrador de la convocatoria)
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
export type FilaFijaTabla = z.infer<typeof filaFijaSchema>;
export type AutoRelleno = z.infer<typeof autoRellenoSchema>;
export type VarianteInformativo = z.infer<typeof varianteInformativoSchema>;

// Distingue campos de DATO (capturan respuesta del postulante) de los de
// PRESENTACION (informativo). Fuente unica de verdad: la usan el validador de
// respuestas, el calculo de % completado y el render. Un campo informativo no
// genera clave en response_data, no valida y no cuenta para la completitud.
export function esCampoDeDato(campo: FormField): boolean {
  return campo.tipo !== 'informativo';
}

// Decide si un campo se muestra, segun las respuestas actuales del formulario.
// Fuente unica de verdad: la usan el formulario del postulante, el paso de
// revision, el validador de respuestas, el calculo de % completado y el visor
// de solo lectura. Si los cuatro no coinciden, el postulante puede quedar
// atrapado en un campo que no ve.
// Un campo sin `mostrarSi` se muestra siempre.
export function campoVisible(
  campo: FormField,
  respuestas: Record<string, unknown>,
): boolean {
  if (!campo.mostrarSi) return true;
  return respuestas[campo.mostrarSi.campo] === campo.mostrarSi.igual;
}

// GET /convocatorias/:convocatoriaId/categorias/:categoriaId/formulario, POST, PUT
export interface FormularioResponse {
  id: number;
  categoriaId: number;
  nombre: string;
  descripcion: string | null;
  schemaDefinition: SchemaDefinition;
  version: number;
  createdAt: string;
  updatedAt: string;
}
