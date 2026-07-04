import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  RolUsuario,
  createCategoriaSchema,
  updateCategoriaSchema,
  assignEvaluadorSchema,
} from '@superstars/shared';
import type { AuthUser, CreateCategoriaDto, UpdateCategoriaDto, AssignEvaluadorDto } from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CheckConvocatoria } from '../convocatoria/decorators/check-convocatoria.decorator';
import { CategoriaService } from './categoria.service';

// Las categorias cuelgan de la convocatoria. El guard @CheckConvocatoria valida
// la propiedad por convocatoriaId; el service valida la coherencia de la categoria.
@Controller('convocatorias/:convocatoriaId/categorias')
export class CategoriaController {
  constructor(private readonly categoriaService: CategoriaService) {}

  // --- CRUD ---

  // Listar categorias de la convocatoria
  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA, RolUsuario.PROPONENTE)
  @CheckConvocatoria('convocatoriaId')
  async findAll(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.categoriaService.findByConvocatoria(convocatoriaId, user);
  }

  // Crear categoria (solo en borrador)
  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Body() body: CreateCategoriaDto,
  ) {
    const dto = createCategoriaSchema.parse(body);
    return this.categoriaService.create(convocatoriaId, dto);
  }

  // Detalle de una categoria
  @Get(':categoriaId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA, RolUsuario.PROPONENTE)
  @CheckConvocatoria('convocatoriaId')
  async findOne(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.categoriaService.getOne(convocatoriaId, categoriaId, user);
  }

  // Actualizar categoria (solo en borrador)
  @Patch(':categoriaId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  async update(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
    @Body() body: UpdateCategoriaDto,
  ) {
    const dto = updateCategoriaSchema.parse(body);
    return this.categoriaService.update(convocatoriaId, categoriaId, dto);
  }

  // Eliminar categoria (solo en borrador)
  @Delete(':categoriaId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
  ) {
    await this.categoriaService.delete(convocatoriaId, categoriaId);
  }

  // --- Pool de evaluadores (nivel 1) ---

  // Listar evaluadores del pool de la categoria
  @Get(':categoriaId/evaluadores')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  async findEvaluadores(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
  ) {
    return this.categoriaService.findEvaluadores(convocatoriaId, categoriaId);
  }

  // Agregar evaluador al pool de la categoria
  @Post(':categoriaId/evaluadores')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.CREATED)
  async addEvaluador(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
    @Body() body: AssignEvaluadorDto,
    @CurrentUser() user: AuthUser,
  ) {
    const dto = assignEvaluadorSchema.parse(body);
    return this.categoriaService.addEvaluador(convocatoriaId, categoriaId, dto.evaluadorId, user.id);
  }

  // Remover evaluador del pool de la categoria
  @Delete(':categoriaId/evaluadores/:evaluadorId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeEvaluador(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
    @Param('evaluadorId', ParseIntPipe) evaluadorId: number,
  ) {
    await this.categoriaService.removeEvaluador(convocatoriaId, categoriaId, evaluadorId);
  }
}
