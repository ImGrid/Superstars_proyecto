// Tipos de respuesta del dashboard por rol (sin Zod — son responses, no DTOs de input)
import { EstadoConvocatoria, EstadoPostulacion, EstadoCalificacion, RolUsuario } from '../enums';

// ====== ADMIN ======

// Resumen de una convocatoria para el dashboard del admin
export interface AdminConvocatoriaResumenItem {
  id: number;
  nombre: string;
  estado: EstadoConvocatoria;
  totalPostulaciones: number;
  diasParaCerrar: number | null;
}

// Respuesta del endpoint GET /api/dashboard/admin
export interface AdminDashboardStats {
  // KPIs principales
  totalConvocatoriasActivas: number;
  totalEmpresas: number;
  totalPostulacionesNoBorrador: number;
  totalGanadoresHistoricos: number;

  // Distribuciones para graficos
  convocatoriasPorEstado: Record<EstadoConvocatoria, number>;
  usuariosActivosPorRol: Record<RolUsuario, number>;

  // Resumen accionable
  convocatoriasActivasResumen: AdminConvocatoriaResumenItem[];

  // Alertas operativas
  alertas: {
    convocatoriasCerradasSinEvaluacion: number;
    convocatoriasSinResponsable: number;
  };
}

// ====== RESPONSABLE ======

export interface ResponsablePostulacionPendiente {
  postulacionId: number;
  empresaNombre: string;
  convocatoriaId: number;
  convocatoriaNombre: string;
  fechaEnvio: string;
}

export interface ResponsableCalificacionPendiente {
  calificacionId: number;
  postulacionId: number;
  empresaNombre: string;
  convocatoriaId: number;
  convocatoriaNombre: string;
  evaluadorNombre: string;
  puntajeTotal: string | null;
  fechaCompletada: string;
}

export interface ResponsableConvocatoriaResumenItem {
  id: number;
  nombre: string;
  estado: EstadoConvocatoria;
  totalPostulaciones: number;
  postulacionesEnviadas: number;
  postulacionesAprobadas: number;
  totalCalificaciones: number;
  calificacionesAprobadas: number;
  fechaCierreReal: string;
  diasParaCerrar: number | null;
}

export interface ResponsableDashboardStats {
  // KPIs
  totalMisConvocatorias: number;
  misConvocatoriasActivas: number;
  postulacionesPorRevisar: number;
  calificacionesPorAprobar: number;
  convocatoriasProximasACerrar: number;

  // Listas accionables
  postulacionesPendientesLista: ResponsablePostulacionPendiente[];
  calificacionesPendientesLista: ResponsableCalificacionPendiente[];

  // Resumen de convocatorias
  misConvocatoriasResumen: ResponsableConvocatoriaResumenItem[];

  // Distribuciones para graficos
  distribucionEstadosPostulaciones: Record<EstadoPostulacion, number>;
}

// ====== PROPONENTE ======

// Item de convocatoria abierta listo para postular (snapshot ligero para el dashboard)
export interface ProponenteConvocatoriaAbiertaItem {
  id: number;
  nombre: string;
  fechaCierreReal: string;
  diasParaCerrar: number;
  monto: string;
  numeroGanadores: number;
  yaPostule: boolean;
}

// Respuesta del endpoint GET /api/dashboard/proponente
export interface ProponenteDashboardStats {
  // KPIs principales
  convocatoriasAbiertas: number;
  convocatoriasAnteriores: number;
  totalMisPostulaciones: number;
  postulacionesObservadas: number;

  // Distribucion de mis postulaciones por estado
  misPostulacionesPorEstado: Record<EstadoPostulacion, number>;

  // Datos del perfil de empresa para alertas
  tieneEmpresa: boolean;
  empresaRazonSocial: string | null;

  // Resumen de las convocatorias abiertas mas relevantes (top N por cierre)
  convocatoriasAbiertasResumen: ProponenteConvocatoriaAbiertaItem[];
}

// ====== EVALUADOR ======

export interface EvaluadorPostulacionPendiente {
  postulacionId: number;
  convocatoriaId: number;
  convocatoriaNombre: string;
  empresaNombre: string;
  estadoCalificacion: EstadoCalificacion | null;
}

export interface EvaluadorCalificacionDevuelta {
  calificacionId: number;
  postulacionId: number;
  convocatoriaId: number;
  convocatoriaNombre: string;
  empresaNombre: string;
  comentarioResponsable: string | null;
}

export interface EvaluadorConvocatoriaProgreso {
  convocatoriaId: number;
  convocatoriaNombre: string;
  totalAsignadas: number;
  pendientes: number;
  enProgreso: number;
  completadas: number;
  aprobadas: number;
  devueltas: number;
}

export interface EvaluadorDashboardStats {
  // KPIs
  convocatoriasAsignadas: number;
  postulacionesPorCalificar: number;
  calificacionesEnProgreso: number;
  calificacionesDevueltas: number;
  calificacionesAprobadas: number;

  // Listas accionables
  postulacionesPorCalificarLista: EvaluadorPostulacionPendiente[];
  calificacionesDevueltasLista: EvaluadorCalificacionDevuelta[];

  // Para grafico de progreso por convocatoria
  progresoPorConvocatoria: EvaluadorConvocatoriaProgreso[];
}
