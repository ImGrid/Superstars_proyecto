import { apiClient } from "./client";
import type {
  PaginatedResponse,
  CreateFaqDto,
  UpdateFaqDto,
  ListFaqQueryDto,
  FaqResponse,
} from "@superstars/shared";

// --- Endpoints publicos ---

export function listPublicFaq() {
  return apiClient
    .get<FaqResponse[]>("/public/faq")
    .then((r) => r.data);
}

export function listPublicFaqByConcurso(concursoId: number) {
  return apiClient
    .get<FaqResponse[]>(`/public/faq/concurso/${concursoId}`)
    .then((r) => r.data);
}

// --- Endpoints admin ---

export function listFaq(params?: Partial<ListFaqQueryDto>) {
  return apiClient
    .get<PaginatedResponse<FaqResponse>>("/faq", { params })
    .then((r) => r.data);
}

export function getFaq(id: number) {
  return apiClient
    .get<FaqResponse>(`/faq/${id}`)
    .then((r) => r.data);
}

export function createFaq(dto: CreateFaqDto) {
  return apiClient
    .post<FaqResponse>("/faq", dto)
    .then((r) => r.data);
}

export function updateFaq(id: number, dto: UpdateFaqDto) {
  return apiClient
    .patch<FaqResponse>(`/faq/${id}`, dto)
    .then((r) => r.data);
}

export function deleteFaq(id: number) {
  return apiClient.delete(`/faq/${id}`);
}
