import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import type { CreateDocumentoDto, UpdateDocumentoDto, AuthUser } from '@superstars/shared';
import { RolUsuario, EstadoConvocatoria } from '@superstars/shared';
import { DocumentoRepository } from './documento.repository';
import { ConvocatoriaAccessService } from '../convocatoria/convocatoria-access.service';
import { ConvocatoriaRepository } from '../convocatoria/convocatoria.repository';
import { STORAGE_SERVICE, type StorageService } from '../storage/storage.interface';

@Injectable()
export class DocumentoService {
  constructor(
    private readonly documentoRepo: DocumentoRepository,
    private readonly convocatoriaAccess: ConvocatoriaAccessService,
    private readonly convocatoriaRepo: ConvocatoriaRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  // Subir documento (admin/responsable, guard ya valido acceso)
  async upload(
    convocatoriaId: number,
    dto: CreateDocumentoDto,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    // Verificar que la convocatoria existe
    const estado = await this.convocatoriaRepo.getEstado(convocatoriaId);
    if (!estado) {
      throw new NotFoundException('Convocatoria no encontrada');
    }

    const ext = extname(file.originalname).toLowerCase();
    const uuid = randomUUID();
    const storageKey = `convocatorias/${convocatoriaId}/docs/${uuid}${ext}`;

    await this.storage.upload(storageKey, file.buffer);

    return this.documentoRepo.create({
      convocatoriaId,
      nombre: dto.nombre,
      storageKey,
      nombreOriginal: file.originalname,
      mimeType: file.mimetype,
      tamanoBytes: file.size,
      orden: dto.orden ?? 0,
    });
  }

  // Listar documentos (admin/responsable/proponente con control de acceso)
  async findAllByConvocatoria(convocatoriaId: number, user: AuthUser) {
    await this.verificarAccesoLectura(convocatoriaId, user);
    return this.documentoRepo.findAllByConvocatoriaId(convocatoriaId);
  }

  // Descargar documento
  async download(id: number, convocatoriaId: number, user: AuthUser) {
    await this.verificarAccesoLectura(convocatoriaId, user);

    const doc = await this.findByIdAndConvocatoria(id, convocatoriaId);
    const buffer = await this.storage.download(doc.storageKey);

    return { buffer, mimeType: doc.mimeType, nombreOriginal: doc.nombreOriginal };
  }

  // Actualizar metadatos (nombre, orden)
  async update(id: number, convocatoriaId: number, dto: UpdateDocumentoDto) {
    const doc = await this.findByIdAndConvocatoria(id, convocatoriaId);

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
  async delete(id: number, convocatoriaId: number) {
    const doc = await this.findByIdAndConvocatoria(id, convocatoriaId);

    await this.storage.delete(doc.storageKey);
    await this.documentoRepo.delete(id);
  }

  // --- Helpers privados ---

  // Busca documento y verifica que pertenece a la convocatoria de la ruta
  private async findByIdAndConvocatoria(id: number, convocatoriaId: number) {
    const doc = await this.documentoRepo.findById(id);
    if (!doc) {
      throw new NotFoundException('Documento no encontrado');
    }
    if (doc.convocatoriaId !== convocatoriaId) {
      throw new NotFoundException('Documento no encontrado');
    }
    return doc;
  }

  // Verifica acceso de lectura segun rol
  private async verificarAccesoLectura(convocatoriaId: number, user: AuthUser): Promise<void> {
    const estado = await this.convocatoriaRepo.getEstado(convocatoriaId);
    if (!estado) {
      throw new NotFoundException('Convocatoria no encontrada');
    }

    // Admin tiene acceso total
    if (user.rol === RolUsuario.ADMINISTRADOR) return;

    // Responsable solo accede a sus convocatorias
    if (user.rol === RolUsuario.RESPONSABLE_CONVOCATORIA) {
      const isResp = await this.convocatoriaAccess.isResponsable(convocatoriaId, user.id);
      if (!isResp) {
        throw new ForbiddenException('No tienes acceso a esta convocatoria');
      }
      return;
    }

    // Proponente solo ve documentos de convocatorias no borrador
    if (estado === EstadoConvocatoria.BORRADOR) {
      throw new ForbiddenException('La convocatoria no está disponible');
    }
  }
}
