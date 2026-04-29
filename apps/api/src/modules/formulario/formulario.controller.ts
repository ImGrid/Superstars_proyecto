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
  createFormularioSchema,
  updateFormularioSchema,
} from '@superstars/shared';
import type { CreateFormularioDto, UpdateFormularioDto, AuthUser } from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CheckConvocatoria } from '../convocatoria/decorators/check-convocatoria.decorator';
import { FormularioService } from './formulario.service';

@Controller('convocatorias/:convocatoriaId/formulario')
export class FormularioController {
  constructor(private readonly formularioService: FormularioService) {}

  // Obtener el formulario de la convocatoria
  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA, RolUsuario.PROPONENTE, RolUsuario.EVALUADOR)
  @CheckConvocatoria('convocatoriaId')
  async find(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.formularioService.findByConvocatoriaId(convocatoriaId, user);
  }

  // Crear formulario para la convocatoria (1:1)
  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Body() body: CreateFormularioDto,
  ) {
    const dto = createFormularioSchema.parse(body);
    return this.formularioService.create(convocatoriaId, dto);
  }

  // Actualizar formulario (solo en borrador, optimistic locking por version)
  @Put()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  async update(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Body() body: UpdateFormularioDto,
  ) {
    const dto = updateFormularioSchema.parse(body);
    return this.formularioService.update(convocatoriaId, dto);
  }

  // Eliminar formulario (solo en borrador)
  @Delete()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('convocatoriaId', ParseIntPipe) convocatoriaId: number) {
    await this.formularioService.delete(convocatoriaId);
  }
}
