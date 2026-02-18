import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL, PoolProvider, DrizzleProvider, DRIZZLE } from './drizzle.provider';

@Global()
@Module({
  providers: [PoolProvider, DrizzleProvider],
  exports: [DRIZZLE],
})
export class DrizzleModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
