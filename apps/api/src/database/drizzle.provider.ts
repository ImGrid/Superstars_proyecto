import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@superstars/db';

export const DRIZZLE = Symbol('drizzle-connection');
export const PG_POOL = Symbol('pg-pool');

export type DrizzleDB = NodePgDatabase<typeof schema>;

export const PoolProvider: Provider = {
  provide: PG_POOL,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Pool => {
    return new Pool({
      host: config.get<string>('database.host'),
      port: config.get<number>('database.port'),
      user: config.get<string>('database.username'),
      password: config.get<string>('database.password'),
      database: config.get<string>('database.name'),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  },
};

export const DrizzleProvider: Provider = {
  provide: DRIZZLE,
  inject: [PG_POOL],
  useFactory: (pool: Pool): DrizzleDB => {
    return drizzle(pool, {
      schema,
      logger: process.env.NODE_ENV !== 'production',
    });
  },
};
