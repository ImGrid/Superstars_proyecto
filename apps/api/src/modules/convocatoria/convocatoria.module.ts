import { Module, forwardRef } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConvocatoriaController } from './convocatoria.controller';
import { ConvocatoriaService } from './convocatoria.service';
import { ConvocatoriaRepository } from './convocatoria.repository';
import { ConvocatoriaAccessService } from './convocatoria-access.service';
import { ConvocatoriaAccessGuard } from './guards/convocatoria-access.guard';
import { ConvocatoriaCron } from './convocatoria.cron';
import { RubricaModule } from '../rubrica/rubrica.module';

@Module({
  imports: [forwardRef(() => RubricaModule)],
  controllers: [ConvocatoriaController],
  providers: [
    ConvocatoriaService,
    ConvocatoriaRepository,
    ConvocatoriaAccessService,
    ConvocatoriaCron,
    // Guard global: solo actua en endpoints con @CheckConvocatoria()
    { provide: APP_GUARD, useClass: ConvocatoriaAccessGuard },
  ],
  exports: [ConvocatoriaService, ConvocatoriaAccessService, ConvocatoriaRepository],
})
export class ConvocatoriaModule {}
