import { apiClient } from "./client";
import type {
  PaginatedResponse,
  CreateConcursoDto,
  UpdateConcursoDto,
  UpdateFechasConcursoDto,
  ListConcursosQueryDto,
  AssignResponsableDto,
  AssignEvaluadorDto,
  SeleccionarGanadoresDto,
  ConcursoResponse,
  ResponsableResponse,
  EvaluadorConcursoResponse,
  CanPublicarResponse,
  ConcursoResultadosResumenItem,
  ConcursoRankingResponse,
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

// Seleccionar ganadores (en_evaluacion -> resultados_listos)
export function seleccionarGanadores(id: number, dto: SeleccionarGanadoresDto) {
  return apiClient
    .post<ConcursoResponse>(`/concursos/${id}/seleccionar-ganadores`, dto)
    .then((r) => r.data);
}

// Verificar si se puede publicar resultados
export function canFinalizar(id: number) {
  return apiClient
    .get<{ canFinalizar: boolean; errors: string[] }>(`/concursos/${id}/can-finalizar`)
    .then((r) => r.data);
}

// Publicar resultados (resultados_listos -> finalizado)
export function publicarResultados(id: number) {
  return apiClient
    .post<ConcursoResponse>(`/concursos/${id}/publicar-resultados`)
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

// --- Resultados ---

export function getResumenResultados() {
  return apiClient
    .get<ConcursoResultadosResumenItem[]>("/concursos/resumen-resultados")
    .then((r) => r.data);
}

export function getRankingConcurso(id: number) {
  return apiClient
    .get<ConcursoRankingResponse>(`/concursos/${id}/ranking`)
    .then((r) => r.data);
}
