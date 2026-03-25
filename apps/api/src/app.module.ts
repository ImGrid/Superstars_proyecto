import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ZodValidationPipe } from 'nestjs-zod';
import { validate, appConfig, databaseConfig, jwtConfig } from './config';
import { DrizzleModule } from './database/drizzle.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AuthModule } from './modules/auth/auth.module';
import { UsuarioModule } from './modules/usuario/usuario.module';
import { EmpresaModule } from './modules/empresa/empresa.module';
import { ConcursoModule } from './modules/concurso/concurso.module';
import { FormularioModule } from './modules/formulario/formulario.module';
import { DocumentoModule } from './modules/documento/documento.module';
import { PostulacionModule } from './modules/postulacion/postulacion.module';
import { StorageModule } from './modules/storage/storage.module';
import { ArchivoModule } from './modules/archivo/archivo.module';
import { RubricaModule } from './modules/rubrica/rubrica.module';
import { PublicacionModule } from './modules/publicacion/publicacion.module';
import { PublicModule } from './modules/public/public.module';
import { EvaluacionModule } from './modules/evaluacion/evaluacion.module';
import { FaqModule } from './modules/faq/faq.module';

@Module({
  imports: [
    // Config global con validacion Zod
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      load: [appConfig, databaseConfig, jwtConfig],
      envFilePath: '.env',
    }),

    // Base de datos
    DrizzleModule,

    // Tareas programadas (cron cleanup de tokens)
    ScheduleModule.forRoot(),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60000),
            limit: config.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),

    // Autenticacion y autorizacion
    AuthModule,

    // Gestion de usuarios
    UsuarioModule,

    // Gestion de empresas
    EmpresaModule,

    // Gestion de concursos
    ConcursoModule,

    // Formularios dinamicos (sub-recurso de concurso)
    FormularioModule,

    // Documentos del concurso (bases, guias, plantillas)
    DocumentoModule,

    // Postulaciones de empresas
    PostulacionModule,

    // Almacenamiento de archivos (global)
    StorageModule,

    // Archivos de postulaciones
    ArchivoModule,

    // Rubrica de evaluacion (criterios, sub-criterios, niveles)
    RubricaModule,

    // Publicaciones (noticias, historias)
    PublicacionModule,

    // Evaluacion (calificacion de postulaciones por jurados)
    EvaluacionModule,

    // Preguntas frecuentes (FAQ configurable)
    FaqModule,

    // Endpoints publicos (sin autenticacion)
    PublicModule,
  ],
  providers: [
    // Validacion global con Zod (nestjs-zod)
    { provide: APP_PIPE, useClass: ZodValidationPipe },

    // Formato consistente de errores
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
