import { Injectable, Inject } from '@nestjs/common';
import { eq, and, or, ilike, count, desc, sql, inArray } from 'drizzle-orm';
import {
  ESTADOS_CONVOCATORIA_VISIBLE_PROPONENTE,
  ESTADOS_CONVOCATORIA_ANTERIORES_PROPONENTE,
  ESTADO_CONVOCATORIA_PUBLICO,
  type TipoListadoProponente,
} from '@superstars/shared';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import {
  convocatoria,
  categoriaConvocatoria,
  responsableConvocatoria,
  evaluadorCategoria,
  formularioDinamico,
  usuario,
  postulacion,
  empresa,
  calificacion,
} from '@superstars/db';
import type { EstadoConvocatoria, SchemaDefinition } from '@superstars/shared';

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

  // Listado de convocatorias visibles para un proponente.
  // - tipo='abiertas'   : solo PUBLICADO (postulables)
  // - tipo='anteriores' : CERRADO/EN_EVALUACION/RESULTADOS_LISTOS/FINALIZADO
  // - tipo undefined    : todas las visibles (no borrador). Mantiene compat. para
  //                       casos donde el cliente quiere todas (ej. selector de filtros)
  async findAllVisiblesParaProponente(
    params: FindAllConvocatoriasParams,
    tipo?: TipoListadoProponente,
  ) {
    const { page, limit, search } = params;
    const offset = (page - 1) * limit;

    const estadosVisibles =
      tipo === 'abiertas'
        ? [ESTADO_CONVOCATORIA_PUBLICO]
        : tipo === 'anteriores'
          ? [...ESTADOS_CONVOCATORIA_ANTERIORES_PROPONENTE]
          : [...ESTADOS_CONVOCATORIA_VISIBLE_PROPONENTE];

    const conditions = [
      inArray(convocatoria.estado, estadosVisibles as unknown as EstadoConvocatoria[]),
    ];
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
    fechaInicioPostulacion: string;
    fechaCierrePostulacion: string;
    fechaAnuncioGanadores?: string;
    departamentos: string[];
    createdBy: number;
  }) {
    const [created] = await this.db
      .insert(convocatoria)
      .values(data)
      .returning();
    return created;
  }

  // SB-6: crea la convocatoria + (opcional) su responsable + N categorias por
  // defecto con sus formularios, TODO en una transaccion (o se crea todo o nada).
  async createConCategorias(
    data: {
      nombre: string;
      descripcion?: string;
      fechaInicioPostulacion: string;
      fechaCierrePostulacion: string;
      fechaAnuncioGanadores?: string;
      departamentos: string[];
      createdBy: number;
    },
    responsableUserId: number | null,
    categorias: Array<{
      nombre: string;
      monto: string;
      numeroGanadores: number;
      topNSistema: number;
      orden: number;
      formularioNombre: string;
      schemaDefinition: SchemaDefinition;
    }>,
  ) {
    return this.db.transaction(async (tx) => {
      const [conv] = await tx.insert(convocatoria).values(data).returning();

      if (responsableUserId !== null) {
        await tx.insert(responsableConvocatoria).values({
          convocatoriaId: conv.id,
          usuarioId: responsableUserId,
        });
      }

      for (const cat of categorias) {
        const [catRow] = await tx
          .insert(categoriaConvocatoria)
          .values({
            convocatoriaId: conv.id,
            nombre: cat.nombre,
            monto: cat.monto,
            numeroGanadores: cat.numeroGanadores,
            topNSistema: cat.topNSistema,
            orden: cat.orden,
          })
          .returning();

        await tx.insert(formularioDinamico).values({
          categoriaId: catRow.id,
          nombre: cat.formularioNombre,
          schemaDefinition: cat.schemaDefinition,
        });
      }

      return conv;
    });
  }

  async update(id: number, data: Partial<{
    nombre: string;
    descripcion: string;
    fechaInicioPostulacion: string;
    fechaCierrePostulacion: string;
    fechaAnuncioGanadores: string;
    departamentos: string[];
    imagenKey: string | null;
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

  // --- Checks para publicar (por categoria) ---

  async hasFormulario(categoriaId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: formularioDinamico.id })
      .from(formularioDinamico)
      .where(eq(formularioDinamico.categoriaId, categoriaId))
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

  // --- Guard: evaluador de la convocatoria ---
  // El pool de evaluadores es por categoria (evaluador_categoria); el CRUD del pool
  // vive en el modulo categoria. Aqui solo queda el check que usa el guard.

  // el evaluador esta en el pool de ALGUNA categoria de esta convocatoria
  // ¿este usuario (proponente) ya tiene una postulacion en esta convocatoria?
  // Se usa para dejarlo consultar la convocatoria aunque no sea visible por su
  // estado: si ya postulo, tiene un interes legitimo en verla.
  async tienePostulacionDeUsuario(convocatoriaId: number, usuarioId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: postulacion.id })
      .from(postulacion)
      .innerJoin(empresa, eq(empresa.id, postulacion.empresaId))
      .where(and(
        eq(postulacion.convocatoriaId, convocatoriaId),
        eq(empresa.usuarioId, usuarioId),
      ))
      .limit(1);
    return rows.length > 0;
  }

  async isEvaluador(convocatoriaId: number, evaluadorId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: evaluadorCategoria.id })
      .from(evaluadorCategoria)
      .innerJoin(categoriaConvocatoria, eq(evaluadorCategoria.categoriaId, categoriaConvocatoria.id))
      .where(and(
        eq(categoriaConvocatoria.convocatoriaId, convocatoriaId),
        eq(evaluadorCategoria.evaluadorId, evaluadorId),
      ))
      .limit(1);
    return rows.length > 0;
  }

  // --- Resultados: queries para seleccion de ganadores ---

  // postulaciones calificadas de una categoria (para validar seleccion)
  async findPostulacionesCalificadas(categoriaId: number) {
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
        eq(postulacion.categoriaId, categoriaId),
        eq(postulacion.estado, 'calificado' as any),
      ))
      .orderBy(desc(postulacion.puntajeFinal));
  }

  // postulaciones aun en evaluacion en una categoria
  async countPostulacionesPendientes(categoriaId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(postulacion)
      .where(and(
        eq(postulacion.categoriaId, categoriaId),
        sql`${postulacion.estado} IN ('en_evaluacion')`,
      ));
    return Number(result.count);
  }

  // calificaciones no aprobadas de las postulaciones de una categoria.
  // Solo cuenta las de postulaciones que SIGUEN EN EVALUACION: si el
  // responsable ya cerro la evaluacion de una propuesta, decidio conscientemente
  // que los jurados que no entregaron quedaban fuera, y esas notas inconclusas
  // no deben volver a bloquear la seleccion de ganadores. Las de postulaciones
  // rechazadas o ya cerradas quedan de auditoria, sin frenar el proceso.
  async countCalificacionesNoAprobadas(categoriaId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(calificacion)
      .innerJoin(postulacion, eq(calificacion.postulacionId, postulacion.id))
      .where(and(
        eq(postulacion.categoriaId, categoriaId),
        sql`${postulacion.estado} = 'en_evaluacion'`,
        sql`${calificacion.estado} != 'aprobado'`,
      ));
    return Number(result.count);
  }

  // calcular ranking (DENSE_RANK dentro de la categoria) y persistir posicion_final
  async calcularRanking(categoriaId: number) {
    await this.db.execute(sql`
      UPDATE postulacion SET posicion_final = ranked.pos
      FROM (
        SELECT id, DENSE_RANK() OVER (
          ORDER BY puntaje_final DESC, fecha_envio ASC
        ) AS pos
        FROM postulacion
        WHERE categoria_id = ${categoriaId}
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

  // marcar las postulaciones calificadas restantes de la categoria como no seleccionadas
  async marcarNoSeleccionados(categoriaId: number, exceptIds: number[]) {
    await this.db
      .update(postulacion)
      .set({ estado: 'no_seleccionado' as any })
      .where(and(
        eq(postulacion.categoriaId, categoriaId),
        eq(postulacion.estado, 'calificado' as any),
        exceptIds.length > 0
          ? sql`${postulacion.id} NOT IN (${sql.join(exceptIds.map(id => sql`${id}`), sql`, `)})`
          : sql`true`,
      ));
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

  // ranking de postulaciones calificadas/ganadoras de una categoria
  async findRankingPostulaciones(categoriaId: number) {
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
        eq(postulacion.categoriaId, categoriaId),
        sql`${postulacion.estado} in ('calificado', 'ganador', 'no_seleccionado')`,
      ))
      .orderBy(desc(postulacion.puntajeFinal));
  }
}
