import { Injectable, Inject } from '@nestjs/common';
import { eq, and, asc, sum } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import { rubrica, criterio, subCriterio, nivelEvaluacion } from '@superstars/db';

@Injectable()
export class RubricaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // --- Rubrica ---

  async findByConcursoId(concursoId: number) {
    const rows = await this.db
      .select()
      .from(rubrica)
      .where(eq(rubrica.concursoId, concursoId));
    return rows[0] ?? null;
  }

  // Arbol completo: rubrica + criterios + sub-criterios + niveles
  async findFullTree(concursoId: number) {
    return this.db.query.rubrica.findFirst({
      where: eq(rubrica.concursoId, concursoId),
      with: {
        criterios: {
          orderBy: [asc(criterio.orden)],
          with: {
            subCriterios: {
              orderBy: [asc(subCriterio.orden)],
              with: {
                nivelEvaluacions: true,
              },
            },
          },
        },
      },
    });
  }

  async createRubrica(data: {
    concursoId: number;
    nombre: string;
    descripcion?: string;
    puntajeTotal: string;
  }) {
    const [created] = await this.db
      .insert(rubrica)
      .values(data)
      .returning();
    return created;
  }

  async updateRubrica(id: number, data: Partial<{
    nombre: string;
    descripcion: string;
    puntajeTotal: string;
  }>) {
    const [updated] = await this.db
      .update(rubrica)
      .set(data)
      .where(eq(rubrica.id, id))
      .returning();
    return updated ?? null;
  }

  async deleteRubrica(concursoId: number): Promise<boolean> {
    const result = await this.db
      .delete(rubrica)
      .where(eq(rubrica.concursoId, concursoId))
      .returning({ id: rubrica.id });
    return result.length > 0;
  }

  // --- Criterio ---

  async findCriterioById(id: number) {
    const rows = await this.db
      .select()
      .from(criterio)
      .where(eq(criterio.id, id));
    return rows[0] ?? null;
  }

  // Verificar que un criterio pertenece a la rubrica del concurso
  async findCriterioByIdAndConcurso(criterioId: number, concursoId: number) {
    const rows = await this.db
      .select({ criterio, rubrica })
      .from(criterio)
      .innerJoin(rubrica, eq(criterio.rubricaId, rubrica.id))
      .where(and(
        eq(criterio.id, criterioId),
        eq(rubrica.concursoId, concursoId),
      ));
    return rows[0] ?? null;
  }

  async createCriterio(data: {
    rubricaId: number;
    tipo: string;
    nombre: string;
    descripcion?: string;
    pesoPorcentaje: string;
    orden: number;
  }) {
    const [created] = await this.db
      .insert(criterio)
      .values(data as any)
      .returning();
    return created;
  }

  async updateCriterio(id: number, data: Partial<{
    tipo: string;
    nombre: string;
    descripcion: string;
    pesoPorcentaje: string;
    orden: number;
  }>) {
    const [updated] = await this.db
      .update(criterio)
      .set(data as any)
      .where(eq(criterio.id, id))
      .returning();
    return updated ?? null;
  }

  async deleteCriterio(id: number): Promise<boolean> {
    const result = await this.db
      .delete(criterio)
      .where(eq(criterio.id, id))
      .returning({ id: criterio.id });
    return result.length > 0;
  }

  // --- Sub-criterio ---

  // Verificar que un sub-criterio pertenece al concurso (join sub_criterio->criterio->rubrica)
  async findSubCriterioByIdAndConcurso(subCriterioId: number, concursoId: number) {
    const rows = await this.db
      .select({ subCriterio, criterio, rubrica })
      .from(subCriterio)
      .innerJoin(criterio, eq(subCriterio.criterioId, criterio.id))
      .innerJoin(rubrica, eq(criterio.rubricaId, rubrica.id))
      .where(and(
        eq(subCriterio.id, subCriterioId),
        eq(rubrica.concursoId, concursoId),
      ));
    return rows[0] ?? null;
  }

  // Crear sub-criterio + 3 niveles en transaccion
  async createSubCriterioConNiveles(
    subData: {
      criterioId: number;
      nombre: string;
      descripcion?: string;
      pesoPorcentaje: string;
      orden: number;
    },
    nivelesData: Array<{
      nivel: string;
      descripcion: string;
      puntajeMin: string;
      puntajeMax: string;
    }>,
  ) {
    return this.db.transaction(async (tx) => {
      const [sc] = await tx
        .insert(subCriterio)
        .values(subData)
        .returning();

      const niveles = await tx
        .insert(nivelEvaluacion)
        .values(nivelesData.map(n => ({
          subCriterioId: sc.id,
          nivel: n.nivel as any,
          descripcion: n.descripcion,
          puntajeMin: n.puntajeMin,
          puntajeMax: n.puntajeMax,
        })))
        .returning();

      return { ...sc, niveles };
    });
  }

  async updateSubCriterio(id: number, data: Partial<{
    nombre: string;
    descripcion: string;
    pesoPorcentaje: string;
    orden: number;
  }>) {
    const [updated] = await this.db
      .update(subCriterio)
      .set(data)
      .where(eq(subCriterio.id, id))
      .returning();
    return updated ?? null;
  }

  async deleteSubCriterio(id: number): Promise<boolean> {
    const result = await this.db
      .delete(subCriterio)
      .where(eq(subCriterio.id, id))
      .returning({ id: subCriterio.id });
    return result.length > 0;
  }

  // --- Nivel evaluacion ---

  // Verificar que un nivel pertenece al concurso (join nivel->sub_criterio->criterio->rubrica)
  async findNivelByIdAndConcurso(nivelId: number, concursoId: number) {
    const rows = await this.db
      .select({ nivelEvaluacion, subCriterio, criterio, rubrica })
      .from(nivelEvaluacion)
      .innerJoin(subCriterio, eq(nivelEvaluacion.subCriterioId, subCriterio.id))
      .innerJoin(criterio, eq(subCriterio.criterioId, criterio.id))
      .innerJoin(rubrica, eq(criterio.rubricaId, rubrica.id))
      .where(and(
        eq(nivelEvaluacion.id, nivelId),
        eq(rubrica.concursoId, concursoId),
      ));
    return rows[0] ?? null;
  }

  async updateNivel(id: number, data: Partial<{
    descripcion: string;
    puntajeMin: string;
    puntajeMax: string;
  }>) {
    const [updated] = await this.db
      .update(nivelEvaluacion)
      .set(data)
      .where(eq(nivelEvaluacion.id, id))
      .returning();
    return updated ?? null;
  }

  async deleteNivel(id: number): Promise<boolean> {
    const result = await this.db
      .delete(nivelEvaluacion)
      .where(eq(nivelEvaluacion.id, id))
      .returning({ id: nivelEvaluacion.id });
    return result.length > 0;
  }
}
