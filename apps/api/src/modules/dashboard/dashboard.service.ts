import { Injectable } from '@nestjs/common';
import {
  EstadoConvocatoria,
  EstadoPostulacion,
  RolUsuario,
  OPCIONES_DEPARTAMENTO,
} from '@superstars/shared';
import type {
  AdminDashboardStats,
  ResponsableDashboardStats,
  EvaluadorDashboardStats,
  ProponenteDashboardStats,
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
      coberturaRows,
      empresasNuevasEsteMes,
      montoComprometidoTotal,
      postulacionesPorEstadoRows,
      inclusionRaw,
      postulacionesPorMesRows,
    ] = await Promise.all([
      this.repo.getAdminConvocatoriaStats(),
      this.repo.getAdminGlobalCounts(),
      this.repo.getAdminUsuarioStats(),
      this.repo.getAdminConvocatoriasActivasResumen(),
      this.repo.getAdminAlertas(),
      this.repo.getAdminCoberturaNacional(),
      this.repo.getAdminEmpresasNuevasEsteMes(),
      this.repo.getAdminMontoComprometido(),
      this.repo.getAdminPostulacionesPorEstado(),
      this.repo.getAdminInclusion(),
      this.repo.getAdminPostulacionesPorMes(),
    ]);

    // total de convocatorias en estados activos (publicado + cerrado + en_evaluacion + resultados_listos)
    const totalConvocatoriasActivas =
      convocatoriaStats.publicado +
      convocatoriaStats.cerrado +
      convocatoriaStats.en_evaluacion +
      convocatoriaStats.resultados_listos;

    // cobertura: rellenar los 9 departamentos canonicos con 0 donde no haya empresas
    const coberturaMap = new Map(
      coberturaRows.map((r) => [r.departamento, Number(r.total)]),
    );
    const coberturaNacional = OPCIONES_DEPARTAMENTO.map((d) => ({
      departamento: d.valor,
      label: d.label,
      total: coberturaMap.get(d.valor) ?? 0,
    }));
    const departamentosCubiertos = coberturaNacional.filter((d) => d.total > 0).length;

    // distribucion global de postulaciones por estado (rellenar los 8 estados en 0)
    const postulacionesPorEstado = this.emptyPostulacionRecord();
    for (const row of postulacionesPorEstadoRows) {
      postulacionesPorEstado[row.estado as EstadoPostulacion] = Number(row.total);
    }

    // inclusion: calcular % de empleadas mujeres sobre el total de personas
    const totalEmpleados =
      inclusionRaw.empleadasMujeres + inclusionRaw.empleadosHombres;
    const inclusion = {
      empleadasMujeres: inclusionRaw.empleadasMujeres,
      empleadosHombres: inclusionRaw.empleadosHombres,
      pctMujeres:
        totalEmpleados > 0
          ? Math.round((inclusionRaw.empleadasMujeres / totalEmpleados) * 100)
          : 0,
      empresasContactoFemenino: inclusionRaw.empresasContactoFemenino,
      empresasConContacto: inclusionRaw.empresasConContacto,
    };

    // tendencia: serie de los ultimos 6 meses, rellenando en 0 los meses sin envios
    const mesesMap = new Map(
      postulacionesPorMesRows.map((r) => [r.mes, Number(r.total)]),
    );
    const tendenciaPostulaciones = this.ultimosMeses(6).map((mes) => ({
      mes,
      total: mesesMap.get(mes) ?? 0,
    }));

    // convocatorias que cierran en <= 7 dias (derivado del resumen de activas)
    const convocatoriasProximasACerrar = convocatoriasResumen.filter(
      (c) => c.diasParaCerrar !== null && c.diasParaCerrar >= 0 && c.diasParaCerrar <= 7,
    ).length;

    return {
      totalConvocatoriasActivas,
      convocatoriasProximasACerrar,
      totalEmpresas: globalCounts.totalEmpresas,
      empresasNuevasEsteMes,
      totalPostulacionesNoBorrador: globalCounts.totalPostulacionesNoBorrador,
      totalGanadoresHistoricos: globalCounts.totalGanadoresHistoricos,
      montoComprometidoTotal,

      coberturaNacional,
      departamentosCubiertos,

      convocatoriasPorEstado: {
        [EstadoConvocatoria.BORRADOR]: convocatoriaStats.borrador,
        [EstadoConvocatoria.PUBLICADO]: convocatoriaStats.publicado,
        [EstadoConvocatoria.CERRADO]: convocatoriaStats.cerrado,
        [EstadoConvocatoria.EN_EVALUACION]: convocatoriaStats.en_evaluacion,
        [EstadoConvocatoria.RESULTADOS_LISTOS]: convocatoriaStats.resultados_listos,
        [EstadoConvocatoria.FINALIZADO]: convocatoriaStats.finalizado,
      },

      postulacionesPorEstado,

      usuariosActivosPorRol: {
        [RolUsuario.ADMINISTRADOR]: usuarioStats.administrador,
        [RolUsuario.RESPONSABLE_CONVOCATORIA]: usuarioStats.responsable_convocatoria,
        [RolUsuario.EVALUADOR]: usuarioStats.evaluador,
        [RolUsuario.PROPONENTE]: usuarioStats.proponente,
      },

      inclusion,
      tendenciaPostulaciones,

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
        categoriaId: p.categoriaId,
        convocatoriaId: p.convocatoriaId,
        convocatoriaNombre: p.convocatoriaNombre,
        empresaNombre: p.empresaNombre,
        // Drizzle infiere el enum como string literal union; lo casteamos al enum TS de shared
        estadoCalificacion: p.estadoCalificacion as EstadoCalificacion | null,
      })),

      calificacionesDevueltasLista: devueltas.map((d) => ({
        calificacionId: d.calificacionId,
        postulacionId: d.postulacionId,
        categoriaId: d.categoriaId,
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

  // ============== PROPONENTE ==============

  async getProponenteStats(usuarioId: number): Promise<ProponenteDashboardStats> {
    const kpis = await this.repo.getProponenteKpis(usuarioId);

    // si no tiene empresa, no hay postulaciones que distribuir, ni resumen relevante.
    // devolvemos un payload coherente que el frontend usa para mostrar la alerta de
    // "registra tu empresa".
    if (!kpis.empresaId) {
      return {
        convocatoriasAbiertas: kpis.convocatoriasAbiertas,
        convocatoriasAnteriores: kpis.convocatoriasAnteriores,
        totalMisPostulaciones: 0,
        postulacionesObservadas: 0,
        misPostulacionesPorEstado: this.emptyPostulacionRecord(),
        tieneEmpresa: false,
        empresaRazonSocial: null,
        convocatoriasAbiertasResumen: [],
      };
    }

    const [distribucionRows, abiertasResumen] = await Promise.all([
      this.repo.getProponenteDistribucionEstados(kpis.empresaId),
      this.repo.getProponenteConvocatoriasAbiertasResumen(kpis.empresaId),
    ]);

    const distribucion = this.emptyPostulacionRecord();
    for (const row of distribucionRows) {
      distribucion[row.estado as EstadoPostulacion] = Number(row.total);
    }

    const totalMisPostulaciones = distribucionRows.reduce(
      (acc, row) => acc + Number(row.total),
      0,
    );

    return {
      convocatoriasAbiertas: kpis.convocatoriasAbiertas,
      convocatoriasAnteriores: kpis.convocatoriasAnteriores,
      totalMisPostulaciones,
      postulacionesObservadas: distribucion[EstadoPostulacion.OBSERVADO],
      misPostulacionesPorEstado: distribucion,
      tieneEmpresa: true,
      empresaRazonSocial: kpis.empresaRazonSocial,
      convocatoriasAbiertasResumen: abiertasResumen.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        fechaCierreReal: c.fechaCierreEfectiva ?? c.fechaCierrePostulacion,
        diasParaCerrar: c.diasParaCerrar,
        montoMin: c.montoMin,
        montoMax: c.montoMax,
        numeroGanadores: c.numeroGanadores,
        yaPostule: c.yaPostule,
        departamentos: c.departamentos,
        categorias: c.categorias,
        totalPostulantes: c.totalPostulantes,
        tieneImagen: c.tieneImagen,
      })),
    };
  }

  // helper: devuelve los ultimos n meses en formato YYYY-MM, del mas viejo al actual
  private ultimosMeses(n: number): string[] {
    const meses: string[] = [];
    const hoy = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return meses;
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
