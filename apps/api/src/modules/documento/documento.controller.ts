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
import { RolUsuario, updateDocumentoSchema } from '@superstars/shared';
import type { UpdateDocumentoDto, AuthUser } from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CheckConcurso } from '../concurso/decorators/check-concurso.decorator';
import { DocumentoService } from './documento.service';

@Controller('concursos/:concursoId/documentos')
export class DocumentoController {
  constructor(private readonly documentoService: DocumentoService) {}

  // Subir documento (multipart/form-data con campo "file" + "nombre" + "orden" opcional)
  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 20 * 1024 * 1024 },
  }))
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @Body('nombre') nombre: string,
    @Body('orden') orden: string | undefined,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se envio ningun archivo');
    }
    if (!nombre || nombre.trim().length === 0) {
      throw new BadRequestException('El campo nombre es requerido');
    }

    const dto = {
      nombre: nombre.trim(),
      orden: orden !== undefined ? Number(orden) : undefined,
    };

    return this.documentoService.upload(concursoId, dto, {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    });
  }

  // Listar documentos del concurso (service valida acceso por rol)
  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO, RolUsuario.PROPONENTE)
  async findAll(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentoService.findAllByConcurso(concursoId, user);
  }

  // Descargar documento (service valida acceso por rol)
  @Get(':id/download')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO, RolUsuario.PROPONENTE)
  async download(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const { buffer, mimeType, nombreOriginal } = await this.documentoService.download(
      id, concursoId, user,
    );

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(nombreOriginal)}"`,
      'Content-Length': buffer.length.toString(),
    });
    res.send(buffer);
  }

  // Actualizar metadatos (nombre, orden) - JSON body
  @Put(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  async update(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateDocumentoDto,
  ) {
    const dto = updateDocumentoSchema.parse(body);
    return this.documentoService.update(id, concursoId, dto);
  }

  // Eliminar documento + archivo fisico
  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO)
  @CheckConcurso('concursoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('concursoId', ParseIntPipe) concursoId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.documentoService.delete(id, concursoId);
  }
}
