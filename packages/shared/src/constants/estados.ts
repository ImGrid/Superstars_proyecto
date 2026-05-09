import { EstadoConvocatoria, EstadoPostulacion, EstadoCalificacion, EstadoPublicacion } from '../enums';

// Estados de convocatoria
export const ESTADOS_CONVOCATORIA = Object.values(EstadoConvocatoria);

// Estados de postulación
export const ESTADOS_POSTULACION = Object.values(EstadoPostulacion);

// Estados terminales de postulación (no tienen transiciones de salida)
export const ESTADOS_POSTULACION_TERMINALES = [
  EstadoPostulacion.RECHAZADO,
  EstadoPostulacion.GANADOR,
  EstadoPostulacion.NO_SELECCIONADO,
] as const;

// Estado visible en la web pública (solo convocatorias abiertas para postular)
export const ESTADO_CONVOCATORIA_PUBLICO = EstadoConvocatoria.PUBLICADO;

// Estados de convocatoria que un proponente puede ver (ya no se ve borrador)
export const ESTADOS_CONVOCATORIA_VISIBLE_PROPONENTE = [
  EstadoConvocatoria.PUBLICADO,
  EstadoConvocatoria.CERRADO,
  EstadoConvocatoria.EN_EVALUACION,
  EstadoConvocatoria.RESULTADOS_LISTOS,
  EstadoConvocatoria.FINALIZADO,
] as const;

// Estados que cuentan como "anteriores" para el proponente (todo lo visible menos publicado)
export const ESTADOS_CONVOCATORIA_ANTERIORES_PROPONENTE = [
  EstadoConvocatoria.CERRADO,
  EstadoConvocatoria.EN_EVALUACION,
  EstadoConvocatoria.RESULTADOS_LISTOS,
  EstadoConvocatoria.FINALIZADO,
] as const;

// Predicado canonico de "convocatoria abierta para postular".
// Una convocatoria es abierta si y solo si:
//   1. Su estado es PUBLICADO (es la unica transicion del flujo que admite envios)
//   2. La fecha de cierre vigente (efectiva si existe, sino la original) no ha pasado
// Mantener este helper como unica fuente de verdad: backend, frontend y tests
// deben llamar a este predicado en vez de inferir "abierta" desde la fecha.
export function isConvocatoriaAbierta(c: {
  estado: string;
  fechaCierrePostulacion: string;
  fechaCierreEfectiva?: string | null;
}): boolean {
  if (c.estado !== EstadoConvocatoria.PUBLICADO) return false;
  const cierreStr = c.fechaCierreEfectiva ?? c.fechaCierrePostulacion;
  // las fechas DATE de PG llegan como YYYY-MM-DD; comparamos al inicio del dia local
  // para que "hoy" siga contando como abierta
  const [y, m, d] = cierreStr.split('-').map(Number);
  const cierre = new Date(y, m - 1, d);
  cierre.setHours(23, 59, 59, 999);
  return cierre.getTime() >= Date.now();
}

// Estados de calificación
export const ESTADOS_CALIFICACION = Object.values(EstadoCalificacion);

// Estados de publicación
export const ESTADOS_PUBLICACION = Object.values(EstadoPublicacion);
