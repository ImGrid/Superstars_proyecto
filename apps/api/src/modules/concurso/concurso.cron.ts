import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConcursoRepository } from './concurso.repository';

@Injectable()
export class ConcursoCron {
  private readonly logger = new Logger(ConcursoCron.name);

  constructor(private readonly concursoRepo: ConcursoRepository) {}

  // cada hora: cerrar concursos publicados cuya fecha de cierre ya paso
  @Cron(CronExpression.EVERY_HOUR)
  async handleCerrarVencidos(): Promise<void> {
    const cerrados = await this.concursoRepo.cerrarVencidos();
    if (cerrados > 0) {
      this.logger.log(`Auto-cerrados ${cerrados} concursos vencidos`);
    }
  }
}
