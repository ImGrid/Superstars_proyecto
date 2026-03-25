import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PublicacionRepository } from './publicacion.repository';

@Injectable()
export class PublicacionCron {
  private readonly logger = new Logger(PublicacionCron.name);

  constructor(private readonly publicacionRepo: PublicacionRepository) {}

  // Cada minuto: publicar programadas y expirar vencidas
  @Cron(CronExpression.EVERY_MINUTE)
  async handlePublicacionesCron(): Promise<void> {
    const published = await this.publicacionRepo.publicarProgramadas();
    if (published > 0) {
      this.logger.log(`Auto-publicadas ${published} publicaciones`);
    }

    const expired = await this.publicacionRepo.expirarVencidas();
    if (expired > 0) {
      this.logger.log(`Auto-expiradas ${expired} publicaciones`);
    }
  }
}
