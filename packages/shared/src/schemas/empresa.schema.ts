import { z } from 'zod';
import {
  NIT_REGEX,
  TELEFONO_REGEX,
  SEPREC_REGEX,
  ANIO_FUNDACION_MIN,
  EDAD_MINIMA_REPRESENTANTE,
  EDAD_MAXIMA_REPRESENTANTE,
  EMPLEADOS_MAX,
  RAZON_SOCIAL_MIN,
  RAZON_SOCIAL_MAX,
  CIUDAD_MIN,
  CIUDAD_MAX,
  DIRECCION_MIN,
  DIRECCION_MAX,
  CONTACTO_CARGO_MAX,
  DESCRIPCION_MAX_PALABRAS,
} from '../constants/validation-patterns';
import { withinMaxWords } from '../validation/word-count';

// Helper: campo de texto opcional. RHF envía '' cuando el usuario borra el
// input; lo convertimos a undefined ANTES de validar para que (a) la regla
// regex se aplique solo a contenido real y (b) el backend nunca persista
// '' en columnas UNIQUE NULLABLE (NIT) ni en columnas que esperan NULL como
// "no informado". El cleanFormValues del frontend hace lo mismo, esto es
// defensa para clientes directos (curl, Postman).
function optionalText<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    schema.optional(),
  );
}

// Helper: número entero opcional con rango. Vacío en el form llega como
// undefined (no como NaN) gracias al onChange del Input numérico de empresa-form.
function optionalIntegerInRange(min: number, max: number, message: string) {
  return z.number().int().min(min, message).max(max, message).optional();
}

// Año actual recalculado en cada parse: si el deploy queda corriendo en
// producción más de un año, no hay que regenerar el módulo para que valide
// fechas del nuevo año. El máximo se calcula on-the-fly.
function anioFundacionSchema() {
  const max = new Date().getFullYear();
  return z
    .number()
    .int()
    .min(ANIO_FUNDACION_MIN, `El año debe ser ${ANIO_FUNDACION_MIN} o posterior`)
    .max(max, `El año debe ser ${max} o anterior`)
    .optional();
}

// Fecha de nacimiento opcional. Validamos formato YYYY-MM-DD y un rango de
// edad razonable (entre EDAD_MÍNIMA y EDAD_MÁXIMA años). El representante
// legal de la empresa debe ser mayor de edad y la edad máxima evita capturar
// errores de tipeo (ej. 1850 en vez de 1985).
function birthDateSchema() {
  return z
    .string()
    .optional()
    .refine(
      (v) => v === undefined || v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v),
      { message: 'Formato de fecha inválido' },
    )
    .refine(
      (v) => {
        if (!v) return true;
        const [y, m, d] = v.split('-').map(Number);
        const fecha = new Date(y, m - 1, d);
        if (Number.isNaN(fecha.getTime())) return false;
        // cálculo de edad considerando mes y día, no solo año
        const hoy = new Date();
        let edad = hoy.getFullYear() - fecha.getFullYear();
        const mDiff = hoy.getMonth() - fecha.getMonth();
        if (mDiff < 0 || (mDiff === 0 && hoy.getDate() < fecha.getDate())) edad--;
        return edad >= EDAD_MINIMA_REPRESENTANTE && edad <= EDAD_MAXIMA_REPRESENTANTE;
      },
      {
        message: `La persona de contacto debe tener entre ${EDAD_MINIMA_REPRESENTANTE} y ${EDAD_MAXIMA_REPRESENTANTE} años`,
      },
    );
}

