import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  const port = config.get<number>('app.port', 3000);
  const isProduction = config.get<string>('app.nodeEnv') === 'production';

  // 0. Confiar en el proxy local (nginx) para resolver la IP del cliente.
  //
  // En produccion nginx corre en la misma maquina y reenvia a localhost con las
  // cabeceras X-Real-IP y X-Forwarded-For. Sin esto, Express las ignora y req.ip
  // vale 127.0.0.1 para TODAS las peticiones, con dos consecuencias reales:
  //   * la capa por IP del limite de intentos de acceso (AuthRateLimitGuard) y
  //     el limite global pasan a ser compartidos por todo el mundo: diez
  //     intentos fallidos de cualquiera bloquean al resto;
  //   * la auditoria de descargas de reportes guarda la IP de nginx en vez de
  //     la de quien descargo, y deja de servir para rastrear una filtracion.
  //
  // Se confia SOLO en loopback, no en cualquier cliente: con 'trust proxy' en
  // true, quien alcanzara el puerto del API directamente podria falsear su IP
  // mandando su propia cabecera X-Forwarded-For. El cortafuegos del VPS solo
  // expone 22, 80, 443 y 2224, asi que la unica via es el proxy local.
  app.set('trust proxy', 'loopback');

  // 1. Helmet (PRIMERO - headers de seguridad)
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
    }),
  );

  // 2. Cookie parser
  app.use(cookieParser(config.get<string>('app.cookieSecret')));

  // 3. CORS
  app.enableCors({
    origin: config
      .get<string>('app.corsOrigins', 'http://localhost:3001')
      .split(',')
      .map((o) => o.trim()),
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    // El navegador solo deja leer unas pocas cabeceras de una respuesta que
    // viene de otro origen. Content-Disposition trae el nombre del archivo en
    // las descargas (documentos, archivos de postulacion, reportes); sin
    // exponerla, el codigo del frontend no puede leerla y tiene que inventar
    // un nombre. En produccion el sitio y el API comparten dominio y no se
    // nota, pero en desarrollo, o si algun dia el API vive en otro dominio,
    // los archivos se descargarian con un nombre generico.
    exposedHeaders: ['Content-Disposition'],
    maxAge: 86400,
  });

  // 4. Prefijo global
  app.setGlobalPrefix('api');

  // 5. Shutdown hooks (CRITICO para cerrar pool de BD)
  app.enableShutdownHooks();

  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
}

bootstrap();
