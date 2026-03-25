"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api/auth.api";
import type { RegisterDto } from "@superstars/shared";

export function useRegister() {
  const router = useRouter();

  return useMutation({
    mutationFn: (dto: RegisterDto) => register(dto),
    onSuccess: () => {
      router.push("/auth/login?registered=true");
    },
  });
}
