import { apiClient } from "./client";
import type {
  LoginDto,
  RegisterDto,
  LoginResponse,
  RegisterResponse,
  VerifyEmailDto,
  VerifyEmailResponse,
  ResendCodeDto,
  ResendCodeResponse,
  ForgotPasswordDto,
  ForgotPasswordResponse,
  ResetPasswordDto,
  ResetPasswordResponse,
  ResendResetCodeDto,
  ResendResetCodeResponse,
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

export function verifyEmail(dto: VerifyEmailDto) {
  return apiClient
    .post<VerifyEmailResponse>("/auth/verify-email", dto)
    .then((r) => r.data);
}

export function resendCode(dto: ResendCodeDto) {
  return apiClient
    .post<ResendCodeResponse>("/auth/resend-code", dto)
    .then((r) => r.data);
}

export function forgotPassword(dto: ForgotPasswordDto) {
  return apiClient
    .post<ForgotPasswordResponse>("/auth/forgot-password", dto)
    .then((r) => r.data);
}

export function resetPassword(dto: ResetPasswordDto) {
  return apiClient
    .post<ResetPasswordResponse>("/auth/reset-password", dto)
    .then((r) => r.data);
}

export function resendResetCode(dto: ResendResetCodeDto) {
  return apiClient
    .post<ResendResetCodeResponse>("/auth/resend-reset-code", dto)
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
