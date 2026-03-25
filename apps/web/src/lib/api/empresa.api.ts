import { apiClient } from "./client";
import type {
  PaginatedResponse,
  CreateEmpresaDto,
  UpdateEmpresaDto,
  ListEmpresasQueryDto,
  EmpresaResponse,
} from "@superstars/shared";

// Proponente: obtener mi empresa
export function getMyEmpresa() {
  return apiClient
    .get<EmpresaResponse>("/empresas/me")
    .then((r) => r.data);
}

// Proponente: registrar empresa
export function createEmpresa(dto: CreateEmpresaDto) {
  return apiClient
    .post<EmpresaResponse>("/empresas", dto)
    .then((r) => r.data);
}

// Proponente: actualizar mi empresa
export function updateMyEmpresa(dto: UpdateEmpresaDto) {
  return apiClient
    .patch<EmpresaResponse>("/empresas/me", dto)
    .then((r) => r.data);
}

// Admin: listar empresas (paginado)
export function listEmpresas(params?: Partial<ListEmpresasQueryDto>) {
  return apiClient
    .get<PaginatedResponse<EmpresaResponse>>("/empresas", { params })
    .then((r) => r.data);
}

// Admin: detalle de empresa
export function getEmpresa(id: number) {
  return apiClient
    .get<EmpresaResponse>(`/empresas/${id}`)
    .then((r) => r.data);
}
