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
import { CheckConvocatoria } from '../convocatoria/decorators/check-convocatoria.decorator';
import { RubricaService } from './rubrica.service';

@Controller('convocatorias/:convocatoriaId/rubrica')
export class RubricaController {
  constructor(private readonly rubricaService: RubricaService) {}

  // === RUBRICA (1:1 con convocatoria) ===

  // Obtener rubrica con arbol completo (criterios + sub-criterios + niveles)
  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA, RolUsuario.EVALUADOR)
  @CheckConvocatoria('convocatoriaId')
  async find(@Param('convocatoriaId', ParseIntPipe) convocatoriaId: number) {
    return this.rubricaService.findByConvocatoria(convocatoriaId);
  }

  // Crear rubrica para la convocatoria
  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Body() body: CreateRubricaDto,
  ) {
    const dto = createRubricaSchema.parse(body);
    return this.rubricaService.create(convocatoriaId, dto);
  }

  // Actualizar rubrica (nombre, descripcion, puntajeTotal)
  @Put()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  async update(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Body() body: UpdateRubricaDto,
  ) {
    const dto = updateRubricaSchema.parse(body);
    return this.rubricaService.updateRubrica(convocatoriaId, dto);
  }

  // Eliminar rubrica (cascade elimina criterios, sub-criterios, niveles)
  @Delete()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRubrica(@Param('convocatoriaId', ParseIntPipe) convocatoriaId: number) {
    await this.rubricaService.deleteRubrica(convocatoriaId);
  }

  // === CRITERIOS ===

  // Crear criterio dentro de la rubrica
  @Post('criterios')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.CREATED)
  async createCriterio(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Body() body: CreateCriterioDto,
  ) {
    const dto = createCriterioSchema.parse(body);
    return this.rubricaService.createCriterio(convocatoriaId, dto);
  }

  // Actualizar criterio
  @Put('criterios/:criterioId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  async updateCriterio(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('criterioId', ParseIntPipe) criterioId: number,
    @Body() body: UpdateCriterioDto,
  ) {
    const dto = updateCriterioSchema.parse(body);
    return this.rubricaService.updateCriterio(convocatoriaId, criterioId, dto);
  }

  // Eliminar criterio (cascade elimina sub-criterios y niveles)
  @Delete('criterios/:criterioId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCriterio(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('criterioId', ParseIntPipe) criterioId: number,
  ) {
    await this.rubricaService.deleteCriterio(convocatoriaId, criterioId);
  }

  // === SUB-CRITERIOS (flat, criterioId en body) ===

  // Crear sub-criterio con 3 niveles atomicamente
  @Post('sub-criterios')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.CREATED)
  async createSubCriterio(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Body() body: CreateSubCriterioConNivelesDto,
  ) {
    const dto = createSubCriterioConNivelesSchema.parse(body);
    return this.rubricaService.createSubCriterioConNiveles(convocatoriaId, dto);
  }

  // Actualizar sub-criterio (solo campos del sub-criterio, no niveles)
  @Put('sub-criterios/:subCriterioId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  async updateSubCriterio(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('subCriterioId', ParseIntPipe) subCriterioId: number,
    @Body() body: UpdateSubCriterioDto,
  ) {
    const dto = updateSubCriterioSchema.parse(body);
    return this.rubricaService.updateSubCriterio(convocatoriaId, subCriterioId, dto);
  }

  // Eliminar sub-criterio (cascade elimina niveles)
  @Delete('sub-criterios/:subCriterioId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSubCriterio(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('subCriterioId', ParseIntPipe) subCriterioId: number,
  ) {
    await this.rubricaService.deleteSubCriterio(convocatoriaId, subCriterioId);
  }

  // === NIVELES (flat, actualizacion/eliminacion individual) ===

  // Actualizar nivel individual (descripcion, puntajeMin, puntajeMax — NO nivel)
  @Put('niveles/:nivelId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  async updateNivel(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('nivelId', ParseIntPipe) nivelId: number,
    @Body() body: UpdateNivelEvaluacionDto,
  ) {
    const dto = updateNivelEvaluacionSchema.parse(body);
    return this.rubricaService.updateNivel(convocatoriaId, nivelId, dto);
  }

  // Eliminar nivel individual
  @Delete('niveles/:nivelId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNivel(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('nivelId', ParseIntPipe) nivelId: number,
  ) {
    await this.rubricaService.deleteNivel(convocatoriaId, nivelId);
  }

  // === VALIDACION ===

  // Validar completitud de la rubrica (6 reglas cross-entity)
  @Get('validar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  async validar(@Param('convocatoriaId', ParseIntPipe) convocatoriaId: number) {
    return this.rubricaService.validar(convocatoriaId);
  }
}
