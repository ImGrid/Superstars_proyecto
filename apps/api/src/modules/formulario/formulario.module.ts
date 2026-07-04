import { Module } from '@nestjs/common';
import { ConvocatoriaModule } from '../convocatoria/convocatoria.module';
import { CategoriaModule } from '../categoria/categoria.module';
import { FormularioController } from './formulario.controller';
import { FormularioService } from './formulario.service';
import { FormularioRepository } from './formulario.repository';

@Module({
  imports: [ConvocatoriaModule, CategoriaModule],
  controllers: [FormularioController],
  providers: [FormularioService, FormularioRepository],
  exports: [FormularioService],
})
export class FormularioModule {}
