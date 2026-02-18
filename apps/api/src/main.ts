import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const port = config.get<number>('app.port', 3000);
  const isProduction = config.get<string>('app.nodeEnv') === 'production';

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
    allowedHeaders: ['Content-Type', 'Authorization'],
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
