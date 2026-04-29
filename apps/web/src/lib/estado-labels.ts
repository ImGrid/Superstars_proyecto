import {
  EstadoConvocatoria,
  EstadoPostulacion,
  EstadoPublicacion,
  EstadoCalificacion,
  RolUsuario,
} from "@superstars/shared";

export interface EstadoConfig {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}

// --- Convocatoria (6 estados) ---

export const convocatoriaEstadoConfig: Record<EstadoConvocatoria, EstadoConfig> = {
  [EstadoConvocatoria.BORRADOR]: {
    label: "Borrador",
    variant: "secondary",
  },
  [EstadoConvocatoria.PUBLICADO]: {
    label: "Publicado",
    variant: "default",
    className: "bg-success-600 text-white border-transparent",
  },
  [EstadoConvocatoria.CERRADO]: {
    label: "Cerrado",
    variant: "default",
    className: "bg-warning-600 text-white border-transparent",
  },
  [EstadoConvocatoria.EN_EVALUACION]: {
    label: "En Evaluación",
    variant: "default",
    className: "bg-primary-600 text-white border-transparent",
  },
  [EstadoConvocatoria.RESULTADOS_LISTOS]: {
    label: "Resultados Listos",
    variant: "default",
    className: "bg-violet-600 text-white border-transparent",
  },
  [EstadoConvocatoria.FINALIZADO]: {
    label: "Finalizado",
    variant: "default",
    className: "bg-secondary-700 text-white border-transparent",
  },
};

// --- Postulacion (8 estados) ---

export const postulacionEstadoConfig: Record<EstadoPostulacion, EstadoConfig> = {
  [EstadoPostulacion.BORRADOR]: {
    label: "Borrador",
    variant: "secondary",
  },
  [EstadoPostulacion.ENVIADO]: {
    label: "Enviado",
    variant: "default",
    className: "bg-primary-600 text-white border-transparent",
  },
  [EstadoPostulacion.OBSERVADO]: {
    label: "Observado",
    variant: "default",
    className: "bg-warning-600 text-white border-transparent",
  },
  [EstadoPostulacion.RECHAZADO]: {
    label: "Rechazado",
    variant: "destructive",
  },
  [EstadoPostulacion.EN_EVALUACION]: {
    label: "En Evaluación",
    variant: "default",
    className: "bg-primary-700 text-white border-transparent",
  },
  [EstadoPostulacion.CALIFICADO]: {
    label: "Calificado",
    variant: "default",
    className: "bg-secondary-600 text-white border-transparent",
  },
  [EstadoPostulacion.GANADOR]: {
    label: "Ganador",
    variant: "default",
    className: "bg-success-600 text-white border-transparent",
  },
  [EstadoPostulacion.NO_SELECCIONADO]: {
    label: "No Seleccionado",
    variant: "secondary",
  },
};

// --- Publicacion (5 estados) ---

export const publicacionEstadoConfig: Record<EstadoPublicacion, EstadoConfig> = {
  [EstadoPublicacion.BORRADOR]: {
    label: "Borrador",
    variant: "secondary",
  },
  [EstadoPublicacion.PROGRAMADO]: {
    label: "Programado",
    variant: "default",
    className: "bg-primary-600 text-white border-transparent",
  },
  [EstadoPublicacion.PUBLICADO]: {
    label: "Publicado",
    variant: "default",
    className: "bg-success-600 text-white border-transparent",
  },
  [EstadoPublicacion.EXPIRADO]: {
    label: "Expirado",
    variant: "default",
    className: "bg-warning-600 text-white border-transparent",
  },
  [EstadoPublicacion.ARCHIVADO]: {
    label: "Archivado",
    variant: "secondary",
  },
};

// --- Calificacion (4 estados) ---

export const calificacionEstadoConfig: Record<EstadoCalificacion, EstadoConfig> = {
  [EstadoCalificacion.EN_PROGRESO]: {
    label: "En Progreso",
    variant: "default",
    className: "bg-primary-600 text-white border-transparent",
  },
  [EstadoCalificacion.COMPLETADO]: {
    label: "Completado",
    variant: "default",
    className: "bg-success-600 text-white border-transparent",
  },
  [EstadoCalificacion.APROBADO]: {
    label: "Aprobado",
    variant: "default",
    className: "bg-secondary-700 text-white border-transparent",
  },
  [EstadoCalificacion.DEVUELTO]: {
    label: "Devuelto",
    variant: "default",
    className: "bg-warning-600 text-white border-transparent",
  },
};

// --- Roles ---

export const rolConfig: Record<RolUsuario, EstadoConfig> = {
  [RolUsuario.ADMINISTRADOR]: {
    label: "Administrador",
    variant: "default",
  },
  [RolUsuario.RESPONSABLE_CONVOCATORIA]: {
    label: "Responsable",
    variant: "default",
    className: "bg-primary-700 text-white border-transparent",
  },
  [RolUsuario.PROPONENTE]: {
    label: "Proponente",
    variant: "default",
    className: "bg-success-600 text-white border-transparent",
  },
  [RolUsuario.EVALUADOR]: {
    label: "Evaluador",
    variant: "default",
    className: "bg-warning-600 text-white border-transparent",
  },
};

// helper para obtener config de cualquier estado
export function getEstadoConfig(
  tipo: "convocatoria" | "postulacion" | "publicacion" | "calificacion" | "rol",
  valor: string,
): EstadoConfig {
  const maps = {
    convocatoria: convocatoriaEstadoConfig,
    postulacion: postulacionEstadoConfig,
    publicacion: publicacionEstadoConfig,
    calificacion: calificacionEstadoConfig,
    rol: rolConfig,
  };
  const config = maps[tipo] as Record<string, EstadoConfig>;
  return config[valor] ?? { label: valor, variant: "outline" };
}
