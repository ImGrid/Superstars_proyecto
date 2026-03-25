import { apiClient } from "./client";
import type {
  PaginatedResponse,
  CreateUsuarioDto,
  UpdateUsuarioDto,
  ListUsuariosQueryDto,
  UsuarioResponse,
} from "@superstars/shared";

export function listUsuarios(params?: Partial<ListUsuariosQueryDto>) {
  return apiClient
    .get<PaginatedResponse<UsuarioResponse>>("/usuarios", { params })
    .then((r) => r.data);
}

export function getUsuario(id: number) {
  return apiClient
    .get<UsuarioResponse>(`/usuarios/${id}`)
    .then((r) => r.data);
}

export function createUsuario(dto: CreateUsuarioDto) {
  return apiClient
    .post<UsuarioResponse>("/usuarios", dto)
    .then((r) => r.data);
}

export function updateUsuario(id: number, dto: UpdateUsuarioDto) {
  return apiClient
    .patch<UsuarioResponse>(`/usuarios/${id}`, dto)
    .then((r) => r.data);
}

export function deleteUsuario(id: number) {
  return apiClient.delete(`/usuarios/${id}`);
}
