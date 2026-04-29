import { RolUsuario } from '../enums';

// Todos los roles validos del sistema
export const ROLES = Object.values(RolUsuario);

// Roles que pueden gestionar convocatorias
export const ROLES_GESTION = [
  RolUsuario.ADMINISTRADOR,
  RolUsuario.RESPONSABLE_CONVOCATORIA,
] as const;

// Roles que pueden calificar
export const ROLES_EVALUACION = [
  RolUsuario.EVALUADOR,
] as const;
