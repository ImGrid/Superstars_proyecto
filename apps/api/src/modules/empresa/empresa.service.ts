import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import type {
  CreateEmpresaDto,
  UpdateEmpresaDto,
  ListEmpresasQueryDto,
  PaginatedResponse,
} from '@superstars/shared';
import { EmpresaRepository } from './empresa.repository';
import { STORAGE_SERVICE, type StorageService } from '../storage/storage.interface';
import {
  IMAGE_CONFIG,
  IMAGE_ERROR_MESSAGES,
  resolveMimeFromExt,
} from '../../common/constants/image.constants';

@Injectable()
export class EmpresaService {
  constructor(
    private readonly empresaRepository: EmpresaRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  // Proponente obtiene su propia empresa
  async getMyEmpresa(usuarioId: number) {
    const emp = await this.empresaRepository.findByUsuarioId(usuarioId);
    if (!emp) {
      throw new NotFoundException('No tienes una empresa registrada');
    }
    return emp;
  }

  // Proponente crea su empresa (1:1 con usuario)
  async create(dto: CreateEmpresaDto, usuarioId: number) {
    const alreadyHas = await this.empresaRepository.existsByUsuarioId(usuarioId);
    if (alreadyHas) {
      throw new ConflictException('Ya tienes una empresa registrada');
    }

    // Verificar NIT unico solo si se proporciona (es opcional)
    if (dto.nit) {
      const nitExists = await this.empresaRepository.existsByNit(dto.nit);
      if (nitExists) {
        throw new ConflictException('El NIT ya está registrado por otra empresa');
      }
    }

    return this.empresaRepository.create({
      usuarioId,
      ...dto,
    });
  }

  // Proponente actualiza su empresa
  async updateMyEmpresa(dto: UpdateEmpresaDto, usuarioId: number) {
    const emp = await this.empresaRepository.findByUsuarioId(usuarioId);
    if (!emp) {
      throw new NotFoundException('No tienes una empresa registrada');
    }

    // Verificar NIT unico si se esta cambiando
    if (dto.nit) {
      const nitExists = await this.empresaRepository.existsByNit(dto.nit, emp.id);
      if (nitExists) {
        throw new ConflictException('El NIT ya está registrado por otra empresa');
      }
    }

    return this.empresaRepository.update(emp.id, dto);
  }

  // Admin: obtener empresa por ID
  async findById(id: number) {
    const emp = await this.empresaRepository.findById(id);
    if (!emp) {
      throw new NotFoundException('Empresa no encontrada');
    }
    return emp;
  }

  // Admin: listar todas con paginacion y busqueda
  async findAll(query: ListEmpresasQueryDto): Promise<PaginatedResponse<unknown>> {
    const { page, limit } = query;
    const { data, total } = await this.empresaRepository.findAll(query);
    const totalPages = Math.ceil(total / limit);

    return { data, total, page, limit, totalPages };
  }

  // --- Logo de la empresa ---
  // El proponente sube el logo de SU propia empresa (se resuelve por usuarioId).
  // El GET del binario es publico (por id de empresa), igual que la imagen de convocatoria.

  async uploadLogo(usuarioId: number, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(IMAGE_ERROR_MESSAGES.fileMissing);
    }
    const emp = await this.empresaRepository.findByUsuarioId(usuarioId);
    if (!emp) {
      throw new NotFoundException('No tienes una empresa registrada');
    }

    // Validar tipo MIME
    if (!IMAGE_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(IMAGE_ERROR_MESSAGES.invalidMime);
    }

    // Validar tamano
    if (file.size > IMAGE_CONFIG.maxSizeBytes) {
      throw new BadRequestException(IMAGE_ERROR_MESSAGES.exceedsMaxSize);
    }

    // Subir el logo nuevo primero (clave unica para evitar colisiones)
    const ext = extname(file.originalname).toLowerCase();
    const newKey = `empresas/${emp.id}/${randomUUID()}${ext}`;
    await this.storage.upload(newKey, file.buffer);

    try {
      const updated = await this.empresaRepository.update(emp.id, {
        logoKey: newKey,
      });
      if (!updated) {
        await this.storage.delete(newKey).catch(() => {});
        throw new NotFoundException('Empresa no encontrada');
      }
      // Borrar el logo anterior despues del UPDATE exitoso (best-effort)
      if (emp.logoKey) {
        await this.storage.delete(emp.logoKey).catch(() => {});
      }
      return updated;
    } catch (err) {
      // Si el UPDATE falla, limpiar el archivo huerfano
      await this.storage.delete(newKey).catch(() => {});
      throw err;
    }
  }

  async downloadLogo(id: number): Promise<{ buffer: Buffer; mimeType: string }> {
    const emp = await this.empresaRepository.findById(id);
    if (!emp) {
      throw new NotFoundException('Empresa no encontrada');
    }
    if (!emp.logoKey) {
      throw new NotFoundException('Esta empresa no tiene logo.');
    }

    const buffer = await this.storage.download(emp.logoKey);
    const mimeType = resolveMimeFromExt(extname(emp.logoKey));

    return { buffer, mimeType };
  }

  async removeLogo(usuarioId: number) {
    const emp = await this.empresaRepository.findByUsuarioId(usuarioId);
    if (!emp) {
      throw new NotFoundException('No tienes una empresa registrada');
    }
    if (!emp.logoKey) {
      throw new NotFoundException('Esta empresa no tiene logo.');
    }

    // Persistir el cambio en BD primero (si falla, el logo sigue accesible)
    const updated = await this.empresaRepository.update(emp.id, {
      logoKey: null,
    });
    if (!updated) throw new NotFoundException('Empresa no encontrada');

    // Borrar el archivo del storage (best-effort)
    await this.storage.delete(emp.logoKey).catch(() => {});

    return updated;
  }
}
