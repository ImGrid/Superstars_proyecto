import { EstadoPublicacion } from '@superstars/shared';

// Eventos que disparan transiciones de estado
export type PublicacionEvent =
  | 'publicar'
  | 'programar'
  | 'cancelar_programacion'
  | 'auto_publicar'
  | 'archivar'
  | 'auto_expirar'
  | 'republicar';

// Mapa declarativo de transiciones: estado actual -> evento -> estado nuevo
const TRANSITIONS: Record<string, Partial<Record<PublicacionEvent, EstadoPublicacion>>> = {
  [EstadoPublicacion.BORRADOR]: {
    publicar: EstadoPublicacion.PUBLICADO,
    programar: EstadoPublicacion.PROGRAMADO,
  },
  [EstadoPublicacion.PROGRAMADO]: {
    cancelar_programacion: EstadoPublicacion.BORRADOR,
    auto_publicar: EstadoPublicacion.PUBLICADO,
  },
  [EstadoPublicacion.PUBLICADO]: {
    archivar: EstadoPublicacion.ARCHIVADO,
    auto_expirar: EstadoPublicacion.EXPIRADO,
  },
  [EstadoPublicacion.EXPIRADO]: {
    archivar: EstadoPublicacion.ARCHIVADO,
    republicar: EstadoPublicacion.PUBLICADO,
  },
  [EstadoPublicacion.ARCHIVADO]: {
    republicar: EstadoPublicacion.BORRADOR,
  },
};

// Clase pura: solo sabe de transiciones validas, no de DB ni reglas de negocio
export class PublicacionStateMachine {
  canTransition(from: string, event: PublicacionEvent): boolean {
    return !!TRANSITIONS[from]?.[event];
  }

  transition(from: string, event: PublicacionEvent): EstadoPublicacion {
    const next = TRANSITIONS[from]?.[event];
    if (!next) {
      throw new Error(`Transicion invalida: ${from} + ${event}`);
    }
    return next;
  }

  getAllowedEvents(state: string): PublicacionEvent[] {
    const stateTransitions = TRANSITIONS[state];
    if (!stateTransitions) return [];
    return Object.keys(stateTransitions) as PublicacionEvent[];
  }
}
