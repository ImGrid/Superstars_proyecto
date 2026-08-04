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
  repartirEvaluadoresSchema,
} from '@superstars/shared';
import type {
  AuthUser,
  SaveCalificacionDto,
  DevolverCalificacionDto,
  AssignEvaluadorPostulacionDto,
  RepartirEvaluadoresDto,
} from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CheckConvocatoria } from '../convocatoria/decorators/check-convocatoria.decorator';
import { EvaluacionService } from './evaluacion.service';

// --- Endpoints del evaluador ---
@Controller('mis-evaluaciones')
export class EvaluacionEvaluadorController {
  constructor(private readonly evaluacionService: EvaluacionService) {}

  // categorias donde soy jurado
  @Get('categorias')
  @Roles(RolUsuario.EVALUADOR)
  async findMisCategorias(@CurrentUser() user: AuthUser) {
    return this.evaluacionService.findMisCategorias(user.id);
  }

  // postulaciones que me asignaron en una categoria
  @Get('categorias/:categoriaId/postulaciones')
  @Roles(RolUsuario.EVALUADOR)
  async findPostulaciones(
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.evaluacionService.findPostulacionesEvaluables(categoriaId, user.id);
  }

  // detalle de una postulacion (propuesta + mi calificacion)
  @Get('categorias/:categoriaId/postulaciones/:postulacionId')
  @Roles(RolUsuario.EVALUADOR)
  async findPostulacionDetalle(
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.evaluacionService.findPostulacionDetalle(categoriaId, postulacionId, user.id);
  }

  // guardar calificacion (parcial o completa). La categoria se deriva de la postulacion.
  @Put('calificaciones/:postulacionId')
  @Roles(RolUsuario.EVALUADOR)
  async saveCalificacion(
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
    @Body() body: SaveCalificacionDto,
    @CurrentUser() user: AuthUser,
  ) {
    const dto = saveCalificacionSchema.parse(body);
    return this.evaluacionService.saveCalificacion(postulacionId, user.id, dto);
  }

  // completar calificacion (enviar para revision)
  @Post('calificaciones/:postulacionId/completar')
  @Roles(RolUsuario.EVALUADOR)
  @HttpCode(HttpStatus.OK)
  async completarCalificacion(
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.evaluacionService.completarCalificacion(postulacionId, user.id);
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
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('calificacionId', ParseIntPipe) calificacionId: number,
  ) {
    return this.evaluacionService.findCalificacionDetalle(convocatoriaId, calificacionId);
  }

  // aprobar calificacion
  @Post(':calificacionId/aprobar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.OK)
  async aprobar(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('calificacionId', ParseIntPipe) calificacionId: number,
  ) {
    return this.evaluacionService.aprobarCalificacion(convocatoriaId, calificacionId);
  }

  // devolver calificacion al evaluador
  @Post(':calificacionId/devolver')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.OK)
  async devolver(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('calificacionId', ParseIntPipe) calificacionId: number,
    @Body() body: DevolverCalificacionDto,
  ) {
    const dto = devolverCalificacionSchema.parse(body);
    return this.evaluacionService.devolverCalificacion(convocatoriaId, calificacionId, dto);
  }
}

// --- Reparto automatico de jurados en una categoria (responsable/admin) ---
@Controller('convocatorias/:convocatoriaId/categorias/:categoriaId')
export class RepartoEvaluadoresController {
  constructor(private readonly evaluacionService: EvaluacionService) {}

  // reparte el jurado de la categoria entre sus postulaciones en evaluacion
  @Post('repartir-evaluadores')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.OK)
  async repartir(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
    @Body() body: RepartirEvaluadoresDto,
    @CurrentUser() user: AuthUser,
  ) {
    const dto = repartirEvaluadoresSchema.parse(body);
    return this.evaluacionService.repartirEvaluadores(
      convocatoriaId, categoriaId, dto, user.id,
    );
  }
}

// --- Cierre de la evaluacion de una postulacion (responsable/admin) ---
@Controller('convocatorias/:convocatoriaId/postulaciones/:postulacionId')
export class CierreEvaluacionController {
  constructor(private readonly evaluacionService: EvaluacionService) {}

  // da por terminada la evaluacion y calcula el puntaje con las notas aprobadas
  @Post('cerrar-evaluacion')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.OK)
  async cerrarEvaluacion(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
  ) {
    return this.evaluacionService.cerrarEvaluacion(convocatoriaId, postulacionId);
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
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
  ) {
    return this.evaluacionService.findAsignacionesByPostulacion(convocatoriaId, postulacionId);
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
