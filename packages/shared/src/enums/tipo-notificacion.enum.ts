// Tipos de notificacion por email (tabla: notificacion_email, columna: tipo)
export enum TipoNotificacion {
  OBSERVACION_PROPUESTA = 'observacion_propuesta',
  RECHAZO_PROPUESTA = 'rechazo_propuesta',
  ASIGNACION_EVALUADOR = 'asignacion_evaluador',
  DEVOLUCION_CALIFICACION = 'devolucion_calificacion',
  PROPUESTA_CALIFICADA = 'propuesta_calificada',
  PROPUESTA_GANADORA = 'propuesta_ganadora',
  PROPUESTA_NO_SELECCIONADA = 'propuesta_no_seleccionada',
  GENERAL = 'general',
}
