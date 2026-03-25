import { apiClient } from "./client";
import type {
  SavePostulacionDraftDto,
  ObservarPostulacionDto,
  ListPostulacionesQueryDto,
  PostulacionResponse,
  PostulacionListItem,
  PostulacionAdminListItem,
  PaginatedResponse,
} from "@superstars/shared";

// --- Proponente ---

// Guardar borrador (crea o actualiza)
export function saveDraft(concursoId: number, dto: SavePostulacionDraftDto) {
  return apiClient
    .put<PostulacionResponse>(
      `/concursos/${concursoId}/postulaciones/me/draft`,
      dto,
    )
    .then((r) => r.data);
}

// Enviar postulacion
export function submitPostulacion(concursoId: number) {
  return apiClient
    .post<PostulacionResponse>(
      `/concursos/${concursoId}/postulaciones/me/enviar`,
    )
    .then((r) => r.data);
}

// Obtener mi postulacion para un concurso
export function getMyPostulacion(concursoId: number) {
  return apiClient
    .get<PostulacionResponse>(
      `/concursos/${concursoId}/postulaciones/me`,
    )
    .then((r) => r.data);
}

// Listar todas mis postulaciones (cross-concurso)
export function listMyPostulaciones() {
  return apiClient
    .get<PostulacionListItem[]>("/mis-postulaciones")
    .then((r) => r.data);
}

// --- Responsable / Admin ---

// Listar postulaciones cross-concurso (paginado, con nombre empresa y concurso)
export function listPostulacionesAdmin(params?: Partial<ListPostulacionesQueryDto>) {
  return apiClient
    .get<PaginatedResponse<PostulacionAdminListItem>>("/postulaciones", { params })
    .then((r) => r.data);
}

// Listar postulaciones de un concurso
export function listPostulaciones(concursoId: number, estado?: string) {
  return apiClient
    .get<PostulacionListItem[]>(
      `/concursos/${concursoId}/postulaciones`,
      { params: estado ? { estado } : undefined },
    )
    .then((r) => r.data);
}

// Detalle de una postulacion
export function getPostulacion(concursoId: number, id: number) {
  return apiClient
    .get<PostulacionResponse>(
      `/concursos/${concursoId}/postulaciones/${id}`,
    )
    .then((r) => r.data);
}

// Observar postulacion (devolver con comentarios)
export function observarPostulacion(
  concursoId: number,
  id: number,
  dto: ObservarPostulacionDto,
) {
  return apiClient
    .post<PostulacionResponse>(
      `/concursos/${concursoId}/postulaciones/${id}/observar`,
      dto,
    )
    .then((r) => r.data);
}

// Rechazar postulacion
export function rechazarPostulacion(concursoId: number, id: number) {
  return apiClient
    .post<PostulacionResponse>(
      `/concursos/${concursoId}/postulaciones/${id}/rechazar`,
    )
    .then((r) => r.data);
}

// Aprobar postulacion para evaluacion (enviado → en_evaluacion)
export function aprobarPostulacion(concursoId: number, id: number) {
  return apiClient
    .post<PostulacionResponse>(
      `/concursos/${concursoId}/postulaciones/${id}/aprobar`,
    )
    .then((r) => r.data);
}

// Seleccionar como ganadora (calificado → ganador)
export function seleccionarGanador(concursoId: number, id: number) {
  return apiClient
    .post<PostulacionResponse>(
      `/concursos/${concursoId}/postulaciones/${id}/seleccionar-ganador`,
    )
    .then((r) => r.data);
}

// Marcar como no seleccionada (calificado → no_seleccionado)
export function noSeleccionarPostulacion(concursoId: number, id: number) {
  return apiClient
    .post<PostulacionResponse>(
      `/concursos/${concursoId}/postulaciones/${id}/no-seleccionar`,
    )
    .then((r) => r.data);
}
