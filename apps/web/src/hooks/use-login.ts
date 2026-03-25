"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { authQueries } from "@/lib/api/query-keys";
import { login } from "@/lib/api/auth.api";
import type { LoginDto } from "@superstars/shared";

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  return useMutation({
    mutationFn: (dto: LoginDto) => login(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueries.me().queryKey });
      const from = searchParams.get("from") || "/dashboard";
      router.push(from);
    },
  });
}
