import { Injectable } from '@nestjs/common';
import {
  EstadoConvocatoria,
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
      convocatoriaStats,
      globalCounts,
      usuarioStats,
      convocatoriasResumen,
      alertas,
    ] = await Promise.all([
      this.repo.getAdminConvocatoriaStats(),
      this.repo.getAdminGlobalCounts(),
      this.repo.getAdminUsuarioStats(),
      this.repo.getAdminConvocatoriasActivasResumen(),
      this.repo.getAdminAlertas(),
    ]);

    // total de convocatorias en estados activos (publicado + cerrado + en_evaluacion + resultados_listos)
    const totalConvocatoriasActivas =
      convocatoriaStats.publicado +
      convocatoriaStats.cerrado +
      convocatoriaStats.en_evaluacion +
      convocatoriaStats.resultados_listos;

    return {
      totalConvocatoriasActivas,
      totalEmpresas: globalCounts.totalEmpresas,
      totalPostulacionesNoBorrador: globalCounts.totalPostulacionesNoBorrador,
      totalGanadoresHistoricos: globalCounts.totalGanadoresHistoricos,

      convocatoriasPorEstado: {
        [EstadoConvocatoria.BORRADOR]: convocatoriaStats.borrador,
        [EstadoConvocatoria.PUBLICADO]: convocatoriaStats.publicado,
        [EstadoConvocatoria.CERRADO]: convocatoriaStats.cerrado,
        [EstadoConvocatoria.EN_EVALUACION]: convocatoriaStats.en_evaluacion,
        [EstadoConvocatoria.RESULTADOS_LISTOS]: convocatoriaStats.resultados_listos,
        [EstadoConvocatoria.FINALIZADO]: convocatoriaStats.finalizado,
      },

      usuariosActivosPorRol: {
        [RolUsuario.ADMINISTRADOR]: usuarioStats.administrador,
        [RolUsuario.RESPONSABLE_CONVOCATORIA]: usuarioStats.responsable_convocatoria,
        [RolUsuario.EVALUADOR]: usuarioStats.evaluador,
        [RolUsuario.PROPONENTE]: usuarioStats.proponente,
      },

      convocatoriasActivasResumen: convocatoriasResumen.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        estado: c.estado as EstadoConvocatoria,
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
      convocatoriasResumen,
      distribucionRows,
    ] = await Promise.all([
      this.repo.getResponsableKpis(usuarioId),
      this.repo.getResponsablePostulacionesPendientes(usuarioId),
      this.repo.getResponsableCalificacionesPendientes(usuarioId),
      this.repo.getResponsableConvocatoriasResumen(usuarioId),
      this.repo.getResponsableDistribucionEstados(usuarioId),
    ]);

    // armar Record con todos los estados (incluso los que vienen en 0)
    const distribucion = this.emptyPostulacionRecord();
    for (const row of distribucionRows) {
      distribucion[row.estado as EstadoPostulacion] = Number(row.total);
    }

    return {
      totalMisConvocatorias: kpis.totalMisConvocatorias,
      misConvocatoriasActivas: kpis.misConvocatoriasActivas,
      postulacionesPorRevisar: kpis.postulacionesPorRevisar,
      calificacionesPorAprobar: kpis.calificacionesPorAprobar,
      convocatoriasProximasACerrar: kpis.convocatoriasProximasACerrar,

      postulacionesPendientesLista: postPendientes.map((p) => ({
        postulacionId: p.postulacionId,
        empresaNombre: p.empresaNombre,
        convocatoriaId: p.convocatoriaId,
        convocatoriaNombre: p.convocatoriaNombre,
        // fechaEnvio del schema es nullable; el filtro estado=enviado garantiza que no sea null
        fechaEnvio: p.fechaEnvio ?? '',
      })),

      calificacionesPendientesLista: califPendientes.map((c) => ({
        calificacionId: c.calificacionId,
        postulacionId: c.postulacionId,
        empresaNombre: c.empresaNombre,
        convocatoriaId: c.convocatoriaId,
        convocatoriaNombre: c.convocatoriaNombre,
        evaluadorNombre: c.evaluadorNombre,
        puntajeTotal: c.puntajeTotal,
        fechaCompletada: c.fechaCompletada,
      })),

      misConvocatoriasResumen: convocatoriasResumen.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        estado: c.estado as EstadoConvocatoria,
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
      this.repo.getEvaluadorProgresoPorConvocatoria(evaluadorId),
    ]);

    return {
      convocatoriasAsignadas: kpis.convocatoriasAsignadas,
      postulacionesPorCalificar: kpis.postulacionesPorCalificar,
      calificacionesEnProgreso: kpis.calificacionesEnProgreso,
      calificacionesDevueltas: kpis.calificacionesDevueltas,
      calificacionesAprobadas: kpis.calificacionesAprobadas,

      postulacionesPorCalificarLista: pendientes.map((p) => ({
        postulacionId: p.postulacionId,
        convocatoriaId: p.convocatoriaId,
        convocatoriaNombre: p.convocatoriaNombre,
        empresaNombre: p.empresaNombre,
        // Drizzle infiere el enum como string literal union; lo casteamos al enum TS de shared
        estadoCalificacion: p.estadoCalificacion as EstadoCalificacion | null,
      })),

      calificacionesDevueltasLista: devueltas.map((d) => ({
        calificacionId: d.calificacionId,
        postulacionId: d.postulacionId,
        convocatoriaId: d.convocatoriaId,
        convocatoriaNombre: d.convocatoriaNombre,
        empresaNombre: d.empresaNombre,
        comentarioResponsable: d.comentarioResponsable,
      })),

      progresoPorConvocatoria: progreso.map((p) => ({
        convocatoriaId: p.convocatoriaId,
        convocatoriaNombre: p.convocatoriaNombre,
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
