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
  UploadedFile,
  UseInterceptors,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  RolUsuario,
  createEmpresaSchema,
  updateEmpresaSchema,
  listEmpresasQuerySchema,
} from '@superstars/shared';
import type { AuthUser, CreateEmpresaDto, UpdateEmpresaDto } from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IMAGE_PUBLIC_CACHE_HEADERS } from '../../common/constants/image.constants';
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

  // Proponente: subir/cambiar el logo de mi empresa
  @Post('me/logo')
  @Roles(RolUsuario.PROPONENTE)
  @UseInterceptors(FileInterceptor('logo'))
  async uploadMyLogo(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.empresaService.uploadLogo(user.id, file);
  }

  // Proponente: quitar el logo de mi empresa
  @Delete('me/logo')
  @Roles(RolUsuario.PROPONENTE)
  async removeMyLogo(@CurrentUser() user: AuthUser) {
    return this.empresaService.removeLogo(user.id);
  }

  // Admin: listar todas las empresas
  @Get()
  @Roles(RolUsuario.ADMINISTRADOR)
  async findAll(@Query() rawQuery: Record<string, string>) {
    const query = listEmpresasQuerySchema.parse(rawQuery);
    return this.empresaService.findAll(query);
  }

  // Publico: servir el logo de una empresa como binario (para usar en <img>).
  // Se sirve con cache de 24h; el logo no es informacion sensible.
  @Get(':id/logo')
  @Public()
  async getLogo(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { buffer, mimeType } = await this.empresaService.downloadLogo(id);
    res.set({ 'Content-Type': mimeType, ...IMAGE_PUBLIC_CACHE_HEADERS });
    res.send(buffer);
  }

  // Admin: obtener empresa por ID
  @Get(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.empresaService.findById(id);
  }
}
