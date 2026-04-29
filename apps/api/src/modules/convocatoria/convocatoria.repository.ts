import { Injectable, Inject } from '@nestjs/common';
import { eq, ne, and, or, ilike, count, desc, sql, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import {
  convocatoria,
  responsableConvocatoria,
  evaluadorConvocatoria,
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
import type { EstadoConvocatoria } from '@superstars/shared';

export interface FindAllConvocatoriasParams {
  page: number;
  limit: number;
  estado?: string;
  search?: string;
}

@Injectable()
export class ConvocatoriaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // --- CRUD convocatoria ---

  async findById(id: number) {
    const rows = await this.db
      .select()
      .from(convocatoria)
      .where(eq(convocatoria.id, id));
    return rows[0] ?? null;
  }

  async findAll(params: FindAllConvocatoriasParams) {
    const { page, limit, estado, search } = params;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (estado) conditions.push(eq(convocatoria.estado, estado as EstadoConvocatoria));
    if (search) {
      conditions.push(
        or(
          ilike(convocatoria.nombre, `%${search}%`),
          ilike(convocatoria.descripcion, `%${search}%`),
        )!,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      this.db.select().from(convocatoria).where(where)
        .orderBy(desc(convocatoria.createdAt))
        .limit(limit).offset(offset),
      this.db.select({ count: count() }).from(convocatoria).where(where),
    ]);

    return { data, total: Number(totalResult[0].count) };
  }

  // Listar convocatorias excluyendo un estado (para proponente: excluir borrador)
  async findAllExcludeEstado(params: FindAllConvocatoriasParams, excludeEstado: EstadoConvocatoria) {
    const { page, limit, search } = params;
    const offset = (page - 1) * limit;

    const conditions = [ne(convocatoria.estado, excludeEstado as EstadoConvocatoria)];
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
      this.db.select().from(convocatoria).where(where)
        .orderBy(desc(convocatoria.createdAt))
        .limit(limit).offset(offset),
      this.db.select({ count: count() }).from(convocatoria).where(where),
    ]);

    return { data, total: Number(totalResult[0].count) };
  }

  async findAllByResponsable(usuarioId: number, params: FindAllConvocatoriasParams) {
    const { page, limit, estado, search } = params;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(responsableConvocatoria.usuarioId, usuarioId),
    ];
    if (estado) conditions.push(eq(convocatoria.estado, estado as EstadoConvocatoria));
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
      this.db.select({ convocatoria })
        .from(convocatoria)
        .innerJoin(responsableConvocatoria, eq(convocatoria.id, responsableConvocatoria.convocatoriaId))
        .where(where)
        .orderBy(desc(convocatoria.createdAt))
        .limit(limit).offset(offset),
      this.db.select({ count: count() })
        .from(convocatoria)
        .innerJoin(responsableConvocatoria, eq(convocatoria.id, responsableConvocatoria.convocatoriaId))
        .where(where),
    ]);

    // innerJoin retorna { convocatoria: {...} }, extraer el objeto
    return {
      data: data.map(row => row.convocatoria),
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
    monto: string;
    numeroGanadores: number;
    topNSistema: number;
    departamentos: string[];
    createdBy: number;
  }) {
    const [created] = await this.db
      .insert(convocatoria)
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
    monto: string;
    numeroGanadores: number;
    topNSistema: number;
    departamentos: string[];
  }>) {
    const [updated] = await this.db
      .update(convocatoria)
      .set(data)
      .where(eq(convocatoria.id, id))
      .returning();
    return updated ?? null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(convocatoria)
      .where(eq(convocatoria.id, id))
      .returning({ id: convocatoria.id });
    return result.length > 0;
  }

  // UPDATE atomico con WHERE estado = currentEstado (optimistic locking)
  async updateEstado(id: number, currentEstado: string, newEstado: string) {
    const result = await this.db
      .update(convocatoria)
      .set({ estado: newEstado as EstadoConvocatoria })
      .where(and(
        eq(convocatoria.id, id),
        eq(convocatoria.estado, currentEstado as EstadoConvocatoria),
      ))
      .returning();
    return result[0] ?? null;
  }

  // Marcar fecha_publicacion_resultados al finalizar
  async setFechaPublicacionResultados(id: number) {
    await this.db
      .update(convocatoria)
      .set({ fechaPublicacionResultados: new Date().toISOString() })
      .where(eq(convocatoria.id, id));
  }

  // --- Pivot: responsable_convocatoria ---

  async findResponsables(convocatoriaId: number) {
    return this.db
      .select({
        id: responsableConvocatoria.id,
        usuarioId: responsableConvocatoria.usuarioId,
        email: usuario.email,
        nombre: usuario.nombre,
        createdAt: responsableConvocatoria.createdAt,
      })
      .from(responsableConvocatoria)
      .innerJoin(usuario, eq(responsableConvocatoria.usuarioId, usuario.id))
      .where(eq(responsableConvocatoria.convocatoriaId, convocatoriaId));
  }

  async addResponsable(convocatoriaId: number, usuarioId: number) {
    const [created] = await this.db
      .insert(responsableConvocatoria)
      .values({ convocatoriaId, usuarioId })
      .returning();
    return created;
  }

  async removeResponsable(convocatoriaId: number, usuarioId: number): Promise<boolean> {
    const result = await this.db
      .delete(responsableConvocatoria)
      .where(and(
        eq(responsableConvocatoria.convocatoriaId, convocatoriaId),
        eq(responsableConvocatoria.usuarioId, usuarioId),
      ))
      .returning({ id: responsableConvocatoria.id });
    return result.length > 0;
  }

  async isResponsable(convocatoriaId: number, usuarioId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: responsableConvocatoria.id })
      .from(responsableConvocatoria)
      .where(and(
        eq(responsableConvocatoria.convocatoriaId, convocatoriaId),
        eq(responsableConvocatoria.usuarioId, usuarioId),
      ))
      .limit(1);
    return rows.length > 0;
  }

  async countResponsables(convocatoriaId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(responsableConvocatoria)
      .where(eq(responsableConvocatoria.convocatoriaId, convocatoriaId));
    return Number(result.count);
  }

  // --- Checks para publicar ---

  async hasFormulario(convocatoriaId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: formularioDinamico.id })
      .from(formularioDinamico)
      .where(eq(formularioDinamico.convocatoriaId, convocatoriaId))
      .limit(1);
    return rows.length > 0;
  }

  async hasRubricaWithCriterios(convocatoriaId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: rubrica.id })
      .from(rubrica)
      .innerJoin(criterio, eq(rubrica.id, criterio.rubricaId))
      .where(eq(rubrica.convocatoriaId, convocatoriaId))
      .limit(1);
    return rows.length > 0;
  }

  // --- Estado de la convocatoria para guard ---

  async getEstado(convocatoriaId: number): Promise<string | null> {
    const rows = await this.db
      .select({ estado: convocatoria.estado })
      .from(convocatoria)
      .where(eq(convocatoria.id, convocatoriaId))
      .limit(1);
    return rows[0]?.estado ?? null;
  }

  // Cerrar convocatorias publicadas cuya fecha efectiva ya paso
  async cerrarVencidos(): Promise<number> {
    const result = await this.db
      .update(convocatoria)
      .set({ estado: 'cerrado' as EstadoConvocatoria })
      .where(and(
        eq(convocatoria.estado, 'publicado' as EstadoConvocatoria),
        sql`COALESCE(fecha_cierre_efectiva, fecha_cierre_postulacion) < CURRENT_DATE`,
      ))
      .returning({ id: convocatoria.id });
    return result.length;
  }

  // --- Pivot: evaluador_convocatoria ---

  async findEvaluadores(convocatoriaId: number) {
    return this.db
      .select({
        id: evaluadorConvocatoria.id,
        evaluadorId: evaluadorConvocatoria.evaluadorId,
        email: usuario.email,
        nombre: usuario.nombre,
        createdAt: evaluadorConvocatoria.createdAt,
      })
      .from(evaluadorConvocatoria)
      .innerJoin(usuario, eq(evaluadorConvocatoria.evaluadorId, usuario.id))
      .where(eq(evaluadorConvocatoria.convocatoriaId, convocatoriaId));
  }

  async addEvaluador(convocatoriaId: number, evaluadorId: number, asignadoPor: number) {
    const [created] = await this.db
      .insert(evaluadorConvocatoria)
      .values({ convocatoriaId, evaluadorId, asignadoPor })
      .returning();
    return created;
  }

  async removeEvaluador(convocatoriaId: number, evaluadorId: number): Promise<boolean> {
    const result = await this.db
      .delete(evaluadorConvocatoria)
      .where(and(
        eq(evaluadorConvocatoria.convocatoriaId, convocatoriaId),
        eq(evaluadorConvocatoria.evaluadorId, evaluadorId),
      ))
      .returning({ id: evaluadorConvocatoria.id });
    return result.length > 0;
  }

  async isEvaluador(convocatoriaId: number, evaluadorId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: evaluadorConvocatoria.id })
      .from(evaluadorConvocatoria)
      .where(and(
        eq(evaluadorConvocatoria.convocatoriaId, convocatoriaId),
        eq(evaluadorConvocatoria.evaluadorId, evaluadorId),
      ))
      .limit(1);
    return rows.length > 0;
  }

  // --- Resultados: queries para seleccion de ganadores ---

  // postulaciones calificadas de una convocatoria (para validar seleccion)
  async findPostulacionesCalificadas(convocatoriaId: number) {
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
        eq(postulacion.convocatoriaId, convocatoriaId),
        eq(postulacion.estado, 'calificado' as any),
      ))
      .orderBy(desc(postulacion.puntajeFinal));
  }

  // verificar si hay postulaciones en estados intermedios (no terminales y no calificado)
  async countPostulacionesPendientes(convocatoriaId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(postulacion)
      .where(and(
        eq(postulacion.convocatoriaId, convocatoriaId),
        sql`${postulacion.estado} IN ('en_evaluacion')`,
      ));
    return Number(result.count);
  }

  // verificar si hay calificaciones no aprobadas en una convocatoria
  async countCalificacionesNoAprobadas(convocatoriaId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(calificacion)
      .innerJoin(postulacion, eq(calificacion.postulacionId, postulacion.id))
      .where(and(
        eq(postulacion.convocatoriaId, convocatoriaId),
        sql`${calificacion.estado} != 'aprobado'`,
      ));
    return Number(result.count);
  }

  // calcular ranking con DENSE_RANK y persistir posicion_final
  async calcularRanking(convocatoriaId: number) {
    await this.db.execute(sql`
      UPDATE postulacion SET posicion_final = ranked.pos
      FROM (
        SELECT id, DENSE_RANK() OVER (
          ORDER BY puntaje_final DESC, fecha_envio ASC
        ) AS pos
        FROM postulacion
        WHERE convocatoria_id = ${convocatoriaId}
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
  async marcarNoSeleccionados(convocatoriaId: number, exceptIds: number[]) {
    await this.db
      .update(postulacion)
      .set({ estado: 'no_seleccionado' as any })
      .where(and(
        eq(postulacion.convocatoriaId, convocatoriaId),
        eq(postulacion.estado, 'calificado' as any),
        exceptIds.length > 0
          ? sql`${postulacion.id} NOT IN (${sql.join(exceptIds.map(id => sql`${id}`), sql`, `)})`
          : sql`true`,
      ));
  }

  // contar ganadores actuales de una convocatoria
  async countGanadores(convocatoriaId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(postulacion)
      .where(and(
        eq(postulacion.convocatoriaId, convocatoriaId),
        eq(postulacion.estado, 'ganador' as any),
      ));
    return Number(result.count);
  }

  // postulaciones calificadas que aun no fueron decididas (ni ganador ni no_seleccionado)
  async countCalificadasSinDecidir(convocatoriaId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(postulacion)
      .where(and(
        eq(postulacion.convocatoriaId, convocatoriaId),
        eq(postulacion.estado, 'calificado' as any),
      ));
    return Number(result.count);
  }

  // --- Resultados: vista admin/responsable ---

  // resumen estadistico de convocatorias en evaluacion/resultados_listos/finalizado
  // si usuarioId se pasa, solo retorna las convocatorias del responsable
  async findResumenResultados(usuarioId?: number) {
    const query = this.db
      .select({
        id: convocatoria.id,
        nombre: convocatoria.nombre,
        estado: convocatoria.estado,
        monto: convocatoria.monto,
        numeroGanadores: convocatoria.numeroGanadores,
        fechaPublicacionResultados: convocatoria.fechaPublicacionResultados,
        totalPostulaciones: sql<number>`count(${postulacion.id}) filter (where ${postulacion.estado} not in ('borrador'))`.mapWith(Number),
        totalCalificadas: sql<number>`count(${postulacion.id}) filter (where ${postulacion.estado} in ('calificado', 'ganador', 'no_seleccionado'))`.mapWith(Number),
        promedioCalificadas: sql<string | null>`round(avg(${postulacion.puntajeFinal}) filter (where ${postulacion.puntajeFinal} is not null), 2)`,
        totalGanadores: sql<number>`count(${postulacion.id}) filter (where ${postulacion.estado} = 'ganador')`.mapWith(Number),
      })
      .from(convocatoria)
      .leftJoin(postulacion, eq(postulacion.convocatoriaId, convocatoria.id))
      .where(
        sql`${convocatoria.estado} in ('en_evaluacion', 'resultados_listos', 'finalizado')`,
      )
      .groupBy(convocatoria.id)
      .orderBy(desc(convocatoria.createdAt));

    if (usuarioId) {
      // responsable: solo sus convocatorias asignadas
      return this.db
        .select({
          id: convocatoria.id,
          nombre: convocatoria.nombre,
          estado: convocatoria.estado,
          monto: convocatoria.monto,
          numeroGanadores: convocatoria.numeroGanadores,
          fechaPublicacionResultados: convocatoria.fechaPublicacionResultados,
          totalPostulaciones: sql<number>`count(${postulacion.id}) filter (where ${postulacion.estado} not in ('borrador'))`.mapWith(Number),
          totalCalificadas: sql<number>`count(${postulacion.id}) filter (where ${postulacion.estado} in ('calificado', 'ganador', 'no_seleccionado'))`.mapWith(Number),
          promedioCalificadas: sql<string | null>`round(avg(${postulacion.puntajeFinal}) filter (where ${postulacion.puntajeFinal} is not null), 2)`,
          totalGanadores: sql<number>`count(${postulacion.id}) filter (where ${postulacion.estado} = 'ganador')`.mapWith(Number),
        })
        .from(convocatoria)
        .innerJoin(responsableConvocatoria, and(
          eq(responsableConvocatoria.convocatoriaId, convocatoria.id),
          eq(responsableConvocatoria.usuarioId, usuarioId),
        ))
        .leftJoin(postulacion, eq(postulacion.convocatoriaId, convocatoria.id))
        .where(
          sql`${convocatoria.estado} in ('en_evaluacion', 'resultados_listos', 'finalizado')`,
        )
        .groupBy(convocatoria.id)
        .orderBy(desc(convocatoria.createdAt));
    }

    return query;
  }

  // ranking de postulaciones calificadas/ganadoras de una convocatoria
  async findRankingPostulaciones(convocatoriaId: number) {
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
        eq(postulacion.convocatoriaId, convocatoriaId),
        sql`${postulacion.estado} in ('calificado', 'ganador', 'no_seleccionado')`,
      ))
      .orderBy(desc(postulacion.puntajeFinal));
  }
}
