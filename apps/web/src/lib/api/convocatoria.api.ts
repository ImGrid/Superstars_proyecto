import { apiClient } from "./client";
import type {
  PaginatedResponse,
  CreateConvocatoriaDto,
  UpdateConvocatoriaDto,
  UpdateFechasConvocatoriaDto,
  ListConvocatoriasQueryDto,
  AssignResponsableDto,
  AssignEvaluadorDto,
  SeleccionarGanadoresDto,
  ConvocatoriaResponse,
  ResponsableResponse,
  EvaluadorConvocatoriaResponse,
  CanPublicarResponse,
  ConvocatoriaResultadosResumenItem,
  ConvocatoriaRankingResponse,
} from "@superstars/shared";

// --- CRUD ---

export function createConvocatoria(dto: CreateConvocatoriaDto) {
  return apiClient
    .post<ConvocatoriaResponse>("/convocatorias", dto)
    .then((r) => r.data);
}

export function listConvocatorias(params?: Partial<ListConvocatoriasQueryDto>) {
  return apiClient
    .get<PaginatedResponse<ConvocatoriaResponse>>("/convocatorias", { params })
    .then((r) => r.data);
}

export function getConvocatoria(id: number) {
  return apiClient
    .get<ConvocatoriaResponse>(`/convocatorias/${id}`)
    .then((r) => r.data);
}

export function updateConvocatoria(id: number, dto: UpdateConvocatoriaDto) {
  return apiClient
    .patch<ConvocatoriaResponse>(`/convocatorias/${id}`, dto)
    .then((r) => r.data);
}

export function deleteConvocatoria(id: number) {
  return apiClient.delete(`/convocatorias/${id}`);
}

export function updateFechasConvocatoria(id: number, dto: UpdateFechasConvocatoriaDto) {
  return apiClient
    .patch<ConvocatoriaResponse>(`/convocatorias/${id}/fechas`, dto)
    .then((r) => r.data);
}

// --- Transiciones de estado ---

export function canPublicar(id: number) {
  return apiClient
    .get<CanPublicarResponse>(`/convocatorias/${id}/can-publicar`)
    .then((r) => r.data);
}

export function publicarConvocatoria(id: number) {
  return apiClient
    .post<ConvocatoriaResponse>(`/convocatorias/${id}/publicar`)
    .then((r) => r.data);
}

export function cerrarConvocatoria(id: number) {
  return apiClient
    .post<ConvocatoriaResponse>(`/convocatorias/${id}/cerrar`)
    .then((r) => r.data);
}

export function iniciarEvaluacion(id: number) {
  return apiClient
    .post<ConvocatoriaResponse>(`/convocatorias/${id}/iniciar-evaluacion`)
    .then((r) => r.data);
}

// Seleccionar ganadores (en_evaluacion -> resultados_listos)
export function seleccionarGanadores(id: number, dto: SeleccionarGanadoresDto) {
  return apiClient
    .post<ConvocatoriaResponse>(`/convocatorias/${id}/seleccionar-ganadores`, dto)
    .then((r) => r.data);
}

// Verificar si se puede publicar resultados
export function canFinalizar(id: number) {
  return apiClient
    .get<{ canFinalizar: boolean; errors: string[] }>(`/convocatorias/${id}/can-finalizar`)
    .then((r) => r.data);
}

// Publicar resultados (resultados_listos -> finalizado)
export function publicarResultados(id: number) {
  return apiClient
    .post<ConvocatoriaResponse>(`/convocatorias/${id}/publicar-resultados`)
    .then((r) => r.data);
}

// --- Responsables ---

export function listResponsables(convocatoriaId: number) {
  return apiClient
    .get<ResponsableResponse[]>(`/convocatorias/${convocatoriaId}/responsables`)
    .then((r) => r.data);
}

export function addResponsable(convocatoriaId: number, dto: AssignResponsableDto) {
  return apiClient
    .post(`/convocatorias/${convocatoriaId}/responsables`, dto)
    .then((r) => r.data);
}

export function removeResponsable(convocatoriaId: number, userId: number) {
  return apiClient.delete(
    `/convocatorias/${convocatoriaId}/responsables/${userId}`,
  );
}

// --- Evaluadores ---

export function listEvaluadores(convocatoriaId: number) {
  return apiClient
    .get<EvaluadorConvocatoriaResponse[]>(`/convocatorias/${convocatoriaId}/evaluadores`)
    .then((r) => r.data);
}

export function addEvaluador(convocatoriaId: number, dto: AssignEvaluadorDto) {
  return apiClient
    .post(`/convocatorias/${convocatoriaId}/evaluadores`, dto)
    .then((r) => r.data);
}

export function removeEvaluador(convocatoriaId: number, evaluadorId: number) {
  return apiClient.delete(
    `/convocatorias/${convocatoriaId}/evaluadores/${evaluadorId}`,
  );
}

// --- Resultados ---

export function getResumenResultados() {
  return apiClient
    .get<ConvocatoriaResultadosResumenItem[]>("/convocatorias/resumen-resultados")
    .then((r) => r.data);
}

export function getRankingConvocatoria(id: number) {
  return apiClient
    .get<ConvocatoriaRankingResponse>(`/convocatorias/${id}/ranking`)
    .then((r) => r.data);
}
