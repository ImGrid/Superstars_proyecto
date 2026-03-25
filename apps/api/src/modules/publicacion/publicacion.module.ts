import { Module } from '@nestjs/common';
import { PublicacionController } from './publicacion.controller';
import { PublicacionService } from './publicacion.service';
import { PublicacionRepository } from './publicacion.repository';
import { PublicacionCron } from './publicacion.cron';

@Module({
  controllers: [PublicacionController],
  providers: [PublicacionService, PublicacionRepository, PublicacionCron],
  exports: [PublicacionService, PublicacionRepository],
})
export class PublicacionModule {}
