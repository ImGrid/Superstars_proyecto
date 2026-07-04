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

// La rubrica es 1:1 con la categoria (ruta anidada bajo la convocatoria).
const base = (convocatoriaId: number, categoriaId: number) =>
  `/convocatorias/${convocatoriaId}/categorias/${categoriaId}/rubrica`;

// --- Rubrica (1:1 con categoria) ---

export function getRubrica(convocatoriaId: number, categoriaId: number) {
  return apiClient
    .get<RubricaFullResponse>(base(convocatoriaId, categoriaId))
    .then((r) => r.data);
}

export function createRubrica(
  convocatoriaId: number,
  categoriaId: number,
  dto: CreateRubricaDto,
) {
  return apiClient
    .post<RubricaResponse>(base(convocatoriaId, categoriaId), dto)
    .then((r) => r.data);
}

export function updateRubrica(
  convocatoriaId: number,
  categoriaId: number,
  dto: UpdateRubricaDto,
) {
  return apiClient
    .put<RubricaResponse>(base(convocatoriaId, categoriaId), dto)
    .then((r) => r.data);
}

export function deleteRubrica(convocatoriaId: number, categoriaId: number) {
  return apiClient.delete(base(convocatoriaId, categoriaId));
}

// --- Criterios ---

export function createCriterio(
  convocatoriaId: number,
  categoriaId: number,
  dto: CreateCriterioDto,
) {
  return apiClient
    .post<CriterioResponse>(`${base(convocatoriaId, categoriaId)}/criterios`, dto)
    .then((r) => r.data);
}

export function updateCriterio(
  convocatoriaId: number,
  categoriaId: number,
  criterioId: number,
  dto: UpdateCriterioDto,
) {
  return apiClient
    .put<CriterioResponse>(
      `${base(convocatoriaId, categoriaId)}/criterios/${criterioId}`,
      dto,
    )
    .then((r) => r.data);
}

export function deleteCriterio(
  convocatoriaId: number,
  categoriaId: number,
  criterioId: number,
) {
  return apiClient.delete(
    `${base(convocatoriaId, categoriaId)}/criterios/${criterioId}`,
  );
}

// --- Sub-criterios ---

export function createSubCriterio(
  convocatoriaId: number,
  categoriaId: number,
  dto: CreateSubCriterioConNivelesDto,
) {
  return apiClient
    .post<SubCriterioConNivelesResponse>(
      `${base(convocatoriaId, categoriaId)}/sub-criterios`,
      dto,
    )
    .then((r) => r.data);
}

export function updateSubCriterio(
  convocatoriaId: number,
  categoriaId: number,
  subCriterioId: number,
  dto: UpdateSubCriterioDto,
) {
  return apiClient
    .put<SubCriterioResponse>(
      `${base(convocatoriaId, categoriaId)}/sub-criterios/${subCriterioId}`,
      dto,
    )
    .then((r) => r.data);
}

export function deleteSubCriterio(
  convocatoriaId: number,
  categoriaId: number,
  subCriterioId: number,
) {
  return apiClient.delete(
    `${base(convocatoriaId, categoriaId)}/sub-criterios/${subCriterioId}`,
  );
}

// --- Niveles ---

export function updateNivel(
  convocatoriaId: number,
  categoriaId: number,
  nivelId: number,
  dto: UpdateNivelEvaluacionDto,
) {
  return apiClient
    .put<NivelEvaluacionResponse>(
      `${base(convocatoriaId, categoriaId)}/niveles/${nivelId}`,
      dto,
    )
    .then((r) => r.data);
}

export function deleteNivel(
  convocatoriaId: number,
  categoriaId: number,
  nivelId: number,
) {
  return apiClient.delete(
    `${base(convocatoriaId, categoriaId)}/niveles/${nivelId}`,
  );
}

// --- Validacion ---

export function validarRubrica(convocatoriaId: number, categoriaId: number) {
  return apiClient
    .get<RubricaValidacionResponse>(
      `${base(convocatoriaId, categoriaId)}/validar`,
    )
    .then((r) => r.data);
}
