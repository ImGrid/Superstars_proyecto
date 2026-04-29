import { EstadoConvocatoria } from '@superstars/shared';

// Eventos que disparan transiciones de estado
export type ConvocatoriaEvent = 'publicar' | 'cerrar' | 'iniciar_evaluacion' | 'seleccionar_ganadores' | 'publicar_resultados';

// Mapa declarativo de transiciones: estado actual -> evento -> estado nuevo
const TRANSITIONS: Record<string, Partial<Record<ConvocatoriaEvent, EstadoConvocatoria>>> = {
  [EstadoConvocatoria.BORRADOR]: {
    publicar: EstadoConvocatoria.PUBLICADO,
  },
  [EstadoConvocatoria.PUBLICADO]: {
    cerrar: EstadoConvocatoria.CERRADO,
  },
  [EstadoConvocatoria.CERRADO]: {
    iniciar_evaluacion: EstadoConvocatoria.EN_EVALUACION,
  },
  [EstadoConvocatoria.EN_EVALUACION]: {
    seleccionar_ganadores: EstadoConvocatoria.RESULTADOS_LISTOS,
  },
  [EstadoConvocatoria.RESULTADOS_LISTOS]: {
    publicar_resultados: EstadoConvocatoria.FINALIZADO,
  },
};

// Clase pura: solo sabe de transiciones validas, no de DB ni reglas de negocio
export class ConvocatoriaStateMachine {
  canTransition(from: string, event: ConvocatoriaEvent): boolean {
    return !!TRANSITIONS[from]?.[event];
  }

  transition(from: string, event: ConvocatoriaEvent): EstadoConvocatoria {
    const next = TRANSITIONS[from]?.[event];
    if (!next) {
      throw new Error(`Transicion invalida: ${from} + ${event}`);
    }
    return next;
  }

  getAllowedEvents(state: string): ConvocatoriaEvent[] {
    const stateTransitions = TRANSITIONS[state];
    if (!stateTransitions) return [];
    return Object.keys(stateTransitions) as ConvocatoriaEvent[];
  }
}
