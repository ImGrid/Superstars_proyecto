import { Module } from '@nestjs/common';
import { ConvocatoriaModule } from '../convocatoria/convocatoria.module';
import { CategoriaModule } from '../categoria/categoria.module';
import {
  EvaluacionEvaluadorController,
  EvaluacionResponsableController,
  RepartoEvaluadoresController,
  CierreEvaluacionController,
  AsignacionEvaluadorController,
} from './evaluacion.controller';
import { EvaluacionService } from './evaluacion.service';
import { EvaluacionRepository } from './evaluacion.repository';

@Module({
  imports: [ConvocatoriaModule, CategoriaModule],
  controllers: [
    EvaluacionEvaluadorController,
    EvaluacionResponsableController,
    RepartoEvaluadoresController,
    CierreEvaluacionController,
    AsignacionEvaluadorController,
  ],
  providers: [EvaluacionService, EvaluacionRepository],
  exports: [EvaluacionService],
})
export class EvaluacionModule {}
