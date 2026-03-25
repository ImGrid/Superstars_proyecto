import { Module } from '@nestjs/common';
import { PostulacionModule } from '../postulacion/postulacion.module';
import { FormularioModule } from '../formulario/formulario.module';
import { ConcursoModule } from '../concurso/concurso.module';
import { ArchivoController } from './archivo.controller';
import { ArchivoService } from './archivo.service';
import { ArchivoRepository } from './archivo.repository';
import { EvaluacionRepository } from '../evaluacion/evaluacion.repository';

@Module({
  imports: [PostulacionModule, FormularioModule, ConcursoModule],
  controllers: [ArchivoController],
  providers: [ArchivoService, ArchivoRepository, EvaluacionRepository],
  exports: [ArchivoService],
})
export class ArchivoModule {}
