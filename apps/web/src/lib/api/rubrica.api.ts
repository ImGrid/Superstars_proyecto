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

// --- Rubrica (1:1 con concurso) ---

export function getRubrica(concursoId: number) {
  return apiClient
    .get<RubricaFullResponse>(`/concursos/${concursoId}/rubrica`)
    .then((r) => r.data);
}

export function createRubrica(concursoId: number, dto: CreateRubricaDto) {
  return apiClient
    .post<RubricaResponse>(`/concursos/${concursoId}/rubrica`, dto)
    .then((r) => r.data);
}

export function updateRubrica(concursoId: number, dto: UpdateRubricaDto) {
  return apiClient
    .put<RubricaResponse>(`/concursos/${concursoId}/rubrica`, dto)
    .then((r) => r.data);
}

export function deleteRubrica(concursoId: number) {
  return apiClient.delete(`/concursos/${concursoId}/rubrica`);
}

// --- Criterios ---

export function createCriterio(concursoId: number, dto: CreateCriterioDto) {
  return apiClient
    .post<CriterioResponse>(
      `/concursos/${concursoId}/rubrica/criterios`,
      dto,
    )
    .then((r) => r.data);
}

export function updateCriterio(
  concursoId: number,
  criterioId: number,
  dto: UpdateCriterioDto,
) {
  return apiClient
    .put<CriterioResponse>(
      `/concursos/${concursoId}/rubrica/criterios/${criterioId}`,
      dto,
    )
    .then((r) => r.data);
}

export function deleteCriterio(concursoId: number, criterioId: number) {
  return apiClient.delete(
    `/concursos/${concursoId}/rubrica/criterios/${criterioId}`,
  );
}

// --- Sub-criterios ---

export function createSubCriterio(
  concursoId: number,
  dto: CreateSubCriterioConNivelesDto,
) {
  return apiClient
    .post<SubCriterioConNivelesResponse>(
      `/concursos/${concursoId}/rubrica/sub-criterios`,
      dto,
    )
    .then((r) => r.data);
}

export function updateSubCriterio(
  concursoId: number,
  subCriterioId: number,
  dto: UpdateSubCriterioDto,
) {
  return apiClient
    .put<SubCriterioResponse>(
      `/concursos/${concursoId}/rubrica/sub-criterios/${subCriterioId}`,
      dto,
    )
    .then((r) => r.data);
}

export function deleteSubCriterio(
  concursoId: number,
  subCriterioId: number,
) {
  return apiClient.delete(
    `/concursos/${concursoId}/rubrica/sub-criterios/${subCriterioId}`,
  );
}

// --- Niveles ---

export function updateNivel(
  concursoId: number,
  nivelId: number,
  dto: UpdateNivelEvaluacionDto,
) {
  return apiClient
    .put<NivelEvaluacionResponse>(
      `/concursos/${concursoId}/rubrica/niveles/${nivelId}`,
      dto,
    )
    .then((r) => r.data);
}

export function deleteNivel(concursoId: number, nivelId: number) {
  return apiClient.delete(
    `/concursos/${concursoId}/rubrica/niveles/${nivelId}`,
  );
}

// --- Validacion ---

export function validarRubrica(concursoId: number) {
  return apiClient
    .get<RubricaValidacionResponse>(
      `/concursos/${concursoId}/rubrica/validar`,
    )
    .then((r) => r.data);
}
