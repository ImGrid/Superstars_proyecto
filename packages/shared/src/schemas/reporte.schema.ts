import { z } from 'zod';
import { EstadoPostulacion } from '../enums';

// Reportes descargables del administrador (modulo reporte del API).
//
// Aqui vive el CATALOGO de reportes y los filtros que acepta cada uno. La tabla
// descarga_reporte guarda `tipo` como texto libre a proposito: la lista valida
// es esta, no un CHECK de la base, para que agregar un reporte no obligue a una
// migracion. Ver sql/25_descarga_reporte.sql.
//
// Las FILAS de cada reporte no se tipan aqui: nunca viajan al frontend, que solo
// descarga un archivo binario. Viven en apps/api/src/modules/reporte. Lo unico
// que el frontend consume es el catalogo (ReporteCatalogoItem).

// --- Tipos de reporte ---

export const tipoReporteValues = [
  // Base de contactos para seguimiento, una fila por persona, agrupada por
  // etapa del embudo. Es el reporte que pidio el cliente.
  'contactos',
  // Detalle de postulaciones de una convocatoria, una fila por postulacion,
  // con el avance y que campos obligatorios le faltan a cada borrador.
  'postulaciones',
  // Volcado completo de las respuestas del formulario dinamico, una hoja por
  // categoria y una columna por campo.
  'respuestas',
  // Perfil del ecosistema: departamento, rubro, tipo de empresa, genero y
  // empleo. Es el reporte de indicadores para las organizaciones auspiciantes.
  'ecosistema',
  // Auditoria de calidad de datos: telefonos invalidos, anios imposibles,
  // empresas sin NIT o sin SEPREC, campos sin llenar.
  'calidad_datos',
] as const;

export const tipoReporteSchema = z.enum(tipoReporteValues);
export type TipoReporte = z.infer<typeof tipoReporteSchema>;

// --- Formatos ---

export const formatoReporteValues = ['excel', 'pdf'] as const;
export const formatoReporteSchema = z.enum(formatoReporteValues);
export type FormatoReporte = z.infer<typeof formatoReporteSchema>;

// --- Etapa del embudo (filtro del reporte de contactos) ---
//
// Clasifica a cada persona registrada segun hasta donde llego. El orden de la
// lista es el orden del embudo, de menos a mas avance.
export const etapaEmbudoValues = [
  // Confirmo su correo pero nunca creo el perfil de su empresa. De estas
  // personas el sistema NO tiene telefono: el unico contacto es el correo.
  'solo_registrado',
  // Creo la empresa pero nunca abrio una postulacion.
  'empresa_sin_postular',
  // Tiene una postulacion en borrador, sin enviar.
  'borrador',
  // Envio la postulacion.
  'enviada',
] as const;

export const etapaEmbudoSchema = z.enum(etapaEmbudoValues);
export type EtapaEmbudo = z.infer<typeof etapaEmbudoSchema>;

export const ETAPA_EMBUDO_LABEL: Record<EtapaEmbudo, string> = {
  solo_registrado: 'Solo registrado (sin empresa)',
  empresa_sin_postular: 'Con empresa, sin postular',
  borrador: 'Borrador sin enviar',
  enviada: 'Postulación enviada',
};

// --- Nombres de filtro, para que el catalogo declare cuales acepta cada uno ---

export const filtroReporteValues = [
  'convocatoriaId',
  'categoriaId',
  'departamento',
  'etapa',
  'estado',
  'desde',
  'hasta',
] as const;

export const filtroReporteSchema = z.enum(filtroReporteValues);
export type FiltroReporte = z.infer<typeof filtroReporteSchema>;

// --- Consulta de un reporte (query string de GET /reportes/:tipo) ---
//
// Todos los filtros son opcionales: sin ninguno, el reporte sale completo. El
// servicio ignora los que no apliquen al reporte pedido (el catalogo declara
// cuales son) en vez de rechazar la consulta, para que el frontend pueda
// mandar el mismo juego de filtros a cualquier reporte.
export const reporteQuerySchema = z
  .object({
    formato: formatoReporteSchema.default('excel'),

    convocatoriaId: z.coerce.number().int().positive().optional(),
    categoriaId: z.coerce.number().int().positive().optional(),
    // slug de departamento (la_paz, cochabamba, ...), no la etiqueta visible
    departamento: z.string().min(1).optional(),
    etapa: etapaEmbudoSchema.optional(),
    estado: z.nativeEnum(EstadoPostulacion).optional(),

    // rango sobre la fecha de creacion del registro principal de cada reporte
    desde: z.string().date().optional(),
    hasta: z.string().date().optional(),

    // solo aplica al PDF; el Excel nunca lleva graficos
    graficos: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
      .optional(),
  })
  .refine(
    (data) => !data.desde || !data.hasta || data.hasta >= data.desde,
    {
      message: 'La fecha final debe ser igual o posterior a la fecha inicial',
      path: ['hasta'],
    },
  )
  .refine(
    // pedir una categoria sin decir de que convocatoria es ambiguo: las
    // categorias son hijas de una convocatoria y sus ids no son globales para
    // el usuario que arma el filtro
    (data) => !data.categoriaId || data.convocatoriaId !== undefined,
    {
      message: 'Para filtrar por categoría hay que indicar también la convocatoria',
      path: ['categoriaId'],
    },
  );

export type ReporteQueryDto = z.infer<typeof reporteQuerySchema>;

// --- Catalogo (GET /reportes) ---

// Un reporte tal como se le presenta al administrador. `filas` es cuantas filas
// tendria el archivo AHORA, sin filtros; sirve para no ofrecer una descarga que
// saldria vacia y para que la persona sepa que va a recibir antes de bajarla.
export interface ReporteCatalogoItem {
  tipo: TipoReporte;
  nombre: string;
  descripcion: string;
  formatos: FormatoReporte[];
  filtros: FiltroReporte[];
  filas: number;
  disponible: boolean;
  // por que no se puede descargar todavia (por ejemplo, aun no hay datos).
  // null cuando disponible es true
  motivoNoDisponible: string | null;
}

export interface ReporteCatalogoResponse {
  reportes: ReporteCatalogoItem[];
  // momento en que se contaron las filas, en formato ISO
  generadoEn: string;
}
