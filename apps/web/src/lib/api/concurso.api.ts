import { apiClient } from "./client";
import type {
  PaginatedResponse,
  CreateConcursoDto,
  UpdateConcursoDto,
  UpdateFechasConcursoDto,
  ListConcursosQueryDto,
  AssignResponsableDto,
  AssignEvaluadorDto,
  ConcursoResponse,
  ResponsableResponse,
  EvaluadorConcursoResponse,
  CanPublicarResponse,
} from "@superstars/shared";

// --- CRUD ---

export function createConcurso(dto: CreateConcursoDto) {
  return apiClient
    .post<ConcursoResponse>("/concursos", dto)
    .then((r) => r.data);
}

export function listConcursos(params?: Partial<ListConcursosQueryDto>) {
  return apiClient
    .get<PaginatedResponse<ConcursoResponse>>("/concursos", { params })
    .then((r) => r.data);
}

export function getConcurso(id: number) {
  return apiClient
    .get<ConcursoResponse>(`/concursos/${id}`)
    .then((r) => r.data);
}

export function updateConcurso(id: number, dto: UpdateConcursoDto) {
  return apiClient
    .patch<ConcursoResponse>(`/concursos/${id}`, dto)
    .then((r) => r.data);
}

export function deleteConcurso(id: number) {
  return apiClient.delete(`/concursos/${id}`);
}

export function updateFechasConcurso(id: number, dto: UpdateFechasConcursoDto) {
  return apiClient
    .patch<ConcursoResponse>(`/concursos/${id}/fechas`, dto)
    .then((r) => r.data);
}

// --- Transiciones de estado ---

export function canPublicar(id: number) {
  return apiClient
    .get<CanPublicarResponse>(`/concursos/${id}/can-publicar`)
    .then((r) => r.data);
}

export function publicarConcurso(id: number) {
  return apiClient
    .post<ConcursoResponse>(`/concursos/${id}/publicar`)
    .then((r) => r.data);
}

export function cerrarConcurso(id: number) {
  return apiClient
    .post<ConcursoResponse>(`/concursos/${id}/cerrar`)
    .then((r) => r.data);
}

export function iniciarEvaluacion(id: number) {
  return apiClient
    .post<ConcursoResponse>(`/concursos/${id}/iniciar-evaluacion`)
    .then((r) => r.data);
}

export function finalizarConcurso(id: number) {
  return apiClient
    .post<ConcursoResponse>(`/concursos/${id}/finalizar`)
    .then((r) => r.data);
}

// --- Responsables ---

export function listResponsables(concursoId: number) {
  return apiClient
    .get<ResponsableResponse[]>(`/concursos/${concursoId}/responsables`)
    .then((r) => r.data);
}

export function addResponsable(concursoId: number, dto: AssignResponsableDto) {
  return apiClient
    .post(`/concursos/${concursoId}/responsables`, dto)
    .then((r) => r.data);
}

export function removeResponsable(concursoId: number, userId: number) {
  return apiClient.delete(
    `/concursos/${concursoId}/responsables/${userId}`,
  );
}

// --- Evaluadores ---

export function listEvaluadores(concursoId: number) {
  return apiClient
    .get<EvaluadorConcursoResponse[]>(`/concursos/${concursoId}/evaluadores`)
    .then((r) => r.data);
}

export function addEvaluador(concursoId: number, dto: AssignEvaluadorDto) {
  return apiClient
    .post(`/concursos/${concursoId}/evaluadores`, dto)
    .then((r) => r.data);
}

export function removeEvaluador(concursoId: number, evaluadorId: number) {
  return apiClient.delete(
    `/concursos/${concursoId}/evaluadores/${evaluadorId}`,
  );
}
