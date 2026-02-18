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

export type CreateUsuarioDto = z.infer<typeof createUsuarioSchema>;
export type UpdateUsuarioDto = z.infer<typeof updateUsuarioSchema>;
