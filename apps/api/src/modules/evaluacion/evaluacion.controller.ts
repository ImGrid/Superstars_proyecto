import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  RolUsuario,
  saveCalificacionSchema,
  devolverCalificacionSchema,
  assignEvaluadorPostulacionSchema,
} from '@superstars/shared';
import type { AuthUser, SaveCalificacionDto, DevolverCalificacionDto, AssignEvaluadorPostulacionDto } from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CheckConvocatoria } from '../convocatoria/decorators/check-convocatoria.decorator';
import { EvaluacionService } from './evaluacion.service';

// --- Endpoints del evaluador ---
@Controller('mis-evaluaciones')
export class EvaluacionEvaluadorController {
  constructor(private readonly evaluacionService: EvaluacionService) {}

  // convocatorias donde estoy asignado como evaluador
  @Get('convocatorias')
  @Roles(RolUsuario.EVALUADOR)
  async findMisConvocatorias(@CurrentUser() user: AuthUser) {
    return this.evaluacionService.findMisConvocatorias(user.id);
  }

  // postulaciones evaluables de una convocatoria
  @Get('convocatorias/:convocatoriaId/postulaciones')
  @Roles(RolUsuario.EVALUADOR)
  async findPostulaciones(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.evaluacionService.findPostulacionesEvaluables(convocatoriaId, user.id);
  }

  // detalle de una postulacion (propuesta + mi calificacion)
  @Get('convocatorias/:convocatoriaId/postulaciones/:postulacionId')
  @Roles(RolUsuario.EVALUADOR)
  async findPostulacionDetalle(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.evaluacionService.findPostulacionDetalle(convocatoriaId, postulacionId, user.id);
  }

  // guardar calificacion (parcial o completa)
  @Put('calificaciones/:postulacionId')
  @Roles(RolUsuario.EVALUADOR)
  async saveCalificacion(
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
    @Body() body: SaveCalificacionDto,
    @CurrentUser() user: AuthUser,
  ) {
    const dto = saveCalificacionSchema.parse(body);
    // obtener convocatoriaId de la postulacion
    const post = await this.evaluacionService.findPostulacionParaConvocatoriaId(postulacionId);
    return this.evaluacionService.saveCalificacion(post.convocatoriaId, postulacionId, user.id, dto);
  }

  // completar calificacion (enviar para revision)
  @Post('calificaciones/:postulacionId/completar')
  @Roles(RolUsuario.EVALUADOR)
  @HttpCode(HttpStatus.OK)
  async completarCalificacion(
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
    @CurrentUser() user: AuthUser,
  ) {
    const post = await this.evaluacionService.findPostulacionParaConvocatoriaId(postulacionId);
    return this.evaluacionService.completarCalificacion(post.convocatoriaId, postulacionId, user.id);
  }
}

// --- Endpoints del responsable/admin para supervision ---
@Controller('convocatorias/:convocatoriaId/calificaciones')
export class EvaluacionResponsableController {
  constructor(private readonly evaluacionService: EvaluacionService) {}

  // listar calificaciones de una convocatoria
  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  async findAll(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
  ) {
    return this.evaluacionService.findCalificacionesByConvocatoria(convocatoriaId);
  }

  // detalle de una calificacion (puntajes + postulacion con responseData)
  @Get(':calificacionId/detalle')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  async findDetalle(
    @Param('calificacionId', ParseIntPipe) calificacionId: number,
  ) {
    return this.evaluacionService.findCalificacionDetalle(calificacionId);
  }

  // aprobar calificacion
  @Post(':calificacionId/aprobar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.OK)
  async aprobar(
    @Param('calificacionId', ParseIntPipe) calificacionId: number,
  ) {
    return this.evaluacionService.aprobarCalificacion(calificacionId);
  }

  // devolver calificacion al evaluador
  @Post(':calificacionId/devolver')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.OK)
  async devolver(
    @Param('calificacionId', ParseIntPipe) calificacionId: number,
    @Body() body: DevolverCalificacionDto,
  ) {
    const dto = devolverCalificacionSchema.parse(body);
    return this.evaluacionService.devolverCalificacion(calificacionId, dto);
  }
}

// --- Endpoints para asignar evaluadores a postulaciones ---
@Controller('convocatorias/:convocatoriaId/postulaciones/:postulacionId/evaluadores-asignados')
export class AsignacionEvaluadorController {
  constructor(private readonly evaluacionService: EvaluacionService) {}

  // listar evaluadores asignados a una postulacion
  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  async findAll(
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
  ) {
    return this.evaluacionService.findAsignacionesByPostulacion(postulacionId);
  }

  // asignar evaluador a una postulacion
  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.CREATED)
  async assign(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
    @Body() body: AssignEvaluadorPostulacionDto,
    @CurrentUser() user: AuthUser,
  ) {
    const dto = assignEvaluadorPostulacionSchema.parse(body);
    return this.evaluacionService.assignEvaluadorToPostulacion(
      convocatoriaId, postulacionId, dto, user.id,
    );
  }

  // desasignar evaluador de una postulacion
  @Delete(':evaluadorId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
    @Param('evaluadorId', ParseIntPipe) evaluadorId: number,
  ) {
    await this.evaluacionService.removeAsignacion(convocatoriaId, postulacionId, evaluadorId);
  }
}
