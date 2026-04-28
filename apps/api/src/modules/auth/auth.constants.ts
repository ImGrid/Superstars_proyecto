import * as argon2 from 'argon2';

// Parametros de argon2id segun OWASP + RFC 9106
export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 1, // OWASP recomienda 1 para servidores
  hashLength: 32,
};

// Nombre de la cookie httpOnly para el refresh token
export const REFRESH_COOKIE_NAME = 'refresh_token';

// Nombre de la cookie httpOnly para el access token
export const ACCESS_COOKIE_NAME = 'access_token';

// Convierte strings de duracion a milisegundos (ej: '7d' -> 604800000)
export function parseDuration(value: string): number {
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const num = parseInt(match[1], 10);
  const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * (multipliers[match[2]] || 86400000);
}

// Verificacion de cuenta por codigo de email.
// VERIFICACION_EXPIRACION_MINUTOS, RESEND_MAX y RESEND_COOLDOWNS_SEG
// estan en @superstars/shared/constants (compartidas con el frontend para
// que el countdown UI use los mismos valores que el enforcement server-side)
export { VERIFICACION_EXPIRACION_MINUTOS } from '@superstars/shared';
import { VERIFICACION_EXPIRACION_MINUTOS } from '@superstars/shared';

export const VERIFICACION_EXPIRACION_MS = VERIFICACION_EXPIRACION_MINUTOS * 60 * 1000;
export const VERIFICACION_MAX_INTENTOS = 3;

// Rate limits por IP y por email (consumidos por @AuthRateLimit en controller)
export const RATE_LIMIT_REGISTER_IP_LIMIT = 3;
export const RATE_LIMIT_REGISTER_IP_TTL_MS = 3600000; // 1 hora
export const RATE_LIMIT_REGISTER_EMAIL_HOUR_LIMIT = 5;
export const RATE_LIMIT_REGISTER_EMAIL_HOUR_TTL_MS = 3600000;
export const RATE_LIMIT_REGISTER_EMAIL_DAY_LIMIT = 10;
export const RATE_LIMIT_REGISTER_EMAIL_DAY_TTL_MS = 86400000; // 24 horas
export const RATE_LIMIT_VERIFY_IP_LIMIT = 5;
export const RATE_LIMIT_VERIFY_IP_TTL_MS = 60000; // 1 minuto

// Mensajes genericos anti-enumeration: misma respuesta para email existente,
// no existente, desechable, honeypot, sin pendiente, etc.
export const MENSAJE_GENERICO_REGISTRO =
  'Si el email no está registrado, te enviaremos un código de verificación. Revisa tu bandeja de entrada.';

export const MENSAJE_GENERICO_RESEND =
  'Si tu correo tiene una verificación pendiente, te enviamos un código nuevo. Revisa tu bandeja de entrada.';

// Mensajes genericos para el flow de reset password (anti-enumeration:
// misma respuesta si el usuario existe / no existe / esta desactivado / no
// tiene reset pendiente)
export const MENSAJE_GENERICO_FORGOT_PASSWORD =
  'Si tu correo está registrado, te enviamos un código para restablecer tu contraseña. Revisa tu bandeja de entrada.';

export const MENSAJE_GENERICO_RESEND_RESET =
  'Si tu correo tiene una solicitud de restablecimiento pendiente, te enviamos un código nuevo. Revisa tu bandeja de entrada.';

export const MENSAJE_PASSWORD_RESTABLECIDA =
  'Contraseña restablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña.';
