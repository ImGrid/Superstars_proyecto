import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import type { CreateDocumentoDto, UpdateDocumentoDto, AuthUser } from '@superstars/shared';
import { RolUsuario, EstadoConcurso } from '@superstars/shared';
import { DocumentoRepository } from './documento.repository';
import { ConcursoAccessService } from '../concurso/concurso-access.service';
import { ConcursoRepository } from '../concurso/concurso.repository';
import { STORAGE_SERVICE, type StorageService } from '../storage/storage.interface';

@Injectable()
export class DocumentoService {
  constructor(
    private readonly documentoRepo: DocumentoRepository,
    private readonly concursoAccess: ConcursoAccessService,
    private readonly concursoRepo: ConcursoRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  // Subir documento (admin/responsable, guard ya valido acceso)
  async upload(
    concursoId: number,
    dto: CreateDocumentoDto,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    // Verificar que el concurso existe
    const estado = await this.concursoRepo.getEstado(concursoId);
    if (!estado) {
      throw new NotFoundException('Concurso no encontrado');
    }

    const ext = extname(file.originalname).toLowerCase();
    const uuid = randomUUID();
    const storageKey = `concursos/${concursoId}/docs/${uuid}${ext}`;

    await this.storage.upload(storageKey, file.buffer);

    return this.documentoRepo.create({
      concursoId,
      nombre: dto.nombre,
      storageKey,
      nombreOriginal: file.originalname,
      mimeType: file.mimetype,
      tamanoBytes: file.size,
      orden: dto.orden ?? 0,
    });
  }

  // Listar documentos (admin/responsable/proponente con control de acceso)
  async findAllByConcurso(concursoId: number, user: AuthUser) {
    await this.verificarAccesoLectura(concursoId, user);
    return this.documentoRepo.findAllByConcursoId(concursoId);
  }

  // Descargar documento
  async download(id: number, concursoId: number, user: AuthUser) {
    await this.verificarAccesoLectura(concursoId, user);

    const doc = await this.findByIdAndConcurso(id, concursoId);
    const buffer = await this.storage.download(doc.storageKey);

    return { buffer, mimeType: doc.mimeType, nombreOriginal: doc.nombreOriginal };
  }

  // Actualizar metadatos (nombre, orden)
  async update(id: number, concursoId: number, dto: UpdateDocumentoDto) {
    const doc = await this.findByIdAndConcurso(id, concursoId);

    const data: Partial<{ nombre: string; orden: number }> = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre;
    if (dto.orden !== undefined) data.orden = dto.orden;

    // Si no hay nada que actualizar, devolver el doc actual
    if (Object.keys(data).length === 0) return doc;

    const updated = await this.documentoRepo.update(id, data);
    if (!updated) {
      throw new NotFoundException('Documento no encontrado');
    }

    return updated;
  }

  // Eliminar documento + archivo fisico
  async delete(id: number, concursoId: number) {
    const doc = await this.findByIdAndConcurso(id, concursoId);

    await this.storage.delete(doc.storageKey);
    await this.documentoRepo.delete(id);
  }

  // --- Helpers privados ---

  // Busca documento y verifica que pertenece al concurso de la ruta
  private async findByIdAndConcurso(id: number, concursoId: number) {
    const doc = await this.documentoRepo.findById(id);
    if (!doc) {
      throw new NotFoundException('Documento no encontrado');
    }
    if (doc.concursoId !== concursoId) {
      throw new NotFoundException('Documento no encontrado');
    }
    return doc;
  }

  // Verifica acceso de lectura segun rol
  private async verificarAccesoLectura(concursoId: number, user: AuthUser): Promise<void> {
    const estado = await this.concursoRepo.getEstado(concursoId);
    if (!estado) {
      throw new NotFoundException('Concurso no encontrado');
    }

    // Admin tiene acceso total
    if (user.rol === RolUsuario.ADMINISTRADOR) return;

    // Responsable solo accede a sus concursos
    if (user.rol === RolUsuario.RESPONSABLE_CONCURSO) {
      const isResp = await this.concursoAccess.isResponsable(concursoId, user.id);
      if (!isResp) {
        throw new ForbiddenException('No tienes acceso a este concurso');
      }
      return;
    }

    // Proponente solo ve documentos de concursos no borrador
    if (estado === EstadoConcurso.BORRADOR) {
      throw new ForbiddenException('El concurso no esta disponible');
    }
  }
}
