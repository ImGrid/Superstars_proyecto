import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql, desc, asc, isNull, inArray, ne, count } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import {
  concurso,
  responsableConcurso,
  evaluadorConcurso,
  asignacionEvaluador,
  postulacion,
  empresa,
  usuario,
  calificacion,
} from '@superstars/db';

// estados que cuentan como concurso "activo" para los KPIs
const ESTADOS_ACTIVOS = ['publicado', 'cerrado', 'en_evaluacion', 'resultados_listos'] as const;

// estados de postulacion que cuentan como "aprobada" (paso por la revision del responsable)
const ESTADOS_POSTULACION_APROBADA = ['en_evaluacion', 'calificado', 'ganador', 'no_seleccionado'] as const;

@Injectable()
export class DashboardRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // ============== ADMIN ==============

  // KPIs globales del admin: counts por estado de concurso, postulaciones, ganadores
  async getAdminConcursoStats() {
    const [row] = await this.db
      .select({
        borrador: sql<number>`count(*) filter (where ${concurso.estado} = 'borrador')`.mapWith(Number),
        publicado: sql<number>`count(*) filter (where ${concurso.estado} = 'publicado')`.mapWith(Number),
        cerrado: sql<number>`count(*) filter (where ${concurso.estado} = 'cerrado')`.mapWith(Number),
        en_evaluacion: sql<number>`count(*) filter (where ${concurso.estado} = 'en_evaluacion')`.mapWith(Number),
        resultados_listos: sql<number>`count(*) filter (where ${concurso.estado} = 'resultados_listos')`.mapWith(Number),
        finalizado: sql<number>`count(*) filter (where ${concurso.estado} = 'finalizado')`.mapWith(Number),
      })
      .from(concurso);
    return row;
  }

  // counts globales de postulaciones (no borrador, ganadores) y empresas
  async getAdminGlobalCounts() {
    const [postRow] = await this.db
      .select({
        totalNoBorrador: sql<number>`count(*) filter (where ${postulacion.estado} != 'borrador')`.mapWith(Number),
        totalGanadores: sql<number>`count(*) filter (where ${postulacion.estado} = 'ganador')`.mapWith(Number),
      })
      .from(postulacion);

    const [empRow] = await this.db
      .select({ total: count() })
      .from(empresa);

    return {
      totalPostulacionesNoBorrador: postRow.totalNoBorrador,
      totalGanadoresHistoricos: postRow.totalGanadores,
      totalEmpresas: Number(empRow.total),
    };
  }

  // counts de usuarios activos por rol (solo admin)
  async getAdminUsuarioStats() {
    const [row] = await this.db
      .select({
        administrador: sql<number>`count(*) filter (where ${usuario.rol} = 'administrador')`.mapWith(Number),
        responsable_concurso: sql<number>`count(*) filter (where ${usuario.rol} = 'responsable_concurso')`.mapWith(Number),
        evaluador: sql<number>`count(*) filter (where ${usuario.rol} = 'evaluador')`.mapWith(Number),
        proponente: sql<number>`count(*) filter (where ${usuario.rol} = 'proponente')`.mapWith(Number),
      })
      .from(usuario)
      .where(eq(usuario.activo, true));
    return row;
  }

  // resumen de los concursos activos: id, nombre, estado, total postulaciones, dias para cerrar
  async getAdminConcursosActivosResumen() {
    return this.db
      .select({
        id: concurso.id,
        nombre: concurso.nombre,
        estado: concurso.estado,
        // postulaciones del concurso (no borradores)
        totalPostulaciones: sql<number>`(
          select count(*) from postulacion p
          where p.concurso_id = ${concurso.id} and p.estado != 'borrador'
        )`.mapWith(Number),
        // dias hasta el cierre real (efectiva si existe, si no la original). Solo aplica si esta publicado
        diasParaCerrar: sql<number | null>`case
          when ${concurso.estado} = 'publicado' then
            (coalesce(${concurso.fechaCierreEfectiva}, ${concurso.fechaCierrePostulacion}) - current_date)::int
          else null
        end`,
      })
      .from(concurso)
      .where(inArray(concurso.estado, [...ESTADOS_ACTIVOS]))
      .orderBy(asc(sql`coalesce(${concurso.fechaCierreEfectiva}, ${concurso.fechaCierrePostulacion})`));
  }

  // alertas operativas para el admin
  async getAdminAlertas() {
    // concursos en cerrado que aun no se llevaron a evaluacion
    const [cerradoSinEval] = await this.db
      .select({ count: count() })
      .from(concurso)
      .where(eq(concurso.estado, 'cerrado'));

    // concursos en borrador o publicado sin responsable asignado
    const [sinResponsable] = await this.db
      .select({ count: count() })
      .from(concurso)
      .where(and(
        inArray(concurso.estado, ['borrador', 'publicado']),
        sql`not exists (select 1 from ${responsableConcurso} rc where rc.concurso_id = ${concurso.id})`,
      ));

    return {
      concursosCerradosSinEvaluacion: Number(cerradoSinEval.count),
      concursosSinResponsable: Number(sinResponsable.count),
    };
  }

  // ============== RESPONSABLE ==============

  // KPIs principales para un responsable: cuenta sus concursos y trabajo pendiente
  async getResponsableKpis(usuarioId: number) {
    // mis concursos: total y activos
    const [misConcursos] = await this.db
      .select({
        total: count(),
        activos: sql<number>`count(*) filter (where ${concurso.estado} in ('publicado', 'cerrado', 'en_evaluacion', 'resultados_listos'))`.mapWith(Number),
        proximosACerrar: sql<number>`count(*) filter (
          where ${concurso.estado} = 'publicado'
          and coalesce(${concurso.fechaCierreEfectiva}, ${concurso.fechaCierrePostulacion}) <= current_date + interval '7 days'
        )`.mapWith(Number),
      })
      .from(concurso)
      .innerJoin(responsableConcurso, eq(responsableConcurso.concursoId, concurso.id))
      .where(eq(responsableConcurso.usuarioId, usuarioId));

    // postulaciones por revisar (estado=enviado en mis concursos)
    const [postPorRevisar] = await this.db
      .select({ count: count() })
      .from(postulacion)
      .innerJoin(responsableConcurso, eq(responsableConcurso.concursoId, postulacion.concursoId))
      .where(and(
        eq(responsableConcurso.usuarioId, usuarioId),
        eq(postulacion.estado, 'enviado'),
      ));

    // calificaciones por aprobar (estado=completado en mis concursos)
    const [califPorAprobar] = await this.db
      .select({ count: count() })
      .from(calificacion)
      .innerJoin(postulacion, eq(postulacion.id, calificacion.postulacionId))
      .innerJoin(responsableConcurso, eq(responsableConcurso.concursoId, postulacion.concursoId))
      .where(and(
        eq(responsableConcurso.usuarioId, usuarioId),
        eq(calificacion.estado, 'completado'),
      ));

    return {
      totalMisConcursos: Number(misConcursos.total),
      misConcursosActivos: misConcursos.activos,
      concursosProximosACerrar: misConcursos.proximosACerrar,
      postulacionesPorRevisar: Number(postPorRevisar.count),
      calificacionesPorAprobar: Number(califPorAprobar.count),
    };
  }

  // top 10 postulaciones esperando revision del responsable, ordenadas por la mas vieja
  async getResponsablePostulacionesPendientes(usuarioId: number) {
    return this.db
      .select({
        postulacionId: postulacion.id,
        empresaNombre: empresa.razonSocial,
        concursoId: concurso.id,
        concursoNombre: concurso.nombre,
        fechaEnvio: postulacion.fechaEnvio,
      })
      .from(postulacion)
      .innerJoin(empresa, eq(empresa.id, postulacion.empresaId))
      .innerJoin(concurso, eq(concurso.id, postulacion.concursoId))
      .innerJoin(responsableConcurso, eq(responsableConcurso.concursoId, concurso.id))
      .where(and(
        eq(responsableConcurso.usuarioId, usuarioId),
        eq(postulacion.estado, 'enviado'),
      ))
      .orderBy(asc(postulacion.fechaEnvio))
      .limit(10);
  }

  // top 10 calificaciones esperando aprobacion del responsable
  async getResponsableCalificacionesPendientes(usuarioId: number) {
    return this.db
      .select({
        calificacionId: calificacion.id,
        postulacionId: postulacion.id,
        empresaNombre: empresa.razonSocial,
        concursoId: concurso.id,
        concursoNombre: concurso.nombre,
        evaluadorNombre: usuario.nombre,
        puntajeTotal: calificacion.puntajeTotal,
        fechaCompletada: calificacion.updatedAt,
      })
      .from(calificacion)
      .innerJoin(postulacion, eq(postulacion.id, calificacion.postulacionId))
      .innerJoin(empresa, eq(empresa.id, postulacion.empresaId))
      .innerJoin(concurso, eq(concurso.id, postulacion.concursoId))
      .innerJoin(usuario, eq(usuario.id, calificacion.evaluadorId))
      .innerJoin(responsableConcurso, eq(responsableConcurso.concursoId, concurso.id))
      .where(and(
        eq(responsableConcurso.usuarioId, usuarioId),
        eq(calificacion.estado, 'completado'),
      ))
      .orderBy(asc(calificacion.updatedAt))
      .limit(10);
  }

  // resumen completo de los concursos del responsable con counts agregados
  async getResponsableConcursosResumen(usuarioId: number) {
    return this.db
      .select({
        id: concurso.id,
        nombre: concurso.nombre,
        estado: concurso.estado,
        fechaCierrePostulacion: concurso.fechaCierrePostulacion,
        fechaCierreEfectiva: concurso.fechaCierreEfectiva,
        // postulaciones del concurso por estado
        totalPostulaciones: sql<number>`(
          select count(*) from postulacion p
          where p.concurso_id = ${concurso.id} and p.estado != 'borrador'
        )`.mapWith(Number),
        postulacionesEnviadas: sql<number>`(
          select count(*) from postulacion p
          where p.concurso_id = ${concurso.id} and p.estado = 'enviado'
        )`.mapWith(Number),
        postulacionesAprobadas: sql<number>`(
          select count(*) from postulacion p
          where p.concurso_id = ${concurso.id}
          and p.estado in ('en_evaluacion', 'calificado', 'ganador', 'no_seleccionado')
        )`.mapWith(Number),
        totalCalificaciones: sql<number>`(
          select count(*) from calificacion c
          inner join postulacion p on p.id = c.postulacion_id
          where p.concurso_id = ${concurso.id}
        )`.mapWith(Number),
        calificacionesAprobadas: sql<number>`(
          select count(*) from calificacion c
          inner join postulacion p on p.id = c.postulacion_id
          where p.concurso_id = ${concurso.id} and c.estado = 'aprobado'
        )`.mapWith(Number),
        diasParaCerrar: sql<number | null>`case
          when ${concurso.estado} = 'publicado' then
            (coalesce(${concurso.fechaCierreEfectiva}, ${concurso.fechaCierrePostulacion}) - current_date)::int
          else null
        end`,
      })
      .from(concurso)
      .innerJoin(responsableConcurso, eq(responsableConcurso.concursoId, concurso.id))
      .where(eq(responsableConcurso.usuarioId, usuarioId))
      .orderBy(desc(concurso.createdAt));
  }

  // distribucion de estados de postulaciones en los concursos del responsable
  async getResponsableDistribucionEstados(usuarioId: number) {
    return this.db
      .select({
        estado: postulacion.estado,
        total: count(),
      })
      .from(postulacion)
      .innerJoin(responsableConcurso, eq(responsableConcurso.concursoId, postulacion.concursoId))
      .where(eq(responsableConcurso.usuarioId, usuarioId))
      .groupBy(postulacion.estado);
  }

  // ============== EVALUADOR ==============

  // KPIs principales para un evaluador
  async getEvaluadorKpis(evaluadorId: number) {
    // concursos asignados
    const [concursosRow] = await this.db
      .select({ count: count() })
      .from(evaluadorConcurso)
      .where(eq(evaluadorConcurso.evaluadorId, evaluadorId));

    // postulaciones asignadas pendientes de calificar (sin calificacion completada/aprobada)
    const [pendientesRow] = await this.db
      .select({ count: count() })
      .from(asignacionEvaluador)
      .leftJoin(calificacion, and(
        eq(calificacion.postulacionId, asignacionEvaluador.postulacionId),
        eq(calificacion.evaluadorId, asignacionEvaluador.evaluadorId),
      ))
      .innerJoin(postulacion, eq(postulacion.id, asignacionEvaluador.postulacionId))
      .where(and(
        eq(asignacionEvaluador.evaluadorId, evaluadorId),
        eq(postulacion.estado, 'en_evaluacion'),
        // sin calificacion o en estados que el evaluador puede editar
        sql`(${calificacion.estado} is null or ${calificacion.estado} in ('en_progreso', 'devuelto'))`,
      ));

    // counts por estado de mis calificaciones
    const [estadoCounts] = await this.db
      .select({
        enProgreso: sql<number>`count(*) filter (where ${calificacion.estado} = 'en_progreso')`.mapWith(Number),
        completadas: sql<number>`count(*) filter (where ${calificacion.estado} = 'completado')`.mapWith(Number),
        devueltas: sql<number>`count(*) filter (where ${calificacion.estado} = 'devuelto')`.mapWith(Number),
        aprobadas: sql<number>`count(*) filter (where ${calificacion.estado} = 'aprobado')`.mapWith(Number),
      })
      .from(calificacion)
      .where(eq(calificacion.evaluadorId, evaluadorId));

    return {
      concursosAsignados: Number(concursosRow.count),
      postulacionesPorCalificar: Number(pendientesRow.count),
      calificacionesEnProgreso: estadoCounts.enProgreso,
      calificacionesCompletadas: estadoCounts.completadas,
      calificacionesDevueltas: estadoCounts.devueltas,
      calificacionesAprobadas: estadoCounts.aprobadas,
    };
  }

  // top 10 postulaciones que el evaluador debe calificar
  async getEvaluadorPostulacionesPendientes(evaluadorId: number) {
    return this.db
      .select({
        postulacionId: postulacion.id,
        concursoId: concurso.id,
        concursoNombre: concurso.nombre,
        empresaNombre: empresa.razonSocial,
        estadoCalificacion: calificacion.estado,
      })
      .from(asignacionEvaluador)
      .innerJoin(postulacion, eq(postulacion.id, asignacionEvaluador.postulacionId))
      .innerJoin(empresa, eq(empresa.id, postulacion.empresaId))
      .innerJoin(concurso, eq(concurso.id, postulacion.concursoId))
      .leftJoin(calificacion, and(
        eq(calificacion.postulacionId, asignacionEvaluador.postulacionId),
        eq(calificacion.evaluadorId, asignacionEvaluador.evaluadorId),
      ))
      .where(and(
        eq(asignacionEvaluador.evaluadorId, evaluadorId),
        eq(postulacion.estado, 'en_evaluacion'),
        sql`(${calificacion.estado} is null or ${calificacion.estado} in ('en_progreso', 'devuelto'))`,
      ))
      .orderBy(asc(postulacion.createdAt))
      .limit(10);
  }

  // calificaciones del evaluador devueltas por el responsable
  async getEvaluadorCalificacionesDevueltas(evaluadorId: number) {
    return this.db
      .select({
        calificacionId: calificacion.id,
        postulacionId: postulacion.id,
        concursoId: concurso.id,
        concursoNombre: concurso.nombre,
        empresaNombre: empresa.razonSocial,
        comentarioResponsable: calificacion.comentarioResponsable,
      })
      .from(calificacion)
      .innerJoin(postulacion, eq(postulacion.id, calificacion.postulacionId))
      .innerJoin(empresa, eq(empresa.id, postulacion.empresaId))
      .innerJoin(concurso, eq(concurso.id, postulacion.concursoId))
      .where(and(
        eq(calificacion.evaluadorId, evaluadorId),
        eq(calificacion.estado, 'devuelto'),
      ))
      .orderBy(desc(calificacion.updatedAt));
  }

  // progreso por concurso asignado: counts agregados de calificaciones por estado
  async getEvaluadorProgresoPorConcurso(evaluadorId: number) {
    return this.db
      .select({
        concursoId: concurso.id,
        concursoNombre: concurso.nombre,
        totalAsignadas: sql<number>`(
          select count(*) from asignacion_evaluador ae
          inner join postulacion p on p.id = ae.postulacion_id
          where ae.evaluador_id = ${evaluadorId} and p.concurso_id = ${concurso.id}
        )`.mapWith(Number),
        pendientes: sql<number>`(
          select count(*) from asignacion_evaluador ae
          inner join postulacion p on p.id = ae.postulacion_id
          left join calificacion c on c.postulacion_id = p.id and c.evaluador_id = ae.evaluador_id
          where ae.evaluador_id = ${evaluadorId} and p.concurso_id = ${concurso.id} and c.id is null
        )`.mapWith(Number),
        enProgreso: sql<number>`(
          select count(*) from calificacion c
          inner join postulacion p on p.id = c.postulacion_id
          where c.evaluador_id = ${evaluadorId} and p.concurso_id = ${concurso.id} and c.estado = 'en_progreso'
        )`.mapWith(Number),
        completadas: sql<number>`(
          select count(*) from calificacion c
          inner join postulacion p on p.id = c.postulacion_id
          where c.evaluador_id = ${evaluadorId} and p.concurso_id = ${concurso.id} and c.estado = 'completado'
        )`.mapWith(Number),
        aprobadas: sql<number>`(
          select count(*) from calificacion c
          inner join postulacion p on p.id = c.postulacion_id
          where c.evaluador_id = ${evaluadorId} and p.concurso_id = ${concurso.id} and c.estado = 'aprobado'
        )`.mapWith(Number),
        devueltas: sql<number>`(
          select count(*) from calificacion c
          inner join postulacion p on p.id = c.postulacion_id
          where c.evaluador_id = ${evaluadorId} and p.concurso_id = ${concurso.id} and c.estado = 'devuelto'
        )`.mapWith(Number),
      })
      .from(evaluadorConcurso)
      .innerJoin(concurso, eq(concurso.id, evaluadorConcurso.concursoId))
      .where(eq(evaluadorConcurso.evaluadorId, evaluadorId))
      .orderBy(desc(concurso.createdAt));
  }
}
