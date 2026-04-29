import { apiClient } from "./client";
import type {
  CreateRubricaDto,
  UpdateRubricaDto,
  CreateCriterioDto,
  UpdateCriterioDto,
  CreateSubCriterioConNivelesDto,
  UpdateSubCriterioDto,
  UpdateNivelEvaluacionDto,
  RubricaResponse,
  RubricaFullResponse,
  CriterioResponse,
  SubCriterioConNivelesResponse,
  SubCriterioResponse,
  NivelEvaluacionResponse,
  RubricaValidacionResponse,
} from "@superstars/shared";

// --- Rubrica (1:1 con convocatoria) ---

export function getRubrica(convocatoriaId: number) {
  return apiClient
    .get<RubricaFullResponse>(`/convocatorias/${convocatoriaId}/rubrica`)
    .then((r) => r.data);
}

export function createRubrica(convocatoriaId: number, dto: CreateRubricaDto) {
  return apiClient
    .post<RubricaResponse>(`/convocatorias/${convocatoriaId}/rubrica`, dto)
    .then((r) => r.data);
}

export function updateRubrica(convocatoriaId: number, dto: UpdateRubricaDto) {
  return apiClient
    .put<RubricaResponse>(`/convocatorias/${convocatoriaId}/rubrica`, dto)
    .then((r) => r.data);
}

export function deleteRubrica(convocatoriaId: number) {
  return apiClient.delete(`/convocatorias/${convocatoriaId}/rubrica`);
}

// --- Criterios ---

export function createCriterio(convocatoriaId: number, dto: CreateCriterioDto) {
  return apiClient
    .post<CriterioResponse>(
      `/convocatorias/${convocatoriaId}/rubrica/criterios`,
      dto,
    )
    .then((r) => r.data);
}

export function updateCriterio(
  convocatoriaId: number,
  criterioId: number,
  dto: UpdateCriterioDto,
) {
  return apiClient
    .put<CriterioResponse>(
      `/convocatorias/${convocatoriaId}/rubrica/criterios/${criterioId}`,
      dto,
    )
    .then((r) => r.data);
}

export function deleteCriterio(convocatoriaId: number, criterioId: number) {
  return apiClient.delete(
    `/convocatorias/${convocatoriaId}/rubrica/criterios/${criterioId}`,
  );
}

// --- Sub-criterios ---

export function createSubCriterio(
  convocatoriaId: number,
  dto: CreateSubCriterioConNivelesDto,
) {
  return apiClient
    .post<SubCriterioConNivelesResponse>(
      `/convocatorias/${convocatoriaId}/rubrica/sub-criterios`,
      dto,
    )
    .then((r) => r.data);
}

export function updateSubCriterio(
  convocatoriaId: number,
  subCriterioId: number,
  dto: UpdateSubCriterioDto,
) {
  return apiClient
    .put<SubCriterioResponse>(
      `/convocatorias/${convocatoriaId}/rubrica/sub-criterios/${subCriterioId}`,
      dto,
    )
    .then((r) => r.data);
}

export function deleteSubCriterio(
  convocatoriaId: number,
  subCriterioId: number,
) {
  return apiClient.delete(
    `/convocatorias/${convocatoriaId}/rubrica/sub-criterios/${subCriterioId}`,
  );
}

// --- Niveles ---

export function updateNivel(
  convocatoriaId: number,
  nivelId: number,
  dto: UpdateNivelEvaluacionDto,
) {
  return apiClient
    .put<NivelEvaluacionResponse>(
      `/convocatorias/${convocatoriaId}/rubrica/niveles/${nivelId}`,
      dto,
    )
    .then((r) => r.data);
}

export function deleteNivel(convocatoriaId: number, nivelId: number) {
  return apiClient.delete(
    `/convocatorias/${convocatoriaId}/rubrica/niveles/${nivelId}`,
  );
}

// --- Validacion ---

export function validarRubrica(convocatoriaId: number) {
  return apiClient
    .get<RubricaValidacionResponse>(
      `/convocatorias/${convocatoriaId}/rubrica/validar`,
    )
    .then((r) => r.data);
}
