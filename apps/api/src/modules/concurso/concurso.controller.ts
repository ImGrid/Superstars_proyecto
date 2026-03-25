import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  RolUsuario,
  createConcursoSchema,
  updateConcursoSchema,
  updateFechasConcursoSchema,
  listConcursosQuerySchema,
  assignResponsableSchema,
  assignEvaluadorSchema,
} from '@superstars/shared';
import type { AuthUser, CreateConcursoDto, UpdateConcursoDto, UpdateFechasConcursoDto } from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CheckConcurso } from './decorators/check-concurso.decorator';
import { ConcursoService } from './concurso.service';

@Controller('concursos')
export class ConcursoController {
  constructor(private readonly concursoService: ConcursoService) {}

  // --- CRUD ---

  // Crear concurso (admin o responsable)
  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: CreateConcursoDto,
    @CurrentUser() user: AuthUser,
  ) {
    const dto = createConcursoSchema.parse(body);
    return this.concursoService.create(dto, user);
  }

  // Listar concursos (admin ve todos, responsable asignados, proponente solo publicados)
  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO, RolUsuario.PROPONENTE)
  async findAll(
    @Query() rawQuery: Record<string, string>,
    @CurrentUser() user: AuthUser,
  ) {
    const query = listConcursosQuerySchema.parse(rawQuery);
    return this.concursoService.findAll(query, user);
  }

  // Obtener concurso por ID (proponente solo ve publicados)
  @Get(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO, RolUsuario.PROPONENTE)
  @CheckConcurso('id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.concursoService.findById(id, user);
  }

  // Actualizar concurso (solo en borrador)
  @Patch(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateConcursoDto,
  ) {
    const dto = updateConcursoSchema.parse(body);
    return this.concursoService.update(id, dto);
  }

  // Modificar fechas de concurso publicado (cierre efectiva + anuncio ganadores)
  @Patch(':id/fechas')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('id')
  async updateFechas(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateFechasConcursoDto,
  ) {
    const dto = updateFechasConcursoSchema.parse(body);
    return this.concursoService.updateFechas(id, dto);
  }

  // Eliminar concurso (solo en borrador)
  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.concursoService.delete(id);
  }

  // --- Transiciones de estado ---

  // Verificar si se puede publicar (devuelve lista de errores)
  @Get(':id/can-publicar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('id')
  async canPublicar(@Param('id', ParseIntPipe) id: number) {
    const errors = await this.concursoService.canPublicar(id);
    return { canPublicar: errors.length === 0, errors };
  }

  // Publicar concurso (borrador -> publicado)
  @Post(':id/publicar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('id')
  async publicar(@Param('id', ParseIntPipe) id: number) {
    return this.concursoService.publicar(id);
  }

  // Cerrar concurso (publicado -> cerrado)
  @Post(':id/cerrar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('id')
  async cerrar(@Param('id', ParseIntPipe) id: number) {
    return this.concursoService.cerrar(id);
  }

  // Iniciar evaluacion (cerrado -> en_evaluacion)
  @Post(':id/iniciar-evaluacion')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('id')
  async iniciarEvaluacion(@Param('id', ParseIntPipe) id: number) {
    return this.concursoService.iniciarEvaluacion(id);
  }

  // Finalizar concurso (en_evaluacion -> finalizado)
  @Post(':id/finalizar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('id')
  async finalizar(@Param('id', ParseIntPipe) id: number) {
    return this.concursoService.finalizar(id);
  }

  // --- Responsables ---

  // Listar responsables de un concurso
  @Get(':id/responsables')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('id')
  async findResponsables(@Param('id', ParseIntPipe) id: number) {
    return this.concursoService.findResponsables(id);
  }

  // Asignar responsable a un concurso (solo admin)
  @Post(':id/responsables')
  @Roles(RolUsuario.ADMINISTRADOR)
  @CheckConcurso('id')
  @HttpCode(HttpStatus.CREATED)
  async addResponsable(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { usuarioId: number },
  ) {
    const dto = assignResponsableSchema.parse(body);
    return this.concursoService.addResponsable(id, dto.usuarioId);
  }

  // Remover responsable de un concurso (solo admin)
  @Delete(':id/responsables/:userId')
  @Roles(RolUsuario.ADMINISTRADOR)
  @CheckConcurso('id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeResponsable(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    await this.concursoService.removeResponsable(id, userId);
  }

  // --- Evaluadores ---

  // listar evaluadores asignados al concurso
  @Get(':id/evaluadores')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('id')
  async findEvaluadores(@Param('id', ParseIntPipe) id: number) {
    return this.concursoService.findEvaluadores(id);
  }

  // asignar evaluador al concurso
  @Post(':id/evaluadores')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('id')
  @HttpCode(HttpStatus.CREATED)
  async addEvaluador(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { evaluadorId: number },
    @CurrentUser() user: AuthUser,
  ) {
    const dto = assignEvaluadorSchema.parse(body);
    return this.concursoService.addEvaluador(id, dto.evaluadorId, user.id);
  }

  // remover evaluador del concurso
  @Delete(':id/evaluadores/:evaluadorId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeEvaluador(
    @Param('id', ParseIntPipe) id: number,
    @Param('evaluadorId', ParseIntPipe) evaluadorId: number,
  ) {
    await this.concursoService.removeEvaluador(id, evaluadorId);
  }
}
