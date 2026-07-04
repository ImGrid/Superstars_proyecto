import { Injectable, Inject } from '@nestjs/common';
import { eq, and, or, ilike, count, desc, asc, isNull, ne, sql, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import { convocatoria, categoriaConvocatoria, formularioDinamico, documentoCategoria, publicacion, categoriaPublicacion, postulacion, empresa } from '@superstars/db';
import { ESTADO_CONVOCATORIA_PUBLICO, EstadoConvocatoria } from '@superstars/shared';
import type { EstadoPublicacion } from '@superstars/shared';

// Columnas seguras para el listado publico (excluye createdBy, topNSistema).
// El premio/bases viven en las categorias, no aqui.
const publicConvocatoriaColumns = {
  id: convocatoria.id,
  nombre: convocatoria.nombre,
  descripcion: convocatoria.descripcion,
  fechaInicioPostulacion: convocatoria.fechaInicioPostulacion,
  fechaCierrePostulacion: convocatoria.fechaCierrePostulacion,
  fechaAnuncioGanadores: convocatoria.fechaAnuncioGanadores,
  fechaCierreEfectiva: convocatoria.fechaCierreEfectiva,
  departamentos: convocatoria.departamentos,
  estado: convocatoria.estado,
  imagenKey: convocatoria.imagenKey,
  fechaPublicacionResultados: convocatoria.fechaPublicacionResultados,
  createdAt: convocatoria.createdAt,
  updatedAt: convocatoria.updatedAt,
} as const;

export interface FindPublicConvocatoriasParams {
  page: number;
  limit: number;
  search?: string;
  tipo: 'activas' | 'anteriores';
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

  async findPublicConvocatorias(params: FindPublicConvocatoriasParams) {
    const { page, limit, search, tipo } = params;
    const offset = (page - 1) * limit;

    // activas = publicado, anteriores = cerrado/en_evaluacion/finalizado
    const estadosAnteriores = [
      EstadoConvocatoria.CERRADO as 'cerrado',
      EstadoConvocatoria.EN_EVALUACION as 'en_evaluacion',
      EstadoConvocatoria.RESULTADOS_LISTOS as 'resultados_listos',
      EstadoConvocatoria.FINALIZADO as 'finalizado',
    ];

    const conditions = [
      tipo === 'activas'
        ? eq(convocatoria.estado, ESTADO_CONVOCATORIA_PUBLICO)
        : inArray(convocatoria.estado, estadosAnteriores),
    ];

    if (search) {
      conditions.push(
        or(
          ilike(convocatoria.nombre, `%${search}%`),
          ilike(convocatoria.descripcion, `%${search}%`),
        )!,
      );
    }

    const where = and(...conditions);

    const [data, totalResult] = await Promise.all([
      this.db.select(publicConvocatoriaColumns).from(convocatoria).where(where)
        .orderBy(desc(convocatoria.createdAt))
        .limit(limit).offset(offset),
      this.db.select({ count: count() }).from(convocatoria).where(where),
    ]);

    return { data, total: Number(totalResult[0].count) };
  }

  async findPublicConvocatoriaById(id: number) {
    const rows = await this.db
      .select(publicConvocatoriaColumns)
      .from(convocatoria)
      .where(eq(convocatoria.id, id));
    return rows[0] ?? null;
  }

  // Categorias de la convocatoria (datos publicos: premio, bases, etc.)
  async findCategoriasByConvocatoriaId(convocatoriaId: number) {
    return this.db
      .select({
        id: categoriaConvocatoria.id,
        nombre: categoriaConvocatoria.nombre,
        descripcion: categoriaConvocatoria.descripcion,
        bases: categoriaConvocatoria.bases,
        monto: categoriaConvocatoria.monto,
        numeroGanadores: categoriaConvocatoria.numeroGanadores,
        orden: categoriaConvocatoria.orden,
      })
      .from(categoriaConvocatoria)
      .where(eq(categoriaConvocatoria.convocatoriaId, convocatoriaId))
      .orderBy(asc(categoriaConvocatoria.orden));
  }

  async findFormularioByCategoriaId(categoriaId: number) {
    const rows = await this.db
      .select({
        id: formularioDinamico.id,
        nombre: formularioDinamico.nombre,
        descripcion: formularioDinamico.descripcion,
        schemaDefinition: formularioDinamico.schemaDefinition,
        version: formularioDinamico.version,
      })
      .from(formularioDinamico)
      .where(eq(formularioDinamico.categoriaId, categoriaId));
    return rows[0] ?? null;
  }

  // Documentos de la categoria (metadata sin storageKey; excluye los de proposito 'jurado')
  async findDocumentosByCategoriaId(categoriaId: number) {
    return this.db
      .select({
        id: documentoCategoria.id,
        nombre: documentoCategoria.nombre,
        nombreOriginal: documentoCategoria.nombreOriginal,
        mimeType: documentoCategoria.mimeType,
        tamanoBytes: documentoCategoria.tamanoBytes,
        orden: documentoCategoria.orden,
      })
      .from(documentoCategoria)
      .where(and(
        eq(documentoCategoria.categoriaId, categoriaId),
        ne(documentoCategoria.proposito, 'jurado'),
      ))
      .orderBy(documentoCategoria.orden, documentoCategoria.id);
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

  // ganadores de una convocatoria, con su categoria (para agrupar y mostrar el premio)
  async findGanadores(convocatoriaId: number) {
    return this.db
      .select({
        categoriaId: categoriaConvocatoria.id,
        categoriaNombre: categoriaConvocatoria.nombre,
        monto: categoriaConvocatoria.monto,
        empresaNombre: empresa.razonSocial,
        posicionFinal: postulacion.posicionFinal,
      })
      .from(postulacion)
      .innerJoin(empresa, eq(postulacion.empresaId, empresa.id))
      .innerJoin(categoriaConvocatoria, eq(postulacion.categoriaId, categoriaConvocatoria.id))
      .where(and(
        eq(postulacion.convocatoriaId, convocatoriaId),
        eq(postulacion.estado, 'ganador' as any),
      ))
      .orderBy(asc(categoriaConvocatoria.orden), asc(postulacion.posicionFinal));
  }
}
