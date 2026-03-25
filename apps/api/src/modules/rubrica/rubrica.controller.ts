import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  RolUsuario,
  createRubricaSchema,
  updateRubricaSchema,
  createCriterioSchema,
  updateCriterioSchema,
  createSubCriterioConNivelesSchema,
  updateSubCriterioSchema,
  updateNivelEvaluacionSchema,
} from '@superstars/shared';
import type {
  CreateRubricaDto,
  UpdateRubricaDto,
  CreateCriterioDto,
  UpdateCriterioDto,
  CreateSubCriterioConNivelesDto,
  UpdateSubCriterioDto,
  UpdateNivelEvaluacionDto,
} from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CheckConcurso } from '../concurso/decorators/check-concurso.decorator';
import { RubricaService } from './rubrica.service';

@Controller('concursos/:concursoId/rubrica')
export class RubricaController {
  constructor(private readonly rubricaService: RubricaService) {}

  // === RUBRICA (1:1 con concurso) ===

  // Obtener rubrica con arbol completo (criterios + sub-criterios + niveles)
  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO, RolUsuario.EVALUADOR)
  @CheckConcurso('concursoId')
  async find(@Param('concursoId', ParseIntPipe) concursoId: number) {
    return this.rubricaService.findByConcurso(concursoId);
  }

  // Crear rubrica para el concurso
  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @Body() body: CreateRubricaDto,
  ) {
    const dto = createRubricaSchema.parse(body);
    return this.rubricaService.create(concursoId, dto);
  }

  // Actualizar rubrica (nombre, descripcion, puntajeTotal)
  @Put()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  async update(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @Body() body: UpdateRubricaDto,
  ) {
    const dto = updateRubricaSchema.parse(body);
    return this.rubricaService.updateRubrica(concursoId, dto);
  }

  // Eliminar rubrica (cascade elimina criterios, sub-criterios, niveles)
  @Delete()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRubrica(@Param('concursoId', ParseIntPipe) concursoId: number) {
    await this.rubricaService.deleteRubrica(concursoId);
  }

  // === CRITERIOS ===

  // Crear criterio dentro de la rubrica
  @Post('criterios')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  @HttpCode(HttpStatus.CREATED)
  async createCriterio(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @Body() body: CreateCriterioDto,
  ) {
    const dto = createCriterioSchema.parse(body);
    return this.rubricaService.createCriterio(concursoId, dto);
  }

  // Actualizar criterio
  @Put('criterios/:criterioId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  async updateCriterio(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @Param('criterioId', ParseIntPipe) criterioId: number,
    @Body() body: UpdateCriterioDto,
  ) {
    const dto = updateCriterioSchema.parse(body);
    return this.rubricaService.updateCriterio(concursoId, criterioId, dto);
  }

  // Eliminar criterio (cascade elimina sub-criterios y niveles)
  @Delete('criterios/:criterioId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCriterio(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @Param('criterioId', ParseIntPipe) criterioId: number,
  ) {
    await this.rubricaService.deleteCriterio(concursoId, criterioId);
  }

  // === SUB-CRITERIOS (flat, criterioId en body) ===

  // Crear sub-criterio con 3 niveles atomicamente
  @Post('sub-criterios')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  @HttpCode(HttpStatus.CREATED)
  async createSubCriterio(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @Body() body: CreateSubCriterioConNivelesDto,
  ) {
    const dto = createSubCriterioConNivelesSchema.parse(body);
    return this.rubricaService.createSubCriterioConNiveles(concursoId, dto);
  }

  // Actualizar sub-criterio (solo campos del sub-criterio, no niveles)
  @Put('sub-criterios/:subCriterioId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  async updateSubCriterio(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @Param('subCriterioId', ParseIntPipe) subCriterioId: number,
    @Body() body: UpdateSubCriterioDto,
  ) {
    const dto = updateSubCriterioSchema.parse(body);
    return this.rubricaService.updateSubCriterio(concursoId, subCriterioId, dto);
  }

  // Eliminar sub-criterio (cascade elimina niveles)
  @Delete('sub-criterios/:subCriterioId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSubCriterio(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @Param('subCriterioId', ParseIntPipe) subCriterioId: number,
  ) {
    await this.rubricaService.deleteSubCriterio(concursoId, subCriterioId);
  }

  // === NIVELES (flat, actualizacion/eliminacion individual) ===

  // Actualizar nivel individual (descripcion, puntajeMin, puntajeMax — NO nivel)
  @Put('niveles/:nivelId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  async updateNivel(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @Param('nivelId', ParseIntPipe) nivelId: number,
    @Body() body: UpdateNivelEvaluacionDto,
  ) {
    const dto = updateNivelEvaluacionSchema.parse(body);
    return this.rubricaService.updateNivel(concursoId, nivelId, dto);
  }

  // Eliminar nivel individual
  @Delete('niveles/:nivelId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNivel(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @Param('nivelId', ParseIntPipe) nivelId: number,
  ) {
    await this.rubricaService.deleteNivel(concursoId, nivelId);
  }

  // === VALIDACION ===

  // Validar completitud de la rubrica (6 reglas cross-entity)
  @Get('validar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  async validar(@Param('concursoId', ParseIntPipe) concursoId: number) {
    return this.rubricaService.validar(concursoId);
  }
}
