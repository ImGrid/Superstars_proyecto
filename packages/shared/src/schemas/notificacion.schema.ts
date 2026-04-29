import { z } from 'zod';
import { TipoNotificacion } from '../enums';

// Crear notificacion de email
export const createNotificacionSchema = z.object({
  destinatarioId: z.number().int().positive(),
  remitenteId: z.number().int().positive().optional(),
  convocatoriaId: z.number().int().positive().optional(),
  postulacionId: z.number().int().positive().optional(),
  tipo: z.nativeEnum(TipoNotificacion),
  asunto: z.string().min(1),
  contenido: z.string().min(1),
});

export type CreateNotificacionDto = z.infer<typeof createNotificacionSchema>;
