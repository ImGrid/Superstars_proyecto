import { Module } from '@nestjs/common';
import { ConcursoModule } from '../concurso/concurso.module';
import { DocumentoController } from './documento.controller';
import { DocumentoService } from './documento.service';
import { DocumentoRepository } from './documento.repository';

@Module({
  imports: [ConcursoModule],
  controllers: [DocumentoController],
  providers: [DocumentoService, DocumentoRepository],
  exports: [DocumentoService],
})
export class DocumentoModule {}
