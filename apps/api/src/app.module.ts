import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ZodValidationPipe } from 'nestjs-zod';
import { validate, appConfig, databaseConfig, jwtConfig, mailConfig } from './config';
import { DrizzleModule } from './database/drizzle.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AuthModule } from './modules/auth/auth.module';
import { UsuarioModule } from './modules/usuario/usuario.module';
import { EmpresaModule } from './modules/empresa/empresa.module';
import { ConvocatoriaModule } from './modules/convocatoria/convocatoria.module';
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
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificacionModule } from './modules/notificacion/notificacion.module';

@Module({
  imports: [
    // Config global con validacion Zod
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      load: [appConfig, databaseConfig, jwtConfig, mailConfig],
      envFilePath: '.env',
    }),

    // Base de datos
    DrizzleModule,

    // Tareas programadas (cron cleanup de tokens)
    ScheduleModule.forRoot(),

    // Rate limiting global por IP (limite generoso). Endpoints especificos
    // pueden aplicar guards custom (ej: AuthRateLimitGuard) con limites mas
    // estrictos por IP y por email.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('THROTTLE_TTL', 60000),
            limit: config.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),

    // Autenticacion y autorizacion
    AuthModule,

    // Envio de correos transaccionales (verificacion de cuenta, etc.)
    NotificacionModule,

    // Gestion de usuarios
    UsuarioModule,

    // Gestion de empresas
    EmpresaModule,

    // Gestion de convocatorias
    ConvocatoriaModule,

    // Formularios dinamicos (sub-recurso de convocatoria)
    FormularioModule,

    // Documentos de la convocatoria (bases, guias, plantillas)
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

    // Dashboards por rol (admin, responsable, evaluador)
    DashboardModule,

    // Endpoints publicos (sin autenticacion)
    PublicModule,
  ],
  providers: [
    // Validacion global con Zod (nestjs-zod)
    { provide: APP_PIPE, useClass: ZodValidationPipe },

    // Formato consistente de errores
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },

    // Rate limiting global. Cada endpoint puede sobrescribir limites con @Throttle
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
