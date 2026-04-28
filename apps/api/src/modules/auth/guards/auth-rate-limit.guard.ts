import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerStorage } from '@nestjs/throttler';
import {
  AUTH_RATE_LIMITS_KEY,
  AuthRateLimitConfig,
} from '../decorators/rate-limit.decorator';

// Guard generico para rate limiting multi-capa de endpoints de auth.
// Lee el array de capas del decorator @AuthRateLimit y aplica cada una
// independientemente: si cualquiera se excede, lanza 429.
//
// Defensa en capas:
//   - Capa IP: detiene atacante con una sola IP (bots simples, typos legitimos)
//   - Capa email: detiene subscription bombing (atacante rota IPs contra
//     misma victima). Esta es la capa CRITICA segun research_amenazas
//
// Storage: reusa @nestjs/throttler storage (en memoria por default).
// Si se necesita escalar a multiples replicas: swappable a Redis sin tocar
// este guard.
//
// Reemplaza el viejo EmailThrottlerGuard que compartia el throttler 'default'
// y por eso terminaba aplicando los mismos limites que el guard de IP.
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(
    @Inject(ThrottlerStorage) private readonly storage: ThrottlerStorage,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limits = this.reflector.getAllAndOverride<AuthRateLimitConfig[]>(
      AUTH_RATE_LIMITS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!limits || limits.length === 0) return true;

    const req = context.switchToHttp().getRequest<{
      ip?: string;
      body?: { email?: string };
    }>();

    const ip = typeof req.ip === 'string' ? req.ip : 'unknown';
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.toLowerCase().trim()
        : '';

    for (const cfg of limits) {
      const tracker = cfg.by === 'email' ? email : ip;
      // Si el tracker requerido no existe (ej: body sin email cuando layer es 'email'),
      // se salta esa capa. Zod ya valida que el email este presente en los DTOs
      // de register/resend/verify, asi que esto solo ocurre en errores de validacion
      // que se rechazan antes del guard de todas formas.
      if (!tracker) continue;

      const key = `auth:${cfg.prefix}:${tracker}`;
      const record = await this.storage.increment(
        key,
        cfg.ttl,
        cfg.limit,
        0,
        cfg.prefix,
      );

      if (record.isBlocked) {
        const res = context.switchToHttp().getResponse<{
          header?: (k: string, v: string | number) => void;
        }>();
        if (typeof res.header === 'function') {
          res.header('Retry-After', record.timeToBlockExpire);
        }
        // Mensaje generico — no revelar si fue por IP o email (anti-enumeration)
        throw new HttpException(
          {
            message: 'Demasiados intentos. Intenta más tarde.',
            code: 'RATE_LIMITED',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    return true;
  }
}
