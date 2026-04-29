import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConvocatoriaRepository } from './convocatoria.repository';
import { EstadoConvocatoria } from '@superstars/shared';

@Injectable()
export class ConvocatoriaAccessService {
  constructor(private readonly convocatoriaRepo: ConvocatoriaRepository) {}

  // Verifica si un usuario es responsable de una convocatoria
  async isResponsable(convocatoriaId: number, usuarioId: number): Promise<boolean> {
    return this.convocatoriaRepo.isResponsable(convocatoriaId, usuarioId);
  }

  // Verifica si un usuario es evaluador asignado a una convocatoria
  async isEvaluador(convocatoriaId: number, usuarioId: number): Promise<boolean> {
    return this.convocatoriaRepo.isEvaluador(convocatoriaId, usuarioId);
  }

  // Verifica que la convocatoria exista y este en estado borrador (editable)
  async verificarEditable(convocatoriaId: number): Promise<void> {
    const estado = await this.convocatoriaRepo.getEstado(convocatoriaId);
    if (!estado) {
      throw new NotFoundException('Convocatoria no encontrada');
    }
    if (estado !== EstadoConvocatoria.BORRADOR) {
      throw new ConflictException(
        'La convocatoria no se puede modificar porque no esta en estado borrador',
      );
    }
  }
}
