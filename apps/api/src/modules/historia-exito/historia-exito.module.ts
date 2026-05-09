import { Module } from '@nestjs/common';
import {
  HistoriaExitoController,
  HistoriaExitoPublicController,
} from './historia-exito.controller';
import { HistoriaExitoService } from './historia-exito.service';
import { HistoriaExitoRepository } from './historia-exito.repository';

@Module({
  controllers: [HistoriaExitoController, HistoriaExitoPublicController],
  providers: [HistoriaExitoService, HistoriaExitoRepository],
})
export class HistoriaExitoModule {}
