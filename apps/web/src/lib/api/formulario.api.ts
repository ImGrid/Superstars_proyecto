import { apiClient } from "./client";
import type {
  CreateFormularioDto,
  UpdateFormularioDto,
  FormularioResponse,
} from "@superstars/shared";

export function getFormulario(concursoId: number) {
  return apiClient
    .get<FormularioResponse>(`/concursos/${concursoId}/formulario`)
    .then((r) => r.data);
}

export function createFormulario(
  concursoId: number,
  dto: CreateFormularioDto,
) {
  return apiClient
    .post<FormularioResponse>(`/concursos/${concursoId}/formulario`, dto)
    .then((r) => r.data);
}

export function updateFormulario(
  concursoId: number,
  dto: UpdateFormularioDto,
) {
  return apiClient
    .put<FormularioResponse>(`/concursos/${concursoId}/formulario`, dto)
    .then((r) => r.data);
}

export function deleteFormulario(concursoId: number) {
  return apiClient.delete(`/concursos/${concursoId}/formulario`);
}
