import { EstadoConcurso, EstadoPostulacion, EstadoCalificacion, EstadoPublicacion } from '../enums';

// Estados de concurso
export const ESTADOS_CONCURSO = Object.values(EstadoConcurso);

// Estados de postulación
export const ESTADOS_POSTULACION = Object.values(EstadoPostulacion);

// Estados terminales de postulación (no tienen transiciones de salida)
export const ESTADOS_POSTULACION_TERMINALES = [
  EstadoPostulacion.RECHAZADO,
  EstadoPostulacion.GANADOR,
  EstadoPostulacion.NO_SELECCIONADO,
] as const;

// Estado visible en la web pública (solo concursos abiertos para postular)
export const ESTADO_CONCURSO_PUBLICO = EstadoConcurso.PUBLICADO;

// Estados de calificación
export const ESTADOS_CALIFICACION = Object.values(EstadoCalificacion);

// Estados de publicación
export const ESTADOS_PUBLICACION = Object.values(EstadoPublicacion);
