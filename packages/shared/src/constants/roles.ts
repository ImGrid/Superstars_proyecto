import { RolUsuario } from '../enums';

// Todos los roles validos del sistema
export const ROLES = Object.values(RolUsuario);

// Roles que pueden gestionar concursos
export const ROLES_GESTION = [
  RolUsuario.ADMINISTRADOR,
  RolUsuario.RESPONSABLE_CONCURSO,
] as const;

// Roles que pueden calificar
export const ROLES_EVALUACION = [
  RolUsuario.EVALUADOR,
] as const;
