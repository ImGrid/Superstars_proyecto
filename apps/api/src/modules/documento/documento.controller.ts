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
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { RolUsuario, createDocumentoSchema, updateDocumentoSchema } from '@superstars/shared';
import type { UpdateDocumentoDto, AuthUser } from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CheckConvocatoria } from '../convocatoria/decorators/check-convocatoria.decorator';
import { DocumentoService } from './documento.service';

// Documentos por categoria. Ruta anidada: convocatoria (guard de propiedad) + categoria (recurso).
@Controller('convocatorias/:convocatoriaId/categorias/:categoriaId/documentos')
export class DocumentoController {
  constructor(private readonly documentoService: DocumentoService) {}

  // Subir documento (multipart: "file" + "nombre" + "orden"? + "proposito"?)
  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 20 * 1024 * 1024 },
  }))
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
    @Body('nombre') nombre: string,
    @Body('orden') orden: string | undefined,
    @Body('proposito') proposito: string | undefined,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se envió ningún archivo');
    }

    const dto = createDocumentoSchema.parse({
      nombre: typeof nombre === 'string' ? nombre.trim() : nombre,
      orden: orden !== undefined ? Number(orden) : undefined,
      proposito,
    });

    return this.documentoService.upload(convocatoriaId, categoriaId, dto, {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    });
  }

  // Listar documentos de la categoria (service filtra por audiencia segun rol)
  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA, RolUsuario.PROPONENTE, RolUsuario.EVALUADOR)
  async findAll(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentoService.findAllByCategoria(convocatoriaId, categoriaId, user);
  }

  // Descargar documento (service valida acceso por proposito)
  @Get(':id/download')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA, RolUsuario.PROPONENTE, RolUsuario.EVALUADOR)
  async download(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const { buffer, mimeType, nombreOriginal } = await this.documentoService.download(
      id, convocatoriaId, categoriaId, user,
    );

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(nombreOriginal)}"`,
      'Content-Length': buffer.length.toString(),
    });
    res.send(buffer);
  }

  // Actualizar metadatos (nombre, orden, proposito) - JSON body
  @Put(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  async update(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateDocumentoDto,
  ) {
    const dto = updateDocumentoSchema.parse(body);
    return this.documentoService.update(id, convocatoriaId, categoriaId, dto);
  }

  // Eliminar documento + archivo fisico
  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA)
  @CheckConvocatoria('convocatoriaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('categoriaId', ParseIntPipe) categoriaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.documentoService.delete(id, convocatoriaId, categoriaId);
  }
}
