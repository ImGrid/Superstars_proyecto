import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
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
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  RolUsuario,
  createHistoriaExitoSchema,
  updateHistoriaExitoSchema,
  toggleActivaHistoriaExitoSchema,
  reorderHistoriasExitoSchema,
  listHistoriasExitoQuerySchema,
} from '@superstars/shared';
import type {
  CreateHistoriaExitoDto,
  UpdateHistoriaExitoDto,
  ToggleActivaHistoriaExitoDto,
  ReorderHistoriasExitoDto,
} from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { HistoriaExitoService } from './historia-exito.service';

// --- Endpoints admin (solo administrador) ---
@Controller('historias-exito')
export class HistoriaExitoController {
  constructor(private readonly service: HistoriaExitoService) {}

  // Crear (multipart con imagen obligatoria)
  @Post()
  @Roles(RolUsuario.ADMINISTRADOR)
  @UseInterceptors(FileInterceptor('imagen'))
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: Record<string, unknown>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('La imagen es obligatoria');
    }
    const parsed = this.preprocessMultipartBody(body);
    const dto = createHistoriaExitoSchema.parse(parsed);
    return this.service.create(dto, file);
  }

  // Listar (paginado)
  @Get()
  @Roles(RolUsuario.ADMINISTRADOR)
  async findAll(@Query() rawQuery: Record<string, string>) {
    const query = listHistoriasExitoQuerySchema.parse(rawQuery);
    return this.service.findAll(query);
  }

  // Reordenar (PUT antes de :id para evitar colision)
  @Put('orden')
  @Roles(RolUsuario.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  async reorder(@Body() body: ReorderHistoriasExitoDto) {
    const dto = reorderHistoriasExitoSchema.parse(body);
    return this.service.reorder(dto);
  }

  // Servir imagen (publico, sin auth, con cache)
  @Get(':id/imagen')
  @Public()
  async getImagen(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { buffer, mimeType } = await this.service.downloadImagen(id);
    res.set({
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=86400',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    res.send(buffer);
  }

  // Detalle
  @Get(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  // Editar campos texto
  @Patch(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateHistoriaExitoDto,
  ) {
    const dto = updateHistoriaExitoSchema.parse(body);
    return this.service.update(id, dto);
  }

  // Cambiar imagen
  @Post(':id/imagen')
  @Roles(RolUsuario.ADMINISTRADOR)
  @UseInterceptors(FileInterceptor('imagen'))
  async cambiarImagen(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('La imagen es obligatoria');
    }
    return this.service.cambiarImagen(id, file);
  }

  // Activar / desactivar
  @Patch(':id/toggle-activa')
  @Roles(RolUsuario.ADMINISTRADOR)
  async toggleActiva(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ToggleActivaHistoriaExitoDto,
  ) {
    const dto = toggleActivaHistoriaExitoSchema.parse(body);
    return this.service.toggleActiva(id, dto);
  }

  // Eliminar
  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.service.delete(id);
  }

  // Convierte strings de multipart a tipos correctos antes del parse Zod
  private preprocessMultipartBody(body: Record<string, unknown>): Record<string, unknown> {
    const result = { ...body };

    // empresaId: "5" -> 5, "" -> undefined
    if (typeof result.empresaId === 'string') {
      const trimmed = (result.empresaId as string).trim();
      result.empresaId = trimmed === '' ? undefined : Number(trimmed);
    }

    // badge / empresaNombre: "" -> null para limpiar el campo
    if (typeof result.badge === 'string' && (result.badge as string).trim() === '') {
      result.badge = null;
    }
    if (typeof result.empresaNombre === 'string' && (result.empresaNombre as string).trim() === '') {
      result.empresaNombre = null;
    }

    return result;
  }
}

// --- Endpoint publico (lista para landing) ---
@Public()
@Controller('public/historias-exito')
export class HistoriaExitoPublicController {
  constructor(private readonly service: HistoriaExitoService) {}

  @Get()
  async findAll() {
    return this.service.findAllPublic();
  }
}
