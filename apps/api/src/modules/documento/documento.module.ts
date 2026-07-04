import { Module } from '@nestjs/common';
import { ConvocatoriaModule } from '../convocatoria/convocatoria.module';
import { CategoriaModule } from '../categoria/categoria.module';
import { DocumentoController } from './documento.controller';
import { DocumentoService } from './documento.service';
import { DocumentoRepository } from './documento.repository';

@Module({
  imports: [ConvocatoriaModule, CategoriaModule],
  controllers: [DocumentoController],
  providers: [DocumentoService, DocumentoRepository],
  exports: [DocumentoService],
})
export class DocumentoModule {}
