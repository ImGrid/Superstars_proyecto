import { Injectable, Inject } from '@nestjs/common';
import { eq, and, asc, desc, count, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import { categoriaConvocatoria, evaluadorCategoria, convocatoria, usuario } from '@superstars/db';

@Injectable()
export class CategoriaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // --- Categoria ---

  // obtiene una categoria por id (null si no existe)
  async getById(categoriaId: number) {
    const rows = await this.db
      .select()
      .from(categoriaConvocatoria)
      .where(eq(categoriaConvocatoria.id, categoriaId));
    return rows[0] ?? null;
  }

  // lista las categorias de una convocatoria, ordenadas por orden
  async findByConvocatoriaId(convocatoriaId: number) {
    return this.db
      .select()
      .from(categoriaConvocatoria)
      .where(eq(categoriaConvocatoria.convocatoriaId, convocatoriaId))
      .orderBy(asc(categoriaConvocatoria.orden));
  }

  async create(data: {
    convocatoriaId: number;
    nombre: string;
    descripcion?: string | null;
    bases?: string | null;
    monto: string;
    numeroGanadores?: number;
    topNSistema?: number;
    orden?: number;
  }) {
    const [created] = await this.db
      .insert(categoriaConvocatoria)
      .values(data)
      .returning();
    return created;
  }

  async update(id: number, data: Partial<{
    nombre: string;
    descripcion: string | null;
    bases: string | null;
    monto: string;
    numeroGanadores: number;
    topNSistema: number;
    orden: number;
  }>) {
    const [updated] = await this.db
      .update(categoriaConvocatoria)
      .set(data)
      .where(eq(categoriaConvocatoria.id, id))
      .returning();
    return updated ?? null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(categoriaConvocatoria)
      .where(eq(categoriaConvocatoria.id, id))
      .returning({ id: categoriaConvocatoria.id });
    return result.length > 0;
  }

  // estado de la convocatoria padre (para la guardia de "solo editable en borrador")
  async getConvocatoriaEstado(convocatoriaId: number): Promise<string | null> {
    const rows = await this.db
      .select({ estado: convocatoria.estado })
      .from(convocatoria)
      .where(eq(convocatoria.id, convocatoriaId))
      .limit(1);
    return rows[0]?.estado ?? null;
  }

  // --- Resolucion (seleccion de ganadores por categoria) ---

  // marca la categoria como resuelta (ganadores seleccionados) con timestamp
  async marcarResuelta(categoriaId: number) {
    await this.db
      .update(categoriaConvocatoria)
      .set({ fechaSeleccionGanadores: new Date().toISOString() })
      .where(eq(categoriaConvocatoria.id, categoriaId));
  }

  // cuenta las categorias de la convocatoria que aun NO tienen ganadores seleccionados
  async countCategoriasNoResueltas(convocatoriaId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(categoriaConvocatoria)
      .where(and(
        eq(categoriaConvocatoria.convocatoriaId, convocatoriaId),
        isNull(categoriaConvocatoria.fechaSeleccionGanadores),
      ));
    return Number(result.count);
  }

  // --- Pool de evaluadores (nivel 1) ---

  // verifica si un evaluador esta en el pool de una categoria
  async isEvaluadorDeCategoria(categoriaId: number, evaluadorId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: evaluadorCategoria.id })
      .from(evaluadorCategoria)
      .where(and(
        eq(evaluadorCategoria.categoriaId, categoriaId),
        eq(evaluadorCategoria.evaluadorId, evaluadorId),
      ))
      .limit(1);
    return rows.length > 0;
  }

  async findEvaluadores(categoriaId: number) {
    return this.db
      .select({
        id: evaluadorCategoria.id,
        evaluadorId: evaluadorCategoria.evaluadorId,
        email: usuario.email,
        nombre: usuario.nombre,
        createdAt: evaluadorCategoria.createdAt,
      })
      .from(evaluadorCategoria)
      .innerJoin(usuario, eq(evaluadorCategoria.evaluadorId, usuario.id))
      .where(eq(evaluadorCategoria.categoriaId, categoriaId))
      .orderBy(desc(evaluadorCategoria.createdAt));
  }

  async addEvaluador(categoriaId: number, evaluadorId: number, asignadoPor: number) {
    const [created] = await this.db
      .insert(evaluadorCategoria)
      .values({ categoriaId, evaluadorId, asignadoPor })
      .returning();
    return created;
  }

  async removeEvaluador(categoriaId: number, evaluadorId: number): Promise<boolean> {
    const result = await this.db
      .delete(evaluadorCategoria)
      .where(and(
        eq(evaluadorCategoria.categoriaId, categoriaId),
        eq(evaluadorCategoria.evaluadorId, evaluadorId),
      ))
      .returning({ id: evaluadorCategoria.id });
    return result.length > 0;
  }
}
