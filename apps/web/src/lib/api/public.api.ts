import { apiClient } from "./client";
import type {
  PaginatedResponse,
  ListPublicConvocatoriasQueryDto,
  ListPublicPublicacionesQueryDto,
  PublicConvocatoriaResponse,
  PublicConvocatoriaDetailResponse,
  PublicPublicacionListItem,
  PublicPublicacionResponse,
  PublicResultadosResponse,
  CategoriaPublicacionResponse,
} from "@superstars/shared";

// --- Convocatorias publicas ---

export function listPublicConvocatorias(
  params?: Partial<ListPublicConvocatoriasQueryDto>,
) {
  return apiClient
    .get<PaginatedResponse<PublicConvocatoriaResponse>>("/public/convocatorias", {
      params,
    })
    .then((r) => r.data);
}

export function getPublicConvocatoria(id: number) {
  return apiClient
    .get<PublicConvocatoriaDetailResponse>(`/public/convocatorias/${id}`)
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

export function getPublicResultados(convocatoriaId: number) {
  return apiClient
    .get<PublicResultadosResponse>(`/public/convocatorias/${convocatoriaId}/resultados`)
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
