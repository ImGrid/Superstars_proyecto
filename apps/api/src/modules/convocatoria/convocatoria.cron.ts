import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConvocatoriaRepository } from './convocatoria.repository';

@Injectable()
export class ConvocatoriaCron {
  private readonly logger = new Logger(ConvocatoriaCron.name);

  constructor(private readonly convocatoriaRepo: ConvocatoriaRepository) {}

  // cada hora: cerrar convocatorias publicadas cuya fecha de cierre ya paso
  @Cron(CronExpression.EVERY_HOUR)
  async handleCerrarVencidos(): Promise<void> {
    const cerrados = await this.convocatoriaRepo.cerrarVencidos();
    if (cerrados > 0) {
      this.logger.log(`Auto-cerradas ${cerrados} convocatorias vencidas`);
    }
  }
}
