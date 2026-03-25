import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import type {
  CreateUsuarioDto,
  UpdateUsuarioDto,
  ListUsuariosQueryDto,
  PaginatedResponse,
} from '@superstars/shared';
import { UsuarioRepository } from './usuario.repository';
import { ARGON2_OPTIONS } from '../auth/auth.constants';

@Injectable()
export class UsuarioService {
  private readonly pepper: Buffer;

  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly configService: ConfigService,
  ) {
    this.pepper = Buffer.from(
      this.configService.get<string>('PASSWORD_PEPPER', ''),
    );
  }

  // Perfil del usuario autenticado
  async getProfile(userId: number) {
    const user = await this.usuarioRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  // Obtener usuario por ID (admin)
  async findById(id: number) {
    const user = await this.usuarioRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  // Listar usuarios con paginacion y filtros (admin)
  async findAll(query: ListUsuariosQueryDto): Promise<PaginatedResponse<unknown>> {
    const { page, limit } = query;
    const { data, total } = await this.usuarioRepository.findAll(query);
    const totalPages = Math.ceil(total / limit);

    return { data, total, page, limit, totalPages };
  }

  // Crear usuario con cualquier rol (admin)
  async create(dto: CreateUsuarioDto) {
    const emailExists = await this.usuarioRepository.existsByEmail(dto.email);
    if (emailExists) {
      throw new ConflictException('El email ya esta registrado');
    }

    const passwordHash = await argon2.hash(dto.password, {
      ...ARGON2_OPTIONS,
      secret: this.pepper,
    });

    return this.usuarioRepository.create({
      email: dto.email,
      passwordHash,
      nombre: dto.nombre,
      rol: dto.rol,
    });
  }

  // Actualizar usuario (admin)
  async update(id: number, dto: UpdateUsuarioDto, currentUserId: number) {
    // Prevenir auto-desactivacion
    if (id === currentUserId && dto.activo === false) {
      throw new ForbiddenException('No puedes desactivar tu propia cuenta');
    }

    const updated = await this.usuarioRepository.update(id, dto);
    if (!updated) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return updated;
  }

  // Eliminar usuario (admin)
  async delete(id: number, currentUserId: number) {
    if (id === currentUserId) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta');
    }

    try {
      const deleted = await this.usuarioRepository.delete(id);
      if (!deleted) {
        throw new NotFoundException('Usuario no encontrado');
      }
    } catch (error: unknown) {
      // Drizzle 0.45 envuelve el error de PG en DrizzleQueryError.cause
      const pgCode = (error as any)?.cause?.code ?? (error as any)?.code;
      // FK constraint violation (23503): usuario tiene datos asociados
      if (pgCode === '23503') {
        throw new ConflictException(
          'No se puede eliminar el usuario porque tiene datos asociados. Desactivalo en su lugar.',
        );
      }
      throw error;
    }
  }
}
