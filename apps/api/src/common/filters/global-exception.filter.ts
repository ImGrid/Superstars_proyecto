import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { ARCHIVO_POSTULACION_MAX_MB } from '@superstars/shared';
import type { ErrorResponse } from '../types';

// Cuando multer corta una subida, @nestjs/platform-express ya la convirtio en
// una HttpException cuyo mensaje es una cadena fija en ingles (ver
// transformException y multerExceptions en ese paquete). Sin esto el postulante
// lee "File too large" y no entiende que su archivo pesa de mas.
//
// La clave es el mensaje en ingles tal como lo deja NestJS. Algunos llegan con
// " - <campo>" pegado al final, por eso tambien se compara por prefijo.
const MENSAJES_SUBIDA: Record<string, string> = {
  'File too large': `El archivo supera el tamaño máximo de ${ARCHIVO_POSTULACION_MAX_MB} MB. Suba un archivo más liviano.`,
  'Too many files': 'Se enviaron más archivos de los permitidos.',
  'Unexpected field': 'El archivo llegó en un campo que no se esperaba.',
  'Unexpected end of form': 'La subida se cortó antes de terminar. Vuelve a intentarlo.',
  'Unexpected end of file': 'La subida se cortó antes de terminar. Vuelve a intentarlo.',
};

// Traduce el mensaje de un corte de subida; null si no es uno de esos errores
function mensajeDeSubida(message: string): string | null {
  if (MENSAJES_SUBIDA[message]) return MENSAJES_SUBIDA[message];
  const porPrefijo = Object.keys(MENSAJES_SUBIDA).find((clave) =>
    message.startsWith(`${clave} - `),
  );
  return porPrefijo ? MENSAJES_SUBIDA[porPrefijo] : null;
}

// Formato consistente de errores + safety net para ZodError
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const timestamp = new Date().toISOString();
    const path = request.url;

    // Safety net: ZodError que escape del validation pipe
    if (exception instanceof ZodError) {
      const body: ErrorResponse = {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Error de validación',
        timestamp,
        path,
        errors: exception.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      };
      this.logger.warn(`${request.method} ${path} - 400: Error de validacion`);
      return response.status(HttpStatus.BAD_REQUEST).json(body);
    }

    // HttpException (built-in: NotFoundException, ConflictException, etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const mensajeOriginal =
        typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? ((exceptionResponse as Record<string, unknown>).message as string) ||
            exception.message
          : exception.message;
      // Los cortes de subida vienen con el texto en ingles de multer
      const message =
        (typeof mensajeOriginal === 'string'
          ? mensajeDeSubida(mensajeOriginal)
          : null) ?? mensajeOriginal;

      const body: ErrorResponse = {
        statusCode: status,
        message,
        timestamp,
        path,
        errors:
          typeof exceptionResponse === 'object' && exceptionResponse !== null
            ? ((exceptionResponse as Record<string, unknown>).errors as ErrorResponse['errors'])
            : undefined,
      };

      if (status >= 400 && status < 500) {
        this.logger.warn(`${request.method} ${path} - ${status}: ${message}`);
      }

      return response.status(status).json(body);
    }

    // Error desconocido: loguear internamente, responder generico
    this.logger.error(
      `${request.method} ${path} - 500`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
      timestamp,
      path,
    });
  }
}
