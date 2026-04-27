import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import slugify from 'slugify';
import sanitizeHtml from 'sanitize-html';
import { EstadoPublicacion } from '@superstars/shared';
import type {
  CreatePublicacionDto,
  UpdatePublicacionDto,
  PublicarPublicacionDto,
  ListPublicacionesQueryDto,
  PaginatedResponse,
} from '@superstars/shared';
import { PublicacionRepository } from './publicacion.repository';
import { PublicacionStateMachine } from './publicacion.state-machine';
import type { PublicacionEvent } from './publicacion.state-machine';
import { STORAGE_SERVICE, type StorageService } from '../storage/storage.interface';

// Config de imagen de portada
const IMAGE_CONFIG = {
  maxSizeBytes: 5 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
};

// Estados en los que se puede editar contenido (todos menos expirado)
const ESTADOS_EDITABLES = [
  EstadoPublicacion.BORRADOR,
  EstadoPublicacion.PROGRAMADO,
  EstadoPublicacion.PUBLICADO,
  EstadoPublicacion.ARCHIVADO,
];

@Injectable()
export class PublicacionService {
  private readonly stateMachine = new PublicacionStateMachine();

  constructor(
    private readonly publicacionRepo: PublicacionRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  // --- CRUD ---

  async create(dto: CreatePublicacionDto) {
    // Validar categoria si se proporciona
    if (dto.categoriaId) {
      await this.ensureCategoriaExists(dto.categoriaId);
    }

    const slug = await this.ensureUniqueSlug(this.generateSlug(dto.titulo));
    const contenidoLimpio = this.sanitizeContent(dto.contenido);
    const extracto = this.generateExcerpt(contenidoLimpio);

    return this.publicacionRepo.create({
      titulo: dto.titulo,
      slug,
      extracto,
      contenido: contenidoLimpio,
      categoriaId: dto.categoriaId ?? null,
      destacado: dto.destacado,
    });
  }

  async findAll(query: ListPublicacionesQueryDto): Promise<PaginatedResponse<unknown>> {
    const { data, total } = await this.publicacionRepo.findAll(query);
    const totalPages = Math.ceil(total / query.limit);

    return { data, total, page: query.page, limit: query.limit, totalPages };
  }

  async findById(id: number) {
    const pub = await this.publicacionRepo.findById(id);
    if (!pub) {
      throw new NotFoundException('Publicacion no encontrada');
    }
    return pub;
  }

  async update(id: number, dto: UpdatePublicacionDto) {
    const pub = await this.ensureExists(id);
    this.verificarEditable(pub.estado);

    const updateData: Record<string, unknown> = {};

    if (dto.titulo !== undefined) updateData.titulo = dto.titulo;
    if (dto.categoriaId !== undefined) {
      if (dto.categoriaId !== null) {
        await this.ensureCategoriaExists(dto.categoriaId);
      }
      updateData.categoriaId = dto.categoriaId;
    }
    if (dto.destacado !== undefined) updateData.destacado = dto.destacado;

    if (dto.contenido !== undefined) {
      updateData.contenido = this.sanitizeContent(dto.contenido);
      updateData.extracto = this.generateExcerpt(updateData.contenido as string);
    }

    return this.publicacionRepo.update(id, updateData);
  }

  async delete(id: number) {
    const pub = await this.ensureExists(id);

    // No se puede borrar si esta publicada
    if (pub.estado === EstadoPublicacion.PUBLICADO || pub.estado === EstadoPublicacion.PROGRAMADO) {
      throw new ConflictException('No se puede eliminar una publicacion publicada o programada. Archivela primero');
    }

    // Borrar imagen del storage si existe
    if (pub.imagenDestacadaKey) {
      await this.storage.delete(pub.imagenDestacadaKey);
    }

    await this.publicacionRepo.delete(id);
  }

  // --- Transiciones de estado ---

  async publicarOProgramar(id: number, dto: PublicarPublicacionDto) {
    const pub = await this.ensureExists(id);

    if (dto.fechaPublicacion && new Date(dto.fechaPublicacion) > new Date()) {
      // Fecha futura: programar
      return this.executeTransition(id, pub.estado, 'programar', {
        fechaPublicacion: dto.fechaPublicacion,
        fechaExpiracion: dto.fechaExpiracion ?? null,
      });
    }

    // Sin fecha o fecha pasada: publicar inmediatamente
    return this.executeTransition(id, pub.estado, 'publicar', {
      fechaPublicacion: new Date().toISOString(),
      fechaExpiracion: dto.fechaExpiracion ?? null,
    });
  }

  async archivar(id: number) {
    const pub = await this.ensureExists(id);
    return this.executeTransition(id, pub.estado, 'archivar');
  }

  async republicar(id: number) {
    const pub = await this.ensureExists(id);

    if (pub.estado === EstadoPublicacion.EXPIRADO) {
      // Expirado -> publicado (con nueva fecha, sin expiracion)
      return this.executeTransition(id, pub.estado, 'republicar', {
        fechaPublicacion: new Date().toISOString(),
        fechaExpiracion: null,
      });
    }

    // Archivado -> borrador
    return this.executeTransition(id, pub.estado, 'republicar');
  }

  async cancelarProgramacion(id: number) {
    const pub = await this.ensureExists(id);
    return this.executeTransition(id, pub.estado, 'cancelar_programacion', {
      fechaPublicacion: null,
      fechaExpiracion: null,
    });
  }

  // --- Imagen de portada ---

  async uploadImagen(
    id: number,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    const pub = await this.ensureExists(id);

    // Validar tipo MIME
    if (!IMAGE_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de imagen "${file.mimetype}" no permitido. Permitidos: ${IMAGE_CONFIG.allowedMimeTypes.join(', ')}`,
      );
    }

    // Validar tamaño
    if (file.size > IMAGE_CONFIG.maxSizeBytes) {
      throw new BadRequestException(
        `La imagen excede el tamaño máximo de ${IMAGE_CONFIG.maxSizeBytes / (1024 * 1024)} MB`,
      );
    }

    // Borrar imagen anterior si existe
    if (pub.imagenDestacadaKey) {
      await this.storage.delete(pub.imagenDestacadaKey);
    }

    // Subir nueva imagen
    const ext = extname(file.originalname).toLowerCase();
    const storageKey = `publicaciones/${id}/${randomUUID()}${ext}`;
    await this.storage.upload(storageKey, file.buffer);

    return this.publicacionRepo.update(id, { imagenDestacadaKey: storageKey });
  }

  async downloadImagen(id: number): Promise<{ buffer: Buffer; mimeType: string }> {
    const pub = await this.ensureExists(id);
    if (!pub.imagenDestacadaKey) {
      throw new NotFoundException('La publicacion no tiene imagen de portada');
    }

    const buffer = await this.storage.download(pub.imagenDestacadaKey);
    const ext = extname(pub.imagenDestacadaKey).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    const mimeType = mimeMap[ext] || 'application/octet-stream';

    return { buffer, mimeType };
  }

  async removeImagen(id: number) {
    const pub = await this.ensureExists(id);
    if (!pub.imagenDestacadaKey) {
      throw new NotFoundException('La publicacion no tiene imagen de portada');
    }

    await this.storage.delete(pub.imagenDestacadaKey);
    return this.publicacionRepo.update(id, { imagenDestacadaKey: null });
  }

  // --- Categorias ---

  async findAllCategorias() {
    return this.publicacionRepo.findAllCategorias();
  }

  async createCategoria(nombre: string) {
    const slug = slugify(nombre, { lower: true, strict: true, locale: 'es' });
    return this.publicacionRepo.createCategoria({ nombre, slug });
  }

  async deleteCategoria(id: number) {
    const cat = await this.publicacionRepo.findCategoriaById(id);
    if (!cat) {
      throw new NotFoundException(`Categoria ${id} no encontrada`);
    }
    await this.publicacionRepo.deleteCategoria(id);
  }

  // --- Helpers privados ---

  private async ensureExists(id: number) {
    const pub = await this.publicacionRepo.findById(id);
    if (!pub) {
      throw new NotFoundException('Publicacion no encontrada');
    }
    return pub;
  }

  private async ensureCategoriaExists(categoriaId: number) {
    const cat = await this.publicacionRepo.findCategoriaById(categoriaId);
    if (!cat) {
      throw new NotFoundException(`Categoria ${categoriaId} no encontrada`);
    }
  }

  private verificarEditable(estado: string): void {
    if (!ESTADOS_EDITABLES.includes(estado as EstadoPublicacion)) {
      throw new ConflictException('No se puede editar una publicacion en el estado actual');
    }
  }

  private async executeTransition(
    id: number,
    currentEstado: string,
    event: PublicacionEvent,
    extraData?: { fechaPublicacion?: string | null; fechaExpiracion?: string | null },
  ) {
    const newEstado = this.stateMachine.transition(currentEstado, event);
    const result = await this.publicacionRepo.updateEstado(id, currentEstado, newEstado, extraData);
    if (!result) {
      throw new ConflictException('No se pudo cambiar el estado. Posible conflicto concurrente');
    }
    return result;
  }

  private generateSlug(titulo: string): string {
    return slugify(titulo, {
      lower: true,
      strict: true,
      locale: 'es',
    });
  }

  private async ensureUniqueSlug(baseSlug: string, excludeId?: number): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (await this.publicacionRepo.slugExists(slug, excludeId)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private generateExcerpt(html: string, maxLength = 160): string {
    const text = html.replace(/<[^>]+>/g, '').trim();
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
  }

  private sanitizeContent(html: string): string {
    return sanitizeHtml(html, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ['src', 'alt', 'width', 'height', 'loading'],
        a: ['href', 'target', 'rel'],
        h1: ['style'],
        h2: ['style'],
        h3: ['style'],
        p: ['style'],
      },
      allowedStyles: {
        '*': {
          'text-align': [/^left$/, /^center$/, /^right$/, /^justify$/],
        },
      },
    });
  }
}
