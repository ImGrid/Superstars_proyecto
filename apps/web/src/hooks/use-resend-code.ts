"use client";

import { useMutation } from "@tanstack/react-query";
import { resendCode } from "@/lib/api/auth.api";
import type { ResendCodeDto } from "@superstars/shared";

// Hook para reenviar el codigo de verificacion. La gestion del cooldown UI
// y los errores tipados (MAX_RESENDS, COOLDOWN_ACTIVE, RATE_LIMITED) los
// maneja el componente que lo consume.
export function useResendCode() {
  return useMutation({
    mutationFn: (dto: ResendCodeDto) => resendCode(dto),
  });
}
