import { apiClient } from "./client";
import type {
  SaveCalificacionDto,
  DevolverCalificacionDto,
  EvaluadorConvocatoriaItem,
  PostulacionEvaluableItem,
  PostulacionDetalleEvaluador,
  CalificacionListItem,
  CalificacionDetalleResponsable,
  AsignacionEvaluadorResponse,
} from "@superstars/shared";

// --- Evaluador ---

// convocatorias donde estoy asignado
export function listMisConvocatorias() {
  return apiClient
    .get<EvaluadorConvocatoriaItem[]>("/mis-evaluaciones/convocatorias")
    .then((r) => r.data);
}

// postulaciones evaluables de una convocatoria
export function listPostulacionesEvaluables(convocatoriaId: number) {
  return apiClient
    .get<PostulacionEvaluableItem[]>(
      `/mis-evaluaciones/convocatorias/${convocatoriaId}/postulaciones`,
    )
    .then((r) => r.data);
}

// detalle de postulacion + mi calificacion
export function getPostulacionDetalle(convocatoriaId: number, postulacionId: number) {
  return apiClient
    .get<PostulacionDetalleEvaluador>(
      `/mis-evaluaciones/convocatorias/${convocatoriaId}/postulaciones/${postulacionId}`,
    )
    .then((r) => r.data);
}

// guardar calificacion parcial
export function saveCalificacion(postulacionId: number, dto: SaveCalificacionDto) {
  return apiClient
    .put(`/mis-evaluaciones/calificaciones/${postulacionId}`, dto)
    .then((r) => r.data);
}

// completar calificacion (enviar para revision)
export function completarCalificacion(postulacionId: number) {
  return apiClient
    .post(`/mis-evaluaciones/calificaciones/${postulacionId}/completar`)
    .then((r) => r.data);
}

// --- Responsable ---

// listar calificaciones de una convocatoria
export function listCalificaciones(convocatoriaId: number) {
  return apiClient
    .get<CalificacionListItem[]>(`/convocatorias/${convocatoriaId}/calificaciones`)
    .then((r) => r.data);
}

// detalle de una calificacion (puntajes + postulacion)
export function getCalificacionDetalle(convocatoriaId: number, calificacionId: number) {
  return apiClient
    .get<CalificacionDetalleResponsable>(
      `/convocatorias/${convocatoriaId}/calificaciones/${calificacionId}/detalle`,
    )
    .then((r) => r.data);
}

// aprobar calificacion
export function aprobarCalificacion(convocatoriaId: number, calificacionId: number) {
  return apiClient
    .post(`/convocatorias/${convocatoriaId}/calificaciones/${calificacionId}/aprobar`)
    .then((r) => r.data);
}

// devolver calificacion al evaluador
export function devolverCalificacion(
  convocatoriaId: number,
  calificacionId: number,
  dto: DevolverCalificacionDto,
) {
  return apiClient
    .post(`/convocatorias/${convocatoriaId}/calificaciones/${calificacionId}/devolver`, dto)
    .then((r) => r.data);
}

// --- Asignacion de evaluadores a postulaciones ---

// listar evaluadores asignados a una postulacion
export function listAsignacionesEvaluador(convocatoriaId: number, postulacionId: number) {
  return apiClient
    .get<AsignacionEvaluadorResponse[]>(
      `/convocatorias/${convocatoriaId}/postulaciones/${postulacionId}/evaluadores-asignados`,
    )
    .then((r) => r.data);
}

// asignar evaluador a una postulacion
export function assignEvaluadorPostulacion(
  convocatoriaId: number,
  postulacionId: number,
  evaluadorId: number,
) {
  return apiClient
    .post(
      `/convocatorias/${convocatoriaId}/postulaciones/${postulacionId}/evaluadores-asignados`,
      { evaluadorId },
    )
    .then((r) => r.data);
}

// desasignar evaluador de una postulacion
export function removeAsignacionEvaluador(
  convocatoriaId: number,
  postulacionId: number,
  evaluadorId: number,
) {
  return apiClient
    .delete(
      `/convocatorias/${convocatoriaId}/postulaciones/${postulacionId}/evaluadores-asignados/${evaluadorId}`,
    )
    .then((r) => r.data);
}
