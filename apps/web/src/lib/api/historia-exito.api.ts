import { apiClient } from "./client";
import type {
  PaginatedResponse,
  CreateHistoriaExitoDto,
  UpdateHistoriaExitoDto,
  ListHistoriasExitoQueryDto,
  HistoriaExitoResponse,
} from "@superstars/shared";

// --- CRUD ---

// Crear (multipart con imagen obligatoria)
export function createHistoriaExito(dto: CreateHistoriaExitoDto, imagen: File) {
  const formData = new FormData();
  formData.append("titulo", dto.titulo);
  formData.append("descripcion", dto.descripcion);
  if (dto.badge) formData.append("badge", dto.badge);
  if (dto.empresaId != null) formData.append("empresaId", String(dto.empresaId));
  if (dto.empresaNombre) formData.append("empresaNombre", dto.empresaNombre);
  formData.append("imagen", imagen);

  return apiClient
    .post<HistoriaExitoResponse>("/historias-exito", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
}

// Listar con paginacion (admin)
export function listHistoriasExito(params?: Partial<ListHistoriasExitoQueryDto>) {
  return apiClient
    .get<PaginatedResponse<HistoriaExitoResponse>>("/historias-exito", { params })
    .then((r) => r.data);
}

// Detalle
export function getHistoriaExito(id: number) {
  return apiClient
    .get<HistoriaExitoResponse>(`/historias-exito/${id}`)
    .then((r) => r.data);
}

// Actualizar campos texto (no imagen ni activa)
export function updateHistoriaExito(id: number, dto: UpdateHistoriaExitoDto) {
  return apiClient
    .patch<HistoriaExitoResponse>(`/historias-exito/${id}`, dto)
    .then((r) => r.data);
}

// Eliminar
export function deleteHistoriaExito(id: number) {
  return apiClient.delete(`/historias-exito/${id}`);
}

// --- Imagen ---

// Cambiar imagen (reemplaza la actual)
export function cambiarImagenHistoriaExito(id: number, imagen: File) {
  const formData = new FormData();
  formData.append("imagen", imagen);

  return apiClient
    .post<HistoriaExitoResponse>(`/historias-exito/${id}/imagen`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
}

// --- Activacion ---

// Activar / desactivar (cap de 6 activas validado en backend)
export function toggleActivaHistoriaExito(id: number, activa: boolean) {
  return apiClient
    .patch<HistoriaExitoResponse>(`/historias-exito/${id}/toggle-activa`, { activa })
    .then((r) => r.data);
}

// --- Reordenar (drag-and-drop) ---

// Asigna orden 0..N-1 segun la posicion de cada id en el array
export function reorderHistoriasExito(ids: number[]) {
  return apiClient
    .put<{ message: string }>("/historias-exito/orden", { ids })
    .then((r) => r.data);
}
