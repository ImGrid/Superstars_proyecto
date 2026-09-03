import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT!, 10) || 3000,
  corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3001',
  cookieSecret: process.env.COOKIE_SECRET!,
  // ruta al Chrome que genera los PDF; sin ella solo se puede exportar a Excel
  chromePath: process.env.PUPPETEER_EXECUTABLE_PATH,
}));
