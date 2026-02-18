import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  dbCredentials: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '12345',
    database: 'superstars_db',
    ssl: false,
  },
  out: './src/drizzle',
  schemaFilter: ['public'],
});
