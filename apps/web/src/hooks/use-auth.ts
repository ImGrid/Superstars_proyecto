"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authQueries } from "@/lib/api/query-keys";
import { logout } from "@/lib/api/auth.api";

// usuario autenticado (GET /usuarios/me)
export function useAuth() {
  return useQuery({
    ...authQueries.me(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

// cerrar sesion + limpiar cache + redirigir
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      router.push("/auth/login");
    },
  });
}
