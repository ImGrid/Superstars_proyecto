import { Injectable, Inject, Logger } from '@nestjs/common';
import { descargaReporte } from '@superstars/db';
import type { AuthUser, TipoReporte, FormatoReporte } from '@superstars/shared';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';

// Deja rastro de quien descargo cada reporte.
//
// Se audita SIEMPRE, sin excepciones: un reporte lleva nombre, correo, telefono,
// cargo, direccion, genero y fecha de nacimiento de las personas registradas, y
// sale del sistema como archivo que despues circula por correo o mensajeria. Si
// alguna vez hay un reclamo por filtracion, tiene que poder responderse quien
// genero ese archivo, cuando y que contenia.
//
// Se registra DESPUES de generar el archivo con exito: un reporte que fallo no
// se audita porque no salio ningun dato del sistema.
//
// El registro NUNCA debe tumbar la descarga: si falla el insert, se loguea y se
// sigue. Un problema de auditoria no puede dejar sin servicio al usuario.
@Injectable()
export class AuditoriaReporteService {
  private readonly logger = new Logger(AuditoriaReporteService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async registrar(params: {
    user: AuthUser;
    tipo: TipoReporte;
    formato: FormatoReporte;
    filtros: Record<string, unknown>;
    filasExportadas: number;
    ip?: string;
  }): Promise<void> {
    try {
      await this.db.insert(descargaReporte).values({
        usuarioId: params.user.id,
        // foto del correo: si el usuario se borra o lo cambia, el rastro sigue
        // diciendo quien fue
        usuarioEmail: params.user.email,
        tipo: params.tipo,
        formato: params.formato,
        filtros: params.filtros,
        filasExportadas: params.filasExportadas,
        ip: params.ip ?? null,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo registrar la descarga del reporte ${params.tipo} (${params.formato}) del usuario ${params.user.id}`,
        error as Error,
      );
    }
  }
}
