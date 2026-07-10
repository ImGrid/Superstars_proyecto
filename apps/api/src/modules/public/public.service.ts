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

    const filas = await this.publicRepo.findGanadores(id);

    // agrupar ganadores por categoria (las filas ya vienen ordenadas por orden y posicion)
    const porCategoria = new Map<number, {
      categoriaId: number;
      categoriaNombre: string;
      monto: string;
      ganadores: { empresaNombre: string; posicionFinal: number }[];
    }>();
    for (const f of filas) {
      let grupo = porCategoria.get(f.categoriaId);
      if (!grupo) {
        grupo = { categoriaId: f.categoriaId, categoriaNombre: f.categoriaNombre, monto: f.monto, ganadores: [] };
        porCategoria.set(f.categoriaId, grupo);
      }
      grupo.ganadores.push({ empresaNombre: f.empresaNombre, posicionFinal: f.posicionFinal ?? 0 });
    }

    return {
      convocatoriaNombre: convocatoria.nombre,
      fechaPublicacionResultados: convocatoria.fechaPublicacionResultados,
      categorias: [...porCategoria.values()],
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

    // cada categoria incluye su premio/bases + su formulario + sus documentos
    const categorias = await this.publicRepo.findCategoriasByConvocatoriaId(id);
    const categoriasDetalle = await Promise.all(
      categorias.map(async (cat) => {
        const [formulario, documentos] = await Promise.all([
          this.publicRepo.findFormularioByCategoriaId(cat.id),
          this.publicRepo.findDocumentosByCategoriaId(cat.id),
        ]);
        return { ...cat, formulario, documentos };
      }),
    );

    return { ...convocatoria, categorias: categoriasDetalle };
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
      throw new NotFoundException('Publicación no encontrada');
    }
    return pub;
  }

  async findCategorias() {
    return this.publicRepo.findCategorias();
  }
}
