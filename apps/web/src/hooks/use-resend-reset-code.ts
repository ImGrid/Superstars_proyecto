"use client";

import { useMutation } from "@tanstack/react-query";
import { resendResetCode } from "@/lib/api/auth.api";
import type { ResendResetCodeDto } from "@superstars/shared";

// Hook para reenviar el codigo de reset. La gestion del cooldown UI y los
// errores tipados (MAX_RESENDS, COOLDOWN_ACTIVE, RATE_LIMITED) los maneja el
// componente que lo consume.
export function useResendResetCode() {
  return useMutation({
    mutationFn: (dto: ResendResetCodeDto) => resendResetCode(dto),
  });
}
