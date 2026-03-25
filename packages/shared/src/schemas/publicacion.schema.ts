import { z } from 'zod';
import { EstadoPublicacion } from '../enums';

// Crear publicacion (borrador)
export const createPublicacionSchema = z.object({
  titulo: z.string().min(1).max(300),
  contenido: z.string().min(1),
  categoriaId: z.number().int().positive().optional(),
  destacado: z.boolean().default(false),
});

// Actualizar publicacion (solo editable en borrador/expirado/archivado)
export const updatePublicacionSchema = z.object({
  titulo: z.string().min(1).max(300).optional(),
  contenido: z.string().min(1).optional(),
  categoriaId: z.number().int().positive().nullable().optional(),
  destacado: z.boolean().optional(),
});

// Publicar o programar publicacion
export const publicarPublicacionSchema = z.object({
  // Fecha futura = programar, sin fecha = publicar ahora
  fechaPublicacion: z.string().datetime().optional(),
  // Fecha de expiracion calculada por frontend, null = indefinido
  fechaExpiracion: z.string().datetime().nullable().optional(),
}).refine(
  (data) => {
    if (data.fechaExpiracion && data.fechaPublicacion) {
      return new Date(data.fechaExpiracion) > new Date(data.fechaPublicacion);
    }
    return true;
  },
  { message: 'La fecha de expiracion debe ser posterior a la fecha de publicacion' },
);

// Query params para listar publicaciones (admin)
export const listPublicacionesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  estado: z.nativeEnum(EstadoPublicacion).optional(),
  categoriaId: z.coerce.number().int().positive().optional(),
  search: z.string().min(1).optional(),
});

// Query params para listar publicaciones publicas
export const listPublicPublicacionesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  categoriaId: z.coerce.number().int().positive().optional(),
  search: z.string().min(1).optional(),
});

export type CreatePublicacionDto = z.infer<typeof createPublicacionSchema>;
export type UpdatePublicacionDto = z.infer<typeof updatePublicacionSchema>;
export type PublicarPublicacionDto = z.infer<typeof publicarPublicacionSchema>;
export type ListPublicacionesQueryDto = z.infer<typeof listPublicacionesQuerySchema>;
export type ListPublicPublicacionesQueryDto = z.infer<typeof listPublicPublicacionesQuerySchema>;

// GET /publicaciones/:id, POST, PATCH, transiciones de estado
export interface PublicacionResponse {
  id: number;
  titulo: string;
  slug: string;
  extracto: string | null;
  contenido: string;
  categoriaId: number | null;
  imagenDestacadaKey: string | null;
  estado: EstadoPublicacion;
  fechaPublicacion: string | null;
  fechaExpiracion: string | null;
  destacado: boolean;
  createdAt: string;
  updatedAt: string;
}

// GET /publicaciones/categorias
export interface CategoriaPublicacionResponse {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  createdAt: string;
}
