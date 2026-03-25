import { Injectable, Inject } from '@nestjs/common';
import { count, asc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import { preguntaFrecuente } from '@superstars/db';

export interface FindAllParams {
  page: number;
  limit: number;
}

@Injectable()
export class FaqRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // Buscar por ID
  async findById(id: number) {
    const rows = await this.db
      .select()
      .from(preguntaFrecuente)
      .where(eq(preguntaFrecuente.id, id));
    return rows[0] ?? null;
  }

  // Listar con paginacion (admin)
  async findAll(params: FindAllParams) {
    const { page, limit } = params;
    const offset = (page - 1) * limit;

    const [data, totalResult] = await Promise.all([
      this.db
        .select()
        .from(preguntaFrecuente)
        .orderBy(asc(preguntaFrecuente.orden), asc(preguntaFrecuente.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(preguntaFrecuente),
    ]);

    return { data, total: Number(totalResult[0].count) };
  }

  // Listar todas ordenadas (endpoint publico)
  async findAllPublic() {
    return this.db
      .select()
      .from(preguntaFrecuente)
      .orderBy(asc(preguntaFrecuente.orden), asc(preguntaFrecuente.id));
  }

  // Crear
  async create(data: { pregunta: string; respuesta: string; orden: number }) {
    const [created] = await this.db
      .insert(preguntaFrecuente)
      .values(data)
      .returning();
    return created;
  }

  // Actualizar
  async update(id: number, data: Partial<{ pregunta: string; respuesta: string; orden: number }>) {
    const [updated] = await this.db
      .update(preguntaFrecuente)
      .set(data)
      .where(eq(preguntaFrecuente.id, id))
      .returning();
    return updated ?? null;
  }

  // Eliminar
  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(preguntaFrecuente)
      .where(eq(preguntaFrecuente.id, id))
      .returning({ id: preguntaFrecuente.id });
    return result.length > 0;
  }
}
