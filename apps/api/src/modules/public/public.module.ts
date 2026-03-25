import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicPublicacionesController } from './public-publicaciones.controller';
import { PublicService } from './public.service';
import { PublicRepository } from './public.repository';

@Module({
  controllers: [PublicController, PublicPublicacionesController],
  providers: [PublicService, PublicRepository],
})
export class PublicModule {}
