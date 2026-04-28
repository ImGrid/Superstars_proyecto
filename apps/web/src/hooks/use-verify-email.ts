"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { verifyEmail } from "@/lib/api/auth.api";
import type { VerifyEmailDto } from "@superstars/shared";

export function useVerifyEmail() {
  const router = useRouter();

  return useMutation({
    mutationFn: (dto: VerifyEmailDto) => verifyEmail(dto),
    // Al verificarse correctamente: el usuario ya existe en BD.
    // Redirigir a login con flag para mostrar banner de exito.
    onSuccess: () => {
      router.push("/auth/login?verified=true");
    },
  });
}
