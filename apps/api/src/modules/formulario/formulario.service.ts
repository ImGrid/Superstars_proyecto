import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { RolUsuario, EstadoConcurso, validateTemplateIntegrity } from '@superstars/shared';
import type { CreateFormularioDto, UpdateFormularioDto, SchemaDefinition, AuthUser } from '@superstars/shared';
import { FormularioRepository } from './formulario.repository';
import { ConcursoAccessService } from '../concurso/concurso-access.service';
import { ConcursoRepository } from '../concurso/concurso.repository';

@Injectable()
export class FormularioService {
  constructor(
    private readonly formularioRepo: FormularioRepository,
    private readonly concursoAccess: ConcursoAccessService,
    private readonly concursoRepo: ConcursoRepository,
  ) {}

  // user es opcional para compatibilidad con PostulacionService que lo llama sin user
  async findByConcursoId(concursoId: number, user?: AuthUser) {
    // Proponente no puede ver formularios de concursos en borrador
    if (user && user.rol === RolUsuario.PROPONENTE) {
      const estado = await this.concursoRepo.getEstado(concursoId);
      if (!estado) {
        throw new NotFoundException('Concurso no encontrado');
      }
      if (estado === EstadoConcurso.BORRADOR) {
        throw new ForbiddenException('El concurso no esta disponible');
      }
    }

    const form = await this.formularioRepo.findByConcursoId(concursoId);
    if (!form) {
      throw new NotFoundException('El concurso no tiene un formulario configurado');
    }
    return form;
  }

  async create(concursoId: number, dto: CreateFormularioDto) {
    await this.concursoAccess.verificarEditable(concursoId);

    // 1:1 con concurso (uq_formulario_concurso)
    const existing = await this.formularioRepo.findByConcursoId(concursoId);
    if (existing) {
      throw new ConflictException('El concurso ya tiene un formulario configurado');
    }

    // validar que las secciones/campos fijos esten presentes
    this.verificarIntegridadPlantilla(dto.schemaDefinition);

    return this.formularioRepo.create({
      concursoId,
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      schemaDefinition: dto.schemaDefinition,
    });
  }

  async update(concursoId: number, dto: UpdateFormularioDto) {
    await this.concursoAccess.verificarEditable(concursoId);

    // validar integridad de plantilla si se actualiza el schema
    if (dto.schemaDefinition) {
      this.verificarIntegridadPlantilla(dto.schemaDefinition);
    }

    const { version, ...data } = dto;
    const updated = await this.formularioRepo.update(concursoId, data, version);

    if (!updated) {
      // Distinguir entre "no existe" y "version no coincide"
      const exists = await this.formularioRepo.findByConcursoId(concursoId);
      if (!exists) {
        throw new NotFoundException('El concurso no tiene un formulario configurado');
      }
      throw new ConflictException('El formulario fue modificado por otro usuario (version no coincide)');
    }

    return updated;
  }

  async delete(concursoId: number) {
    await this.concursoAccess.verificarEditable(concursoId);

    const deleted = await this.formularioRepo.delete(concursoId);
    if (!deleted) {
      throw new NotFoundException('El concurso no tiene un formulario configurado');
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
