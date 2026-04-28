"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api/auth.api";
import type { RegisterDto } from "@superstars/shared";

export function useRegister() {
  const router = useRouter();

  return useMutation({
    mutationFn: (dto: RegisterDto) => register(dto),
    // El backend nunca crea el usuario aqui — solo manda un codigo al correo.
    // Redirigir a la pantalla de verificacion con el email en query param.
    onSuccess: (_data, variables) => {
      const email = encodeURIComponent(variables.email.toLowerCase().trim());
      router.push(`/auth/verificar-cuenta?email=${email}`);
    },
  });
}
