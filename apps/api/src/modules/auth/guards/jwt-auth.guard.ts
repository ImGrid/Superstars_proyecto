import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { eq } from 'drizzle-orm';
import { usuario } from '@superstars/db';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RolUsuario } from '@superstars/shared';
import type { AuthUser, JwtPayload } from '@superstars/shared';
import {
  ACCESS_COOKIE_NAME,
  JWT_ALGORITHM,
  ROLES_VERIFICACION_EN_VIVO,
} from '../auth.constants';

// Roles validos del sistema: cualquier rol fuera de esta lista se rechaza
const ROLES_CONOCIDOS: readonly RolUsuario[] = Object.values(RolUsuario);
import { DRIZZLE } from '../../../database/drizzle.provider';
import type { DrizzleDB } from '../../../database/drizzle.provider';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Endpoints marcados con @Public() no requieren token
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    // Header primero, cookie como fallback (compatibilidad con curl/Postman)
    const token = this.extractTokenFromHeader(request) || this.extractTokenFromCookie(request);
    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    let payload: JwtPayload;
    try {
      // algorithms fijo: un token con "alg" distinto (ej. "none") se rechaza
      // antes de mirar la firma, sin depender del default de la libreria
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('jwt.secret'),
        algorithms: [JWT_ALGORITHM],
      });
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    // Fail-closed: el rol del token DEBE ser uno de los conocidos. Un token con
    // firma valida pero rol inexistente (ej. un rol eliminado del enum del que
    // aun circulan tokens, o un rol corrupto) se rechaza en vez de pasar como
    // "autenticado generico" en los endpoints sin @Roles.
    if (!ROLES_CONOCIDOS.includes(payload.rol)) {
      throw new UnauthorizedException('Sesión no válida, inicia sesión nuevamente');
    }

    // Roles externos (ver ROLES_VERIFICACION_EN_VIVO): revalidar contra la BD en
    // cada request para que desactivar o degradar al usuario tenga efecto
    // inmediato, sin esperar a que caduque el access token.
    if (ROLES_VERIFICACION_EN_VIVO.includes(payload.rol)) {
      await this.verificarEnVivo(payload);
    }

    // Mapear payload JWT a AuthUser en el request
    const user: AuthUser = {
      id: payload.sub,
      email: payload.email,
      rol: payload.rol,
    };
    (request as any).user = user;

    return true;
  }

  // Confirma contra la BD que el usuario sigue existiendo, activo y con el mismo
  // rol que declara el token. Cualquier diferencia invalida la sesion: se
  // responde 401 para que el cliente vuelva a autenticarse en vez de seguir
  // operando con un rol que ya no le corresponde.
  private async verificarEnVivo(payload: JwtPayload): Promise<void> {
    const [actual] = await this.db
      .select({ rol: usuario.rol, activo: usuario.activo })
      .from(usuario)
      .where(eq(usuario.id, payload.sub))
      .limit(1);

    if (!actual || !actual.activo || actual.rol !== payload.rol) {
      throw new UnauthorizedException('Sesión no válida, inicia sesión nuevamente');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private extractTokenFromCookie(request: Request): string | undefined {
    return request.cookies?.[ACCESS_COOKIE_NAME];
  }
}
