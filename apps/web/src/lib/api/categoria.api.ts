import { apiClient } from "./client";
import type {
  CreateCategoriaDto,
  UpdateCategoriaDto,
  CategoriaResponse,
  AssignEvaluadorDto,
  EvaluadorCategoriaResponse,
  RemoverEvaluadorResponse,
} from "@superstars/shared";

// --- CRUD de categorias (anidado bajo la convocatoria) ---

export function listCategorias(convocatoriaId: number) {
  return apiClient
    .get<CategoriaResponse[]>(`/convocatorias/${convocatoriaId}/categorias`)
    .then((r) => r.data);
}

export function getCategoria(convocatoriaId: number, categoriaId: number) {
  return apiClient
    .get<CategoriaResponse>(
      `/convocatorias/${convocatoriaId}/categorias/${categoriaId}`,
    )
    .then((r) => r.data);
}

export function createCategoria(convocatoriaId: number, dto: CreateCategoriaDto) {
  return apiClient
    .post<CategoriaResponse>(`/convocatorias/${convocatoriaId}/categorias`, dto)
    .then((r) => r.data);
}

export function updateCategoria(
  convocatoriaId: number,
  categoriaId: number,
  dto: UpdateCategoriaDto,
) {
  return apiClient
    .patch<CategoriaResponse>(
      `/convocatorias/${convocatoriaId}/categorias/${categoriaId}`,
      dto,
    )
    .then((r) => r.data);
}

export function deleteCategoria(convocatoriaId: number, categoriaId: number) {
  return apiClient.delete(
    `/convocatorias/${convocatoriaId}/categorias/${categoriaId}`,
  );
}

// --- Pool de evaluadores por categoria (nivel 1) ---

export function listCategoriaEvaluadores(
  convocatoriaId: number,
  categoriaId: number,
) {
  return apiClient
    .get<EvaluadorCategoriaResponse[]>(
      `/convocatorias/${convocatoriaId}/categorias/${categoriaId}/evaluadores`,
    )
    .then((r) => r.data);
}

export function addCategoriaEvaluador(
  convocatoriaId: number,
  categoriaId: number,
  dto: AssignEvaluadorDto,
) {
  return apiClient
    .post(
      `/convocatorias/${convocatoriaId}/categorias/${categoriaId}/evaluadores`,
      dto,
    )
    .then((r) => r.data);
}

// Quitar a un jurado de la categoria. La respuesta informa cuantas
// postulaciones asignadas se le retiraron junto con el acceso.
export function removeCategoriaEvaluador(
  convocatoriaId: number,
  categoriaId: number,
  evaluadorId: number,
) {
  return apiClient
    .delete<RemoverEvaluadorResponse>(
      `/convocatorias/${convocatoriaId}/categorias/${categoriaId}/evaluadores/${evaluadorId}`,
    )
    .then((r) => r.data);
}
