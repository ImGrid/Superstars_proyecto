"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { forgotPassword } from "@/lib/api/auth.api";
import type { ForgotPasswordDto } from "@superstars/shared";

// Tras solicitud de reset: redirige a la pantalla de codigo + nueva password
// con el email en query param. Si el correo no esta registrado el server
// responde igual (anti-enumeration), el usuario llega a la siguiente pantalla
// igual y solo descubre el estado real al revisar su bandeja.
export function useForgotPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: (dto: ForgotPasswordDto) => forgotPassword(dto),
    onSuccess: (_data, variables) => {
      const email = encodeURIComponent(variables.email.toLowerCase().trim());
      router.push(`/auth/restablecer-password?email=${email}`);
    },
  });
}
