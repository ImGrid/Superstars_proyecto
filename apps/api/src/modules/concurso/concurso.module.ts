import { Module, forwardRef } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConcursoController } from './concurso.controller';
import { ConcursoService } from './concurso.service';
import { ConcursoRepository } from './concurso.repository';
import { ConcursoAccessService } from './concurso-access.service';
import { ConcursoAccessGuard } from './guards/concurso-access.guard';
import { RubricaModule } from '../rubrica/rubrica.module';

@Module({
  imports: [forwardRef(() => RubricaModule)],
  controllers: [ConcursoController],
  providers: [
    ConcursoService,
    ConcursoRepository,
    ConcursoAccessService,
    // Guard global: solo actua en endpoints con @CheckConcurso()
    { provide: APP_GUARD, useClass: ConcursoAccessGuard },
  ],
  exports: [ConcursoService, ConcursoAccessService, ConcursoRepository],
})
export class ConcursoModule {}
