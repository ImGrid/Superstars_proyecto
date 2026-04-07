import { Injectable, Inject } from '@nestjs/common';
import { eq, and, or, ilike, count, desc, isNull, sql, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import { concurso, formularioDinamico, documentoConcurso, publicacion, categoriaPublicacion } from '@superstars/db';
import { ESTADO_CONCURSO_PUBLICO, EstadoConcurso } from '@superstars/shared';
import type { EstadoPublicacion } from '@superstars/shared';

// Columnas seguras para el listado publico (excluye createdBy, topNSistema)
const publicConcursoColumns = {
  id: concurso.id,
  nombre: concurso.nombre,
  descripcion: concurso.descripcion,
  bases: concurso.bases,
  fechaInicioPostulacion: concurso.fechaInicioPostulacion,
  fechaCierrePostulacion: concurso.fechaCierrePostulacion,
  fechaAnuncioGanadores: concurso.fechaAnuncioGanadores,
  fechaCierreEfectiva: concurso.fechaCierreEfectiva,
  montoPremio: concurso.montoPremio,
  numeroGanadores: concurso.numeroGanadores,
  departamentos: concurso.departamentos,
  estado: concurso.estado,
  fechaPublicacionResultados: concurso.fechaPublicacionResultados,
  createdAt: concurso.createdAt,
  updatedAt: concurso.updatedAt,
} as const;

export interface FindPublicConcursosParams {
  page: number;
  limit: number;
  search?: string;
  tipo: 'activos' | 'anteriores';
}

export interface FindPublicPublicacionesParams {
  page: number;
  limit: number;
  categoriaId?: number;
  search?: string;
}

@Injectable()
export class PublicRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findPublicConcursos(params: FindPublicConcursosParams) {
    const { page, limit, search, tipo } = params;
    const offset = (page - 1) * limit;

    // activos = publicado, anteriores = cerrado/en_evaluacion/finalizado
    const estadosAnteriores = [
      EstadoConcurso.CERRADO as 'cerrado',
      EstadoConcurso.EN_EVALUACION as 'en_evaluacion',
      EstadoConcurso.FINALIZADO as 'finalizado',
    ];

    const conditions = [
      tipo === 'activos'
        ? eq(concurso.estado, ESTADO_CONCURSO_PUBLICO)
        : inArray(concurso.estado, estadosAnteriores),
    ];

    if (search) {
      conditions.push(
        or(
          ilike(concurso.nombre, `%${search}%`),
          ilike(concurso.descripcion, `%${search}%`),
        )!,
      );
    }

    const where = and(...conditions);

    const [data, totalResult] = await Promise.all([
      this.db.select(publicConcursoColumns).from(concurso).where(where)
        .orderBy(desc(concurso.createdAt))
        .limit(limit).offset(offset),
      this.db.select({ count: count() }).from(concurso).where(where),
    ]);

    return { data, total: Number(totalResult[0].count) };
  }

  async findPublicConcursoById(id: number) {
    const rows = await this.db
      .select(publicConcursoColumns)
      .from(concurso)
      .where(eq(concurso.id, id));
    return rows[0] ?? null;
  }

  async findFormularioByConcursoId(concursoId: number) {
    const rows = await this.db
      .select({
        id: formularioDinamico.id,
        nombre: formularioDinamico.nombre,
        descripcion: formularioDinamico.descripcion,
        schemaDefinition: formularioDinamico.schemaDefinition,
        version: formularioDinamico.version,
      })
      .from(formularioDinamico)
      .where(eq(formularioDinamico.concursoId, concursoId));
    return rows[0] ?? null;
  }

  // Documentos del concurso (solo metadata, sin storageKey)
  async findDocumentosByConcursoId(concursoId: number) {
    return this.db
      .select({
        id: documentoConcurso.id,
        nombre: documentoConcurso.nombre,
        nombreOriginal: documentoConcurso.nombreOriginal,
        mimeType: documentoConcurso.mimeType,
        tamanoBytes: documentoConcurso.tamanoBytes,
        orden: documentoConcurso.orden,
      })
      .from(documentoConcurso)
      .where(eq(documentoConcurso.concursoId, concursoId))
      .orderBy(documentoConcurso.orden, documentoConcurso.id);
  }

  // --- Publicaciones publicas ---

  async findPublicaciones(params: FindPublicPublicacionesParams) {
    const { page, limit, categoriaId, search } = params;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(publicacion.estado, 'publicado' as EstadoPublicacion),
      sql`${publicacion.fechaPublicacion} <= now()`,
      or(
        isNull(publicacion.fechaExpiracion),
        sql`${publicacion.fechaExpiracion} > now()`,
      )!,
    ];

    if (categoriaId) conditions.push(eq(publicacion.categoriaId, categoriaId));
    if (search) {
      conditions.push(
        or(
          ilike(publicacion.titulo, `%${search}%`),
          ilike(publicacion.extracto, `%${search}%`),
        )!,
      );
    }

    const where = and(...conditions);

    const publicacionColumns = {
      id: publicacion.id,
      titulo: publicacion.titulo,
      slug: publicacion.slug,
      extracto: publicacion.extracto,
      categoriaId: publicacion.categoriaId,
      imagenDestacadaKey: publicacion.imagenDestacadaKey,
      fechaPublicacion: publicacion.fechaPublicacion,
      destacado: publicacion.destacado,
      categoriaNombre: categoriaPublicacion.nombre,
    } as const;

    const [data, totalResult] = await Promise.all([
      this.db.select(publicacionColumns)
        .from(publicacion)
        .leftJoin(categoriaPublicacion, eq(publicacion.categoriaId, categoriaPublicacion.id))
        .where(where)
        .orderBy(desc(publicacion.fechaPublicacion))
        .limit(limit).offset(offset),
      this.db.select({ count: count() })
        .from(publicacion)
        .where(where),
    ]);

    return { data, total: Number(totalResult[0].count) };
  }

  async findPublicacionBySlug(slug: string) {
    const conditions = [
      eq(publicacion.slug, slug),
      eq(publicacion.estado, 'publicado' as EstadoPublicacion),
      sql`${publicacion.fechaPublicacion} <= now()`,
      or(
        isNull(publicacion.fechaExpiracion),
        sql`${publicacion.fechaExpiracion} > now()`,
      )!,
    ];

    const rows = await this.db
      .select({
        id: publicacion.id,
        titulo: publicacion.titulo,
        slug: publicacion.slug,
        extracto: publicacion.extracto,
        contenido: publicacion.contenido,
        categoriaId: publicacion.categoriaId,
        imagenDestacadaKey: publicacion.imagenDestacadaKey,
        fechaPublicacion: publicacion.fechaPublicacion,
        destacado: publicacion.destacado,
        categoriaNombre: categoriaPublicacion.nombre,
      })
      .from(publicacion)
      .leftJoin(categoriaPublicacion, eq(publicacion.categoriaId, categoriaPublicacion.id))
      .where(and(...conditions));

    return rows[0] ?? null;
  }

  async findCategorias() {
    return this.db.select().from(categoriaPublicacion).orderBy(categoriaPublicacion.nombre);
  }
}
