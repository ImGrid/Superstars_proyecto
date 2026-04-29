import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHECK_CONVOCATORIA_KEY } from '../decorators/check-convocatoria.decorator';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { ConvocatoriaAccessService } from '../convocatoria-access.service';
import { RolUsuario } from '@superstars/shared';
import type { AuthUser } from '@superstars/shared';

@Injectable()
export class ConvocatoriaAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessService: ConvocatoriaAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Si el endpoint es @Public(), no aplicar
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Si no tiene @CheckConvocatoria(), no aplicar
    const paramName = this.reflector.getAllAndOverride<string>(CHECK_CONVOCATORIA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!paramName) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    if (!user) return false;

    // Admin tiene acceso total a todas las convocatorias
    if (user.rol === RolUsuario.ADMINISTRADOR) return true;

    // Proponente: RolesGuard ya filtra que endpoints puede acceder
    if (user.rol === RolUsuario.PROPONENTE) return true;

    // Extraer convocatoriaId del parametro de ruta
    const convocatoriaId = Number(request.params[paramName]);
    if (!convocatoriaId || isNaN(convocatoriaId)) {
      throw new NotFoundException('Convocatoria no encontrada');
    }

    // Responsable: verificar asignacion en responsable_convocatoria
    if (user.rol === RolUsuario.RESPONSABLE_CONVOCATORIA) {
      const isResponsable = await this.accessService.isResponsable(convocatoriaId, user.id);
      if (!isResponsable) {
        throw new ForbiddenException('No tienes acceso a esta convocatoria');
      }
      return true;
    }

    // Evaluador: verificar asignacion en evaluador_convocatoria
    if (user.rol === RolUsuario.EVALUADOR) {
      const isEvaluador = await this.accessService.isEvaluador(convocatoriaId, user.id);
      if (!isEvaluador) {
        throw new ForbiddenException('No estas asignado como evaluador a esta convocatoria');
      }
      return true;
    }

    throw new ForbiddenException('No tienes acceso a esta convocatoria');
  }
}
