import { Injectable, Inject } from '@nestjs/common';
import { eq, and, or, ilike, count, asc, desc, sql, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import { historiaExito, empresa } from '@superstars/db';

export interface FindAllHistoriasParams {
  page: number;
  limit: number;
  search?: string;
}

@Injectable()
export class HistoriaExitoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // --- Lecturas ---

  async findById(id: number) {
    const rows = await this.db.select().from(historiaExito).where(eq(historiaExito.id, id));
    return rows[0] ?? null;
  }

  async findAll(params: FindAllHistoriasParams) {
    const { page, limit, search } = params;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(historiaExito.titulo, `%${search}%`),
          ilike(historiaExito.descripcion, `%${search}%`),
          ilike(historiaExito.empresaNombre, `%${search}%`),
        )!,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      this.db
        .select()
        .from(historiaExito)
        .where(where)
        .orderBy(desc(historiaExito.activa), asc(historiaExito.orden), asc(historiaExito.id))
        .limit(limit)
        .offset(offset),
      this.db.select({ count: count() }).from(historiaExito).where(where),
    ]);

    return { data, total: Number(totalResult[0].count) };
  }

  // Lista publica (landing): solo activas, ordenadas. Sin paginacion (max 6 por cap).
  async findAllPublic() {
    return this.db
      .select({
        id: historiaExito.id,
        titulo: historiaExito.titulo,
        badge: historiaExito.badge,
        descripcion: historiaExito.descripcion,
        empresaNombre: historiaExito.empresaNombre,
        imagenKey: historiaExito.imagenKey,
      })
      .from(historiaExito)
      .where(eq(historiaExito.activa, true))
      .orderBy(asc(historiaExito.orden), asc(historiaExito.id));
  }

  async countActivas(): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(historiaExito)
      .where(eq(historiaExito.activa, true));
    return Number(result[0].count);
  }

  // Siguiente orden disponible (max + 1). Devuelve 0 si no hay registros.
  async getNextOrden(): Promise<number> {
    const result = await this.db
      .select({ maxOrden: sql<number | null>`MAX(${historiaExito.orden})` })
      .from(historiaExito);
    const max = result[0]?.maxOrden;
    return max === null || max === undefined ? 0 : Number(max) + 1;
  }

  // Verifica que todos los IDs existen. Retorna IDs faltantes.
  async findMissingIds(ids: number[]): Promise<number[]> {
    if (ids.length === 0) return [];
    const found = await this.db
      .select({ id: historiaExito.id })
      .from(historiaExito)
      .where(inArray(historiaExito.id, ids));
    const foundIds = new Set(found.map((r) => r.id));
    return ids.filter((id) => !foundIds.has(id));
  }

  // Lookup rapido a empresa para snapshot del nombre (evita acoplar a EmpresaRepository).
  async findEmpresaRazonSocial(empresaId: number): Promise<string | null> {
    const rows = await this.db
      .select({ razonSocial: empresa.razonSocial })
      .from(empresa)
      .where(eq(empresa.id, empresaId));
    return rows[0]?.razonSocial ?? null;
  }

  // --- Escrituras ---

  async create(data: {
    titulo: string;
    badge: string | null;
    descripcion: string;
    imagenKey: string;
    empresaId: number | null;
    empresaNombre: string | null;
    orden: number;
    activa: boolean;
  }) {
    const [created] = await this.db.insert(historiaExito).values(data).returning();
    return created;
  }

  async update(
    id: number,
    data: Partial<{
      titulo: string;
      badge: string | null;
      descripcion: string;
      imagenKey: string;
      empresaId: number | null;
      empresaNombre: string | null;
      orden: number;
      activa: boolean;
    }>,
  ) {
    const [updated] = await this.db
      .update(historiaExito)
      .set(data)
      .where(eq(historiaExito.id, id))
      .returning();
    return updated ?? null;
  }

  // Reordenar en una sola transaccion: asigna orden 0..N-1 segun posicion en el array.
  async reorder(ids: number[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx
          .update(historiaExito)
          .set({ orden: i })
          .where(eq(historiaExito.id, ids[i]));
      }
    });
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(historiaExito)
      .where(eq(historiaExito.id, id))
      .returning({ id: historiaExito.id });
    return result.length > 0;
  }
}
