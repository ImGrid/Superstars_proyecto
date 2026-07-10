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

// --- Logo de la empresa ---

// URL publica para mostrar el logo como src de <img>. El backend sirve el binario
// con cache de 24h, por lo que se puede usar directamente sin auth.
export function getEmpresaLogoUrl(id: number): string {
  return `${process.env.NEXT_PUBLIC_API_URL}/empresas/${id}/logo`;
}

// Proponente: subir/cambiar el logo de mi empresa
export function uploadMyLogo(file: File) {
  const formData = new FormData();
  formData.append("logo", file);

  return apiClient
    .post<EmpresaResponse>("/empresas/me/logo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
}

// Proponente: quitar el logo de mi empresa
export function removeMyLogo() {
  return apiClient
    .delete<EmpresaResponse>("/empresas/me/logo")
    .then((r) => r.data);
}
