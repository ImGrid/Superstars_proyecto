import { apiClient } from "./client";
import type {
  AdminDashboardStats,
  ResponsableDashboardStats,
  EvaluadorDashboardStats,
  ProponenteDashboardStats,
} from "@superstars/shared";

// GET /api/dashboard/admin
export function getAdminDashboard() {
  return apiClient
    .get<AdminDashboardStats>("/dashboard/admin")
    .then((r) => r.data);
}

// GET /api/dashboard/responsable
export function getResponsableDashboard() {
  return apiClient
    .get<ResponsableDashboardStats>("/dashboard/responsable")
    .then((r) => r.data);
}

// GET /api/dashboard/evaluador
export function getEvaluadorDashboard() {
  return apiClient
    .get<EvaluadorDashboardStats>("/dashboard/evaluador")
    .then((r) => r.data);
}

// GET /api/dashboard/proponente
export function getProponenteDashboard() {
  return apiClient
    .get<ProponenteDashboardStats>("/dashboard/proponente")
    .then((r) => r.data);
}
