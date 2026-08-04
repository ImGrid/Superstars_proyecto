import { z } from 'zod';
import { EstadoCalificacion } from '../enums/estado-calificacion.enum';
import { EstadoConvocatoria } from '../enums/estado-convocatoria.enum';
import { EstadoPostulacion } from '../enums/estado-postulacion.enum';

// Detalle de calificacion por sub-criterio (chk_detalle_puntaje: puntaje >= 0)
export const calificacionDetalleSchema = z.object({
  subCriterioId: z.number().int().positive(),
  puntaje: z.number().min(0),
  justificacion: z.string().optional(),
});

// Guardar calificacion (evaluador califica una postulacion)
export const saveCalificacionSchema = z.object({
  comentarioGeneral: z.string().optional(),
  detalles: z.array(calificacionDetalleSchema).min(1),
});

// Devolver calificacion (responsable devuelve para re-evaluar)
export const devolverCalificacionSchema = z.object({
  comentarioResponsable: z.string().min(1),
});

// Asignar evaluador a una postulacion
export const assignEvaluadorPostulacionSchema = z.object({
  evaluadorId: z.number().int().positive(),
});

// Reparto automatico de jurados entre las postulaciones de una categoria.
// El maximo real es el tamaño del jurado; se valida en el servidor.
export const repartirEvaluadoresSchema = z.object({
  evaluadoresPorPostulacion: z
    .number({ message: 'Indica cuántos evaluadores debe tener cada propuesta' })
    .int('Debe ser un número entero')
    .min(1, 'Cada propuesta necesita al menos un evaluador')
    .max(20, 'El máximo es 20 evaluadores por propuesta'),
});

export type CalificacionDetalleDto = z.infer<typeof calificacionDetalleSchema>;
export type SaveCalificacionDto = z.infer<typeof saveCalificacionSchema>;
export type DevolverCalificacionDto = z.infer<typeof devolverCalificacionSchema>;
export type AssignEvaluadorPostulacionDto = z.infer<typeof assignEvaluadorPostulacionSchema>;
export type RepartirEvaluadoresDto = z.infer<typeof repartirEvaluadoresSchema>;

// POST /convocatorias/:convocatoriaId/categorias/:categoriaId/repartir-evaluadores
// Resultado del reparto automatico, para informarle al responsable que se hizo.
export interface RepartirEvaluadoresResponse {
  asignacionesCreadas: number;
  // propuestas a las que se les agrego al menos un jurado
  postulacionesAfectadas: number;
  // propuestas que ya tenian todos los jurados pedidos y se dejaron intactas
  postulacionesYaCompletas: number;
  evaluadoresPorPostulacion: number;
  // carga final de cada jurado, para que se vea que el reparto quedo parejo
  cargaPorEvaluador: {
    evaluadorId: number;
    nombre: string;
    totalAsignadas: number;
  }[];
}

// GET /convocatorias/:id/postulaciones/:id/evaluadores-asignados
export interface AsignacionEvaluadorResponse {
  id: number;
  postulacionId: number;
  evaluadorId: number;
  evaluadorNombre: string;
  evaluadorEmail: string;
  asignadoPor: number;
  createdAt: string;
}

// POST /convocatorias/:convocatoriaId/postulaciones/:postulacionId/cerrar-evaluacion
// El responsable cierra la evaluacion de una propuesta: el puntaje se calcula
// con las calificaciones aprobadas y los jurados que no entregaron quedan fuera.
export interface CerrarEvaluacionResponse {
  postulacionId: number;
  puntajeFinal: string;
  // notas aprobadas con las que se calculo el puntaje
  calificacionesConsideradas: number;
  // jurados asignados que no llegaron a entregar y quedaron fuera del calculo
  evaluadoresSinEntregar: number;
}

// GET /mis-evaluaciones/categorias (categorias donde el evaluador es jurado)
export interface EvaluadorCategoriaItem {
  categoriaId: number;
  categoriaNombre: string;
  monto: string;
  convocatoriaId: number;
  convocatoriaNombre: string;
  convocatoriaEstado: EstadoConvocatoria;
  fechaCierrePostulacion: string;
  asignadoEn: string;
}

// GET /mis-evaluaciones/categorias/:id/postulaciones
export interface PostulacionEvaluableItem {
  id: number;
  convocatoriaId: number;
  categoriaId: number;
  empresaId: number;
  estado: EstadoPostulacion;
  porcentajeCompletado: string;
  fechaEnvio: string | null;
  puntajeFinal: string | null;
  empresaRazonSocial: string;
  calificacionId: number | null;
  calificacionEstado: EstadoCalificacion | null;
  calificacionPuntaje: string | null;
}

// GET /mis-evaluaciones/convocatorias/:id/postulaciones/:postId
export interface PostulacionDetalleEvaluador {
  postulacion: {
    id: number;
    convocatoriaId: number;
    categoriaId: number;
    empresaId: number;
    // el jurado debe saber a que empresa esta calificando
    empresaRazonSocial: string | null;
    estado: EstadoPostulacion;
    responseData: Record<string, unknown>;
    porcentajeCompletado: string;
    fechaEnvio: string | null;
    puntajeFinal: string | null;
  };
  calificacion: {
    id: number;
    postulacionId: number;
    evaluadorId: number;
    puntajeTotal: string | null;
    estado: EstadoCalificacion;
    comentarioGeneral: string | null;
    comentarioResponsable: string | null;
  } | null;
  detalles: {
    id: number;
    calificacionId: number;
    subCriterioId: number;
    puntaje: string;
    justificacion: string | null;
  }[];
}

// GET /convocatorias/:id/calificaciones (responsable)
export interface CalificacionListItem {
  id: number;
  postulacionId: number;
  categoriaId: number;
  evaluadorId: number;
  puntajeTotal: string | null;
  estado: EstadoCalificacion;
  comentarioGeneral: string | null;
  comentarioResponsable: string | null;
  createdAt: string;
  updatedAt: string;
  empresaRazonSocial: string;
  evaluadorNombre: string;
}

// GET /convocatorias/:id/calificaciones/:calId/detalle (responsable)
export interface CalificacionDetalleResponsable {
  calificacion: {
    id: number;
    postulacionId: number;
    evaluadorId: number;
    puntajeTotal: string | null;
    estado: EstadoCalificacion;
    comentarioGeneral: string | null;
    comentarioResponsable: string | null;
  };
  detalles: {
    id: number;
    calificacionId: number;
    subCriterioId: number;
    puntaje: string;
    justificacion: string | null;
  }[];
  postulacion: {
    id: number;
    convocatoriaId: number;
    categoriaId: number;
    empresaId: number;
    estado: EstadoPostulacion;
    responseData: Record<string, unknown>;
    porcentajeCompletado: string;
    fechaEnvio: string | null;
    puntajeFinal: string | null;
  };
  evaluadorNombre: string | null;
}
