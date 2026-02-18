// Estados del ciclo de vida de una postulacion (tabla: postulacion, columna: estado)
export enum EstadoPostulacion {
  BORRADOR = 'borrador',
  ENVIADO = 'enviado',
  OBSERVADO = 'observado',
  RECHAZADO = 'rechazado',
  EN_EVALUACION = 'en_evaluacion',
  CALIFICADO = 'calificado',
  GANADOR = 'ganador',
  NO_SELECCIONADO = 'no_seleccionado',
}
