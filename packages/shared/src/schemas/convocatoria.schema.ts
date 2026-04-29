import { z } from 'zod';
import { EstadoConvocatoria } from '../enums';

// Crear convocatoria (chk_convocatoria_monto: monto > 0, chk_convocatoria_ganadores: numero_ganadores > 0, chk_convocatoria_top_n: top_n_sistema > 0)
export const createConvocatoriaSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  bases: z.string().optional(),
  fechaInicioPostulacion: z.string().date(),
  fechaCierrePostulacion: z.string().date(),
  fechaAnuncioGanadores: z.string().date().optional(),
  monto: z.number().positive(),
  numeroGanadores: z.number().int().positive().default(3),
  topNSistema: z.number().int().positive().default(5),
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
  bases: z.string().optional(),
  fechaInicioPostulacion: z.string().date().optional(),
  fechaCierrePostulacion: z.string().date().optional(),
  fechaAnuncioGanadores: z.string().date().optional(),
  monto: z.number().positive().optional(),
  numeroGanadores: z.number().int().positive().optional(),
  topNSistema: z.number().int().positive().optional(),
  departamentos: z.array(z.string()).min(1).optional(),
});

// Query params para listar convocatorias
export const listConvocatoriasQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  estado: z.nativeEnum(EstadoConvocatoria).optional(),
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
  bases: string | null;
  fechaInicioPostulacion: string;
  fechaCierrePostulacion: string;
  fechaAnuncioGanadores: string | null;
  fechaCierreEfectiva: string | null;
  monto: string;
  numeroGanadores: number;
  topNSistema: number;
  departamentos: string[];
  estado: EstadoConvocatoria;
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

// asignar evaluador a una convocatoria
export const assignEvaluadorSchema = z.object({
  evaluadorId: z.number().int().positive(),
});

export type AssignEvaluadorDto = z.infer<typeof assignEvaluadorSchema>;

// GET /convocatorias/:id/evaluadores
export interface EvaluadorConvocatoriaResponse {
  id: number;
  evaluadorId: number;
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
  monto: string;
  numeroGanadores: number;
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

// GET /convocatorias/:id/ranking — ranking completo de una convocatoria
export interface ConvocatoriaRankingResponse {
  id: number;
  nombre: string;
  estado: EstadoConvocatoria;
  monto: string;
  numeroGanadores: number;
  totalCalificadas: number;
  promedioCalificadas: number | null;
  maxPuntaje: number | null;
  minPuntaje: number | null;
  ranking: PostulacionRankingItem[];
}
