import { z } from 'zod';

// Crear historia de exito (sin imagen — la imagen va por multipart)
// orden y activa los maneja el backend al crear
export const createHistoriaExitoSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(1, 'El título es obligatorio')
    .max(200, 'El título no puede superar los 200 caracteres'),
  badge: z
    .string()
    .trim()
    .min(1)
    .max(50, 'La etiqueta no puede superar los 50 caracteres')
    .nullable()
    .optional(),
  descripcion: z
    .string()
    .trim()
    .min(1, 'La descripción es obligatoria')
    .max(400, 'La descripción no puede superar los 400 caracteres'),
  empresaId: z.number().int().positive().nullable().optional(),
  empresaNombre: z
    .string()
    .trim()
    .min(1)
    .max(200, 'El nombre de la empresa no puede superar los 200 caracteres')
    .nullable()
    .optional(),
});

// Actualizar historia de exito (todos los campos opcionales)
// activa tiene endpoint propio (toggle-activa). orden tiene endpoint propio (reorder).
export const updateHistoriaExitoSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(1, 'El título es obligatorio')
    .max(200, 'El título no puede superar los 200 caracteres')
    .optional(),
  badge: z
    .string()
    .trim()
    .min(1)
    .max(50, 'La etiqueta no puede superar los 50 caracteres')
    .nullable()
    .optional(),
  descripcion: z
    .string()
    .trim()
    .min(1, 'La descripción es obligatoria')
    .max(400, 'La descripción no puede superar los 400 caracteres')
    .optional(),
  empresaId: z.number().int().positive().nullable().optional(),
  empresaNombre: z
    .string()
    .trim()
    .min(1)
    .max(200, 'El nombre de la empresa no puede superar los 200 caracteres')
    .nullable()
    .optional(),
});

// Activar o desactivar (cap de 6 activas se valida en backend)
export const toggleActivaHistoriaExitoSchema = z.object({
  activa: z.boolean(),
});

// Reordenar historias de exito por drag-and-drop
// El array debe tener IDs unicos, max 6 (porque es para reordenar las activas)
export const reorderHistoriasExitoSchema = z.object({
  ids: z
    .array(z.number().int().positive())
    .min(1, 'Debes enviar al menos una historia')
    .max(6, 'No se pueden reordenar más de 6 historias a la vez')
    .refine((arr) => new Set(arr).size === arr.length, {
      message: 'No puede haber IDs duplicados',
    }),
});

// Query params para listar (admin)
export const listHistoriasExitoQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().min(1).optional(),
});

export type CreateHistoriaExitoDto = z.infer<typeof createHistoriaExitoSchema>;
export type UpdateHistoriaExitoDto = z.infer<typeof updateHistoriaExitoSchema>;
export type ToggleActivaHistoriaExitoDto = z.infer<typeof toggleActivaHistoriaExitoSchema>;
export type ReorderHistoriasExitoDto = z.infer<typeof reorderHistoriasExitoSchema>;
export type ListHistoriasExitoQueryDto = z.infer<typeof listHistoriasExitoQuerySchema>;

// Respuesta admin (todos los campos)
export interface HistoriaExitoResponse {
  id: number;
  titulo: string;
  badge: string | null;
  descripcion: string;
  imagenKey: string;
  empresaId: number | null;
  empresaNombre: string | null;
  orden: number;
  activa: boolean;
  createdAt: string;
  updatedAt: string;
}

// Item para el endpoint publico (landing)
// La imagen se sirve en /historias-exito/:id/imagen, el frontend construye la URL con el id
export interface PublicHistoriaExitoItem {
  id: number;
  titulo: string;
  badge: string | null;
  descripcion: string;
  empresaNombre: string | null;
  imagenKey: string;
}
