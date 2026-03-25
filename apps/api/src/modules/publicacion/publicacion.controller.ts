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
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { extname } from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  RolUsuario,
  createPublicacionSchema,
  updatePublicacionSchema,
  publicarPublicacionSchema,
  listPublicacionesQuerySchema,
} from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { PublicacionService } from './publicacion.service';

@Controller('publicaciones')
export class PublicacionController {
  constructor(private readonly publicacionService: PublicacionService) {}

  // --- CRUD ---

  // Crear publicacion (borrador), opcionalmente con imagen
  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @UseInterceptors(FileInterceptor('imagen'))
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: Record<string, unknown>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const parsed = this.preprocessMultipartBody(body);
    const dto = createPublicacionSchema.parse(parsed);
    const pub = await this.publicacionService.create(dto);

    if (file) {
      return this.publicacionService.uploadImagen(pub.id, file);
    }
    return pub;
  }

  // Listar publicaciones (admin/responsable)
  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  async findAll(@Query() rawQuery: Record<string, string>) {
    const query = listPublicacionesQuerySchema.parse(rawQuery);
    return this.publicacionService.findAll(query);
  }

  // --- Categorias (ANTES de :id para evitar conflicto de rutas) ---

  // Listar categorias
  @Get('categorias')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  async findAllCategorias() {
    return this.publicacionService.findAllCategorias();
  }

  // Crear categoria
  @Post('categorias')
  @Roles(RolUsuario.ADMINISTRADOR)
  @HttpCode(HttpStatus.CREATED)
  async createCategoria(@Body() body: { nombre: string }) {
    return this.publicacionService.createCategoria(body.nombre);
  }

  // Eliminar categoria
  @Delete('categorias/:catId')
  @Roles(RolUsuario.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategoria(@Param('catId', ParseIntPipe) catId: number) {
    await this.publicacionService.deleteCategoria(catId);
  }

  // Servir imagen de portada (publico, sin auth)
  @Get(':id/imagen')
  @Public()
  async getImagen(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { buffer, mimeType } = await this.publicacionService.downloadImagen(id);
    res.set({
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=86400',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    res.send(buffer);
  }

  // Obtener publicacion por ID
  @Get(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.publicacionService.findById(id);
  }

  // Actualizar publicacion (solo editable)
  @Patch(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
  ) {
    const dto = updatePublicacionSchema.parse(body);
    return this.publicacionService.update(id, dto);
  }

  // Eliminar publicacion
  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.publicacionService.delete(id);
  }

  // --- Transiciones de estado ---

  // Publicar o programar
  @Post(':id/publicar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  async publicar(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
  ) {
    const dto = publicarPublicacionSchema.parse(body);
    return this.publicacionService.publicarOProgramar(id, dto);
  }

  // Archivar publicacion
  @Post(':id/archivar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  async archivar(@Param('id', ParseIntPipe) id: number) {
    return this.publicacionService.archivar(id);
  }

  // Republicar publicacion (expirado -> publicado, archivado -> borrador)
  @Post(':id/republicar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  async republicar(@Param('id', ParseIntPipe) id: number) {
    return this.publicacionService.republicar(id);
  }

  // Cancelar programacion (programado -> borrador)
  @Post(':id/cancelar-programacion')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  async cancelarProgramacion(@Param('id', ParseIntPipe) id: number) {
    return this.publicacionService.cancelarProgramacion(id);
  }

  // --- Imagen de portada ---

  // Subir imagen
  @Post(':id/imagen')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @UseInterceptors(FileInterceptor('imagen'))
  async uploadImagen(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error('No se recibio archivo');
    }
    return this.publicacionService.uploadImagen(id, file);
  }

  // Eliminar imagen
  @Delete(':id/imagen')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  async removeImagen(@Param('id', ParseIntPipe) id: number) {
    return this.publicacionService.removeImagen(id);
  }

  // Convierte strings de multipart a tipos correctos
  private preprocessMultipartBody(body: Record<string, unknown>): Record<string, unknown> {
    const result = { ...body };

    // categoriaId: "5" -> 5, "" -> undefined
    if (typeof result.categoriaId === 'string') {
      const trimmed = (result.categoriaId as string).trim();
      result.categoriaId = trimmed === '' ? undefined : Number(trimmed);
    }

    // destacado: "true" -> true, "false" -> false
    if (typeof result.destacado === 'string') {
      result.destacado = result.destacado === 'true';
    }

    return result;
  }
}
