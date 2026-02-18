import { z } from 'zod';

// Guardar borrador de postulacion (response_data es JSONB flexible)
export const savePostulacionDraftSchema = z.object({
  responseData: z.record(z.string(), z.unknown()),
});

// Observar postulacion (responsable agrega observacion)
export const observarPostulacionSchema = z.object({
  observacion: z.string().min(1),
});

export type SavePostulacionDraftDto = z.infer<typeof savePostulacionDraftSchema>;
export type ObservarPostulacionDto = z.infer<typeof observarPostulacionSchema>;
