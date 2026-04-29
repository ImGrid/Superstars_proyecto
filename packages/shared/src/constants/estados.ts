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

// Estados de calificación
export const ESTADOS_CALIFICACION = Object.values(EstadoCalificacion);

// Estados de publicación
export const ESTADOS_PUBLICACION = Object.values(EstadoPublicacion);
