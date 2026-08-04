import { z } from 'zod';

// Crear categoria dentro de una convocatoria (solo en borrador).
// chk_categoria_monto: monto > 0, chk_categoria_ganadores/top_n: > 0
export const createCategoriaSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  bases: z.string().optional(),
  monto: z.number().positive(),
  numeroGanadores: z.number().int().positive().default(3),
  topNSistema: z.number().int().positive().default(10),
  orden: z.number().int().positive().default(1),
});

// Actualizar categoria (solo en borrador)
export const updateCategoriaSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  bases: z.string().optional(),
  monto: z.number().positive().optional(),
  numeroGanadores: z.number().int().positive().optional(),
  topNSistema: z.number().int().positive().optional(),
  orden: z.number().int().positive().optional(),
});

// Asignar evaluador al pool de una categoria
export const assignEvaluadorSchema = z.object({
  evaluadorId: z.number().int().positive(),
});

export type CreateCategoriaDto = z.infer<typeof createCategoriaSchema>;
export type UpdateCategoriaDto = z.infer<typeof updateCategoriaSchema>;
export type AssignEvaluadorDto = z.infer<typeof assignEvaluadorSchema>;

// GET /convocatorias/:convocatoriaId/categorias[/:categoriaId]
export interface CategoriaResponse {
  id: number;
  convocatoriaId: number;
  nombre: string;
  descripcion: string | null;
  bases: string | null;
  monto: string;
  numeroGanadores: number;
  topNSistema: number;
  orden: number;
  fechaSeleccionGanadores: string | null;
  createdAt: string;
  updatedAt: string;
  // resumen de configuracion y actividad por categoria. Solo lo incluye el
  // LISTADO para admin/responsable; ausente en el detalle y para el proponente.
  numFormularios?: number;
  numCriterios?: number;
  numEvaluadores?: number;
  numPostulaciones?: number;
}

// GET /convocatorias/:convocatoriaId/categorias/:categoriaId/evaluadores
export interface EvaluadorCategoriaResponse {
  id: number;
  evaluadorId: number;
  email: string;
  nombre: string;
  createdAt: string;
}

// DELETE /convocatorias/:convocatoriaId/categorias/:categoriaId/evaluadores/:evaluadorId
// Al quitar a un jurado de la categoria se le retiran las postulaciones que
// tenia asignadas y se eliminan sus calificaciones. Los puntajes de las
// propuestas afectadas se recalculan sin su nota. Los conteos permiten
// informarle al responsable el alcance real de la accion.
export interface RemoverEvaluadorResponse {
  asignacionesEliminadas: number;
  calificacionesEliminadas: number;
  puntajesRecalculados: number;
}
