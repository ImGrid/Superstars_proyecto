import { Module, forwardRef } from '@nestjs/common';
import { ConcursoModule } from '../concurso/concurso.module';
import { RubricaController } from './rubrica.controller';
import { RubricaService } from './rubrica.service';
import { RubricaRepository } from './rubrica.repository';

@Module({
  imports: [forwardRef(() => ConcursoModule)],
  controllers: [RubricaController],
  providers: [RubricaService, RubricaRepository],
  exports: [RubricaService],
})
export class RubricaModule {}
