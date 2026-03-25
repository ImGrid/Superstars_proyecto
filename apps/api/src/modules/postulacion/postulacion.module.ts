import { Module } from '@nestjs/common';
import { ConcursoModule } from '../concurso/concurso.module';
import { FormularioModule } from '../formulario/formulario.module';
import { PostulacionController } from './postulacion.controller';
import { MisPostulacionesController } from './mis-postulaciones.controller';
import { AdminPostulacionesController } from './admin-postulaciones.controller';
import { PostulacionService } from './postulacion.service';
import { PostulacionRepository } from './postulacion.repository';

@Module({
  imports: [ConcursoModule, FormularioModule],
  controllers: [PostulacionController, MisPostulacionesController, AdminPostulacionesController],
  providers: [PostulacionService, PostulacionRepository],
  exports: [PostulacionService, PostulacionRepository],
})
export class PostulacionModule {}
