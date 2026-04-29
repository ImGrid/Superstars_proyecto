import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import {
  evaluadorConvocatoria,
  asignacionEvaluador,
  calificacion,
  calificacionDetalle,
  convocatoria,
  postulacion,
  empresa,
  usuario,
  subCriterio,
  criterio,
  rubrica,
  nivelEvaluacion,
} from '@superstars/db';
import type { EstadoCalificacion } from '@superstars/shared';

@Injectable()
export class EvaluacionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // --- Queries del evaluador ---

  // convocatorias donde el evaluador esta asignado
  async findConvocatoriasDelEvaluador(evaluadorId: number) {
    return this.db
      .select({
        id: convocatoria.id,
        nombre: convocatoria.nombre,
        descripcion: convocatoria.descripcion,
        estado: convocatoria.estado,
        fechaCierrePostulacion: convocatoria.fechaCierrePostulacion,
        monto: convocatoria.monto,
        asignadoEn: evaluadorConvocatoria.createdAt,
      })
      .from(evaluadorConvocatoria)
      .innerJoin(convocatoria, eq(evaluadorConvocatoria.convocatoriaId, convocatoria.id))
      .where(eq(evaluadorConvocatoria.evaluadorId, evaluadorId))
      .orderBy(desc(evaluadorConvocatoria.createdAt));
  }

  // verificar que el evaluador esta asignado a una convocatoria
  async isEvaluadorDeConvocatoria(convocatoriaId: number, evaluadorId: number): Promise<boolean> {
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

  // postulaciones asignadas al evaluador en una convocatoria (filtradas por asignacion_evaluador)
  async findPostulacionesEvaluables(convocatoriaId: number, evaluadorId: number) {
    return this.db
      .select({
        id: postulacion.id,
        convocatoriaId: postulacion.convocatoriaId,
        empresaId: postulacion.empresaId,
        estado: postulacion.estado,
        porcentajeCompletado: postulacion.porcentajeCompletado,
        fechaEnvio: postulacion.fechaEnvio,
        puntajeFinal: postulacion.puntajeFinal,
        empresaRazonSocial: empresa.razonSocial,
        // incluir estado de la calificacion del evaluador si existe
        calificacionId: calificacion.id,
        calificacionEstado: calificacion.estado,
        calificacionPuntaje: calificacion.puntajeTotal,
      })
      .from(asignacionEvaluador)
      .innerJoin(postulacion, eq(asignacionEvaluador.postulacionId, postulacion.id))
      .innerJoin(empresa, eq(postulacion.empresaId, empresa.id))
      .leftJoin(calificacion, and(
        eq(calificacion.postulacionId, postulacion.id),
        eq(calificacion.evaluadorId, evaluadorId),
      ))
      .where(and(
        eq(asignacionEvaluador.evaluadorId, evaluadorId),
        eq(postulacion.convocatoriaId, convocatoriaId),
        sql`${postulacion.estado} IN ('en_evaluacion', 'calificado', 'ganador', 'no_seleccionado')`,
      ))
      .orderBy(desc(postulacion.updatedAt));
  }

  // detalle de una postulacion (sin responseData para el listado)
  async findPostulacionById(postulacionId: number) {
    const rows = await this.db
      .select()
      .from(postulacion)
      .where(eq(postulacion.id, postulacionId));
    return rows[0] ?? null;
  }

  // --- Calificacion ---

  // buscar calificacion de un evaluador para una postulacion
  async findCalificacion(postulacionId: number, evaluadorId: number) {
    const rows = await this.db
      .select()
      .from(calificacion)
      .where(and(
        eq(calificacion.postulacionId, postulacionId),
        eq(calificacion.evaluadorId, evaluadorId),
      ));
    return rows[0] ?? null;
  }

  // crear calificacion nueva
  async createCalificacion(data: {
    postulacionId: number;
    evaluadorId: number;
  }) {
    const [created] = await this.db
      .insert(calificacion)
      .values(data)
      .returning();
    return created;
  }

  // guardar detalles de calificacion (upsert por sub_criterio)
  async saveDetalles(
    calificacionId: number,
    detalles: { subCriterioId: number; puntaje: string; justificacion?: string }[],
  ) {
    // eliminar detalles existentes y re-insertar
    await this.db
      .delete(calificacionDetalle)
      .where(eq(calificacionDetalle.calificacionId, calificacionId));

    if (detalles.length > 0) {
      await this.db
        .insert(calificacionDetalle)
        .values(detalles.map(d => ({
          calificacionId,
          subCriterioId: d.subCriterioId,
          puntaje: d.puntaje,
          justificacion: d.justificacion,
        })));
    }
  }

  // actualizar estado y comentario de calificacion
  async updateCalificacion(
    calificacionId: number,
    data: {
      estado?: EstadoCalificacion;
      puntajeTotal?: string;
      comentarioGeneral?: string;
      comentarioResponsable?: string | null;
    },
  ) {
    const [updated] = await this.db
      .update(calificacion)
      .set(data)
      .where(eq(calificacion.id, calificacionId))
      .returning();
    return updated ?? null;
  }

  // obtener detalles de una calificacion
  async findDetalles(calificacionId: number) {
    return this.db
      .select()
      .from(calificacionDetalle)
      .where(eq(calificacionDetalle.calificacionId, calificacionId));
  }

  // --- Queries del responsable ---

  // todas las calificaciones de una convocatoria (para supervision)
  async findCalificacionesByConvocatoria(convocatoriaId: number) {
    return this.db
      .select({
        id: calificacion.id,
        postulacionId: calificacion.postulacionId,
        evaluadorId: calificacion.evaluadorId,
        puntajeTotal: calificacion.puntajeTotal,
        estado: calificacion.estado,
        comentarioGeneral: calificacion.comentarioGeneral,
        comentarioResponsable: calificacion.comentarioResponsable,
        createdAt: calificacion.createdAt,
        updatedAt: calificacion.updatedAt,
        empresaRazonSocial: empresa.razonSocial,
        evaluadorNombre: usuario.nombre,
      })
      .from(calificacion)
      .innerJoin(postulacion, eq(calificacion.postulacionId, postulacion.id))
      .innerJoin(empresa, eq(postulacion.empresaId, empresa.id))
      .innerJoin(usuario, eq(calificacion.evaluadorId, usuario.id))
      .where(eq(postulacion.convocatoriaId, convocatoriaId))
      .orderBy(desc(calificacion.updatedAt));
  }

  // detalle completo de una calificacion (para revision del responsable)
  async findCalificacionConDetalle(calificacionId: number) {
    const calif = await this.findCalificacionById(calificacionId);
    if (!calif) return null;

    const [detalles, post, evalUser] = await Promise.all([
      this.findDetalles(calificacionId),
      this.db.select().from(postulacion).where(eq(postulacion.id, calif.postulacionId)),
      this.db.select({ nombre: usuario.nombre }).from(usuario).where(eq(usuario.id, calif.evaluadorId)),
    ]);

    return {
      calificacion: calif,
      detalles,
      postulacion: post[0] ?? null,
      evaluadorNombre: evalUser[0]?.nombre ?? null,
    };
  }

  // buscar calificacion por ID
  async findCalificacionById(calificacionId: number) {
    const rows = await this.db
      .select()
      .from(calificacion)
      .where(eq(calificacion.id, calificacionId));
    return rows[0] ?? null;
  }

  // contar calificaciones aprobadas vs totales para una postulacion
  async countCalificacionesByPostulacion(postulacionId: number) {
    const all = await this.db
      .select({
        id: calificacion.id,
        estado: calificacion.estado,
        puntajeTotal: calificacion.puntajeTotal,
      })
      .from(calificacion)
      .where(eq(calificacion.postulacionId, postulacionId));

    const aprobadas = all.filter(c => c.estado === 'aprobado');

    return {
      total: all.length,
      aprobadas: aprobadas.length,
      todasAprobadas: all.length > 0 && aprobadas.length === all.length,
      promedioPuntaje: aprobadas.length > 0
        ? aprobadas.reduce((sum, c) => sum + Number(c.puntajeTotal ?? 0), 0) / aprobadas.length
        : null,
    };
  }

  // actualizar puntaje final y estado de postulacion
  async updatePostulacionPuntaje(
    postulacionId: number,
    puntajeFinal: string,
    estado: string,
  ) {
    const [updated] = await this.db
      .update(postulacion)
      .set({
        puntajeFinal,
        estado: estado as any,
      })
      .where(eq(postulacion.id, postulacionId))
      .returning();
    return updated ?? null;
  }

  // rangos validos de puntaje por sub-criterio (min del basico, max del avanzado)
  async findRangosPuntajeByConvocatoria(convocatoriaId: number) {
    return this.db
      .select({
        subCriterioId: subCriterio.id,
        nombre: subCriterio.nombre,
        nivel: nivelEvaluacion.nivel,
        puntajeMin: nivelEvaluacion.puntajeMin,
        puntajeMax: nivelEvaluacion.puntajeMax,
      })
      .from(nivelEvaluacion)
      .innerJoin(subCriterio, eq(nivelEvaluacion.subCriterioId, subCriterio.id))
      .innerJoin(criterio, eq(subCriterio.criterioId, criterio.id))
      .innerJoin(rubrica, eq(criterio.rubricaId, rubrica.id))
      .where(eq(rubrica.convocatoriaId, convocatoriaId));
  }

  // contar sub-criterios de la rubrica de una convocatoria
  async countSubCriteriosByConvocatoria(convocatoriaId: number): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(subCriterio)
      .innerJoin(criterio, eq(subCriterio.criterioId, criterio.id))
      .innerJoin(rubrica, eq(criterio.rubricaId, rubrica.id))
      .where(eq(rubrica.convocatoriaId, convocatoriaId));
    return Number(result[0].count);
  }

  // --- Asignacion de evaluadores a postulaciones ---

  // verificar si un evaluador esta asignado a una postulacion
  async isAsignadoAPostulacion(postulacionId: number, evaluadorId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: asignacionEvaluador.id })
      .from(asignacionEvaluador)
      .where(and(
        eq(asignacionEvaluador.postulacionId, postulacionId),
        eq(asignacionEvaluador.evaluadorId, evaluadorId),
      ))
      .limit(1);
    return rows.length > 0;
  }

  // listar evaluadores asignados a una postulacion
  async findAsignacionesByPostulacion(postulacionId: number) {
    return this.db
      .select({
        id: asignacionEvaluador.id,
        postulacionId: asignacionEvaluador.postulacionId,
        evaluadorId: asignacionEvaluador.evaluadorId,
        evaluadorNombre: usuario.nombre,
        evaluadorEmail: usuario.email,
        asignadoPor: asignacionEvaluador.asignadoPor,
        createdAt: asignacionEvaluador.createdAt,
      })
      .from(asignacionEvaluador)
      .innerJoin(usuario, eq(asignacionEvaluador.evaluadorId, usuario.id))
      .where(eq(asignacionEvaluador.postulacionId, postulacionId))
      .orderBy(desc(asignacionEvaluador.createdAt));
  }

  // asignar evaluador a postulacion
  async assignEvaluadorToPostulacion(data: {
    postulacionId: number;
    evaluadorId: number;
    asignadoPor: number;
  }) {
    const [created] = await this.db
      .insert(asignacionEvaluador)
      .values(data)
      .returning();
    return created;
  }

  // desasignar evaluador de postulacion
  async removeAsignacion(postulacionId: number, evaluadorId: number): Promise<boolean> {
    const result = await this.db
      .delete(asignacionEvaluador)
      .where(and(
        eq(asignacionEvaluador.postulacionId, postulacionId),
        eq(asignacionEvaluador.evaluadorId, evaluadorId),
      ))
      .returning({ id: asignacionEvaluador.id });
    return result.length > 0;
  }
}
