import { Module } from '@nestjs/common';
import { ConvocatoriaModule } from '../convocatoria/convocatoria.module';
import { DocumentoController } from './documento.controller';
import { DocumentoService } from './documento.service';
import { DocumentoRepository } from './documento.repository';

@Module({
  imports: [ConvocatoriaModule],
  controllers: [DocumentoController],
  providers: [DocumentoService, DocumentoRepository],
  exports: [DocumentoService],
})
export class DocumentoModule {}
