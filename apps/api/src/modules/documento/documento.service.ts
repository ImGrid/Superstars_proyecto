import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import type { CreateDocumentoDto, UpdateDocumentoDto, AuthUser, PropositoDocumento } from '@superstars/shared';
import { RolUsuario, EstadoConvocatoria } from '@superstars/shared';
import { DocumentoRepository } from './documento.repository';
import { ConvocatoriaAccessService } from '../convocatoria/convocatoria-access.service';
import { ConvocatoriaRepository } from '../convocatoria/convocatoria.repository';
import { CategoriaService } from '../categoria/categoria.service';
import { STORAGE_SERVICE, type StorageService } from '../storage/storage.interface';

@Injectable()
export class DocumentoService {
  constructor(
    private readonly documentoRepo: DocumentoRepository,
    private readonly convocatoriaAccess: ConvocatoriaAccessService,
    private readonly convocatoriaRepo: ConvocatoriaRepository,
    private readonly categoriaService: CategoriaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  // Subir documento (admin/responsable, guard ya valido acceso a la convocatoria)
  async upload(
    convocatoriaId: number,
    categoriaId: number,
    dto: CreateDocumentoDto,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    await this.categoriaService.verificarPerteneceAConvocatoria(categoriaId, convocatoriaId);

    const ext = extname(file.originalname).toLowerCase();
    const uuid = randomUUID();
    const storageKey = `categorias/${categoriaId}/docs/${uuid}${ext}`;

    await this.storage.upload(storageKey, file.buffer);

    return this.documentoRepo.create({
      categoriaId,
      nombre: dto.nombre,
      storageKey,
      nombreOriginal: file.originalname,
      mimeType: file.mimetype,
      tamanoBytes: file.size,
      orden: dto.orden ?? 0,
      proposito: dto.proposito,
    });
  }

  // Listar documentos de la categoria filtrados por la audiencia del rol
  async findAllByCategoria(convocatoriaId: number, categoriaId: number, user: AuthUser) {
    await this.categoriaService.verificarPerteneceAConvocatoria(categoriaId, convocatoriaId);

    const permitidos = await this.resolvePropositosPermitidos(convocatoriaId, categoriaId, user);
    return this.documentoRepo.findAllByCategoriaId(
      categoriaId,
      permitidos === 'all' ? undefined : permitidos,
    );
  }

  // Descargar documento (control de acceso por proposito, post-fetch)
  async download(id: number, convocatoriaId: number, categoriaId: number, user: AuthUser) {
    await this.categoriaService.verificarPerteneceAConvocatoria(categoriaId, convocatoriaId);

    const doc = await this.findByIdAndCategoria(id, categoriaId);

    const permitidos = await this.resolvePropositosPermitidos(convocatoriaId, categoriaId, user);
    if (permitidos !== 'all' && !permitidos.includes(doc.proposito)) {
      throw new ForbiddenException('No tienes acceso a este documento');
    }

    const buffer = await this.storage.download(doc.storageKey);
    return { buffer, mimeType: doc.mimeType, nombreOriginal: doc.nombreOriginal };
  }

  // Actualizar metadatos (nombre, orden, proposito)
  async update(id: number, convocatoriaId: number, categoriaId: number, dto: UpdateDocumentoDto) {
    await this.categoriaService.verificarPerteneceAConvocatoria(categoriaId, convocatoriaId);

    const doc = await this.findByIdAndCategoria(id, categoriaId);

    const data: Partial<{ nombre: string; orden: number; proposito: PropositoDocumento }> = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre;
    if (dto.orden !== undefined) data.orden = dto.orden;
    if (dto.proposito !== undefined) data.proposito = dto.proposito;

    if (Object.keys(data).length === 0) return doc;

    const updated = await this.documentoRepo.update(id, data);
    if (!updated) {
      throw new NotFoundException('Documento no encontrado');
    }
    return updated;
  }

  // Eliminar documento + archivo fisico
  async delete(id: number, convocatoriaId: number, categoriaId: number) {
    await this.categoriaService.verificarPerteneceAConvocatoria(categoriaId, convocatoriaId);

    const doc = await this.findByIdAndCategoria(id, categoriaId);

    await this.storage.delete(doc.storageKey);
    await this.documentoRepo.delete(id);
  }

  // --- Helpers privados ---

  // Busca documento y verifica que pertenece a la categoria de la ruta
  private async findByIdAndCategoria(id: number, categoriaId: number) {
    const doc = await this.documentoRepo.findById(id);
    if (!doc || doc.categoriaId !== categoriaId) {
      throw new NotFoundException('Documento no encontrado');
    }
    return doc;
  }

  // Determina que propositos puede ver/descargar el usuario ('all' = sin filtro).
  // Lanza 403/404 si el usuario no tiene acceso a la categoria/convocatoria.
  private async resolvePropositosPermitidos(
    convocatoriaId: number,
    categoriaId: number,
    user: AuthUser,
  ): Promise<PropositoDocumento[] | 'all'> {
    // Admin: acceso total
    if (user.rol === RolUsuario.ADMINISTRADOR) return 'all';

    // Responsable: solo sus convocatorias, y ve todo
    if (user.rol === RolUsuario.RESPONSABLE_CONVOCATORIA) {
      const isResp = await this.convocatoriaAccess.isResponsable(convocatoriaId, user.id);
      if (!isResp) {
        throw new ForbiddenException('No tienes acceso a esta convocatoria');
      }
      return 'all';
    }

    // Evaluador: debe estar en el pool de la categoria; ve jurado + informativo
    if (user.rol === RolUsuario.EVALUADOR) {
      const enPool = await this.categoriaService.esEvaluadorDeCategoria(categoriaId, user.id);
      if (!enPool) {
        throw new ForbiddenException('No estás asignado como evaluador a esta categoría');
      }
      return ['jurado', 'informativo'];
    }

    // Proponente: solo si la convocatoria no esta en borrador; ve informativo + plantilla
    if (user.rol === RolUsuario.PROPONENTE) {
      const estado = await this.convocatoriaRepo.getEstado(convocatoriaId);
      if (!estado) {
        throw new NotFoundException('Convocatoria no encontrada');
      }
      if (estado === EstadoConvocatoria.BORRADOR) {
        throw new ForbiddenException('La convocatoria no está disponible');
      }
      return ['informativo', 'plantilla'];
    }

    throw new ForbiddenException('No tienes acceso a estos documentos');
  }
}
