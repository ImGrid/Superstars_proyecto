import { Injectable, Inject } from '@nestjs/common';
import { eq, ne, and, or, ilike, count, desc, sql, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import {
  concurso,
  responsableConcurso,
  evaluadorConcurso,
  formularioDinamico,
  rubrica,
  criterio,
  subCriterio,
  nivelEvaluacion,
  usuario,
  postulacion,
  empresa,
  calificacion,
} from '@superstars/db';
import type { EstadoConcurso } from '@superstars/shared';

export interface FindAllConcursosParams {
  page: number;
  limit: number;
  estado?: string;
  search?: string;
}

@Injectable()
export class ConcursoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // --- CRUD concurso ---

  async findById(id: number) {
    const rows = await this.db
      .select()
      .from(concurso)
      .where(eq(concurso.id, id));
    return rows[0] ?? null;
  }

  async findAll(params: FindAllConcursosParams) {
    const { page, limit, estado, search } = params;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (estado) conditions.push(eq(concurso.estado, estado as EstadoConcurso));
    if (search) {
      conditions.push(
        or(
          ilike(concurso.nombre, `%${search}%`),
          ilike(concurso.descripcion, `%${search}%`),
        )!,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      this.db.select().from(concurso).where(where)
        .orderBy(desc(concurso.createdAt))
        .limit(limit).offset(offset),
      this.db.select({ count: count() }).from(concurso).where(where),
    ]);

    return { data, total: Number(totalResult[0].count) };
  }

  // Listar concursos excluyendo un estado (para proponente: excluir borrador)
  async findAllExcludeEstado(params: FindAllConcursosParams, excludeEstado: EstadoConcurso) {
    const { page, limit, search } = params;
    const offset = (page - 1) * limit;

    const conditions = [ne(concurso.estado, excludeEstado as EstadoConcurso)];
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
      this.db.select().from(concurso).where(where)
        .orderBy(desc(concurso.createdAt))
        .limit(limit).offset(offset),
      this.db.select({ count: count() }).from(concurso).where(where),
    ]);

    return { data, total: Number(totalResult[0].count) };
  }

  async findAllByResponsable(usuarioId: number, params: FindAllConcursosParams) {
    const { page, limit, estado, search } = params;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(responsableConcurso.usuarioId, usuarioId),
    ];
    if (estado) conditions.push(eq(concurso.estado, estado as EstadoConcurso));
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
      this.db.select({ concurso })
        .from(concurso)
        .innerJoin(responsableConcurso, eq(concurso.id, responsableConcurso.concursoId))
        .where(where)
        .orderBy(desc(concurso.createdAt))
        .limit(limit).offset(offset),
      this.db.select({ count: count() })
        .from(concurso)
        .innerJoin(responsableConcurso, eq(concurso.id, responsableConcurso.concursoId))
        .where(where),
    ]);

    // innerJoin retorna { concurso: {...} }, extraer el objeto
    return {
      data: data.map(row => row.concurso),
      total: Number(totalResult[0].count),
    };
  }

  async create(data: {
    nombre: string;
    descripcion?: string;
    bases?: string;
    fechaInicioPostulacion: string;
    fechaCierrePostulacion: string;
    fechaAnuncioGanadores?: string;
    montoPremio: string;
    numeroGanadores: number;
    topNSistema: number;
    departamentos: string[];
    createdBy: number;
  }) {
    const [created] = await this.db
      .insert(concurso)
      .values(data)
      .returning();
    return created;
  }

  async update(id: number, data: Partial<{
    nombre: string;
    descripcion: string;
    bases: string;
    fechaInicioPostulacion: string;
    fechaCierrePostulacion: string;
    fechaAnuncioGanadores: string;
    montoPremio: string;
    numeroGanadores: number;
    topNSistema: number;
    departamentos: string[];
  }>) {
    const [updated] = await this.db
      .update(concurso)
      .set(data)
      .where(eq(concurso.id, id))
      .returning();
    return updated ?? null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(concurso)
      .where(eq(concurso.id, id))
      .returning({ id: concurso.id });
    return result.length > 0;
  }

  // UPDATE atomico con WHERE estado = currentEstado (optimistic locking)
  async updateEstado(id: number, currentEstado: string, newEstado: string) {
    const result = await this.db
      .update(concurso)
      .set({ estado: newEstado as EstadoConcurso })
      .where(and(
        eq(concurso.id, id),
        eq(concurso.estado, currentEstado as EstadoConcurso),
      ))
      .returning();
    return result[0] ?? null;
  }

  // Marcar fecha_publicacion_resultados al finalizar
  async setFechaPublicacionResultados(id: number) {
    await this.db
      .update(concurso)
      .set({ fechaPublicacionResultados: new Date().toISOString() })
      .where(eq(concurso.id, id));
  }

  // --- Pivot: responsable_concurso ---

  async findResponsables(concursoId: number) {
    return this.db
      .select({
        id: responsableConcurso.id,
        usuarioId: responsableConcurso.usuarioId,
        email: usuario.email,
        nombre: usuario.nombre,
        createdAt: responsableConcurso.createdAt,
      })
      .from(responsableConcurso)
      .innerJoin(usuario, eq(responsableConcurso.usuarioId, usuario.id))
      .where(eq(responsableConcurso.concursoId, concursoId));
  }

  async addResponsable(concursoId: number, usuarioId: number) {
    const [created] = await this.db
      .insert(responsableConcurso)
      .values({ concursoId, usuarioId })
      .returning();
    return created;
  }

  async removeResponsable(concursoId: number, usuarioId: number): Promise<boolean> {
    const result = await this.db
      .delete(responsableConcurso)
      .where(and(
        eq(responsableConcurso.concursoId, concursoId),
        eq(responsableConcurso.usuarioId, usuarioId),
      ))
      .returning({ id: responsableConcurso.id });
    return result.length > 0;
  }

  async isResponsable(concursoId: number, usuarioId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: responsableConcurso.id })
      .from(responsableConcurso)
      .where(and(
        eq(responsableConcurso.concursoId, concursoId),
        eq(responsableConcurso.usuarioId, usuarioId),
      ))
      .limit(1);
    return rows.length > 0;
  }

  async countResponsables(concursoId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(responsableConcurso)
      .where(eq(responsableConcurso.concursoId, concursoId));
    return Number(result.count);
  }

  // --- Checks para publicar ---

  async hasFormulario(concursoId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: formularioDinamico.id })
      .from(formularioDinamico)
      .where(eq(formularioDinamico.concursoId, concursoId))
      .limit(1);
    return rows.length > 0;
  }

  async hasRubricaWithCriterios(concursoId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: rubrica.id })
      .from(rubrica)
      .innerJoin(criterio, eq(rubrica.id, criterio.rubricaId))
      .where(eq(rubrica.concursoId, concursoId))
      .limit(1);
    return rows.length > 0;
  }

  // --- Estado del concurso para guard ---

  async getEstado(concursoId: number): Promise<string | null> {
    const rows = await this.db
      .select({ estado: concurso.estado })
      .from(concurso)
      .where(eq(concurso.id, concursoId))
      .limit(1);
    return rows[0]?.estado ?? null;
  }

  // Cerrar concursos publicados cuya fecha efectiva ya paso
  async cerrarVencidos(): Promise<number> {
    const result = await this.db
      .update(concurso)
      .set({ estado: 'cerrado' as EstadoConcurso })
      .where(and(
        eq(concurso.estado, 'publicado' as EstadoConcurso),
        sql`COALESCE(fecha_cierre_efectiva, fecha_cierre_postulacion) < CURRENT_DATE`,
      ))
      .returning({ id: concurso.id });
    return result.length;
  }

  // --- Pivot: evaluador_concurso ---

  async findEvaluadores(concursoId: number) {
    return this.db
      .select({
        id: evaluadorConcurso.id,
        evaluadorId: evaluadorConcurso.evaluadorId,
        email: usuario.email,
        nombre: usuario.nombre,
        createdAt: evaluadorConcurso.createdAt,
      })
      .from(evaluadorConcurso)
      .innerJoin(usuario, eq(evaluadorConcurso.evaluadorId, usuario.id))
      .where(eq(evaluadorConcurso.concursoId, concursoId));
  }

  async addEvaluador(concursoId: number, evaluadorId: number, asignadoPor: number) {
    const [created] = await this.db
      .insert(evaluadorConcurso)
      .values({ concursoId, evaluadorId, asignadoPor })
      .returning();
    return created;
  }

  async removeEvaluador(concursoId: number, evaluadorId: number): Promise<boolean> {
    const result = await this.db
      .delete(evaluadorConcurso)
      .where(and(
        eq(evaluadorConcurso.concursoId, concursoId),
        eq(evaluadorConcurso.evaluadorId, evaluadorId),
      ))
      .returning({ id: evaluadorConcurso.id });
    return result.length > 0;
  }

  async isEvaluador(concursoId: number, evaluadorId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: evaluadorConcurso.id })
      .from(evaluadorConcurso)
      .where(and(
        eq(evaluadorConcurso.concursoId, concursoId),
        eq(evaluadorConcurso.evaluadorId, evaluadorId),
      ))
      .limit(1);
    return rows.length > 0;
  }

  // --- Resultados: queries para seleccion de ganadores ---

  // postulaciones calificadas de un concurso (para validar seleccion)
  async findPostulacionesCalificadas(concursoId: number) {
    return this.db
      .select({
        id: postulacion.id,
        estado: postulacion.estado,
        puntajeFinal: postulacion.puntajeFinal,
        empresaRazonSocial: empresa.razonSocial,
      })
      .from(postulacion)
      .innerJoin(empresa, eq(postulacion.empresaId, empresa.id))
      .where(and(
        eq(postulacion.concursoId, concursoId),
        eq(postulacion.estado, 'calificado' as any),
      ))
      .orderBy(desc(postulacion.puntajeFinal));
  }

  // verificar si hay postulaciones en estados intermedios (no terminales y no calificado)
  async countPostulacionesPendientes(concursoId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(postulacion)
      .where(and(
        eq(postulacion.concursoId, concursoId),
        sql`${postulacion.estado} IN ('en_evaluacion')`,
      ));
    return Number(result.count);
  }

  // verificar si hay calificaciones no aprobadas en un concurso
  async countCalificacionesNoAprobadas(concursoId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(calificacion)
      .innerJoin(postulacion, eq(calificacion.postulacionId, postulacion.id))
      .where(and(
        eq(postulacion.concursoId, concursoId),
        sql`${calificacion.estado} != 'aprobado'`,
      ));
    return Number(result.count);
  }

  // calcular ranking con DENSE_RANK y persistir posicion_final
  async calcularRanking(concursoId: number) {
    await this.db.execute(sql`
      UPDATE postulacion SET posicion_final = ranked.pos
      FROM (
        SELECT id, DENSE_RANK() OVER (
          ORDER BY puntaje_final DESC, fecha_envio ASC
        ) AS pos
        FROM postulacion
        WHERE concurso_id = ${concursoId}
          AND puntaje_final IS NOT NULL
          AND estado IN ('calificado', 'ganador', 'no_seleccionado')
      ) ranked
      WHERE postulacion.id = ranked.id
    `);
  }

  // marcar postulaciones como ganadoras (batch)
  async marcarGanadores(ids: number[]) {
    await this.db
      .update(postulacion)
      .set({ estado: 'ganador' as any })
      .where(and(
        inArray(postulacion.id, ids),
        eq(postulacion.estado, 'calificado' as any),
      ));
  }

  // marcar postulaciones restantes como no seleccionadas
  async marcarNoSeleccionados(concursoId: number, exceptIds: number[]) {
    await this.db
      .update(postulacion)
      .set({ estado: 'no_seleccionado' as any })
      .where(and(
        eq(postulacion.concursoId, concursoId),
        eq(postulacion.estado, 'calificado' as any),
        exceptIds.length > 0
          ? sql`${postulacion.id} NOT IN (${sql.join(exceptIds.map(id => sql`${id}`), sql`, `)})`
          : sql`true`,
      ));
  }

  // contar ganadores actuales de un concurso
  async countGanadores(concursoId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(postulacion)
      .where(and(
        eq(postulacion.concursoId, concursoId),
        eq(postulacion.estado, 'ganador' as any),
      ));
    return Number(result.count);
  }

  // postulaciones calificadas que aun no fueron decididas (ni ganador ni no_seleccionado)
  async countCalificadasSinDecidir(concursoId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(postulacion)
      .where(and(
        eq(postulacion.concursoId, concursoId),
        eq(postulacion.estado, 'calificado' as any),
      ));
    return Number(result.count);
  }

  // --- Resultados: vista admin/responsable ---

  // resumen estadistico de concursos en evaluacion/resultados_listos/finalizado
  // si usuarioId se pasa, solo retorna los concursos del responsable
  async findResumenResultados(usuarioId?: number) {
    const query = this.db
      .select({
        id: concurso.id,
        nombre: concurso.nombre,
        estado: concurso.estado,
        montoPremio: concurso.montoPremio,
        numeroGanadores: concurso.numeroGanadores,
        fechaPublicacionResultados: concurso.fechaPublicacionResultados,
        totalPostulaciones: sql<number>`count(${postulacion.id}) filter (where ${postulacion.estado} not in ('borrador'))`.mapWith(Number),
        totalCalificadas: sql<number>`count(${postulacion.id}) filter (where ${postulacion.estado} in ('calificado', 'ganador', 'no_seleccionado'))`.mapWith(Number),
        promedioCalificadas: sql<string | null>`round(avg(${postulacion.puntajeFinal}) filter (where ${postulacion.puntajeFinal} is not null), 2)`,
        totalGanadores: sql<number>`count(${postulacion.id}) filter (where ${postulacion.estado} = 'ganador')`.mapWith(Number),
      })
      .from(concurso)
      .leftJoin(postulacion, eq(postulacion.concursoId, concurso.id))
      .where(
        sql`${concurso.estado} in ('en_evaluacion', 'resultados_listos', 'finalizado')`,
      )
      .groupBy(concurso.id)
      .orderBy(desc(concurso.createdAt));

    if (usuarioId) {
      // responsable: solo sus concursos asignados
      return this.db
        .select({
          id: concurso.id,
          nombre: concurso.nombre,
          estado: concurso.estado,
          montoPremio: concurso.montoPremio,
          numeroGanadores: concurso.numeroGanadores,
          fechaPublicacionResultados: concurso.fechaPublicacionResultados,
          totalPostulaciones: sql<number>`count(${postulacion.id}) filter (where ${postulacion.estado} not in ('borrador'))`.mapWith(Number),
          totalCalificadas: sql<number>`count(${postulacion.id}) filter (where ${postulacion.estado} in ('calificado', 'ganador', 'no_seleccionado'))`.mapWith(Number),
          promedioCalificadas: sql<string | null>`round(avg(${postulacion.puntajeFinal}) filter (where ${postulacion.puntajeFinal} is not null), 2)`,
          totalGanadores: sql<number>`count(${postulacion.id}) filter (where ${postulacion.estado} = 'ganador')`.mapWith(Number),
        })
        .from(concurso)
        .innerJoin(responsableConcurso, and(
          eq(responsableConcurso.concursoId, concurso.id),
          eq(responsableConcurso.usuarioId, usuarioId),
        ))
        .leftJoin(postulacion, eq(postulacion.concursoId, concurso.id))
        .where(
          sql`${concurso.estado} in ('en_evaluacion', 'resultados_listos', 'finalizado')`,
        )
        .groupBy(concurso.id)
        .orderBy(desc(concurso.createdAt));
    }

    return query;
  }

  // ranking de postulaciones calificadas/ganadoras de un concurso
  async findRankingPostulaciones(concursoId: number) {
    return this.db
      .select({
        postulacionId: postulacion.id,
        empresaNombre: empresa.razonSocial,
        puntajeFinal: postulacion.puntajeFinal,
        posicionFinal: postulacion.posicionFinal,
        estado: postulacion.estado,
        fechaEnvio: postulacion.fechaEnvio,
      })
      .from(postulacion)
      .innerJoin(empresa, eq(postulacion.empresaId, empresa.id))
      .where(and(
        eq(postulacion.concursoId, concursoId),
        sql`${postulacion.estado} in ('calificado', 'ganador', 'no_seleccionado')`,
      ))
      .orderBy(desc(postulacion.puntajeFinal));
  }
}
