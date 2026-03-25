import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Body,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { RolUsuario } from '@superstars/shared';
import type { AuthUser } from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ArchivoService } from './archivo.service';

@Controller('concursos/:concursoId/postulaciones/:postulacionId/archivos')
export class ArchivoController {
  constructor(private readonly archivoService: ArchivoService) {}

  // Subir archivo (proponente, multipart/form-data)
  @Post()
  @Roles(RolUsuario.PROPONENTE)
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 20 * 1024 * 1024 },
  }))
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
    @Body('fieldId') fieldId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('No se envio ningun archivo');
    }
    if (!fieldId) {
      throw new BadRequestException('El campo fieldId es requerido');
    }

    return this.archivoService.upload(postulacionId, user.id, fieldId, {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    });
  }

  // Listar archivos de una postulacion (proponente solo su propia postulacion)
  @Get()
  @Roles(RolUsuario.PROPONENTE, RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO, RolUsuario.EVALUADOR)
  async findAll(
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.archivoService.findAllByPostulacion(postulacionId, user.id, user.rol);
  }

  // Descargar archivo
  @Get(':archivoId/download')
  @Roles(RolUsuario.PROPONENTE, RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONCURSO, RolUsuario.EVALUADOR)
  async download(
    @Param('archivoId', ParseIntPipe) archivoId: number,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const { buffer, mimeType, nombreOriginal } = await this.archivoService.download(
      archivoId, user.id, user.rol,
    );

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(nombreOriginal)}"`,
      'Content-Length': buffer.length.toString(),
    });
    res.send(buffer);
  }

  // Eliminar archivo (proponente, solo en borrador/observado)
  @Delete(':archivoId')
  @Roles(RolUsuario.PROPONENTE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('archivoId', ParseIntPipe) archivoId: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.archivoService.remove(archivoId, user.id);
  }
}
