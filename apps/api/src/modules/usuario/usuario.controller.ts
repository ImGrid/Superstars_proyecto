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
  createUsuarioSchema,
  updateUsuarioSchema,
  listUsuariosQuerySchema,
} from '@superstars/shared';
import type { AuthUser, CreateUsuarioDto, UpdateUsuarioDto } from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsuarioService } from './usuario.service';

@Controller('usuarios')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  // Perfil del usuario autenticado (cualquier rol)
  @Get('me')
  async getProfile(@CurrentUser() user: AuthUser) {
    return this.usuarioService.getProfile(user.id);
  }

  // Listar usuarios con paginacion y filtros (admin)
  @Get()
  @Roles(RolUsuario.ADMINISTRADOR)
  async findAll(@Query() rawQuery: Record<string, string>) {
    const query = listUsuariosQuerySchema.parse(rawQuery);
    return this.usuarioService.findAll(query);
  }

  // Obtener usuario por ID (admin)
  @Get(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.usuarioService.findById(id);
  }

  // Crear usuario (admin)
  @Post()
  @Roles(RolUsuario.ADMINISTRADOR)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateUsuarioDto) {
    const dto = createUsuarioSchema.parse(body);
    return this.usuarioService.create(dto);
  }

  // Actualizar usuario (admin)
  @Patch(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUsuarioDto,
    @CurrentUser() user: AuthUser,
  ) {
    const dto = updateUsuarioSchema.parse(body);
    return this.usuarioService.update(id, dto, user.id);
  }

  // Eliminar usuario (admin)
  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.usuarioService.delete(id, user.id);
  }
}
