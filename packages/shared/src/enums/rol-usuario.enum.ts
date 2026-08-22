// Roles de usuario del sistema (tabla: usuario, columna: rol)
export enum RolUsuario {
  ADMINISTRADOR = 'administrador',
  RESPONSABLE_CONVOCATORIA = 'responsable_convocatoria',
  PROPONENTE = 'proponente',
  EVALUADOR = 'evaluador',
  // Solo lectura: financiador o veedor externo. Ve el ciclo de la convocatoria
  // pero no puede modificar nada. No ve calificaciones individuales del jurado,
  // ni los archivos que suben las empresas, ni documentos de proposito jurado.
  OBSERVADOR = 'observador',
}