// Crear empresa (proponente registra su empresa)
export const createEmpresaSchema = z.object({
  // Datos legales (Q7-Q8)
  razonSocial: z
    .string()
    .min(RAZON_SOCIAL_MIN, `Debe tener al menos ${RAZON_SOCIAL_MIN} caracteres`)
    .max(RAZON_SOCIAL_MAX, `Máximo ${RAZON_SOCIAL_MAX} caracteres`),
  nit: optionalText(
    z.string().regex(NIT_REGEX, 'El NIT debe tener entre 7 y 13 dígitos'),
  ),
  registroSeprec: optionalText(
    z
      .string()
      .regex(
        SEPREC_REGEX,
        'Solo letras, números y guiones (4 a 20 caracteres)',
      ),
  ),
  // Estos selectores ya están acotados por OPCIONES_TIPO_EMPRESA / NUMERO_SOCIOS
  // en el frontend. Mantenemos string libre en el schema porque la lista de
  // opciones podría crecer y queremos evitar regresiones; el rol de validación
  // de "valor permitido" lo hace el <Select> y, en cliente directo, no es un
  // riesgo de seguridad porque la columna es solo display.
  tipoEmpresa: z.string().optional(),

  // Datos generales (Q9-Q16)
  numeroSocios: z.string().optional(),
  numEmpleadosMujeres: optionalIntegerInRange(
    0,
    EMPLEADOS_MAX,
    `Debe estar entre 0 y ${EMPLEADOS_MAX}`,
  ),
  numEmpleadosHombres: optionalIntegerInRange(
    0,
    EMPLEADOS_MAX,
    `Debe estar entre 0 y ${EMPLEADOS_MAX}`,
  ),
  rubro: z.string().optional(),
  anioFundacion: anioFundacionSchema(),
  departamento: z.string().optional(),
  ciudad: optionalText(
    z
      .string()
      .min(CIUDAD_MIN, `Debe tener al menos ${CIUDAD_MIN} caracteres`)
      .max(CIUDAD_MAX, `Máximo ${CIUDAD_MAX} caracteres`),
  ),
  direccion: optionalText(
    z
      .string()
      .min(DIRECCION_MIN, `Debe tener al menos ${DIRECCION_MIN} caracteres`)
      .max(DIRECCION_MAX, `Máximo ${DIRECCION_MAX} caracteres`),
  ),
  telefono: optionalText(
    z
      .string()
      .regex(
        TELEFONO_REGEX,
        'Teléfono inválido. Use solo dígitos, espacios, guiones, paréntesis o + (6 a 20 caracteres)',
      ),
  ),
  descripcion: z
    .string()
    .optional()
    .refine((v) => withinMaxWords(v, DESCRIPCION_MAX_PALABRAS), {
      message: `Máximo ${DESCRIPCION_MAX_PALABRAS} palabras`,
    }),

  // Persona de contacto (Q2-Q5)
  contactoCargo: optionalText(
    z.string().max(CONTACTO_CARGO_MAX, `Máximo ${CONTACTO_CARGO_MAX} caracteres`),
  ),
  contactoTelefono: optionalText(
    z
      .string()
      .regex(
        TELEFONO_REGEX,
        'Teléfono inválido. Use solo dígitos, espacios, guiones, paréntesis o + (6 a 20 caracteres)',
      ),
  ),
  contactoGenero: z.string().optional(),
  contactoFechaNacimiento: birthDateSchema(),
});

// Actualizar empresa
export const updateEmpresaSchema = createEmpresaSchema.partial();

// Query params para listar empresas (admin)
export const listEmpresasQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().min(1).optional(),
});

export type CreateEmpresaDto = z.infer<typeof createEmpresaSchema>;
export type UpdateEmpresaDto = z.infer<typeof updateEmpresaSchema>;
export type ListEmpresasQueryDto = z.infer<typeof listEmpresasQuerySchema>;

// GET /empresas/:id, GET /empresas/me, POST /empresas, PATCH /empresas/me
export interface EmpresaResponse {
  id: number;
  usuarioId: number;
  razonSocial: string;
  nit: string | null;
  registroSeprec: string | null;
  tipoEmpresa: string | null;
  numeroSocios: string | null;
  numEmpleadosMujeres: number | null;
  numEmpleadosHombres: number | null;
  rubro: string | null;
  anioFundacion: number | null;
  departamento: string | null;
  ciudad: string | null;
  direccion: string | null;
  telefono: string | null;
  descripcion: string | null;
  contactoCargo: string | null;
  contactoTelefono: string | null;
  contactoGenero: string | null;
  contactoFechaNacimiento: string | null;
  createdAt: string;
  updatedAt: string;
}
