import { z } from 'zod';

// Crear pregunta frecuente
export const createFaqSchema = z.object({
  pregunta: z.string().min(10, 'La pregunta debe tener al menos 10 caracteres').max(500),
  respuesta: z.string().min(10, 'La respuesta debe tener al menos 10 caracteres').max(5000),
  orden: z.number().int().min(0).default(0),
});

// Actualizar pregunta frecuente
export const updateFaqSchema = z.object({
  pregunta: z.string().min(10).max(500).optional(),
  respuesta: z.string().min(10).max(5000).optional(),
  orden: z.number().int().min(0).optional(),
});

// Query params para listar (admin)
export const listFaqQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateFaqDto = z.infer<typeof createFaqSchema>;
export type UpdateFaqDto = z.infer<typeof updateFaqSchema>;
export type ListFaqQueryDto = z.infer<typeof listFaqQuerySchema>;

// Respuesta del endpoint
export interface FaqResponse {
  id: number;
  pregunta: string;
  respuesta: string;
  orden: number;
  createdAt: string;
  updatedAt: string;
}
