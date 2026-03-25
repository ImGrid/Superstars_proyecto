import { apiClient } from "./client";
import type {
  SaveCalificacionDto,
  DevolverCalificacionDto,
  EvaluadorConcursoItem,
  PostulacionEvaluableItem,
  PostulacionDetalleEvaluador,
  CalificacionListItem,
  CalificacionDetalleResponsable,
  AsignacionEvaluadorResponse,
} from "@superstars/shared";

// --- Evaluador ---

// concursos donde estoy asignado
export function listMisConcursos() {
  return apiClient
    .get<EvaluadorConcursoItem[]>("/mis-evaluaciones/concursos")
    .then((r) => r.data);
}

// postulaciones evaluables de un concurso
export function listPostulacionesEvaluables(concursoId: number) {
  return apiClient
    .get<PostulacionEvaluableItem[]>(
      `/mis-evaluaciones/concursos/${concursoId}/postulaciones`,
    )
    .then((r) => r.data);
}

// detalle de postulacion + mi calificacion
export function getPostulacionDetalle(concursoId: number, postulacionId: number) {
  return apiClient
    .get<PostulacionDetalleEvaluador>(
      `/mis-evaluaciones/concursos/${concursoId}/postulaciones/${postulacionId}`,
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

// listar calificaciones de un concurso
export function listCalificaciones(concursoId: number) {
  return apiClient
    .get<CalificacionListItem[]>(`/concursos/${concursoId}/calificaciones`)
    .then((r) => r.data);
}

// detalle de una calificacion (puntajes + postulacion)
export function getCalificacionDetalle(concursoId: number, calificacionId: number) {
  return apiClient
    .get<CalificacionDetalleResponsable>(
      `/concursos/${concursoId}/calificaciones/${calificacionId}/detalle`,
    )
    .then((r) => r.data);
}

// aprobar calificacion
export function aprobarCalificacion(concursoId: number, calificacionId: number) {
  return apiClient
    .post(`/concursos/${concursoId}/calificaciones/${calificacionId}/aprobar`)
    .then((r) => r.data);
}

// devolver calificacion al evaluador
export function devolverCalificacion(
  concursoId: number,
  calificacionId: number,
  dto: DevolverCalificacionDto,
) {
  return apiClient
    .post(`/concursos/${concursoId}/calificaciones/${calificacionId}/devolver`, dto)
    .then((r) => r.data);
}

// --- Asignacion de evaluadores a postulaciones ---

// listar evaluadores asignados a una postulacion
export function listAsignacionesEvaluador(concursoId: number, postulacionId: number) {
  return apiClient
    .get<AsignacionEvaluadorResponse[]>(
      `/concursos/${concursoId}/postulaciones/${postulacionId}/evaluadores-asignados`,
    )
    .then((r) => r.data);
}

// asignar evaluador a una postulacion
export function assignEvaluadorPostulacion(
  concursoId: number,
  postulacionId: number,
  evaluadorId: number,
) {
  return apiClient
    .post(
      `/concursos/${concursoId}/postulaciones/${postulacionId}/evaluadores-asignados`,
      { evaluadorId },
    )
    .then((r) => r.data);
}

// desasignar evaluador de una postulacion
export function removeAsignacionEvaluador(
  concursoId: number,
  postulacionId: number,
  evaluadorId: number,
) {
  return apiClient
    .delete(
      `/concursos/${concursoId}/postulaciones/${postulacionId}/evaluadores-asignados/${evaluadorId}`,
    )
    .then((r) => r.data);
}
