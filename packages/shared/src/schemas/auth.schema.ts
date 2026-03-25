import { z } from 'zod';
import { RolUsuario } from '../enums';

// Login
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Auto-registro de proponente (rol se asigna en el backend)
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nombre: z.string().min(1),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;

// POST /auth/register
export interface RegisterResponse {
  id: number;
  email: string;
  nombre: string;
  rol: RolUsuario;
}

// POST /auth/login, POST /auth/refresh
export interface LoginResponse {
  user: {
    id: number;
    email: string;
    nombre: string;
    rol: RolUsuario;
  };
}
