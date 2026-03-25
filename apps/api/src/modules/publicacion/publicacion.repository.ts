import { Injectable, Inject } from '@nestjs/common';
import { eq, and, or, ilike, count, desc, sql, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import { publicacion, categoriaPublicacion } from '@superstars/db';
import type { EstadoPublicacion } from '@superstars/shared';

export interface FindAllPublicacionesParams {
  page: number;
  limit: number;
  estado?: string;
  categoriaId?: number;
  search?: string;
}

export interface FindPublicadasParams {
  page: number;
  limit: number;
  categoriaId?: number;
  search?: string;
}

@Injectable()
export class PublicacionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // --- CRUD ---

  async findById(id: number) {
    const rows = await this.db
      .select()
      .from(publicacion)
      .where(eq(publicacion.id, id));
    return rows[0] ?? null;
  }

  async findAll(params: FindAllPublicacionesParams) {
    const { page, limit, estado, categoriaId, search } = params;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (estado) conditions.push(eq(publicacion.estado, estado as EstadoPublicacion));
    if (categoriaId) conditions.push(eq(publicacion.categoriaId, categoriaId));
    if (search) {
      conditions.push(
        or(
          ilike(publicacion.titulo, `%${search}%`),
          ilike(publicacion.extracto, `%${search}%`),
        )!,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      this.db.select().from(publicacion).where(where)
        .orderBy(desc(publicacion.createdAt))
        .limit(limit).offset(offset),
      this.db.select({ count: count() }).from(publicacion).where(where),
    ]);

    return { data, total: Number(totalResult[0].count) };
  }

  async findBySlug(slug: string) {
    const rows = await this.db
      .select()
      .from(publicacion)
      .where(eq(publicacion.slug, slug));
    return rows[0] ?? null;
  }

  async slugExists(slug: string, excludeId?: number): Promise<boolean> {
    const conditions = [eq(publicacion.slug, slug)];
    if (excludeId) {
      conditions.push(sql`${publicacion.id} != ${excludeId}`);
    }
    const rows = await this.db
      .select({ id: publicacion.id })
      .from(publicacion)
      .where(and(...conditions))
      .limit(1);
    return rows.length > 0;
  }

  async create(data: {
    titulo: string;
    slug: string;
    extracto: string | null;
    contenido: string;
    categoriaId?: number | null;
    destacado: boolean;
  }) {
    const [created] = await this.db
      .insert(publicacion)
      .values(data)
      .returning();
    return created;
  }

  async update(id: number, data: Partial<{
    titulo: string;
    slug: string;
    extracto: string | null;
    contenido: string;
    categoriaId: number | null;
    imagenDestacadaKey: string | null;
    fechaPublicacion: string | null;
    fechaExpiracion: string | null;
    destacado: boolean;
  }>) {
    const [updated] = await this.db
      .update(publicacion)
      .set(data)
      .where(eq(publicacion.id, id))
      .returning();
    return updated ?? null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(publicacion)
      .where(eq(publicacion.id, id))
      .returning({ id: publicacion.id });
    return result.length > 0;
  }

  // UPDATE atomico con WHERE estado = currentEstado (optimistic locking)
  async updateEstado(
    id: number,
    currentEstado: string,
    newEstado: string,
    extraData?: Partial<{
      fechaPublicacion: string | null;
      fechaExpiracion: string | null;
    }>,
  ) {
    const setData: Record<string, unknown> = { estado: newEstado };
    if (extraData) Object.assign(setData, extraData);

    const result = await this.db
      .update(publicacion)
      .set(setData)
      .where(and(
        eq(publicacion.id, id),
        eq(publicacion.estado, currentEstado as EstadoPublicacion),
      ))
      .returning();
    return result[0] ?? null;
  }

  // Cron: programado -> publicado cuando fecha_publicacion <= now()
  async publicarProgramadas(): Promise<number> {
    const result = await this.db
      .update(publicacion)
      .set({ estado: 'publicado' as EstadoPublicacion })
      .where(and(
        eq(publicacion.estado, 'programado' as EstadoPublicacion),
        sql`fecha_publicacion <= now()`,
      ))
      .returning({ id: publicacion.id });
    return result.length;
  }

  // Cron: publicado -> expirado cuando fecha_expiracion <= now()
  async expirarVencidas(): Promise<number> {
    const result = await this.db
      .update(publicacion)
      .set({ estado: 'expirado' as EstadoPublicacion })
      .where(and(
        eq(publicacion.estado, 'publicado' as EstadoPublicacion),
        sql`fecha_expiracion IS NOT NULL AND fecha_expiracion <= now()`,
      ))
      .returning({ id: publicacion.id });
    return result.length;
  }

  // Endpoint publico: publicaciones visibles con lazy eval
  async findPublicadas(params: FindPublicadasParams) {
    const { page, limit, categoriaId, search } = params;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(publicacion.estado, 'publicado' as EstadoPublicacion),
      sql`fecha_publicacion <= now()`,
      or(
        isNull(publicacion.fechaExpiracion),
        sql`fecha_expiracion > now()`,
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

    const publicColumns = {
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
      this.db.select(publicColumns)
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

  // Detalle publico por slug con lazy eval
  async findPublicadaBySlug(slug: string) {
    const conditions = [
      eq(publicacion.slug, slug),
      eq(publicacion.estado, 'publicado' as EstadoPublicacion),
      sql`fecha_publicacion <= now()`,
      or(
        isNull(publicacion.fechaExpiracion),
        sql`fecha_expiracion > now()`,
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

  // --- Categorias ---

  async findAllCategorias() {
    return this.db.select().from(categoriaPublicacion).orderBy(categoriaPublicacion.nombre);
  }

  async findCategoriaById(id: number) {
    const rows = await this.db
      .select()
      .from(categoriaPublicacion)
      .where(eq(categoriaPublicacion.id, id));
    return rows[0] ?? null;
  }

  async createCategoria(data: { nombre: string; slug: string; descripcion?: string }) {
    const [created] = await this.db
      .insert(categoriaPublicacion)
      .values(data)
      .returning();
    return created;
  }

  async deleteCategoria(id: number): Promise<boolean> {
    const result = await this.db
      .delete(categoriaPublicacion)
      .where(eq(categoriaPublicacion.id, id))
      .returning({ id: categoriaPublicacion.id });
    return result.length > 0;
  }
}
