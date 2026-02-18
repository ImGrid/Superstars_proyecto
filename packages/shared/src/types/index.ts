import { RolUsuario } from '../enums';

// Payload del JWT access token
export interface JwtPayload {
  sub: number;
  email: string;
  rol: RolUsuario;
  iat?: number;
  exp?: number;
}

// Usuario autenticado extraido del request
export interface AuthUser {
  id: number;
  email: string;
  rol: RolUsuario;
}

// Respuesta paginada generica
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Parametros de paginacion
export interface PaginationParams {
  page?: number;
  limit?: number;
}
