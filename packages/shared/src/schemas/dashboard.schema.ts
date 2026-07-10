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

// Cobertura geografica: empresas registradas en un departamento (los 9 canonicos)
export interface AdminCoberturaDepartamentoItem {
  departamento: string; // slug canonico (la_paz, cochabamba, ...)
  label: string; // nombre visible (La Paz)
  total: number; // empresas registradas en ese departamento
}

// Metricas de inclusion (genero) del programa
export interface AdminInclusion {
  empleadasMujeres: number;
  empleadosHombres: number;
  pctMujeres: number; // 0-100, redondeado
  empresasContactoFemenino: number;
  empresasConContacto: number; // empresas con genero de contacto declarado
}

// Punto de la serie temporal de participacion
export interface AdminTendenciaMesItem {
  mes: string; // YYYY-MM
  total: number;
}

// Respuesta del endpoint GET /api/dashboard/admin
export interface AdminDashboardStats {
  // KPIs principales
  totalConvocatoriasActivas: number;
  convocatoriasProximasACerrar: number; // cierran en <= 7 dias
  totalEmpresas: number;
  empresasNuevasEsteMes: number;
  totalPostulacionesNoBorrador: number;
  totalGanadoresHistoricos: number;
  montoComprometidoTotal: string; // Bs, suma de montos de premio de todas las categorias

  // Cobertura nacional (los 9 departamentos, rellenados en 0)
  coberturaNacional: AdminCoberturaDepartamentoItem[];
  departamentosCubiertos: number; // cuantos de los 9 tienen al menos 1 empresa

  // Distribuciones para graficos
  convocatoriasPorEstado: Record<EstadoConvocatoria, number>;
  postulacionesPorEstado: Record<EstadoPostulacion, number>;
  usuariosActivosPorRol: Record<RolUsuario, number>;

  // Inclusion y tendencia de participacion
  inclusion: AdminInclusion;
  tendenciaPostulaciones: AdminTendenciaMesItem[];

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

// Item de convocatoria abierta listo para postular (snapshot para las tarjetas del dashboard)
export interface ProponenteConvocatoriaAbiertaItem {
  id: number;
  nombre: string;
  fechaCierreReal: string;
  diasParaCerrar: number;
  // rango de premios entre las categorias de la convocatoria (null si aun no tiene categorias)
  montoMin: string | null;
  montoMax: string | null;
  // total de ganadores sumando todas las categorias
  numeroGanadores: number;
  yaPostule: boolean;
  // datos para la tarjeta rica del proponente
  departamentos: string[];
  categorias: { nombre: string; monto: string }[];
  totalPostulantes: number; // prueba social: postulaciones no-borrador en la convocatoria
  tieneImagen: boolean; // si tiene imagen de portada (el front arma la URL por id)
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
  categoriaId: number;
  convocatoriaId: number;
  convocatoriaNombre: string;
  empresaNombre: string;
  estadoCalificacion: EstadoCalificacion | null;
}

export interface EvaluadorCalificacionDevuelta {
  calificacionId: number;
  postulacionId: number;
  categoriaId: number;
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
