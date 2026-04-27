import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type {
  CreateEmpresaDto,
  UpdateEmpresaDto,
  ListEmpresasQueryDto,
  PaginatedResponse,
} from '@superstars/shared';
import { EmpresaRepository } from './empresa.repository';

@Injectable()
export class EmpresaService {
  constructor(private readonly empresaRepository: EmpresaRepository) {}

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
}
