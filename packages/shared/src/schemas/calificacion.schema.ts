import { z } from 'zod';

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

export type CalificacionDetalleDto = z.infer<typeof calificacionDetalleSchema>;
export type SaveCalificacionDto = z.infer<typeof saveCalificacionSchema>;
export type DevolverCalificacionDto = z.infer<typeof devolverCalificacionSchema>;
