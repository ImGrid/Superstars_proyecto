import { Module } from '@nestjs/common';
import { ConcursoModule } from '../concurso/concurso.module';
import { FormularioController } from './formulario.controller';
import { FormularioService } from './formulario.service';
import { FormularioRepository } from './formulario.repository';

@Module({
  imports: [ConcursoModule],
  controllers: [FormularioController],
  providers: [FormularioService, FormularioRepository],
  exports: [FormularioService],
})
export class FormularioModule {}
