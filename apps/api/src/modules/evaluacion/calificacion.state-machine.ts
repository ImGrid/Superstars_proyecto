import { EstadoCalificacion } from '@superstars/shared';

// eventos que disparan transiciones
export type CalificacionEvent =
  | 'completar'
  | 'aprobar'
  | 'devolver'
  | 'corregir';

// mapa de transiciones
const TRANSITIONS: Record<string, Partial<Record<CalificacionEvent, EstadoCalificacion>>> = {
  [EstadoCalificacion.EN_PROGRESO]: {
    completar: EstadoCalificacion.COMPLETADO,
  },
  [EstadoCalificacion.COMPLETADO]: {
    aprobar: EstadoCalificacion.APROBADO,
    devolver: EstadoCalificacion.DEVUELTO,
  },
  [EstadoCalificacion.DEVUELTO]: {
    corregir: EstadoCalificacion.EN_PROGRESO,
  },
};

export class CalificacionStateMachine {
  canTransition(from: string, event: CalificacionEvent): boolean {
    return !!TRANSITIONS[from]?.[event];
  }

  transition(from: string, event: CalificacionEvent): EstadoCalificacion {
    const next = TRANSITIONS[from]?.[event];
    if (!next) {
      throw new Error(`Transicion invalida: ${from} + ${event}`);
    }
    return next;
  }
}
