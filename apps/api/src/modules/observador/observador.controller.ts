import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { Req } from '@nestjs/common';
import { ObservadorService } from './observador.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolUsuario } from '@superstars/shared';
import type { AuthUser } from '@superstars/shared';

// Portal de seguimiento del financiador (rol observador).
//
// SOLO LECTURA POR CONSTRUCCION: este controlador no declara ni un @Post, @Put,
// @Patch o @Delete. No hay ruta de escritura que proteger porque no existe.
// Si alguien alguna vez agrega una aca, esta rompiendo el diseño del modulo.
//
// El administrador tambien entra, para poder ver exactamente lo mismo que ve el
// financiador sin tener que crearse una cuenta aparte. Ve estrictamente menos de
// lo que ya puede ver por sus propios endpoints, asi que no amplia su alcance.
//
// Rate limit propio, mas ajustado que el global (100/min): con un rol externo el
// riesgo principal ya no es que modifique algo, sino que se lleve todo el
// contenido con un script.
@Controller('seguimiento')
@Roles(RolUsuario.OBSERVADOR, RolUsuario.ADMINISTRADOR)
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class ObservadorController {
  constructor(private readonly observadorService: ObservadorService) {}

  // Pantalla de inicio: totales generales
  @Get('resumen')
  async resumen() {
    return this.observadorService.verResumen();
  }

  // --- Convocatorias ---

  @Get('convocatorias')
  async listarConvocatorias() {
    return this.observadorService.listarConvocatorias();
  }

  @Get('convocatorias/:convocatoriaId')
  async verConvocatoria(@Param('convocatoriaId', ParseIntPipe) convocatoriaId: number) {
    return this.observadorService.verConvocatoria(convocatoriaId);
  }

  // --- Categorias ---

  @Get('convocatorias/:convocatoriaId/categorias')
  async listarCategorias(@Param('convocatoriaId', ParseIntPipe) convocatoriaId: number) {
    return this.observadorService.listarCategorias(convocatoriaId);
  }

  // --- Formulario y rubrica ---

  @Get('convocatorias/:convocatoriaId/categorias/:categoriaId/formulario')
  async verFormulario(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
  ) {
    return this.observadorService.verFormulario(convocatoriaId, categoriaId);
  }

  @Get('convocatorias/:convocatoriaId/categorias/:categoriaId/rubrica')
  async verRubrica(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
  ) {
    return this.observadorService.verRubrica(convocatoriaId, categoriaId);
  }

  // --- Documentos de la convocatoria ---

  @Get('convocatorias/:convocatoriaId/categorias/:categoriaId/documentos')
  async listarDocumentos(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
  ) {
    return this.observadorService.listarDocumentos(convocatoriaId, categoriaId);
  }

  // Descarga: limite mas bajo todavia, es la operacion mas pesada y la que mas
  // sentido tiene frenar ante un script que quiera bajarse todo.
  @Get('convocatorias/:convocatoriaId/categorias/:categoriaId/documentos/:documentoId/descargar')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async descargarDocumento(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
    @Param('documentoId', ParseIntPipe) documentoId: number,
    @CurrentUser() user: AuthUser,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    const { buffer, mimeType, nombreOriginal } =
      await this.observadorService.descargarDocumento(
        convocatoriaId,
        categoriaId,
        documentoId,
        user,
        request.ip,
      );

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(nombreOriginal)}"`,
      'Content-Length': buffer.length.toString(),
    });
    res.send(buffer);
  }

  // --- Postulaciones ---

  @Get('convocatorias/:convocatoriaId/postulaciones')
  async listarPostulaciones(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    // ParseIntPipe optional: si viene, DEBE ser un entero valido (rechaza texto,
    // decimales, notacion cientifica y overflow con 400). Antes se hacia Number()
    // a mano: un valor basura caia en NaN y se trataba como "sin filtro"
    // (fail-open), y un decimal/overflow llegaba a Postgres y daba 500.
    @Query('categoriaId', new ParseIntPipe({ optional: true }))
    categoriaId?: number,
  ) {
    return this.observadorService.listarPostulaciones(convocatoriaId, categoriaId);
  }

  @Get('convocatorias/:convocatoriaId/postulaciones/:postulacionId')
  async verPostulacion(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
    @CurrentUser() user: AuthUser,
    @Req() request: Request,
  ) {
    return this.observadorService.verPostulacion(
      convocatoriaId,
      postulacionId,
      user,
      request.ip,
    );
  }

  // --- Resultados ---

  @Get('convocatorias/:convocatoriaId/categorias/:categoriaId/ranking')
  async verRanking(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
  ) {
    return this.observadorService.verRanking(convocatoriaId, categoriaId);
  }
}
