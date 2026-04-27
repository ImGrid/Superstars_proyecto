// Tipos de respuesta del dashboard por rol (sin Zod — son responses, no DTOs de input)
import { EstadoConcurso, EstadoPostulacion, EstadoCalificacion, RolUsuario } from '../enums';

// ====== ADMIN ======

// Resumen de un concurso para el dashboard del admin
export interface AdminConcursoResumenItem {
  id: number;
  nombre: string;
  estado: EstadoConcurso;
  totalPostulaciones: number;
  diasParaCerrar: number | null;
}

// Respuesta del endpoint GET /api/dashboard/admin
export interface AdminDashboardStats {
  // KPIs principales
  totalConcursosActivos: number;
  totalEmpresas: number;
  totalPostulacionesNoBorrador: number;
  totalGanadoresHistoricos: number;

  // Distribuciones para graficos
  concursosPorEstado: Record<EstadoConcurso, number>;
  usuariosActivosPorRol: Record<RolUsuario, number>;

  // Resumen accionable
  concursosActivosResumen: AdminConcursoResumenItem[];

  // Alertas operativas
  alertas: {
    concursosCerradosSinEvaluacion: number;
    concursosSinResponsable: number;
  };
}

// ====== RESPONSABLE ======

export interface ResponsablePostulacionPendiente {
  postulacionId: number;
  empresaNombre: string;
  concursoId: number;
  concursoNombre: string;
  fechaEnvio: string;
}

export interface ResponsableCalificacionPendiente {
  calificacionId: number;
  postulacionId: number;
  empresaNombre: string;
  concursoId: number;
  concursoNombre: string;
  evaluadorNombre: string;
  puntajeTotal: string | null;
  fechaCompletada: string;
}

export interface ResponsableConcursoResumenItem {
  id: number;
  nombre: string;
  estado: EstadoConcurso;
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
  totalMisConcursos: number;
  misConcursosActivos: number;
  postulacionesPorRevisar: number;
  calificacionesPorAprobar: number;
  concursosProximosACerrar: number;

  // Listas accionables
  postulacionesPendientesLista: ResponsablePostulacionPendiente[];
  calificacionesPendientesLista: ResponsableCalificacionPendiente[];

  // Resumen de concursos
  misConcursosResumen: ResponsableConcursoResumenItem[];

  // Distribuciones para graficos
  distribucionEstadosPostulaciones: Record<EstadoPostulacion, number>;
}

// ====== EVALUADOR ======

export interface EvaluadorPostulacionPendiente {
  postulacionId: number;
  concursoId: number;
  concursoNombre: string;
  empresaNombre: string;
  estadoCalificacion: EstadoCalificacion | null;
}

export interface EvaluadorCalificacionDevuelta {
  calificacionId: number;
  postulacionId: number;
  concursoId: number;
  concursoNombre: string;
  empresaNombre: string;
  comentarioResponsable: string | null;
}

export interface EvaluadorConcursoProgreso {
  concursoId: number;
  concursoNombre: string;
  totalAsignadas: number;
  pendientes: number;
  enProgreso: number;
  completadas: number;
  aprobadas: number;
  devueltas: number;
}

export interface EvaluadorDashboardStats {
  // KPIs
  concursosAsignados: number;
  postulacionesPorCalificar: number;
  calificacionesEnProgreso: number;
  calificacionesDevueltas: number;
  calificacionesAprobadas: number;

  // Listas accionables
  postulacionesPorCalificarLista: EvaluadorPostulacionPendiente[];
  calificacionesDevueltasLista: EvaluadorCalificacionDevuelta[];

  // Para grafico de progreso por concurso
  progresoPorConcurso: EvaluadorConcursoProgreso[];
}
