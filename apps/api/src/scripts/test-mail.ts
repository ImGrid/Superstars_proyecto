// Script temporal para probar el envio de correo via MailService.
// Uso: cd apps/api && npx tsx src/scripts/test-mail.ts <email-destino>
// Ejemplo: cd apps/api && npx tsx src/scripts/test-mail.ts poncehar0331@gmail.com
//
// Importa solo NotificacionModule + ConfigModule para no levantar el servidor HTTP
// ni conectarse a PostgreSQL ni iniciar crons. Solo prueba la cadena de mail.

import { NestFactory } from '@nestjs/core';
import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { mailConfig } from '../config';
import { NotificacionModule } from '../modules/notificacion/notificacion.module';
import { MailService } from '../modules/notificacion/mail.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // No usamos validate() del proyecto porque requiere DB_*, JWT_*, etc.
      // que no nos interesan en este test. Solo validamos lo de mail aca.
      load: [mailConfig],
      envFilePath: '.env',
    }),
    NotificacionModule,
  ],
})
class TestMailModule {}

async function main(): Promise<void> {
  const logger = new Logger('TestMail');
  const to = process.argv[2];

  if (!to) {
    logger.error('Falta argumento. Uso: npx tsx src/scripts/test-mail.ts <email>');
    process.exit(1);
  }

  // Verificacion previa de las variables criticas
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'];
  const faltantes = required.filter((k) => !process.env[k]);
  if (faltantes.length > 0) {
    logger.error(`Variables faltantes en .env: ${faltantes.join(', ')}`);
    process.exit(1);
  }

  logger.log(`Bootstrap del contexto NestJS (sin HTTP)...`);
  const app = await NestFactory.createApplicationContext(TestMailModule, {
    logger: ['log', 'error', 'warn'],
  });

  const mailService = app.get(MailService);
  const codigoPrueba = '482915';
  const expiraEnMinutos = 15;

  logger.log(`Enviando correo de prueba a ${to} (codigo: ${codigoPrueba})...`);
  const inicio = Date.now();
  await mailService.sendVerificacionCodigo(to, codigoPrueba, expiraEnMinutos);
  const ms = Date.now() - inicio;

  logger.log(`Envio aceptado por el SMTP en ${ms}ms. Revisa la bandeja de ${to}.`);

  await app.close();
  process.exit(0);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`\nERROR durante el envio:\n  ${msg}\n`);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
