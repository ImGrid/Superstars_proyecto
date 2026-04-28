import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().positive().default(3000),
  CORS_ORIGINS: z.string().default('http://localhost:3001'),
  COOKIE_SECRET: z.string().min(16),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().positive().default(5432),
  DB_USERNAME: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),

  PASSWORD_PEPPER: z.string().min(32),

  SESSION_ABSOLUTE_LIFETIME: z.string().default('30d'),
  MAX_SESSIONS_PER_USER: z.coerce.number().positive().default(5),

  THROTTLE_TTL: z.coerce.number().default(60000),
  THROTTLE_LIMIT: z.coerce.number().default(100),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().positive().default(465),
  // z.coerce.boolean trata cualquier string no vacio como true (incluido "false")
  // por usar Boolean() de JS — issue oficial #5501 de Zod. Parseamos explicitamente
  SMTP_SECURE: z.enum(['true', 'false']).transform((v) => v === 'true').default('true'),
  SMTP_USER: z.string().email(),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_FROM: z.string().min(1),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`\nENVIRONMENT VALIDATION FAILED:\n${errors}\n`);
  }
  return result.data;
}
