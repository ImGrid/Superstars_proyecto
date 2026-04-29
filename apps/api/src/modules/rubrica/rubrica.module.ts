import { Module, forwardRef } from '@nestjs/common';
import { ConvocatoriaModule } from '../convocatoria/convocatoria.module';
import { RubricaController } from './rubrica.controller';
import { RubricaService } from './rubrica.service';
import { RubricaRepository } from './rubrica.repository';

@Module({
  imports: [forwardRef(() => ConvocatoriaModule)],
  controllers: [RubricaController],
  providers: [RubricaService, RubricaRepository],
  exports: [RubricaService],
})
export class RubricaModule {}
