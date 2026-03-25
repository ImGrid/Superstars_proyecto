import { z } from 'zod';
import { EstadoConcurso } from '../enums';

// Crear concurso (chk_concurso_monto: monto_premio > 0, chk_concurso_ganadores: numero_ganadores > 0, chk_concurso_top_n: top_n_sistema > 0)
export const createConcursoSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  bases: z.string().optional(),
  fechaInicioPostulacion: z.string().date(),
  fechaCierrePostulacion: z.string().date(),
  fechaAnuncioGanadores: z.string().date().optional(),
  montoPremio: z.number().positive(),
  numeroGanadores: z.number().int().positive().default(3),
  topNSistema: z.number().int().positive().default(5),
  departamentos: z.array(z.string()).min(1),
}).refine(
  // chk_concurso_fechas: fecha_cierre_postulacion >= fecha_inicio_postulacion
  (data) => data.fechaCierrePostulacion >= data.fechaInicioPostulacion,
  { message: 'La fecha de cierre debe ser igual o posterior a la fecha de inicio', path: ['fechaCierrePostulacion'] },
);

// Actualizar concurso (solo en estado borrador)
export const updateConcursoSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  bases: z.string().optional(),
  fechaInicioPostulacion: z.string().date().optional(),
  fechaCierrePostulacion: z.string().date().optional(),
  fechaAnuncioGanadores: z.string().date().optional(),
  montoPremio: z.number().positive().optional(),
  numeroGanadores: z.number().int().positive().optional(),
  topNSistema: z.number().int().positive().optional(),
  departamentos: z.array(z.string()).min(1).optional(),
});

// Query params para listar concursos
export const listConcursosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  estado: z.nativeEnum(EstadoConcurso).optional(),
  search: z.string().min(1).optional(),
});

// Asignar responsable a un concurso (admin)
export const assignResponsableSchema = z.object({
  usuarioId: z.number().int().positive(),
});

// Modificar fechas de un concurso publicado (PATCH /concursos/:id/fechas)
export const updateFechasConcursoSchema = z.object({
  fechaCierreEfectiva: z.string().date().nullable().optional(),
  fechaAnuncioGanadores: z.string().date().nullable().optional(),
});

export type CreateConcursoDto = z.infer<typeof createConcursoSchema>;
export type UpdateConcursoDto = z.infer<typeof updateConcursoSchema>;
export type UpdateFechasConcursoDto = z.infer<typeof updateFechasConcursoSchema>;
export type ListConcursosQueryDto = z.infer<typeof listConcursosQuerySchema>;
export type AssignResponsableDto = z.infer<typeof assignResponsableSchema>;

// GET /concursos/:id, POST /concursos, PATCH /concursos/:id, transiciones de estado
export interface ConcursoResponse {
  id: number;
  nombre: string;
  descripcion: string | null;
  bases: string | null;
  fechaInicioPostulacion: string;
  fechaCierrePostulacion: string;
  fechaAnuncioGanadores: string | null;
  fechaCierreEfectiva: string | null;
  montoPremio: string;
  numeroGanadores: number;
  topNSistema: number;
  departamentos: string[];
  estado: EstadoConcurso;
  fechaPublicacionResultados: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

// GET /concursos/:id/responsables
export interface ResponsableResponse {
  id: number;
  usuarioId: number;
  email: string;
  nombre: string;
  createdAt: string;
}

// asignar evaluador a un concurso
export const assignEvaluadorSchema = z.object({
  evaluadorId: z.number().int().positive(),
});

export type AssignEvaluadorDto = z.infer<typeof assignEvaluadorSchema>;

// GET /concursos/:id/evaluadores
export interface EvaluadorConcursoResponse {
  id: number;
  evaluadorId: number;
  email: string;
  nombre: string;
  createdAt: string;
}

// GET /concursos/:id/can-publicar
export interface CanPublicarResponse {
  canPublicar: boolean;
  errors: string[];
}
