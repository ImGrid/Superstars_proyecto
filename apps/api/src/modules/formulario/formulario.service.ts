import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { RolUsuario, EstadoConvocatoria, validateTemplateIntegrity } from '@superstars/shared';
import type { CreateFormularioDto, UpdateFormularioDto, SchemaDefinition, AuthUser } from '@superstars/shared';
import { FormularioRepository } from './formulario.repository';
import { ConvocatoriaAccessService } from '../convocatoria/convocatoria-access.service';
import { ConvocatoriaRepository } from '../convocatoria/convocatoria.repository';

@Injectable()
export class FormularioService {
  constructor(
    private readonly formularioRepo: FormularioRepository,
    private readonly convocatoriaAccess: ConvocatoriaAccessService,
    private readonly convocatoriaRepo: ConvocatoriaRepository,
  ) {}

  // user es opcional para compatibilidad con PostulacionService que lo llama sin user
  async findByConvocatoriaId(convocatoriaId: number, user?: AuthUser) {
    // Proponente no puede ver formularios de convocatorias en borrador
    if (user && user.rol === RolUsuario.PROPONENTE) {
      const estado = await this.convocatoriaRepo.getEstado(convocatoriaId);
      if (!estado) {
        throw new NotFoundException('Convocatoria no encontrada');
      }
      if (estado === EstadoConvocatoria.BORRADOR) {
        throw new ForbiddenException('La convocatoria no esta disponible');
      }
    }

    const form = await this.formularioRepo.findByConvocatoriaId(convocatoriaId);
    if (!form) {
      throw new NotFoundException('La convocatoria no tiene un formulario configurado');
    }
    return form;
  }

  async create(convocatoriaId: number, dto: CreateFormularioDto) {
    await this.convocatoriaAccess.verificarEditable(convocatoriaId);

    // 1:1 con convocatoria (uq_formulario_convocatoria)
    const existing = await this.formularioRepo.findByConvocatoriaId(convocatoriaId);
    if (existing) {
      throw new ConflictException('La convocatoria ya tiene un formulario configurado');
    }

    // validar que las secciones/campos fijos esten presentes
    this.verificarIntegridadPlantilla(dto.schemaDefinition);

    return this.formularioRepo.create({
      convocatoriaId,
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      schemaDefinition: dto.schemaDefinition,
    });
  }

  async update(convocatoriaId: number, dto: UpdateFormularioDto) {
    await this.convocatoriaAccess.verificarEditable(convocatoriaId);

    // validar integridad de plantilla si se actualiza el schema
    if (dto.schemaDefinition) {
      this.verificarIntegridadPlantilla(dto.schemaDefinition);
    }

    const { version, ...data } = dto;
    const updated = await this.formularioRepo.update(convocatoriaId, data, version);

    if (!updated) {
      // Distinguir entre "no existe" y "version no coincide"
      const exists = await this.formularioRepo.findByConvocatoriaId(convocatoriaId);
      if (!exists) {
        throw new NotFoundException('La convocatoria no tiene un formulario configurado');
      }
      throw new ConflictException('El formulario fue modificado por otro usuario (version no coincide)');
    }

    return updated;
  }

  async delete(convocatoriaId: number) {
    await this.convocatoriaAccess.verificarEditable(convocatoriaId);

    const deleted = await this.formularioRepo.delete(convocatoriaId);
    if (!deleted) {
      throw new NotFoundException('La convocatoria no tiene un formulario configurado');
    }
  }

  // verifica que el schema no elimine ni altere secciones/campos fijos de la plantilla
  private verificarIntegridadPlantilla(schema: SchemaDefinition): void {
    const errors = validateTemplateIntegrity(schema);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
  }
}
