import { z } from 'zod';

// Valores validos para categoria de FAQ
export const categoriaFaqValues = ['general', 'participacion', 'proceso'] as const;
export const categoriaFaqSchema = z.enum(categoriaFaqValues);
export type CategoriaFaq = z.infer<typeof categoriaFaqSchema>;

// Crear pregunta frecuente
export const createFaqSchema = z.object({
  pregunta: z.string().min(10, 'La pregunta debe tener al menos 10 caracteres').max(500),
  respuesta: z.string().min(10, 'La respuesta debe tener al menos 10 caracteres').max(5000),
  orden: z.number().int().min(0).default(0),
  categoria: categoriaFaqSchema.default('general'),
  convocatoriaId: z.number().int().positive().nullable().optional(),
});

// Actualizar pregunta frecuente
export const updateFaqSchema = z.object({
  pregunta: z.string().min(10).max(500).optional(),
  respuesta: z.string().min(10).max(5000).optional(),
  orden: z.number().int().min(0).optional(),
  categoria: categoriaFaqSchema.optional(),
  convocatoriaId: z.number().int().positive().nullable().optional(),
});

// Query params para listar (admin)
export const listFaqQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  categoria: categoriaFaqSchema.optional(),
  convocatoriaId: z.coerce.number().int().positive().optional(),
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
  categoria: string;
  convocatoriaId: number | null;
  createdAt: string;
  updatedAt: string;
}
