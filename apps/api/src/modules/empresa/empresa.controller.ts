import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  RolUsuario,
  createEmpresaSchema,
  updateEmpresaSchema,
  listEmpresasQuerySchema,
} from '@superstars/shared';
import type { AuthUser, CreateEmpresaDto, UpdateEmpresaDto } from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EmpresaService } from './empresa.service';

@Controller('empresas')
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  // Proponente: obtener mi empresa
  @Get('me')
  @Roles(RolUsuario.PROPONENTE)
  async getMyEmpresa(@CurrentUser() user: AuthUser) {
    return this.empresaService.getMyEmpresa(user.id);
  }

  // Proponente: crear mi empresa
  @Post()
  @Roles(RolUsuario.PROPONENTE)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: CreateEmpresaDto,
    @CurrentUser() user: AuthUser,
  ) {
    const dto = createEmpresaSchema.parse(body);
    return this.empresaService.create(dto, user.id);
  }

  // Proponente: actualizar mi empresa
  @Patch('me')
  @Roles(RolUsuario.PROPONENTE)
  async updateMyEmpresa(
    @Body() body: UpdateEmpresaDto,
    @CurrentUser() user: AuthUser,
  ) {
    const dto = updateEmpresaSchema.parse(body);
    return this.empresaService.updateMyEmpresa(dto, user.id);
  }

  // Admin: listar todas las empresas
  @Get()
  @Roles(RolUsuario.ADMINISTRADOR)
  async findAll(@Query() rawQuery: Record<string, string>) {
    const query = listEmpresasQuerySchema.parse(rawQuery);
    return this.empresaService.findAll(query);
  }

  // Admin: obtener empresa por ID
  @Get(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.empresaService.findById(id);
  }
}
