import { apiClient } from "./client";
import type {
  PaginatedResponse,
  CreatePublicacionDto,
  UpdatePublicacionDto,
  PublicarPublicacionDto,
  ListPublicacionesQueryDto,
  PublicacionResponse,
} from "@superstars/shared";

// --- CRUD ---

export function createPublicacion(dto: CreatePublicacionDto, imagen?: File) {
  if (imagen) {
    const formData = new FormData();
    formData.append("titulo", dto.titulo);
    formData.append("contenido", dto.contenido);
    if (dto.categoriaId != null) {
      formData.append("categoriaId", String(dto.categoriaId));
    }
    formData.append("destacado", String(dto.destacado ?? false));
    formData.append("imagen", imagen);

    return apiClient
      .post<PublicacionResponse>("/publicaciones", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  }

  return apiClient
    .post<PublicacionResponse>("/publicaciones", dto)
    .then((r) => r.data);
}

export function listPublicaciones(
  params?: Partial<ListPublicacionesQueryDto>,
) {
  return apiClient
    .get<PaginatedResponse<PublicacionResponse>>("/publicaciones", { params })
    .then((r) => r.data);
}

export function getPublicacion(id: number) {
  return apiClient
    .get<PublicacionResponse>(`/publicaciones/${id}`)
    .then((r) => r.data);
}

export function updatePublicacion(id: number, dto: UpdatePublicacionDto) {
  return apiClient
    .patch<PublicacionResponse>(`/publicaciones/${id}`, dto)
    .then((r) => r.data);
}

export function deletePublicacion(id: number) {
  return apiClient.delete(`/publicaciones/${id}`);
}

// --- Transiciones de estado ---

export function publicarPublicacion(id: number, dto?: PublicarPublicacionDto) {
  return apiClient
    .post<PublicacionResponse>(`/publicaciones/${id}/publicar`, dto ?? {})
    .then((r) => r.data);
}

export function archivarPublicacion(id: number) {
  return apiClient
    .post<PublicacionResponse>(`/publicaciones/${id}/archivar`)
    .then((r) => r.data);
}

export function republicarPublicacion(id: number) {
  return apiClient
    .post<PublicacionResponse>(`/publicaciones/${id}/republicar`)
    .then((r) => r.data);
}

export function cancelarProgramacion(id: number) {
  return apiClient
    .post<PublicacionResponse>(`/publicaciones/${id}/cancelar-programacion`)
    .then((r) => r.data);
}

// --- Categorias (admin) ---

export function listCategoriasAdmin() {
  return apiClient
    .get<{ id: number; nombre: string; slug: string }[]>(
      "/publicaciones/categorias",
    )
    .then((r) => r.data);
}

// --- Imagen de portada ---

export function uploadImagenPublicacion(id: number, file: File) {
  const formData = new FormData();
  formData.append("imagen", file);

  return apiClient
    .post<PublicacionResponse>(`/publicaciones/${id}/imagen`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
}

export function removeImagenPublicacion(id: number) {
  return apiClient
    .delete<PublicacionResponse>(`/publicaciones/${id}/imagen`)
    .then((r) => r.data);
}