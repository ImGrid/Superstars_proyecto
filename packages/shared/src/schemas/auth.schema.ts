import { z } from 'zod';
import { RolUsuario } from '../enums';

// Login
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Auto-registro de proponente (rol se asigna en el backend)
// `website` es campo honeypot: si llega con valor, el backend lo trata como bot
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nombre: z.string().min(1),
  website: z.string().optional(),
});

// Verificacion del codigo de 6 digitos enviado al email
export const verifyEmailSchema = z.object({
  email: z.string().email(),
  codigo: z.string().regex(/^\d{6}$/, 'El codigo debe ser de 6 digitos numericos'),
});

// Reenvio del codigo de verificacion. Solo necesita el email (anti-enumeration:
// la respuesta es identica si existe pendiente o no)
export const resendCodeSchema = z.object({
  email: z.string().email(),
});

// Solicitud de reset de password. Solo email (anti-enumeration: misma respuesta
// si existe usuario o no, incluido cuenta desactivada)
export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

// Confirmacion del reset: email + codigo de 6 digitos + nueva password
// (misma politica de password que registro: min 8 caracteres)
export const resetPasswordSchema = z.object({
  email: z.string().email(),
  codigo: z.string().regex(/^\d{6}$/, 'El codigo debe ser de 6 digitos numericos'),
  nuevaPassword: z.string().min(8),
});

// Reenvio del codigo de reset (analogo a resendCode pero para flow de reset)
export const resendResetCodeSchema = z.object({
  email: z.string().email(),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;
export type ResendCodeDto = z.infer<typeof resendCodeSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type ResendResetCodeDto = z.infer<typeof resendResetCodeSchema>;

// POST /auth/register
// Respuesta generica anti-enumeration: siempre el mismo mensaje, sin revelar
// si el email ya existe o no
export interface RegisterResponse {
  message: string;
}

// POST /auth/verify-email
// Si el codigo es correcto retorna user; si no, error con codigo especifico
export interface VerifyEmailResponse {
  message: string;
  user?: {
    id: number;
    email: string;
    nombre: string;
    rol: RolUsuario;
  };
}

// POST /auth/resend-code
// Respuesta uniforme anti-enumeration: el frontend gestiona el cooldown UI
// localmente segun el numero de reenvios en su sesion. El server solo
// confirma exito generico o lanza 429 si el cooldown server-side se viola.
// MAX_RESENDS se devuelve como error con `code: 'MAX_RESENDS'` para que
// el frontend ofrezca volver a registrarse.
export interface ResendCodeResponse {
  message: string;
}

// POST /auth/forgot-password
// Respuesta uniforme: misma respuesta si el email existe, no existe, o esta
// desactivado. La unica forma de saber el resultado es revisando la bandeja.
export interface ForgotPasswordResponse {
  message: string;
}

// POST /auth/reset-password
// Si el codigo es correcto: 200 con confirmacion. El usuario debe hacer login
// manualmente despues (no auto-login, segun OWASP). Errores tipados:
// INVALID, EXPIRED, MAX_ATTEMPTS, INVALID_OR_EXPIRED — mismo patron que verify-email
export interface ResetPasswordResponse {
  message: string;
}

// POST /auth/resend-reset-code
// Mismo contrato que ResendCodeResponse pero para el flow de reset.
// MAX_RESENDS pide al usuario reiniciar el flow desde /auth/recuperar-password
export interface ResendResetCodeResponse {
  message: string;
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
