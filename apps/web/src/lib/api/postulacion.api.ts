import { apiClient } from "./client";
import type {
  SavePostulacionDraftDto,
  ObservarPostulacionDto,
  RechazarPostulacionDto,
  ListPostulacionesQueryDto,
  PostulacionResponse,
  PostulacionListItem,
  PostulacionAdminListItem,
  PaginatedResponse,
} from "@superstars/shared";

// --- Proponente ---

// Guardar borrador (crea o actualiza)
export function saveDraft(convocatoriaId: number, dto: SavePostulacionDraftDto) {
  return apiClient
    .put<PostulacionResponse>(
      `/convocatorias/${convocatoriaId}/postulaciones/me/draft`,
      dto,
    )
    .then((r) => r.data);
}

// Enviar postulacion
export function submitPostulacion(convocatoriaId: number) {
  return apiClient
    .post<PostulacionResponse>(
      `/convocatorias/${convocatoriaId}/postulaciones/me/enviar`,
    )
    .then((r) => r.data);
}

// Obtener mi postulacion para una convocatoria
export function getMyPostulacion(convocatoriaId: number) {
  return apiClient
    .get<PostulacionResponse>(
      `/convocatorias/${convocatoriaId}/postulaciones/me`,
    )
    .then((r) => r.data);
}

// Listar todas mis postulaciones (cross-convocatoria)
export function listMyPostulaciones() {
  return apiClient
    .get<PostulacionListItem[]>("/mis-postulaciones")
    .then((r) => r.data);
}

// --- Responsable / Admin ---

// Listar postulaciones cross-convocatoria (paginado, con nombre empresa y convocatoria)
export function listPostulacionesAdmin(params?: Partial<ListPostulacionesQueryDto>) {
  return apiClient
    .get<PaginatedResponse<PostulacionAdminListItem>>("/postulaciones", { params })
    .then((r) => r.data);
}

// Listar postulaciones de una convocatoria, opcionalmente filtradas por categoria
export function listPostulaciones(
  convocatoriaId: number,
  estado?: string,
  categoriaId?: number,
) {
  const params: Record<string, string | number> = {};
  if (estado) params.estado = estado;
  if (categoriaId !== undefined) params.categoriaId = categoriaId;
  return apiClient
    .get<PostulacionListItem[]>(
      `/convocatorias/${convocatoriaId}/postulaciones`,
      { params: Object.keys(params).length ? params : undefined },
    )
    .then((r) => r.data);
}

// Detalle de una postulacion
export function getPostulacion(convocatoriaId: number, id: number) {
  return apiClient
    .get<PostulacionResponse>(
      `/convocatorias/${convocatoriaId}/postulaciones/${id}`,
    )
    .then((r) => r.data);
}

// Observar postulacion (devolver con comentarios)
export function observarPostulacion(
  convocatoriaId: number,
  id: number,
  dto: ObservarPostulacionDto,
) {
  return apiClient
    .post<PostulacionResponse>(
      `/convocatorias/${convocatoriaId}/postulaciones/${id}/observar`,
      dto,
    )
    .then((r) => r.data);
}

// Rechazar postulacion con motivo (sirve en revision y en evaluacion)
export function rechazarPostulacion(
  convocatoriaId: number,
  id: number,
  dto: RechazarPostulacionDto,
) {
  return apiClient
    .post<PostulacionResponse>(
      `/convocatorias/${convocatoriaId}/postulaciones/${id}/rechazar`,
      dto,
    )
    .then((r) => r.data);
}

// Aprobar postulacion para evaluacion (enviado → en_evaluacion)
export function aprobarPostulacion(convocatoriaId: number, id: number) {
  return apiClient
    .post<PostulacionResponse>(
      `/convocatorias/${convocatoriaId}/postulaciones/${id}/aprobar`,
    )
    .then((r) => r.data);
}

