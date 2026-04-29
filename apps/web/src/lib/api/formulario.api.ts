import { apiClient } from "./client";
import type {
  CreateFormularioDto,
  UpdateFormularioDto,
  FormularioResponse,
} from "@superstars/shared";

export function getFormulario(convocatoriaId: number) {
  return apiClient
    .get<FormularioResponse>(`/convocatorias/${convocatoriaId}/formulario`)
    .then((r) => r.data);
}

export function createFormulario(
  convocatoriaId: number,
  dto: CreateFormularioDto,
) {
  return apiClient
    .post<FormularioResponse>(`/convocatorias/${convocatoriaId}/formulario`, dto)
    .then((r) => r.data);
}

export function updateFormulario(
  convocatoriaId: number,
  dto: UpdateFormularioDto,
) {
  return apiClient
    .put<FormularioResponse>(`/convocatorias/${convocatoriaId}/formulario`, dto)
    .then((r) => r.data);
}

export function deleteFormulario(convocatoriaId: number) {
  return apiClient.delete(`/convocatorias/${convocatoriaId}/formulario`);
}
