// Estados del ciclo de vida de una convocatoria (tabla: convocatoria, columna: estado)
export enum EstadoConvocatoria {
  BORRADOR = 'borrador',
  PUBLICADO = 'publicado',
  CERRADO = 'cerrado',
  EN_EVALUACION = 'en_evaluacion',
  RESULTADOS_LISTOS = 'resultados_listos',
  FINALIZADO = 'finalizado',
}
