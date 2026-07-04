import { apiClient } from "./client";
import type {
  CreateFormularioDto,
  UpdateFormularioDto,
  FormularioResponse,
} from "@superstars/shared";

// El formulario es 1:1 con la categoria (ruta anidada bajo la convocatoria).
const base = (convocatoriaId: number, categoriaId: number) =>
  `/convocatorias/${convocatoriaId}/categorias/${categoriaId}/formulario`;

export function getFormulario(convocatoriaId: number, categoriaId: number) {
  return apiClient
    .get<FormularioResponse>(base(convocatoriaId, categoriaId))
    .then((r) => r.data);
}

export function createFormulario(
  convocatoriaId: number,
  categoriaId: number,
  dto: CreateFormularioDto,
) {
  return apiClient
    .post<FormularioResponse>(base(convocatoriaId, categoriaId), dto)
    .then((r) => r.data);
}

export function updateFormulario(
  convocatoriaId: number,
  categoriaId: number,
  dto: UpdateFormularioDto,
) {
  return apiClient
    .put<FormularioResponse>(base(convocatoriaId, categoriaId), dto)
    .then((r) => r.data);
}

export function deleteFormulario(convocatoriaId: number, categoriaId: number) {
  return apiClient.delete(base(convocatoriaId, categoriaId));
}
