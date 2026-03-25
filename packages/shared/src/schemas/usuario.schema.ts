import { z } from 'zod';
import { RolUsuario } from '../enums';

// Crear usuario (admin)
export const createUsuarioSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nombre: z.string().min(1),
  rol: z.nativeEnum(RolUsuario),
});

// Actualizar usuario (admin)
export const updateUsuarioSchema = z.object({
  nombre: z.string().min(1).optional(),
  rol: z.nativeEnum(RolUsuario).optional(),
  activo: z.boolean().optional(),
});

// Query params para listar usuarios (admin)
export const listUsuariosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  rol: z.nativeEnum(RolUsuario).optional(),
  activo: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  search: z.string().min(1).optional(),
});

export type CreateUsuarioDto = z.infer<typeof createUsuarioSchema>;
export type UpdateUsuarioDto = z.infer<typeof updateUsuarioSchema>;
export type ListUsuariosQueryDto = z.infer<typeof listUsuariosQuerySchema>;

// GET /usuarios/:id, GET /usuarios/me, POST /usuarios, PATCH /usuarios/:id
export interface UsuarioResponse {
  id: number;
  email: string;
  nombre: string;
  rol: RolUsuario;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}
