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
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { mkdir, unlink } from 'fs/promises';
import type { Request, Response } from 'express';
import { RolUsuario, ARCHIVO_POSTULACION_MAX_BYTES } from '@superstars/shared';
import type { AuthUser } from '@superstars/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CheckConvocatoria } from '../convocatoria/decorators/check-convocatoria.decorator';
import { STORAGE_TEMP_DIR } from '../storage/storage.constants';
import { corregirNombreArchivo } from '../../common/utils/nombre-archivo.util';
import { ArchivoService } from './archivo.service';

// El archivo se escribe a disco mientras sube, no se acumula en memoria: con el
// campo de video son hasta 100 MB por subida y el servidor tiene 4 GB de RAM
// compartidos con el otro sistema del VPS.
const almacenamientoEnDisco = diskStorage({
  destination: (_req, _file, cb) => {
    // Puede no existir en un despliegue nuevo o si alguien la borro
    mkdir(STORAGE_TEMP_DIR, { recursive: true })
      .then(() => cb(null, STORAGE_TEMP_DIR))
      .catch((err) => cb(err as Error, STORAGE_TEMP_DIR));
  },
  filename: (_req, file, cb) => {
    // Nombre neutro en disco; el nombre real del usuario se guarda en la BD
    cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
  },
});

@Controller('convocatorias/:convocatoriaId/postulaciones/:postulacionId/archivos')
export class ArchivoController {
  constructor(private readonly archivoService: ArchivoService) {}

  // Subir archivo (proponente, multipart/form-data)
  @Post()
  @Roles(RolUsuario.PROPONENTE)
  @UseInterceptors(FileInterceptor('file', {
    storage: almacenamientoEnDisco,
    limits: { fileSize: ARCHIVO_POSTULACION_MAX_BYTES },
  }))
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
    @Body('fieldId') fieldId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('No se envió ningún archivo');
    }
    if (!fieldId) {
      // multer ya dejo el temporal en disco: hay que borrarlo antes de cortar
      await unlink(file.path).catch(() => undefined);
      throw new BadRequestException('El campo fieldId es requerido');
    }

    return this.archivoService.upload(postulacionId, user.id, fieldId, {
      originalname: corregirNombreArchivo(file.originalname),
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
    });
  }

  // Listar archivos de una postulacion (proponente solo su propia postulacion)
  @Get()
  @Roles(RolUsuario.PROPONENTE, RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA, RolUsuario.EVALUADOR)
  @CheckConvocatoria('convocatoriaId')
  async findAll(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.archivoService.findAllByPostulacion(convocatoriaId, postulacionId, user.id, user.rol);
  }

  // Descargar archivo
  @Get(':archivoId/download')
  @Roles(RolUsuario.PROPONENTE, RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA, RolUsuario.EVALUADOR)
  @CheckConvocatoria('convocatoriaId')
  async download(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
    @Param('archivoId', ParseIntPipe) archivoId: number,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const archivo = await this.archivoService.obtenerParaEnvio(
      convocatoriaId, postulacionId, archivoId, user.id, user.rol,
    );
    this.enviarArchivo(req, res, archivo, 'attachment');
  }

  // Ver el archivo dentro del sistema (el jurado reproduce el video sin bajarlo).
  // Responde por rangos, que es lo que permite adelantar el video y lo que
  // necesitan los videos cuyo indice esta al final del archivo.
  @Get(':archivoId/ver')
  @Roles(RolUsuario.PROPONENTE, RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA, RolUsuario.EVALUADOR)
  @CheckConvocatoria('convocatoriaId')
  async ver(
    @Param('convocatoriaId', ParseIntPipe) convocatoriaId: number,
    @Param('postulacionId', ParseIntPipe) postulacionId: number,
    @Param('archivoId', ParseIntPipe) archivoId: number,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const archivo = await this.archivoService.obtenerParaEnvio(
      convocatoriaId, postulacionId, archivoId, user.id, user.rol,
    );
    // Solo se muestran en pantalla los formatos que el navegador reproduce.
    // El resto se fuerzan a descarga: un archivo desconocido mostrado en linea
    // es justo el caso peligroso.
    this.enviarArchivo(
      req,
      res,
      archivo,
      archivo.reproducible ? 'inline' : 'attachment',
    );
  }

  // Envia el archivo en flujo, atendiendo la cabecera Range si viene.
  // Nunca carga el archivo entero en memoria.
  private enviarArchivo(
    req: Request,
    res: Response,
    archivo: {
      storageKey: string;
      nombreOriginal: string;
      mimeType: string;
      size: number;
    },
    disposicion: 'inline' | 'attachment',
  ) {
    const { size } = archivo;
    const nombre = encodeURIComponent(archivo.nombreOriginal);

    const comunes = {
      'Content-Type': archivo.mimeType,
      'Content-Disposition': `${disposicion}; filename*=UTF-8''${nombre}`,
      // sin esto el navegador no pide trozos y no se puede adelantar el video
      'Accept-Ranges': 'bytes',
      // es contenido privado de una postulacion: que no quede en caches
      'Cache-Control': 'private, no-store',
    };

    const rango = this.parsearRango(req.headers.range, size);

    if (rango === 'invalido') {
      res.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE).set({
        'Content-Range': `bytes */${size}`,
      });
      res.end();
      return;
    }

    if (rango) {
      const largo = rango.fin - rango.inicio + 1;
      res.status(HttpStatus.PARTIAL_CONTENT).set({
        ...comunes,
        'Content-Range': `bytes ${rango.inicio}-${rango.fin}/${size}`,
        'Content-Length': largo.toString(),
      });
      this.archivoService.abrirFlujo(archivo.storageKey, rango).pipe(res);
      return;
    }

    res.status(HttpStatus.OK).set({
      ...comunes,
      'Content-Length': size.toString(),
    });
    this.archivoService.abrirFlujo(archivo.storageKey).pipe(res);
  }

  // Lee "bytes=inicio-fin". Devuelve null si no hay cabecera (se manda entero)
  // e 'invalido' si pide algo que no existe en el archivo.
  private parsearRango(
    cabecera: string | undefined,
    size: number,
  ): { inicio: number; fin: number } | 'invalido' | null {
    if (!cabecera) return null;

    const coincide = /^bytes=(\d*)-(\d*)$/.exec(cabecera.trim());
    if (!coincide) return 'invalido';

    const [, desde, hasta] = coincide;
    if (desde === '' && hasta === '') return 'invalido';

    let inicio: number;
    let fin: number;

    if (desde === '') {
      // "bytes=-500": los ultimos 500 bytes (asi piden el indice los videos
      // que lo llevan al final)
      const ultimos = Number(hasta);
      if (ultimos <= 0) return 'invalido';
      inicio = Math.max(0, size - ultimos);
      fin = size - 1;
    } else {
      inicio = Number(desde);
      fin = hasta === '' ? size - 1 : Number(hasta);
    }

    if (inicio >= size || fin < inicio) return 'invalido';
    // pedir mas alla del final no es error: se recorta
    return { inicio, fin: Math.min(fin, size - 1) };
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
