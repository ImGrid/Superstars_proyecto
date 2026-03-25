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
import { CheckConcurso } from '../concurso/decorators/check-concurso.decorator';
import { EvaluacionService } from './evaluacion.service';

// --- Endpoints del evaluador ---
@Controller('mis-evaluaciones')
export class EvaluacionEvaluadorController {
  constructor(private readonly evaluacionService: EvaluacionService) {}

  // concursos donde estoy asignado como evaluador
  @Get('concursos')
  @Roles(RolUsuario.EVALUADOR)
  async findMisConcursos(@CurrentUser() user: AuthUser) {
    return this.evaluacionService.findMisConcursos(user.id);
  }

  // postulaciones evaluables de un concurso
  @Get('concursos/:concursoId/postulaciones')
  @Roles(RolUsuario.EVALUADOR)
  async findPostulaciones(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.evaluacionService.findPostulacionesEvaluables(concursoId, user.id);
  }

  // detalle de una postulacion (propuesta + mi calificacion)
  @Get('concursos/:concursoId/postulaciones/:postulacionId')
  @Roles(RolUsuario.EVALUADOR)
  async findPostulacionDetalle(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.evaluacionService.findPostulacionDetalle(concursoId, postulacionId, user.id);
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
    // obtener concursoId de la postulacion
    const post = await this.evaluacionService.findPostulacionParaConcursoId(postulacionId);
    return this.evaluacionService.saveCalificacion(post.concursoId, postulacionId, user.id, dto);
  }

  // completar calificacion (enviar para revision)
  @Post('calificaciones/:postulacionId/completar')
  @Roles(RolUsuario.EVALUADOR)
  @HttpCode(HttpStatus.OK)
  async completarCalificacion(
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
    @CurrentUser() user: AuthUser,
  ) {
    const post = await this.evaluacionService.findPostulacionParaConcursoId(postulacionId);
    return this.evaluacionService.completarCalificacion(post.concursoId, postulacionId, user.id);
  }
}

// --- Endpoints del responsable/admin para supervision ---
@Controller('concursos/:concursoId/calificaciones')
export class EvaluacionResponsableController {
  constructor(private readonly evaluacionService: EvaluacionService) {}

  // listar calificaciones de un concurso
  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  async findAll(
    @Param('concursoId', ParseIntPipe) concursoId: number,
  ) {
    return this.evaluacionService.findCalificacionesByConcurso(concursoId);
  }

  // detalle de una calificacion (puntajes + postulacion con responseData)
  @Get(':calificacionId/detalle')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  async findDetalle(
    @Param('calificacionId', ParseIntPipe) calificacionId: number,
  ) {
    return this.evaluacionService.findCalificacionDetalle(calificacionId);
  }

  // aprobar calificacion
  @Post(':calificacionId/aprobar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  @HttpCode(HttpStatus.OK)
  async aprobar(
    @Param('calificacionId', ParseIntPipe) calificacionId: number,
  ) {
    return this.evaluacionService.aprobarCalificacion(calificacionId);
  }

  // devolver calificacion al evaluador
  @Post(':calificacionId/devolver')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
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
@Controller('concursos/:concursoId/postulaciones/:postulacionId/evaluadores-asignados')
export class AsignacionEvaluadorController {
  constructor(private readonly evaluacionService: EvaluacionService) {}

  // listar evaluadores asignados a una postulacion
  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  async findAll(
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
  ) {
    return this.evaluacionService.findAsignacionesByPostulacion(postulacionId);
  }

  // asignar evaluador a una postulacion
  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  @HttpCode(HttpStatus.CREATED)
  async assign(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
    @Body() body: AssignEvaluadorPostulacionDto,
    @CurrentUser() user: AuthUser,
  ) {
    const dto = assignEvaluadorPostulacionSchema.parse(body);
    return this.evaluacionService.assignEvaluadorToPostulacion(
      concursoId, postulacionId, dto, user.id,
    );
  }

  // desasignar evaluador de una postulacion
  @Delete(':evaluadorId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
    @Param('evaluadorId', ParseIntPipe) evaluadorId: number,
  ) {
    await this.evaluacionService.removeAsignacion(concursoId, postulacionId, evaluadorId);
  }
}
