import { Injectable } from '@nestjs/common';
import {
  EstadoConcurso,
  EstadoPostulacion,
  RolUsuario,
} from '@superstars/shared';
import type {
  AdminDashboardStats,
  ResponsableDashboardStats,
  EvaluadorDashboardStats,
  EstadoCalificacion,
} from '@superstars/shared';
import { DashboardRepository } from './dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(private readonly repo: DashboardRepository) {}

  // ============== ADMIN ==============

  async getAdminStats(): Promise<AdminDashboardStats> {
    // queries en paralelo (todas son agregaciones independientes)
    const [
      concursoStats,
      globalCounts,
      usuarioStats,
      concursosResumen,
      alertas,
    ] = await Promise.all([
      this.repo.getAdminConcursoStats(),
      this.repo.getAdminGlobalCounts(),
      this.repo.getAdminUsuarioStats(),
      this.repo.getAdminConcursosActivosResumen(),
      this.repo.getAdminAlertas(),
    ]);

    // total de concursos en estados activos (publicado + cerrado + en_evaluacion + resultados_listos)
    const totalConcursosActivos =
      concursoStats.publicado +
      concursoStats.cerrado +
      concursoStats.en_evaluacion +
      concursoStats.resultados_listos;

    return {
      totalConcursosActivos,
      totalEmpresas: globalCounts.totalEmpresas,
      totalPostulacionesNoBorrador: globalCounts.totalPostulacionesNoBorrador,
      totalGanadoresHistoricos: globalCounts.totalGanadoresHistoricos,

      concursosPorEstado: {
        [EstadoConcurso.BORRADOR]: concursoStats.borrador,
        [EstadoConcurso.PUBLICADO]: concursoStats.publicado,
        [EstadoConcurso.CERRADO]: concursoStats.cerrado,
        [EstadoConcurso.EN_EVALUACION]: concursoStats.en_evaluacion,
        [EstadoConcurso.RESULTADOS_LISTOS]: concursoStats.resultados_listos,
        [EstadoConcurso.FINALIZADO]: concursoStats.finalizado,
      },

      usuariosActivosPorRol: {
        [RolUsuario.ADMINISTRADOR]: usuarioStats.administrador,
        [RolUsuario.RESPONSABLE_CONCURSO]: usuarioStats.responsable_concurso,
        [RolUsuario.EVALUADOR]: usuarioStats.evaluador,
        [RolUsuario.PROPONENTE]: usuarioStats.proponente,
      },

      concursosActivosResumen: concursosResumen.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        estado: c.estado as EstadoConcurso,
        totalPostulaciones: c.totalPostulaciones,
        diasParaCerrar: c.diasParaCerrar,
      })),

      alertas,
    };
  }

  // ============== RESPONSABLE ==============

  async getResponsableStats(usuarioId: number): Promise<ResponsableDashboardStats> {
    const [
      kpis,
      postPendientes,
      califPendientes,
      concursosResumen,
      distribucionRows,
    ] = await Promise.all([
      this.repo.getResponsableKpis(usuarioId),
      this.repo.getResponsablePostulacionesPendientes(usuarioId),
      this.repo.getResponsableCalificacionesPendientes(usuarioId),
      this.repo.getResponsableConcursosResumen(usuarioId),
      this.repo.getResponsableDistribucionEstados(usuarioId),
    ]);

    // armar Record con todos los estados (incluso los que vienen en 0)
    const distribucion = this.emptyPostulacionRecord();
    for (const row of distribucionRows) {
      distribucion[row.estado as EstadoPostulacion] = Number(row.total);
    }

    return {
      totalMisConcursos: kpis.totalMisConcursos,
      misConcursosActivos: kpis.misConcursosActivos,
      postulacionesPorRevisar: kpis.postulacionesPorRevisar,
      calificacionesPorAprobar: kpis.calificacionesPorAprobar,
      concursosProximosACerrar: kpis.concursosProximosACerrar,

      postulacionesPendientesLista: postPendientes.map((p) => ({
        postulacionId: p.postulacionId,
        empresaNombre: p.empresaNombre,
        concursoId: p.concursoId,
        concursoNombre: p.concursoNombre,
        // fechaEnvio del schema es nullable; el filtro estado=enviado garantiza que no sea null
        fechaEnvio: p.fechaEnvio ?? '',
      })),

      calificacionesPendientesLista: califPendientes.map((c) => ({
        calificacionId: c.calificacionId,
        postulacionId: c.postulacionId,
        empresaNombre: c.empresaNombre,
        concursoId: c.concursoId,
        concursoNombre: c.concursoNombre,
        evaluadorNombre: c.evaluadorNombre,
        puntajeTotal: c.puntajeTotal,
        fechaCompletada: c.fechaCompletada,
      })),

      misConcursosResumen: concursosResumen.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        estado: c.estado as EstadoConcurso,
        totalPostulaciones: c.totalPostulaciones,
        postulacionesEnviadas: c.postulacionesEnviadas,
        postulacionesAprobadas: c.postulacionesAprobadas,
        totalCalificaciones: c.totalCalificaciones,
        calificacionesAprobadas: c.calificacionesAprobadas,
        // fecha real de cierre: efectiva si existe, sino la original
        fechaCierreReal: c.fechaCierreEfectiva ?? c.fechaCierrePostulacion,
        diasParaCerrar: c.diasParaCerrar,
      })),

      distribucionEstadosPostulaciones: distribucion,
    };
  }

  // ============== EVALUADOR ==============

  async getEvaluadorStats(evaluadorId: number): Promise<EvaluadorDashboardStats> {
    const [
      kpis,
      pendientes,
      devueltas,
      progreso,
    ] = await Promise.all([
      this.repo.getEvaluadorKpis(evaluadorId),
      this.repo.getEvaluadorPostulacionesPendientes(evaluadorId),
      this.repo.getEvaluadorCalificacionesDevueltas(evaluadorId),
      this.repo.getEvaluadorProgresoPorConcurso(evaluadorId),
    ]);

    return {
      concursosAsignados: kpis.concursosAsignados,
      postulacionesPorCalificar: kpis.postulacionesPorCalificar,
      calificacionesEnProgreso: kpis.calificacionesEnProgreso,
      calificacionesDevueltas: kpis.calificacionesDevueltas,
      calificacionesAprobadas: kpis.calificacionesAprobadas,

      postulacionesPorCalificarLista: pendientes.map((p) => ({
        postulacionId: p.postulacionId,
        concursoId: p.concursoId,
        concursoNombre: p.concursoNombre,
        empresaNombre: p.empresaNombre,
        // Drizzle infiere el enum como string literal union; lo casteamos al enum TS de shared
        estadoCalificacion: p.estadoCalificacion as EstadoCalificacion | null,
      })),

      calificacionesDevueltasLista: devueltas.map((d) => ({
        calificacionId: d.calificacionId,
        postulacionId: d.postulacionId,
        concursoId: d.concursoId,
        concursoNombre: d.concursoNombre,
        empresaNombre: d.empresaNombre,
        comentarioResponsable: d.comentarioResponsable,
      })),

      progresoPorConcurso: progreso.map((p) => ({
        concursoId: p.concursoId,
        concursoNombre: p.concursoNombre,
        totalAsignadas: p.totalAsignadas,
        pendientes: p.pendientes,
        enProgreso: p.enProgreso,
        completadas: p.completadas,
        aprobadas: p.aprobadas,
        devueltas: p.devueltas,
      })),
    };
  }

  // helper: crea un Record con todos los estados de postulacion en 0
  private emptyPostulacionRecord(): Record<EstadoPostulacion, number> {
    return {
      [EstadoPostulacion.BORRADOR]: 0,
      [EstadoPostulacion.ENVIADO]: 0,
      [EstadoPostulacion.OBSERVADO]: 0,
      [EstadoPostulacion.RECHAZADO]: 0,
      [EstadoPostulacion.EN_EVALUACION]: 0,
      [EstadoPostulacion.CALIFICADO]: 0,
      [EstadoPostulacion.GANADOR]: 0,
      [EstadoPostulacion.NO_SELECCIONADO]: 0,
    };
  }
}
