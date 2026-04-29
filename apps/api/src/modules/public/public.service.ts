import { Injectable, NotFoundException } from '@nestjs/common';
import type { ListPublicConvocatoriasQueryDto, ListPublicPublicacionesQueryDto, PaginatedResponse } from '@superstars/shared';
import { PublicRepository } from './public.repository';

@Injectable()
export class PublicService {
  constructor(private readonly publicRepo: PublicRepository) {}

  async findConvocatorias(query: ListPublicConvocatoriasQueryDto): Promise<PaginatedResponse<unknown>> {
    const { data, total } = await this.publicRepo.findPublicConvocatorias(query);
    const totalPages = Math.ceil(total / query.limit);

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      totalPages,
    };
  }

  // estados visibles en la web publica
  private readonly estadosPublicos = [
    'publicado', 'cerrado', 'en_evaluacion', 'resultados_listos', 'finalizado',
  ];

  async findResultados(id: number) {
    const convocatoria = await this.publicRepo.findPublicConvocatoriaById(id);
    if (!convocatoria) {
      throw new NotFoundException('Convocatoria no encontrada');
    }

    // solo mostrar resultados de convocatorias finalizadas con resultados publicados
    if (!convocatoria.fechaPublicacionResultados) {
      throw new NotFoundException('Resultados no disponibles');
    }

    const ganadores = await this.publicRepo.findGanadores(id);

    return {
      convocatoriaNombre: convocatoria.nombre,
      fechaPublicacionResultados: convocatoria.fechaPublicacionResultados,
      ganadores,
    };
  }

  async findConvocatoriaById(id: number) {
    const convocatoria = await this.publicRepo.findPublicConvocatoriaById(id);
    if (!convocatoria) {
      throw new NotFoundException('Convocatoria no encontrada');
    }

    // solo mostrar convocatorias que ya fueron publicadas (no borradores)
    if (!this.estadosPublicos.includes(convocatoria.estado)) {
      throw new NotFoundException('Convocatoria no encontrada');
    }

    // Incluir formulario y documentos si existen
    const [formulario, documentos] = await Promise.all([
      this.publicRepo.findFormularioByConvocatoriaId(id),
      this.publicRepo.findDocumentosByConvocatoriaId(id),
    ]);

    return { ...convocatoria, formulario, documentos };
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
