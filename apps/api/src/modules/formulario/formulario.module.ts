import { Module } from '@nestjs/common';
import { ConvocatoriaModule } from '../convocatoria/convocatoria.module';
import { FormularioController } from './formulario.controller';
import { FormularioService } from './formulario.service';
import { FormularioRepository } from './formulario.repository';

@Module({
  imports: [ConvocatoriaModule],
  controllers: [FormularioController],
  providers: [FormularioService, FormularioRepository],
  exports: [FormularioService],
})
export class FormularioModule {}
