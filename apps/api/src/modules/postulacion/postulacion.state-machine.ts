import { EstadoPostulacion } from '@superstars/shared';

// Eventos que disparan transiciones de estado
export type PostulacionEvent =
  | 'enviar'
  | 'observar'
  | 'rechazar'
  | 'iniciar_evaluacion'
  | 'calificar'
  | 'seleccionar'
  | 'no_seleccionar';

// Mapa de transiciones: estado actual -> evento -> estado nuevo
const TRANSITIONS: Record<string, Partial<Record<PostulacionEvent, EstadoPostulacion>>> = {
  [EstadoPostulacion.BORRADOR]: {
    enviar: EstadoPostulacion.ENVIADO,
  },
  [EstadoPostulacion.ENVIADO]: {
    observar: EstadoPostulacion.OBSERVADO,
    rechazar: EstadoPostulacion.RECHAZADO,
    iniciar_evaluacion: EstadoPostulacion.EN_EVALUACION,
  },
  [EstadoPostulacion.OBSERVADO]: {
    enviar: EstadoPostulacion.ENVIADO,
  },
  [EstadoPostulacion.EN_EVALUACION]: {
    calificar: EstadoPostulacion.CALIFICADO,
  },
  [EstadoPostulacion.CALIFICADO]: {
    seleccionar: EstadoPostulacion.GANADOR,
    no_seleccionar: EstadoPostulacion.NO_SELECCIONADO,
  },
};

// Clase pura: solo sabe de transiciones validas, no de DB ni reglas de negocio
export class PostulacionStateMachine {
  canTransition(from: string, event: PostulacionEvent): boolean {
    return !!TRANSITIONS[from]?.[event];
  }

  transition(from: string, event: PostulacionEvent): EstadoPostulacion {
    const next = TRANSITIONS[from]?.[event];
    if (!next) {
      throw new Error(`Transicion invalida: ${from} + ${event}`);
    }
    return next;
  }

  getAllowedEvents(state: string): PostulacionEvent[] {
    const stateTransitions = TRANSITIONS[state];
    if (!stateTransitions) return [];
    return Object.keys(stateTransitions) as PostulacionEvent[];
  }
}
