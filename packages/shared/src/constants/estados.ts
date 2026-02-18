import { EstadoConcurso, EstadoPostulacion, EstadoCalificacion } from '../enums';

// Estados de concurso
export const ESTADOS_CONCURSO = Object.values(EstadoConcurso);

// Estados de postulacion
export const ESTADOS_POSTULACION = Object.values(EstadoPostulacion);

// Estados terminales de postulacion (no tienen transiciones de salida)
export const ESTADOS_POSTULACION_TERMINALES = [
  EstadoPostulacion.RECHAZADO,
  EstadoPostulacion.GANADOR,
  EstadoPostulacion.NO_SELECCIONADO,
] as const;

// Estados de calificacion
export const ESTADOS_CALIFICACION = Object.values(EstadoCalificacion);
