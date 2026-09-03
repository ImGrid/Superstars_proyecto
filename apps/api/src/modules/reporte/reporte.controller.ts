import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { RolUsuario, reporteQuerySchema, tipoReporteSchema } from '@superstars/shared';
import type { AuthUser } from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReporteService } from './reporte.service';
import { AuditoriaReporteService } from './auditoria-reporte.service';

// Reportes descargables. SOLO administrador, sin excepciones.
//
// El decorador @Roles va a nivel de clase y no por metodo: aqui no hay ningun
// endpoint que deba abrirse a otro rol, y ponerlo arriba evita que un endpoint
// nuevo nazca sin proteccion por olvido. El responsable de convocatoria no
// exporta la base completa y el observador no exporta nada, por definicion del
// rol de solo lectura.
//
// El limite de peticiones va SEPARADO entre el catalogo y las descargas, y no
// compartido para todo el controlador. Son dos cosas distintas:
//
//   * El catalogo solo devuelve conteos. La pantalla lo consulta al entrar y
//     cada vez que se cambia un filtro, asi que un cupo bajo lo dejaria
//     inservible. Sesenta por minuto.
//   * Cada descarga arma un archivo con datos personales de todas las personas
//     registradas. Ahi el riesgo no es la carga del servidor sino que alguien
//     se lleve la base entera a repeticion. Diez por minuto alcanza de sobra
//     para el uso real.
//
// Si los dos compartieran contador, abrir la pantalla varias veces consumiria
// el cupo de descargas y el administrador veria "demasiados intentos" sin haber
// descargado nada. Es exactamente el fallo que ya ocurrio en el registro.
@Controller('reportes')
@Roles(RolUsuario.ADMINISTRADOR)
export class ReporteController {
  constructor(
    private readonly reporteService: ReporteService,
    private readonly auditoria: AuditoriaReporteService,
  ) {}

  // GET /api/reportes
  // Catalogo: que reportes hay, que filtros acepta cada uno y cuantas filas
  // tendria hoy. Permite avisar antes de descargar que un reporte saldria vacio.
  @Get()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async catalogo() {
    return this.reporteService.getCatalogo();
  }

  // GET /api/reportes/:tipo?formato=excel&convocatoriaId=...
  // Genera el archivo y lo devuelve como descarga.
  @Get(':tipo')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async descargar(
    @Param('tipo') tipoParam: string,
    @Query() rawQuery: Record<string, unknown>,
    @CurrentUser() user: AuthUser,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    // Validacion explicita con Zod, como en el resto del proyecto. Un tipo de
    // reporte desconocido tiene que dar 400 y no un 500 mas abajo.
    const tipo = tipoReporteSchema.parse(tipoParam);
    const filtros = reporteQuerySchema.parse(rawQuery);

    const archivo = await this.reporteService.generar(tipo, filtros, user.email);

    // Se audita despues de generar con exito: si la generacion falla, no salio
    // ningun dato del sistema y no hay nada que registrar.
    await this.auditoria.registrar({
      user,
      tipo,
      formato: filtros.formato,
      filtros: filtros as unknown as Record<string, unknown>,
      filasExportadas: archivo.filasExportadas,
      ip: request.ip,
    });

    res.set({
      'Content-Type': archivo.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(archivo.nombreArchivo)}"`,
      'Content-Length': archivo.buffer.length.toString(),
    });
    res.send(archivo.buffer);
  }
}
