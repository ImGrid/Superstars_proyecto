"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/lib/api/auth.api";
import type { ResetPasswordDto } from "@superstars/shared";

// Tras reset exitoso: NO auto-login (recomendacion OWASP). Redirige a login
// con flag para mostrar banner de exito y que el usuario ingrese manualmente
// con su nueva contrasena.
export function useResetPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: (dto: ResetPasswordDto) => resetPassword(dto),
    onSuccess: () => {
      router.push("/auth/login?password-changed=true");
    },
  });
}
