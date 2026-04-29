import { Module } from '@nestjs/common';
import { ConvocatoriaModule } from '../convocatoria/convocatoria.module';
import { EvaluacionEvaluadorController, EvaluacionResponsableController, AsignacionEvaluadorController } from './evaluacion.controller';
import { EvaluacionService } from './evaluacion.service';
import { EvaluacionRepository } from './evaluacion.repository';

@Module({
  imports: [ConvocatoriaModule],
  controllers: [EvaluacionEvaluadorController, EvaluacionResponsableController, AsignacionEvaluadorController],
  providers: [EvaluacionService, EvaluacionRepository],
  exports: [EvaluacionService],
})
export class EvaluacionModule {}
