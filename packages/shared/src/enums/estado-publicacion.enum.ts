// Estados del ciclo de vida de una publicacion (tabla: publicacion, columna: estado)
export enum EstadoPublicacion {
  BORRADOR = 'borrador',
  PROGRAMADO = 'programado',
  PUBLICADO = 'publicado',
  EXPIRADO = 'expirado',
  ARCHIVADO = 'archivado',
}
