import { z } from 'zod';
import { EstadoConvocatoria } from '../enums';

// Crear convocatoria. El premio/ganadores/bases viven en cada categoria (se
// configuran despues de crear la convocatoria), no aqui.
export const createConvocatoriaSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  fechaInicioPostulacion: z.string().date(),
  fechaCierrePostulacion: z.string().date(),
  fechaAnuncioGanadores: z.string().date().optional(),
  departamentos: z.array(z.string()).min(1),
}).refine(
  // chk_convocatoria_fechas: fecha_cierre_postulacion >= fecha_inicio_postulacion
  (data) => data.fechaCierrePostulacion >= data.fechaInicioPostulacion,
  { message: 'La fecha de cierre debe ser igual o posterior a la fecha de inicio', path: ['fechaCierrePostulacion'] },
);

// Actualizar convocatoria (solo en estado borrador)
export const updateConvocatoriaSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  fechaInicioPostulacion: z.string().date().optional(),
  fechaCierrePostulacion: z.string().date().optional(),
  fechaAnuncioGanadores: z.string().date().optional(),
  departamentos: z.array(z.string()).min(1).optional(),
});

// Tipos de listado para el proponente: separa "abiertas para postular" de "anteriores"
// (cerrado/en_evaluacion/resultados_listos/finalizado). admin/responsable lo ignoran.
export const tipoListadoProponenteSchema = z.enum(['abiertas', 'anteriores']);
export type TipoListadoProponente = z.infer<typeof tipoListadoProponenteSchema>;

// Query params para listar convocatorias
export const listConvocatoriasQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  estado: z.nativeEnum(EstadoConvocatoria).optional(),
  // tipo solo aplica al rol proponente: filtra entre abiertas y anteriores
  tipo: tipoListadoProponenteSchema.optional(),
  search: z.string().min(1).optional(),
});

// Asignar responsable a una convocatoria (admin)
export const assignResponsableSchema = z.object({
  usuarioId: z.number().int().positive(),
});

// Modificar fechas de una convocatoria publicada (PATCH /convocatorias/:id/fechas)
export const updateFechasConvocatoriaSchema = z.object({
  fechaCierreEfectiva: z.string().date().nullable().optional(),
  fechaAnuncioGanadores: z.string().date().nullable().optional(),
});

// Seleccionar ganadores (batch: marcar N como ganador, resto como no_seleccionado)
export const seleccionarGanadoresSchema = z.object({
  ganadorIds: z.array(z.number().int().positive()).min(1),
});

export type CreateConvocatoriaDto = z.infer<typeof createConvocatoriaSchema>;
export type UpdateConvocatoriaDto = z.infer<typeof updateConvocatoriaSchema>;
export type UpdateFechasConvocatoriaDto = z.infer<typeof updateFechasConvocatoriaSchema>;
export type ListConvocatoriasQueryDto = z.infer<typeof listConvocatoriasQuerySchema>;
export type AssignResponsableDto = z.infer<typeof assignResponsableSchema>;
export type SeleccionarGanadoresDto = z.infer<typeof seleccionarGanadoresSchema>;

// GET /convocatorias/:id, POST /convocatorias, PATCH /convocatorias/:id, transiciones de estado
export interface ConvocatoriaResponse {
  id: number;
  nombre: string;
  descripcion: string | null;
  fechaInicioPostulacion: string;
  fechaCierrePostulacion: string;
  fechaAnuncioGanadores: string | null;
  fechaCierreEfectiva: string | null;
  departamentos: string[];
  estado: EstadoConvocatoria;
  imagenKey: string | null;
  fechaPublicacionResultados: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

// GET /convocatorias/:id/responsables
export interface ResponsableResponse {
  id: number;
  usuarioId: number;
  email: string;
  nombre: string;
  createdAt: string;
}

// GET /convocatorias/:id/can-publicar
export interface CanPublicarResponse {
  canPublicar: boolean;
  errors: string[];
}

// GET /convocatorias/resumen-resultados — estadisticas agregadas por convocatoria (admin/responsable)
export interface ConvocatoriaResultadosResumenItem {
  id: number;
  nombre: string;
  estado: EstadoConvocatoria;
  fechaPublicacionResultados: string | null;
  totalPostulaciones: number;
  totalCalificadas: number;
  promedioCalificadas: number | null;
  totalGanadores: number;
}

// Item de ranking de una postulacion (admin/responsable)
export interface PostulacionRankingItem {
  postulacionId: number;
  empresaNombre: string;
  puntajeFinal: number | null;
  posicionFinal: number | null;
  estado: string;
  fechaEnvio: string | null;
}

// GET /convocatorias/:id/categorias/:categoriaId/ranking — ranking de una categoria
export interface CategoriaRankingResponse {
  categoriaId: number;
  categoriaNombre: string;
  convocatoriaId: number;
  monto: string;
  numeroGanadores: number;
  // true si ya se seleccionaron los ganadores de esta categoria
  resuelta: boolean;
  totalCalificadas: number;
  promedioCalificadas: number | null;
  maxPuntaje: number | null;
  minPuntaje: number | null;
  ranking: PostulacionRankingItem[];
}
