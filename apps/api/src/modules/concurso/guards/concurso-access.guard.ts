import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHECK_CONCURSO_KEY } from '../decorators/check-concurso.decorator';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { ConcursoAccessService } from '../concurso-access.service';
import { RolUsuario } from '@superstars/shared';
import type { AuthUser } from '@superstars/shared';

@Injectable()
export class ConcursoAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessService: ConcursoAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Si el endpoint es @Public(), no aplicar
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Si no tiene @CheckConcurso(), no aplicar
    const paramName = this.reflector.getAllAndOverride<string>(CHECK_CONCURSO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!paramName) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    if (!user) return false;

    // Admin tiene acceso total a todos los concursos
    if (user.rol === RolUsuario.ADMINISTRADOR) return true;

    // Proponente: RolesGuard ya filtra que endpoints puede acceder
    if (user.rol === RolUsuario.PROPONENTE) return true;

    // Extraer concursoId del parametro de ruta
    const concursoId = Number(request.params[paramName]);
    if (!concursoId || isNaN(concursoId)) {
      throw new NotFoundException('Concurso no encontrado');
    }

    // Responsable: verificar asignacion en responsable_concurso
    if (user.rol === RolUsuario.RESPONSABLE_CONCURSO) {
      const isResponsable = await this.accessService.isResponsable(concursoId, user.id);
      if (!isResponsable) {
        throw new ForbiddenException('No tienes acceso a este concurso');
      }
      return true;
    }

    // Evaluador: verificar asignacion en evaluador_concurso
    if (user.rol === RolUsuario.EVALUADOR) {
      const isEvaluador = await this.accessService.isEvaluador(concursoId, user.id);
      if (!isEvaluador) {
        throw new ForbiddenException('No estas asignado como evaluador a este concurso');
      }
      return true;
    }

    throw new ForbiddenException('No tienes acceso a este concurso');
  }
}
