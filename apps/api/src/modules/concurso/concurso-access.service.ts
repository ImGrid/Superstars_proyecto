import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConcursoRepository } from './concurso.repository';
import { EstadoConcurso } from '@superstars/shared';

@Injectable()
export class ConcursoAccessService {
  constructor(private readonly concursoRepo: ConcursoRepository) {}

  // Verifica si un usuario es responsable de un concurso
  async isResponsable(concursoId: number, usuarioId: number): Promise<boolean> {
    return this.concursoRepo.isResponsable(concursoId, usuarioId);
  }

  // Verifica si un usuario es evaluador asignado a un concurso
  async isEvaluador(concursoId: number, usuarioId: number): Promise<boolean> {
    return this.concursoRepo.isEvaluador(concursoId, usuarioId);
  }

  // Verifica que el concurso exista y este en estado borrador (editable)
  async verificarEditable(concursoId: number): Promise<void> {
    const estado = await this.concursoRepo.getEstado(concursoId);
    if (!estado) {
      throw new NotFoundException('Concurso no encontrado');
    }
    if (estado !== EstadoConcurso.BORRADOR) {
      throw new ConflictException(
        'El concurso no se puede modificar porque no esta en estado borrador',
      );
    }
  }
}
