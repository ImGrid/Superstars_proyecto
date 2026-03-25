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
