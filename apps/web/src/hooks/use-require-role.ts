"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RolUsuario } from "@superstars/shared";
import { useAuth } from "./use-auth";
import { getDefaultRoute } from "@/lib/auth/route-config";

// redirige si el usuario no tiene uno de los roles requeridos
export function useRequireRole(roles: RolUsuario[]) {
  const { data: user, isLoading, isError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (isError || !user) {
      router.replace("/auth/login");
      return;
    }

    if (!roles.includes(user.rol)) {
      router.replace(getDefaultRoute(user.rol));
    }
  }, [user, isLoading, isError, roles, router]);

  const isAuthorized = !isLoading && !!user && roles.includes(user.rol);

  return { user, isLoading, isAuthorized };
}
