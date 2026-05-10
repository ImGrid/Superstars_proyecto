import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import type {
  CreateHistoriaExitoDto,
  UpdateHistoriaExitoDto,
  ToggleActivaHistoriaExitoDto,
  ReorderHistoriasExitoDto,
  ListHistoriasExitoQueryDto,
  HistoriaExitoResponse,
  PublicHistoriaExitoItem,
  PaginatedResponse,
} from '@superstars/shared';
import { HistoriaExitoRepository } from './historia-exito.repository';
import { STORAGE_SERVICE, type StorageService } from '../storage/storage.interface';
import {
  IMAGE_CONFIG,
  IMAGE_ERROR_MESSAGES,
  resolveMimeFromExt,
} from '../../common/constants/image.constants';

// Cap de historias activas mostradas en la landing
const MAX_ACTIVAS = 6;

@Injectable()
export class HistoriaExitoService {
  constructor(
    private readonly repo: HistoriaExitoRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  // --- Lecturas ---

  async findAll(query: ListHistoriasExitoQueryDto): Promise<PaginatedResponse<HistoriaExitoResponse>> {
    const { data, total } = await this.repo.findAll(query);
    const totalPages = Math.ceil(total / query.limit);
    return {
      data: data as unknown as HistoriaExitoResponse[],
      total,
      page: query.page,
      limit: query.limit,
      totalPages,
    };
  }

  async findById(id: number): Promise<HistoriaExitoResponse> {
    const found = await this.repo.findById(id);
    if (!found) {
      throw new NotFoundException('Historia de éxito no encontrada');
    }
    return found as unknown as HistoriaExitoResponse;
  }

  async findAllPublic(): Promise<PublicHistoriaExitoItem[]> {
    const data = await this.repo.findAllPublic();
    return data as PublicHistoriaExitoItem[];
  }

  // --- Crear (con imagen obligatoria) ---

  async create(
    dto: CreateHistoriaExitoDto,
    file: Express.Multer.File | undefined,
  ): Promise<HistoriaExitoResponse> {
    if (!file) {
      throw new BadRequestException('La imagen es obligatoria');
    }
    this.validarImagen(file);

    // Si se envia empresaId, validar que exista. Si no viene empresaNombre, copiar razon_social.
    let empresaNombre = dto.empresaNombre ?? null;
    if (dto.empresaId != null) {
      const razonSocial = await this.repo.findEmpresaRazonSocial(dto.empresaId);
      if (razonSocial === null) {
        throw new BadRequestException('La empresa seleccionada no existe');
      }
      if (!empresaNombre) {
        empresaNombre = razonSocial;
      }
    }

    // Cap de 6 activas: si se llega al limite, la nueva se crea inactiva
    const activasActuales = await this.repo.countActivas();
    const activa = activasActuales < MAX_ACTIVAS;

    // Subir imagen ANTES del INSERT (la columna imagen_key es NOT NULL)
    const ext = extname(file.originalname).toLowerCase();
    const storageKey = `historias-exito/${randomUUID()}${ext}`;
    await this.storage.upload(storageKey, file.buffer);

    try {
      const orden = await this.repo.getNextOrden();
      const created = await this.repo.create({
        titulo: dto.titulo,
        badge: dto.badge ?? null,
        descripcion: dto.descripcion,
        imagenKey: storageKey,
        empresaId: dto.empresaId ?? null,
        empresaNombre,
        orden,
        activa,
      });
      return created as unknown as HistoriaExitoResponse;
    } catch (err) {
      // Si el INSERT falla, limpiar la imagen huerfana del storage
      await this.storage.delete(storageKey).catch(() => {});
      throw err;
    }
  }

  // --- Actualizar campos texto ---

  async update(id: number, dto: UpdateHistoriaExitoDto): Promise<HistoriaExitoResponse> {
    await this.ensureExists(id);

    // Snapshot de empresa: si cambia el empresaId, re-validar y autorrellenar nombre si falta
    const updateData: Record<string, unknown> = {};

    if (dto.titulo !== undefined) updateData.titulo = dto.titulo;
    if (dto.badge !== undefined) updateData.badge = dto.badge;
    if (dto.descripcion !== undefined) updateData.descripcion = dto.descripcion;

    if (dto.empresaId !== undefined) {
      if (dto.empresaId === null) {
        updateData.empresaId = null;
      } else {
        const razonSocial = await this.repo.findEmpresaRazonSocial(dto.empresaId);
        if (razonSocial === null) {
          throw new BadRequestException('La empresa seleccionada no existe');
        }
        updateData.empresaId = dto.empresaId;
        // Si no se envio empresaNombre, copiar el de la empresa seleccionada
        if (dto.empresaNombre === undefined) {
          updateData.empresaNombre = razonSocial;
        }
      }
    }

    if (dto.empresaNombre !== undefined) {
      updateData.empresaNombre = dto.empresaNombre;
    }

    const updated = await this.repo.update(id, updateData);
    if (!updated) {
      throw new NotFoundException('Historia de éxito no encontrada');
    }
    return updated as unknown as HistoriaExitoResponse;
  }

  // --- Cambiar imagen ---

  async cambiarImagen(id: number, file: Express.Multer.File): Promise<HistoriaExitoResponse> {
    if (!file) {
      throw new BadRequestException('La imagen es obligatoria');
    }
    this.validarImagen(file);

    const found = await this.ensureExists(id);
    const ext = extname(file.originalname).toLowerCase();
    const newKey = `historias-exito/${randomUUID()}${ext}`;

    await this.storage.upload(newKey, file.buffer);

    try {
      const updated = await this.repo.update(id, { imagenKey: newKey });
      if (!updated) {
        // No deberia pasar (ensureExists ya valido) pero por seguridad
        await this.storage.delete(newKey).catch(() => {});
        throw new NotFoundException('Historia de éxito no encontrada');
      }
      // Borrar la imagen anterior (best-effort, sin romper si falla)
      await this.storage.delete(found.imagenKey).catch(() => {});
      return updated as unknown as HistoriaExitoResponse;
    } catch (err) {
      await this.storage.delete(newKey).catch(() => {});
      throw err;
    }
  }

  // --- Activar / desactivar ---

  async toggleActiva(
    id: number,
    dto: ToggleActivaHistoriaExitoDto,
  ): Promise<HistoriaExitoResponse> {
    const found = await this.ensureExists(id);

    if (found.activa === dto.activa) {
      // Sin cambio real, devolver tal cual
      return found as unknown as HistoriaExitoResponse;
    }

    // Si va a activarse, validar cap
    if (dto.activa) {
      const activasActuales = await this.repo.countActivas();
      if (activasActuales >= MAX_ACTIVAS) {
        throw new ConflictException(
          `Solo se permiten ${MAX_ACTIVAS} historias activas. Desactiva otra antes de activar esta.`,
        );
      }
    }

    const updated = await this.repo.update(id, { activa: dto.activa });
    return updated as unknown as HistoriaExitoResponse;
  }

  // --- Reordenar (drag-and-drop) ---

  async reorder(dto: ReorderHistoriasExitoDto): Promise<{ message: string }> {
    const missing = await this.repo.findMissingIds(dto.ids);
    if (missing.length > 0) {
      throw new BadRequestException(
        `No se encontraron las siguientes historias: ${missing.join(', ')}`,
      );
    }
    await this.repo.reorder(dto.ids);
    return { message: 'Orden actualizado correctamente' };
  }

  // --- Eliminar ---

  async delete(id: number): Promise<void> {
    const found = await this.ensureExists(id);
    const ok = await this.repo.delete(id);
    if (!ok) {
      throw new NotFoundException('Historia de éxito no encontrada');
    }
    // Borrar la imagen del storage (best-effort)
    await this.storage.delete(found.imagenKey).catch(() => {});
  }

  // --- Servir imagen (publico) ---

  async downloadImagen(id: number): Promise<{ buffer: Buffer; mimeType: string }> {
    const found = await this.ensureExists(id);
    const buffer = await this.storage.download(found.imagenKey);
    const mimeType = resolveMimeFromExt(extname(found.imagenKey));
    return { buffer, mimeType };
  }

  // --- Helpers privados ---

  private async ensureExists(id: number) {
    const found = await this.repo.findById(id);
    if (!found) {
      throw new NotFoundException('Historia de éxito no encontrada');
    }
    return found;
  }

  private validarImagen(file: Express.Multer.File): void {
    if (!IMAGE_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(IMAGE_ERROR_MESSAGES.invalidMime);
    }
    if (file.size > IMAGE_CONFIG.maxSizeBytes) {
      throw new BadRequestException(IMAGE_ERROR_MESSAGES.exceedsMaxSize);
    }
  }
}
