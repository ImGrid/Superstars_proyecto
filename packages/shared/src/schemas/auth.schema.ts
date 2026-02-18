import { z } from 'zod';
import { RolUsuario } from '../enums';

// Login
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Registro de usuario
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nombre: z.string().min(1),
  rol: z.nativeEnum(RolUsuario),
});

// Refresh token
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
