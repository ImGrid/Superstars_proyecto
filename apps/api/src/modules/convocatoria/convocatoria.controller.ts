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
  createConvocatoriaSchema,
  updateConvocatoriaSchema,
  updateFechasConvocatoriaSchema,
  listConvocatoriasQuerySchema,
  assignResponsableSchema,
  assignEvaluadorSchema,
  seleccionarGanadoresSchema,
} from '@superstars/shared';
import type { AuthUser, CreateConvocatoriaDto, UpdateConvocatoriaDto, UpdateFechasConvocatoriaDto, SeleccionarGanadoresDto } from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CheckConvocatoria } from './decorators/check-convocatoria.decorator';
import { ConvocatoriaService } from './convocatoria.service';

@Controller('convocatorias')
export class ConvocatoriaController {
  constructor(private readonly convocatoriaService: ConvocatoriaService) {}

  // --- CRUD ---

  // Crear convocatoria (admin o responsable)
  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: CreateConvocatoriaDto,
    @CurrentUser() user: AuthUser,
  ) {
    const dto = createConvocatoriaSchema.parse(body);
    return this.convocatoriaService.create(dto, user);
  }

  // Listar convocatorias (admin ve todas, responsable asignadas, proponente solo publicadas)
  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA, RolUsuario.PROPONENTE)
  async findAll(
    @Query() rawQuery: Record<string, string>,
    @CurrentUser() user: AuthUser,
  ) {
    const query = listConvocatoriasQuerySchema.parse(rawQuery);
    return this.convocatoriaService.findAll(query, user);
  }

  // Resumen estadistico de convocatorias en evaluacion/resultados/finalizado (ANTES de :id para evitar colision)
  @Get('resumen-resultados')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  async getResumenResultados(@CurrentUser() user: AuthUser) {
    return this.convocatoriaService.getResumenResultados(user);
  }

  // Obtener convocatoria por ID (proponente solo ve publicadas)
  @Get(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA, RolUsuario.PROPONENTE)
  @CheckConvocatoria('id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.convocatoriaService.findById(id, user);
  }

  // Actualizar convocatoria (solo en borrador)
  @Patch(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateConvocatoriaDto,
  ) {
    const dto = updateConvocatoriaSchema.parse(body);
    return this.convocatoriaService.update(id, dto);
  }

  // Modificar fechas de convocatoria publicada (cierre efectiva + anuncio ganadores)
  @Patch(':id/fechas')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('id')
  async updateFechas(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateFechasConvocatoriaDto,
  ) {
    const dto = updateFechasConvocatoriaSchema.parse(body);
    return this.convocatoriaService.updateFechas(id, dto);
  }

  // Eliminar convocatoria (solo en borrador)
  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.convocatoriaService.delete(id);
  }

  // --- Transiciones de estado ---

  // Verificar si se puede publicar (devuelve lista de errores)
  @Get(':id/can-publicar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('id')
  async canPublicar(@Param('id', ParseIntPipe) id: number) {
    const errors = await this.convocatoriaService.canPublicar(id);
    return { canPublicar: errors.length === 0, errors };
  }

  // Publicar convocatoria (borrador -> publicado)
  @Post(':id/publicar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('id')
  async publicar(@Param('id', ParseIntPipe) id: number) {
    return this.convocatoriaService.publicar(id);
  }

  // Cerrar convocatoria (publicado -> cerrado)
  @Post(':id/cerrar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('id')
  async cerrar(@Param('id', ParseIntPipe) id: number) {
    return this.convocatoriaService.cerrar(id);
  }

  // Iniciar evaluacion (cerrado -> en_evaluacion)
  @Post(':id/iniciar-evaluacion')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('id')
  async iniciarEvaluacion(@Param('id', ParseIntPipe) id: number) {
    return this.convocatoriaService.iniciarEvaluacion(id);
  }

  // Seleccionar ganadores (en_evaluacion -> resultados_listos)
  @Post(':id/seleccionar-ganadores')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('id')
  async seleccionarGanadores(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SeleccionarGanadoresDto,
  ) {
    const dto = seleccionarGanadoresSchema.parse(body);
    return this.convocatoriaService.seleccionarGanadores(id, dto);
  }

  // Verificar si se puede publicar resultados
  @Get(':id/can-finalizar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('id')
  async canFinalizar(@Param('id', ParseIntPipe) id: number) {
    const errors = await this.convocatoriaService.canFinalizar(id);
    return { canFinalizar: errors.length === 0, errors };
  }

  // Publicar resultados (resultados_listos -> finalizado)
  @Post(':id/publicar-resultados')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('id')
  async publicarResultados(@Param('id', ParseIntPipe) id: number) {
    return this.convocatoriaService.publicarResultados(id);
  }

  // --- Responsables ---

  // Listar responsables de una convocatoria
  @Get(':id/responsables')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('id')
  async findResponsables(@Param('id', ParseIntPipe) id: number) {
    return this.convocatoriaService.findResponsables(id);
  }

  // Asignar responsable a una convocatoria (solo admin)
  @Post(':id/responsables')
  @Roles(RolUsuario.ADMINISTRADOR)
  @CheckConvocatoria('id')
  @HttpCode(HttpStatus.CREATED)
  async addResponsable(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { usuarioId: number },
  ) {
    const dto = assignResponsableSchema.parse(body);
    return this.convocatoriaService.addResponsable(id, dto.usuarioId);
  }

  // Remover responsable de una convocatoria (solo admin)
  @Delete(':id/responsables/:userId')
  @Roles(RolUsuario.ADMINISTRADOR)
  @CheckConvocatoria('id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeResponsable(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    await this.convocatoriaService.removeResponsable(id, userId);
  }

  // --- Evaluadores ---

  // listar evaluadores asignados a la convocatoria
  @Get(':id/evaluadores')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('id')
  async findEvaluadores(@Param('id', ParseIntPipe) id: number) {
    return this.convocatoriaService.findEvaluadores(id);
  }

  // asignar evaluador a la convocatoria
  @Post(':id/evaluadores')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('id')
  @HttpCode(HttpStatus.CREATED)
  async addEvaluador(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { evaluadorId: number },
    @CurrentUser() user: AuthUser,
  ) {
    const dto = assignEvaluadorSchema.parse(body);
    return this.convocatoriaService.addEvaluador(id, dto.evaluadorId, user.id);
  }

  // remover evaluador de la convocatoria
  @Delete(':id/evaluadores/:evaluadorId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeEvaluador(
    @Param('id', ParseIntPipe) id: number,
    @Param('evaluadorId', ParseIntPipe) evaluadorId: number,
  ) {
    await this.convocatoriaService.removeEvaluador(id, evaluadorId);
  }

  // Ranking de postulaciones de una convocatoria (admin/responsable)
  @Get(':id/ranking')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('id')
  async getRanking(@Param('id', ParseIntPipe) id: number) {
    return this.convocatoriaService.getRankingConvocatoria(id);
  }
}
