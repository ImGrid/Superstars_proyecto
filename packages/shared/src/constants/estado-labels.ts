// Etiquetas legibles de los estados y roles, en un solo lugar.
//
// Por que viven en shared y no solo en el frontend: los reportes en Excel y PDF
// se generan en el BACKEND, y ahi tambien hay que escribir "En Evaluación" y no
// el valor crudo "en_evaluacion". apps/api no puede importar de apps/web, asi
// que las etiquetas tienen que estar en el paquete compartido.
//
// Aqui va SOLO el texto. Los colores y variantes de badge siguen siendo cosa del
// frontend (dependen de Tailwind y de la linea grafica), y viven en
// apps/web/src/lib/estado-labels.ts.
//
// PENDIENTE: apps/web todavia mantiene su propia copia de estos textos. Cuando
// se trabaje el frontend, ese archivo debe importar las etiquetas de aqui y
// quedarse solo con variant y className, para que no puedan divergir.

import {
  EstadoConvocatoria,
  EstadoPostulacion,
  EstadoPublicacion,
  EstadoCalificacion,
  RolUsuario,
} from '../enums';

export const ESTADO_CONVOCATORIA_LABEL: Record<EstadoConvocatoria, string> = {
  [EstadoConvocatoria.BORRADOR]: 'Borrador',
  [EstadoConvocatoria.PUBLICADO]: 'Publicado',
  [EstadoConvocatoria.CERRADO]: 'Cerrado',
  [EstadoConvocatoria.EN_EVALUACION]: 'En Evaluación',
  [EstadoConvocatoria.RESULTADOS_LISTOS]: 'Resultados Listos',
  [EstadoConvocatoria.FINALIZADO]: 'Finalizado',
};

export const ESTADO_POSTULACION_LABEL: Record<EstadoPostulacion, string> = {
  [EstadoPostulacion.BORRADOR]: 'Borrador',
  [EstadoPostulacion.ENVIADO]: 'Enviado',
  [EstadoPostulacion.OBSERVADO]: 'Observado',
  [EstadoPostulacion.RECHAZADO]: 'Rechazado',
  [EstadoPostulacion.EN_EVALUACION]: 'En Evaluación',
  [EstadoPostulacion.CALIFICADO]: 'Calificado',
  [EstadoPostulacion.GANADOR]: 'Ganador',
  [EstadoPostulacion.NO_SELECCIONADO]: 'No Seleccionado',
};

export const ESTADO_PUBLICACION_LABEL: Record<EstadoPublicacion, string> = {
  [EstadoPublicacion.BORRADOR]: 'Borrador',
  [EstadoPublicacion.PROGRAMADO]: 'Programado',
  [EstadoPublicacion.PUBLICADO]: 'Publicado',
  [EstadoPublicacion.EXPIRADO]: 'Expirado',
  [EstadoPublicacion.ARCHIVADO]: 'Archivado',
};

export const ESTADO_CALIFICACION_LABEL: Record<EstadoCalificacion, string> = {
  [EstadoCalificacion.EN_PROGRESO]: 'En Progreso',
  [EstadoCalificacion.COMPLETADO]: 'Completado',
  [EstadoCalificacion.APROBADO]: 'Aprobado',
  [EstadoCalificacion.DEVUELTO]: 'Devuelto',
};

export const ROL_LABEL: Record<RolUsuario, string> = {
  [RolUsuario.ADMINISTRADOR]: 'Administrador',
  [RolUsuario.RESPONSABLE_CONVOCATORIA]: 'Responsable',
  [RolUsuario.PROPONENTE]: 'Proponente',
  [RolUsuario.EVALUADOR]: 'Evaluador',
  [RolUsuario.OBSERVADOR]: 'Observador',
};

// Traduce un valor de la base a su etiqueta. Si el valor no esta en el mapa
// devuelve el valor crudo: un reporte nunca debe quedar con la celda vacia por
// un estado nuevo que todavia no se tradujo.
export function etiquetaDeEstado(
  mapa: Record<string, string>,
  valor: string | null | undefined,
): string {
  if (valor == null || valor === '') return '';
  return mapa[valor] ?? valor;
}

// Traduce el slug guardado en la base a la etiqueta visible, usando cualquiera
// de los arreglos de opciones-empresa.ts (departamento, rubro, tipo de empresa,
// genero, etapa...). La base guarda 'la_paz' y el reporte debe decir 'La Paz'.
// Igual que arriba: si el slug no esta en la lista se devuelve tal cual, para
// no perder informacion en el archivo exportado.
export function etiquetaDeOpcion(
  opciones: ReadonlyArray<{ readonly valor: string; readonly label: string }>,
  valor: string | null | undefined,
): string {
  if (valor == null || valor === '') return '';
  return opciones.find((o) => o.valor === valor)?.label ?? valor;
}
