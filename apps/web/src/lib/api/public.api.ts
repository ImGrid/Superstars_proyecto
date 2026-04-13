import { apiClient } from "./client";
import type {
  PaginatedResponse,
  ListPublicConcursosQueryDto,
  ListPublicPublicacionesQueryDto,
  PublicConcursoResponse,
  PublicConcursoDetailResponse,
  PublicPublicacionListItem,
  PublicPublicacionResponse,
  PublicResultadosResponse,
  CategoriaPublicacionResponse,
} from "@superstars/shared";

// --- Concursos publicos ---

export function listPublicConcursos(
  params?: Partial<ListPublicConcursosQueryDto>,
) {
  return apiClient
    .get<PaginatedResponse<PublicConcursoResponse>>("/public/concursos", {
      params,
    })
    .then((r) => r.data);
}

export function getPublicConcurso(id: number) {
  return apiClient
    .get<PublicConcursoDetailResponse>(`/public/concursos/${id}`)
    .then((r) => r.data);
}

// --- Publicaciones publicas ---

export function listPublicPublicaciones(
  params?: Partial<ListPublicPublicacionesQueryDto>,
) {
  return apiClient
    .get<PaginatedResponse<PublicPublicacionListItem>>(
      "/public/publicaciones",
      { params },
    )
    .then((r) => r.data);
}

export function getPublicPublicacion(slug: string) {
  return apiClient
    .get<PublicPublicacionResponse>(`/public/publicaciones/${slug}`)
    .then((r) => r.data);
}

// --- Resultados publicos ---

export function getPublicResultados(concursoId: number) {
  return apiClient
    .get<PublicResultadosResponse>(`/public/concursos/${concursoId}/resultados`)
    .then((r) => r.data);
}

// --- Categorias publicas ---

export function listPublicCategorias() {
  return apiClient
    .get<CategoriaPublicacionResponse[]>(
      "/public/publicaciones/categorias",
    )
    .then((r) => r.data);
}
