import { Injectable, Inject } from '@nestjs/common';
import { count, asc, eq, isNull, and } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import { preguntaFrecuente } from '@superstars/db';

export interface FindAllParams {
  page: number;
  limit: number;
  categoria?: string;
  convocatoriaId?: number;
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

  // Listar con paginacion y filtros opcionales (admin)
  async findAll(params: FindAllParams) {
    const { page, limit, categoria, convocatoriaId } = params;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (categoria) conditions.push(eq(preguntaFrecuente.categoria, categoria));
    if (convocatoriaId !== undefined) conditions.push(eq(preguntaFrecuente.convocatoriaId, convocatoriaId));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      this.db
        .select()
        .from(preguntaFrecuente)
        .where(where)
        .orderBy(asc(preguntaFrecuente.categoria), asc(preguntaFrecuente.orden), asc(preguntaFrecuente.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(preguntaFrecuente)
        .where(where),
    ]);

    return { data, total: Number(totalResult[0].count) };
  }

  // Listar preguntas generales ordenadas (endpoint publico /faq)
  // Solo retorna preguntas sin convocatoria asignada
  async findAllPublic() {
    return this.db
      .select()
      .from(preguntaFrecuente)
      .where(isNull(preguntaFrecuente.convocatoriaId))
      .orderBy(asc(preguntaFrecuente.categoria), asc(preguntaFrecuente.orden), asc(preguntaFrecuente.id));
  }

  // Listar preguntas de una convocatoria especifica (endpoint publico /faq/convocatoria/:id)
  async findByConvocatoriaId(convocatoriaId: number) {
    return this.db
      .select()
      .from(preguntaFrecuente)
      .where(eq(preguntaFrecuente.convocatoriaId, convocatoriaId))
      .orderBy(asc(preguntaFrecuente.orden), asc(preguntaFrecuente.id));
  }

  // Crear
  async create(data: {
    pregunta: string;
    respuesta: string;
    orden: number;
    categoria: string;
    convocatoriaId?: number | null;
  }) {
    const [created] = await this.db
      .insert(preguntaFrecuente)
      .values(data)
      .returning();
    return created;
  }

  // Actualizar
  async update(id: number, data: Partial<{
    pregunta: string;
    respuesta: string;
    orden: number;
    categoria: string;
    convocatoriaId: number | null;
  }>) {
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
