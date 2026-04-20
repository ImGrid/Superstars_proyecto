import { Injectable, Inject } from '@nestjs/common';
import { count, asc, eq, isNull, and } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import { preguntaFrecuente } from '@superstars/db';

export interface FindAllParams {
  page: number;
  limit: number;
  categoria?: string;
  concursoId?: number;
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
    const { page, limit, categoria, concursoId } = params;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (categoria) conditions.push(eq(preguntaFrecuente.categoria, categoria));
    if (concursoId !== undefined) conditions.push(eq(preguntaFrecuente.concursoId, concursoId));
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
  // Solo retorna preguntas sin concurso asignado
  async findAllPublic() {
    return this.db
      .select()
      .from(preguntaFrecuente)
      .where(isNull(preguntaFrecuente.concursoId))
      .orderBy(asc(preguntaFrecuente.categoria), asc(preguntaFrecuente.orden), asc(preguntaFrecuente.id));
  }

  // Listar preguntas de un concurso especifico (endpoint publico /faq/concurso/:id)
  async findByConcursoId(concursoId: number) {
    return this.db
      .select()
      .from(preguntaFrecuente)
      .where(eq(preguntaFrecuente.concursoId, concursoId))
      .orderBy(asc(preguntaFrecuente.orden), asc(preguntaFrecuente.id));
  }

  // Crear
  async create(data: {
    pregunta: string;
    respuesta: string;
    orden: number;
    categoria: string;
    concursoId?: number | null;
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
    concursoId: number | null;
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
