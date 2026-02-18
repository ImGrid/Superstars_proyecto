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
import type { ErrorResponse } from '../types';

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
        message: 'Error de validacion',
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
      const message =
        typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? ((exceptionResponse as Record<string, unknown>).message as string) ||
            exception.message
          : exception.message;

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
