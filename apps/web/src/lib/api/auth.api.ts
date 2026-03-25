import { apiClient } from "./client";
import type {
  LoginDto,
  RegisterDto,
  LoginResponse,
  RegisterResponse,
  UsuarioResponse,
} from "@superstars/shared";

export function login(dto: LoginDto) {
  return apiClient.post<LoginResponse>("/auth/login", dto).then((r) => r.data);
}

export function register(dto: RegisterDto) {
  return apiClient
    .post<RegisterResponse>("/auth/register", dto)
    .then((r) => r.data);
}

export function logout() {
  return apiClient.post("/auth/logout");
}

export function logoutAll() {
  return apiClient.post("/auth/logout-all");
}

export function refresh() {
  return apiClient
    .post<LoginResponse>("/auth/refresh")
    .then((r) => r.data);
}

export function getMe() {
  return apiClient.get<UsuarioResponse>("/usuarios/me").then((r) => r.data);
}
