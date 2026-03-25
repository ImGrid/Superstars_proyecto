import { Injectable, Inject } from '@nestjs/common';
import { eq, or, ilike, count, desc } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import { empresa } from '@superstars/db';
import type { InferInsertModel } from 'drizzle-orm';

export interface FindAllEmpresasParams {
  page: number;
  limit: number;
  search?: string;
}

@Injectable()
export class EmpresaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findById(id: number) {
    const rows = await this.db
      .select()
      .from(empresa)
      .where(eq(empresa.id, id));
    return rows[0] ?? null;
  }

  async findByUsuarioId(usuarioId: number) {
    const rows = await this.db
      .select()
      .from(empresa)
      .where(eq(empresa.usuarioId, usuarioId));
    return rows[0] ?? null;
  }

  async findAll(params: FindAllEmpresasParams) {
    const { page, limit, search } = params;
    const offset = (page - 1) * limit;

    const where = search
      ? or(
          ilike(empresa.razonSocial, `%${search}%`),
          ilike(empresa.nit, `%${search}%`),
        )
      : undefined;

    const [data, totalResult] = await Promise.all([
      this.db
        .select()
        .from(empresa)
        .where(where)
        .orderBy(desc(empresa.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(empresa)
        .where(where),
    ]);

    return { data, total: Number(totalResult[0].count) };
  }

  async create(data: InferInsertModel<typeof empresa>) {
    const [created] = await this.db
      .insert(empresa)
      .values(data)
      .returning();
    return created;
  }

  async update(id: number, data: Partial<Omit<InferInsertModel<typeof empresa>, 'id' | 'usuarioId' | 'createdAt' | 'updatedAt'>>) {
    const [updated] = await this.db
      .update(empresa)
      .set(data)
      .where(eq(empresa.id, id))
      .returning();
    return updated ?? null;
  }

  async existsByUsuarioId(usuarioId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: empresa.id })
      .from(empresa)
      .where(eq(empresa.usuarioId, usuarioId))
      .limit(1);
    return rows.length > 0;
  }

  async existsByNit(nit: string, excludeId?: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: empresa.id })
      .from(empresa)
      .where(eq(empresa.nit, nit))
      .limit(1);
    if (rows.length === 0) return false;
    // Si estamos actualizando, excluir la empresa actual
    if (excludeId !== undefined) return rows[0].id !== excludeId;
    return true;
  }
}
