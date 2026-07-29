import { apiClient, apiFileClient } from "./client";
import type {
  PaginatedResponse,
  CreateConvocatoriaDto,
  UpdateConvocatoriaDto,
  UpdateFechasConvocatoriaDto,
  ListConvocatoriasQueryDto,
  AssignResponsableDto,
  SeleccionarGanadoresDto,
  ConvocatoriaResponse,
  ResponsableResponse,
  CanPublicarResponse,
  ConvocatoriaResultadosResumenItem,
  CategoriaRankingResponse,
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

// Seleccionar ganadores de una categoria (la convocatoria avanza a resultados_listos
// cuando TODAS sus categorias quedan resueltas)
export function seleccionarGanadores(
  convocatoriaId: number,
  categoriaId: number,
  dto: SeleccionarGanadoresDto,
) {
  return apiClient
    .post<ConvocatoriaResponse>(
      `/convocatorias/${convocatoriaId}/categorias/${categoriaId}/seleccionar-ganadores`,
      dto,
    )
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

// Nota: el pool de evaluadores (nivel 1) se gestiona por categoria (ver categoria.api.ts).

// --- Resultados ---

export function getResumenResultados() {
  return apiClient
    .get<ConvocatoriaResultadosResumenItem[]>("/convocatorias/resumen-resultados")
    .then((r) => r.data);
}

export function getRankingCategoria(convocatoriaId: number, categoriaId: number) {
  return apiClient
    .get<CategoriaRankingResponse>(
      `/convocatorias/${convocatoriaId}/categorias/${categoriaId}/ranking`,
    )
    .then((r) => r.data);
}

// --- Imagen de portada ---

// URL publica para mostrar la imagen como src de <img>. El backend sirve el binario
// con cache de 24h, por lo que se puede usar directamente sin auth.
export function getConvocatoriaImagenUrl(id: number): string {
  return `${process.env.NEXT_PUBLIC_API_URL}/convocatorias/${id}/imagen`;
}

export function uploadImagenConvocatoria(id: number, file: File) {
  const formData = new FormData();
  formData.append("imagen", file);

  return apiFileClient
    .post<ConvocatoriaResponse>(`/convocatorias/${id}/imagen`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
}

export function removeImagenConvocatoria(id: number) {
  return apiClient
    .delete<ConvocatoriaResponse>(`/convocatorias/${id}/imagen`)
    .then((r) => r.data);
}
