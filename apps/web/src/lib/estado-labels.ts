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

// badges suaves: fondo tenue + texto oscuro del mismo tono + borde sutil.
// Un color = un significado en toda la app (marca oficial Empresas SuperStar).
const soft = {
  neutral: "bg-secondary-100 text-secondary-700 border-secondary-200",
  navy: "bg-primary-50 text-primary-700 border-primary-200",
  teal: "bg-info-50 text-info-700 border-info-200",
  verde: "bg-success-50 text-success-700 border-success-200",
  ambar: "bg-warning-50 text-warning-700 border-warning-200",
  rojo: "bg-error-50 text-error-700 border-error-200",
  morado: "bg-purple-50 text-purple-700 border-purple-200",
} as const;

// --- Convocatoria (6 estados) ---

export const convocatoriaEstadoConfig: Record<EstadoConvocatoria, EstadoConfig> = {
  [EstadoConvocatoria.BORRADOR]: {
    label: "Borrador",
    variant: "outline",
    className: soft.neutral,
  },
  [EstadoConvocatoria.PUBLICADO]: {
    label: "Publicado",
    variant: "outline",
    className: soft.verde,
  },
  [EstadoConvocatoria.CERRADO]: {
    label: "Cerrado",
    variant: "outline",
    className: soft.ambar,
  },
  [EstadoConvocatoria.EN_EVALUACION]: {
    label: "En Evaluación",
    variant: "outline",
    className: soft.teal,
  },
  [EstadoConvocatoria.RESULTADOS_LISTOS]: {
    label: "Resultados Listos",
    variant: "outline",
    className: soft.morado,
  },
  [EstadoConvocatoria.FINALIZADO]: {
    label: "Finalizado",
    variant: "outline",
    className: soft.navy,
  },
};

// --- Postulacion (8 estados) ---

export const postulacionEstadoConfig: Record<EstadoPostulacion, EstadoConfig> = {
  [EstadoPostulacion.BORRADOR]: {
    label: "Borrador",
    variant: "outline",
    className: soft.neutral,
  },
  [EstadoPostulacion.ENVIADO]: {
    label: "Enviado",
    variant: "outline",
    className: soft.teal,
  },
  [EstadoPostulacion.OBSERVADO]: {
    label: "Observado",
    variant: "outline",
    className: soft.ambar,
  },
  [EstadoPostulacion.RECHAZADO]: {
    label: "Rechazado",
    variant: "outline",
    className: soft.rojo,
  },
  [EstadoPostulacion.EN_EVALUACION]: {
    label: "En Evaluación",
    variant: "outline",
    className: soft.navy,
  },
  [EstadoPostulacion.CALIFICADO]: {
    label: "Calificado",
    variant: "outline",
    className: soft.morado,
  },
  [EstadoPostulacion.GANADOR]: {
    label: "Ganador",
    variant: "outline",
    className: soft.verde,
  },
  [EstadoPostulacion.NO_SELECCIONADO]: {
    label: "No Seleccionado",
    variant: "outline",
    className: soft.neutral,
  },
};

// --- Publicacion (5 estados) ---

export const publicacionEstadoConfig: Record<EstadoPublicacion, EstadoConfig> = {
  [EstadoPublicacion.BORRADOR]: {
    label: "Borrador",
    variant: "outline",
    className: soft.neutral,
  },
  [EstadoPublicacion.PROGRAMADO]: {
    label: "Programado",
    variant: "outline",
    className: soft.teal,
  },
  [EstadoPublicacion.PUBLICADO]: {
    label: "Publicado",
    variant: "outline",
    className: soft.verde,
  },
  [EstadoPublicacion.EXPIRADO]: {
    label: "Expirado",
    variant: "outline",
    className: soft.ambar,
  },
  [EstadoPublicacion.ARCHIVADO]: {
    label: "Archivado",
    variant: "outline",
    className: soft.neutral,
  },
};

// --- Calificacion (4 estados) ---

export const calificacionEstadoConfig: Record<EstadoCalificacion, EstadoConfig> = {
  [EstadoCalificacion.EN_PROGRESO]: {
    label: "En Progreso",
    variant: "outline",
    className: soft.navy,
  },
  [EstadoCalificacion.COMPLETADO]: {
    label: "Completado",
    variant: "outline",
    className: soft.teal,
  },
  [EstadoCalificacion.APROBADO]: {
    label: "Aprobado",
    variant: "outline",
    className: soft.verde,
  },
  [EstadoCalificacion.DEVUELTO]: {
    label: "Devuelto",
    variant: "outline",
    className: soft.ambar,
  },
};

// --- Roles ---

export const rolConfig: Record<RolUsuario, EstadoConfig> = {
  [RolUsuario.ADMINISTRADOR]: {
    label: "Administrador",
    variant: "outline",
    className: soft.navy,
  },
  [RolUsuario.RESPONSABLE_CONVOCATORIA]: {
    label: "Responsable",
    variant: "outline",
    className: soft.teal,
  },
  [RolUsuario.PROPONENTE]: {
    label: "Proponente",
    variant: "outline",
    className: soft.verde,
  },
  [RolUsuario.EVALUADOR]: {
    label: "Evaluador",
    variant: "outline",
    className: soft.morado,
  },
  // Financiador externo de solo lectura: gris neutro, no compite con los colores
  // de accion de los roles internos.
  [RolUsuario.OBSERVADOR]: {
    label: "Observador",
    variant: "outline",
    className: soft.neutral,
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
