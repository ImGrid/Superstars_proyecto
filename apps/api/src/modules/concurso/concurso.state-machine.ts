import { EstadoConcurso } from '@superstars/shared';

// Eventos que disparan transiciones de estado
export type ConcursoEvent = 'publicar' | 'cerrar' | 'iniciar_evaluacion' | 'finalizar';

// Mapa declarativo de transiciones: estado actual → evento → estado nuevo
const TRANSITIONS: Record<string, Partial<Record<ConcursoEvent, EstadoConcurso>>> = {
  [EstadoConcurso.BORRADOR]: {
    publicar: EstadoConcurso.PUBLICADO,
  },
  [EstadoConcurso.PUBLICADO]: {
    cerrar: EstadoConcurso.CERRADO,
  },
  [EstadoConcurso.CERRADO]: {
    iniciar_evaluacion: EstadoConcurso.EN_EVALUACION,
  },
  [EstadoConcurso.EN_EVALUACION]: {
    finalizar: EstadoConcurso.FINALIZADO,
  },
};

// Clase pura: solo sabe de transiciones validas, no de DB ni reglas de negocio
export class ConcursoStateMachine {
  canTransition(from: string, event: ConcursoEvent): boolean {
    return !!TRANSITIONS[from]?.[event];
  }

  transition(from: string, event: ConcursoEvent): EstadoConcurso {
    const next = TRANSITIONS[from]?.[event];
    if (!next) {
      throw new Error(`Transicion invalida: ${from} + ${event}`);
    }
    return next;
  }

  getAllowedEvents(state: string): ConcursoEvent[] {
    const stateTransitions = TRANSITIONS[state];
    if (!stateTransitions) return [];
    return Object.keys(stateTransitions) as ConcursoEvent[];
  }
}
