import { Module } from '@nestjs/common';
import { CategoriaController } from './categoria.controller';
import { CategoriaService } from './categoria.service';
import { CategoriaRepository } from './categoria.repository';

// Modulo de categorias: CRUD + pool de evaluadores (nivel 1) + helpers de
// coherencia/pool que consumen otros modulos (formulario, rubrica, documento,
// postulacion, evaluacion). El guard @CheckConvocatoria es global (ConvocatoriaModule).
@Module({
  controllers: [CategoriaController],
  providers: [CategoriaService, CategoriaRepository],
  exports: [CategoriaService, CategoriaRepository],
})
export class CategoriaModule {}
