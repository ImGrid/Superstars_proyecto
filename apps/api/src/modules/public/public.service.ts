import { Injectable, NotFoundException } from '@nestjs/common';
import { ESTADO_CONCURSO_PUBLICO } from '@superstars/shared';
import type { ListPublicConcursosQueryDto, ListPublicPublicacionesQueryDto, PaginatedResponse } from '@superstars/shared';
import { PublicRepository } from './public.repository';

@Injectable()
export class PublicService {
  constructor(private readonly publicRepo: PublicRepository) {}

  async findConcursos(query: ListPublicConcursosQueryDto): Promise<PaginatedResponse<unknown>> {
    const { data, total } = await this.publicRepo.findPublicConcursos(query);
    const totalPages = Math.ceil(total / query.limit);

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      totalPages,
    };
  }

  async findConcursoById(id: number) {
    const concurso = await this.publicRepo.findPublicConcursoById(id);
    if (!concurso) {
      throw new NotFoundException('Concurso no encontrado');
    }

    // Solo mostrar concursos publicados (abiertos)
    if (concurso.estado !== ESTADO_CONCURSO_PUBLICO) {
      throw new NotFoundException('Concurso no encontrado');
    }

    // Incluir formulario y documentos si existen
    const [formulario, documentos] = await Promise.all([
      this.publicRepo.findFormularioByConcursoId(id),
      this.publicRepo.findDocumentosByConcursoId(id),
    ]);

    return { ...concurso, formulario, documentos };
  }

  // --- Publicaciones publicas ---

  async findPublicaciones(query: ListPublicPublicacionesQueryDto): Promise<PaginatedResponse<unknown>> {
    const { data, total } = await this.publicRepo.findPublicaciones(query);
    const totalPages = Math.ceil(total / query.limit);

    return { data, total, page: query.page, limit: query.limit, totalPages };
  }

  async findPublicacionBySlug(slug: string) {
    const pub = await this.publicRepo.findPublicacionBySlug(slug);
    if (!pub) {
      throw new NotFoundException('Publicacion no encontrada');
    }
    return pub;
  }

  async findCategorias() {
    return this.publicRepo.findCategorias();
  }
}
