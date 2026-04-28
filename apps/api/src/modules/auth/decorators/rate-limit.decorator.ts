import { SetMetadata } from '@nestjs/common';

// Decorator para configurar rate limiting multi-capa en endpoints de auth.
// Lo lee AuthRateLimitGuard. Cada elemento del array es una capa independiente:
// si CUALQUIERA se excede, la request se rechaza con 429.
//
// `prefix` debe ser unico globalmente (es la key namespace en el storage).
// `by: 'ip'` usa req.ip como tracker. `by: 'email'` usa body.email (lowercased).

export const AUTH_RATE_LIMITS_KEY = 'auth-rate-limits';

export type AuthRateLimitTracker = 'ip' | 'email';

export interface AuthRateLimitConfig {
  prefix: string;
  by: AuthRateLimitTracker;
  limit: number;
  ttl: number;
}

export const AuthRateLimit = (limits: AuthRateLimitConfig[]) =>
  SetMetadata(AUTH_RATE_LIMITS_KEY, limits);
