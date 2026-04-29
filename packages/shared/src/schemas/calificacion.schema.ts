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

export type CalificacionDetalleDto = z.infer<typeof calificacionDetalleSchema>;
export type SaveCalificacionDto = z.infer<typeof saveCalificacionSchema>;
export type DevolverCalificacionDto = z.infer<typeof devolverCalificacionSchema>;
export type AssignEvaluadorPostulacionDto = z.infer<typeof assignEvaluadorPostulacionSchema>;

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

// GET /mis-evaluaciones/convocatorias
export interface EvaluadorConvocatoriaItem {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: EstadoConvocatoria;
  fechaCierrePostulacion: string;
  monto: string;
  asignadoEn: string;
}

// GET /mis-evaluaciones/convocatorias/:id/postulaciones
export interface PostulacionEvaluableItem {
  id: number;
  convocatoriaId: number;
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
    empresaId: number;
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
    empresaId: number;
    estado: EstadoPostulacion;
    responseData: Record<string, unknown>;
    porcentajeCompletado: string;
    fechaEnvio: string | null;
    puntajeFinal: string | null;
  };
  evaluadorNombre: string | null;
}
