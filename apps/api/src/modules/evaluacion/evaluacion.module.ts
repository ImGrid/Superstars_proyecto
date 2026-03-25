import { Module } from '@nestjs/common';
import { ConcursoModule } from '../concurso/concurso.module';
import { EvaluacionEvaluadorController, EvaluacionResponsableController, AsignacionEvaluadorController } from './evaluacion.controller';
import { EvaluacionService } from './evaluacion.service';
import { EvaluacionRepository } from './evaluacion.repository';

@Module({
  imports: [ConcursoModule],
  controllers: [EvaluacionEvaluadorController, EvaluacionResponsableController, AsignacionEvaluadorController],
  providers: [EvaluacionService, EvaluacionRepository],
  exports: [EvaluacionService],
})
export class EvaluacionModule {}
