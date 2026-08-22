import { Injectable, Inject, Logger } from '@nestjs/common';
import { accesoObservador } from '@superstars/db';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import type { AuthUser } from '@superstars/shared';

type AccionAuditada = 'ver' | 'descargar';
type RecursoAuditado = 'postulacion' | 'documento';

// Deja rastro de que consulto o descargo un observador.
//
// Solo se auditan los accesos con contenido sensible: el detalle de una
// postulacion y la descarga de un documento. Los listados no se auditan porque
// serian ruido y no revelan datos de una empresa en particular.
//
// El registro NUNCA debe tumbar la respuesta: si falla el insert, se loguea y
// se sigue. Un problema de auditoria no puede dejar sin servicio al usuario.
@Injectable()
export class AuditoriaObservadorService {
  private readonly logger = new Logger(AuditoriaObservadorService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async registrar(params: {
    user: AuthUser;
    accion: AccionAuditada;
    recurso: RecursoAuditado;
    recursoId: number;
    convocatoriaId?: number;
    ip?: string;
  }): Promise<void> {
    try {
      await this.db.insert(accesoObservador).values({
        usuarioId: params.user.id,
        // foto del email: si el usuario se borra o cambia de correo, el rastro
        // sigue diciendo quien fue
        usuarioEmail: params.user.email,
        accion: params.accion,
        recurso: params.recurso,
        recursoId: params.recursoId,
        convocatoriaId: params.convocatoriaId ?? null,
        ip: params.ip ?? null,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo registrar el acceso (${params.accion} ${params.recurso} ${params.recursoId}) del usuario ${params.user.id}`,
        error as Error,
      );
    }
  }
}
