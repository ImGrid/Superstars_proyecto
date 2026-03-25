"use client";

import type { RolUsuario } from "@superstars/shared";
import { useAuth } from "@/hooks/use-auth";

interface RoleGateProps {
  roles: RolUsuario[];
  children: React.ReactNode;
  // contenido alternativo si no tiene el rol (default: nada)
  fallback?: React.ReactNode;
}

// renderiza children solo si el usuario tiene uno de los roles permitidos
export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const { data: user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user || !roles.includes(user.rol)) return <>{fallback}</>;

  return <>{children}</>;
}
