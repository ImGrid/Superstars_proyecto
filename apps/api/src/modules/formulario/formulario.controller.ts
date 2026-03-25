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
import { CheckConcurso } from '../concurso/decorators/check-concurso.decorator';
import { FormularioService } from './formulario.service';

@Controller('concursos/:concursoId/formulario')
export class FormularioController {
  constructor(private readonly formularioService: FormularioService) {}

  // Obtener el formulario del concurso
  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO, RolUsuario.PROPONENTE, RolUsuario.EVALUADOR)
  @CheckConcurso('concursoId')
  async find(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.formularioService.findByConcursoId(concursoId, user);
  }

  // Crear formulario para el concurso (1:1)
  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @Body() body: CreateFormularioDto,
  ) {
    const dto = createFormularioSchema.parse(body);
    return this.formularioService.create(concursoId, dto);
  }

  // Actualizar formulario (solo en borrador, optimistic locking por version)
  @Put()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  async update(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @Body() body: UpdateFormularioDto,
  ) {
    const dto = updateFormularioSchema.parse(body);
    return this.formularioService.update(concursoId, dto);
  }

  // Eliminar formulario (solo en borrador)
  @Delete()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('concursoId', ParseIntPipe) concursoId: number) {
    await this.formularioService.delete(concursoId);
  }
}
