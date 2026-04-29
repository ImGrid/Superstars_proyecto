import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  RolUsuario,
  savePostulacionDraftSchema,
  observarPostulacionSchema,
} from '@superstars/shared';
import type {
  SavePostulacionDraftDto,
  ObservarPostulacionDto,
  AuthUser,
} from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CheckConvocatoria } from '../convocatoria/decorators/check-convocatoria.decorator';
import { PostulacionService } from './postulacion.service';

@Controller('convocatorias/:convocatoriaId/postulaciones')
export class PostulacionController {
  constructor(private readonly postulacionService: PostulacionService) {}

  // === Rutas del proponente (sin @CheckConvocatoria, el service valida acceso) ===

  // Guardar borrador (crea o actualiza)
  @Put('me/draft')
  @Roles(RolUsuario.PROPONENTE)
  async saveDraft(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Body() body: SavePostulacionDraftDto,
    @CurrentUser() user: AuthUser,
  ) {
    const dto = savePostulacionDraftSchema.parse(body);
    return this.postulacionService.saveDraft(convocatoriaId, user.id, dto);
  }

  // Enviar postulacion (valida 100% y cambia estado)
  @Post('me/enviar')
  @Roles(RolUsuario.PROPONENTE)
  @HttpCode(HttpStatus.OK)
  async submit(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.postulacionService.submit(convocatoriaId, user.id);
  }

  // Obtener mi postulacion
  @Get('me')
  @Roles(RolUsuario.PROPONENTE)
  async findMine(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.postulacionService.findMine(convocatoriaId, user.id);
  }

  // === Rutas del responsable / admin ===

  // Listar postulaciones de la convocatoria (sin responseData)
  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  async findAll(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Query('estado') estado?: string,
  ) {
    return this.postulacionService.findAllByConvocatoria(convocatoriaId, estado);
  }

  // Detalle de una postulacion (con responseData)
  @Get(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.postulacionService.findById(id);
  }

  // Observar postulacion (devolver al proponente con comentarios)
  @Post(':id/observar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.OK)
  async observar(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ObservarPostulacionDto,
  ) {
    const dto = observarPostulacionSchema.parse(body);
    return this.postulacionService.observar(id, dto);
  }

  // Rechazar postulacion (estado final)
  @Post(':id/rechazar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.OK)
  async rechazar(@Param('id', ParseIntPipe) id: number) {
    return this.postulacionService.rechazar(id);
  }

  // Aprobar postulacion para evaluacion (enviado → en_evaluacion)
  @Post(':id/aprobar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.OK)
  async aprobar(@Param('id', ParseIntPipe) id: number) {
    return this.postulacionService.aprobar(id);
  }

}
