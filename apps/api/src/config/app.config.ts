import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT!, 10) || 3000,
  corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3001',
  cookieSecret: process.env.COOKIE_SECRET!,
}));
