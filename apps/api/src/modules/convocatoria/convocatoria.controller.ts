import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  RolUsuario,
  createConvocatoriaSchema,
  updateConvocatoriaSchema,
  updateFechasConvocatoriaSchema,
  listConvocatoriasQuerySchema,
  assignResponsableSchema,
  seleccionarGanadoresSchema,
} from '@superstars/shared';
import type { AuthUser, CreateConvocatoriaDto, UpdateConvocatoriaDto, UpdateFechasConvocatoriaDto, SeleccionarGanadoresDto } from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CheckConvocatoria } from './decorators/check-convocatoria.decorator';
import { ConvocatoriaService } from './convocatoria.service';
import { IMAGE_PUBLIC_CACHE_HEADERS } from '../../common/constants/image.constants';

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

  // Seleccionar ganadores de una categoria (la convocatoria avanza a
  // resultados_listos cuando TODAS sus categorias quedan resueltas)
  @Post(':id/categorias/:categoriaId/seleccionar-ganadores')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('id')
  async seleccionarGanadores(
    @Param('id', ParseIntPipe) id: number,
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
    @Body() body: SeleccionarGanadoresDto,
  ) {
    const dto = seleccionarGanadoresSchema.parse(body);
    return this.convocatoriaService.seleccionarGanadores(id, categoriaId, dto);
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

  // Nota: el pool de evaluadores se gestiona por categoria (ver CategoriaController).

  // Ranking de postulaciones de una categoria (admin/responsable)
  @Get(':id/categorias/:categoriaId/ranking')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('id')
  async getRanking(
    @Param('id', ParseIntPipe) id: number,
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
  ) {
    return this.convocatoriaService.getRankingCategoria(id, categoriaId);
  }

  // --- Imagen de portada ---
  // Se permite cambiar/eliminar la imagen en cualquier estado (incluso publicada
  // o finalizada): es solo presentacion visual y no compromete las reglas del concurso.

  // Servir imagen de portada (publico, sin autenticacion)
  // El navegador la usa directamente como src de <img>, por eso responde el binario
  @Get(':id/imagen')
  @Public()
  async getImagen(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { buffer, mimeType } = await this.convocatoriaService.downloadImagen(id);
    res.set({
      'Content-Type': mimeType,
      ...IMAGE_PUBLIC_CACHE_HEADERS,
    });
    res.send(buffer);
  }

  // Subir o reemplazar la imagen de portada (admin o responsable de la convocatoria)
  @Post(':id/imagen')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('id')
  @UseInterceptors(FileInterceptor('imagen'))
  async uploadImagen(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.convocatoriaService.uploadImagen(id, file);
  }

  // Eliminar la imagen de portada (admin o responsable de la convocatoria)
  @Delete(':id/imagen')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('id')
  async removeImagen(@Param('id', ParseIntPipe) id: number) {
    return this.convocatoriaService.removeImagen(id);
  }
}
