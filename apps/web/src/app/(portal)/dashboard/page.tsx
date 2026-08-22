"use client";

import { redirect } from "next/navigation";
import { RolUsuario } from "@superstars/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { AdminDashboard } from "./_components/admin-dashboard";
import { ResponsableDashboard } from "./_components/responsable-dashboard";
import { EvaluadorDashboard } from "./_components/evaluador-dashboard";
import { ProponenteDashboard } from "./_components/proponente-dashboard";

export default function DashboardPage() {
  const { data: user } = useAuth();

  if (!user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  // dashboard especifico por rol
  if (user.rol === RolUsuario.ADMINISTRADOR) {
    return <AdminDashboard nombre={user.nombre} />;
  }
  if (user.rol === RolUsuario.RESPONSABLE_CONVOCATORIA) {
    return <ResponsableDashboard nombre={user.nombre} />;
  }
  if (user.rol === RolUsuario.EVALUADOR) {
    return <EvaluadorDashboard nombre={user.nombre} />;
  }
  // El observador no tiene dashboard: su lugar es el portal de seguimiento. El
  // proxy ya lo redirige antes de llegar aca; esto es defensa en profundidad para
  // que nunca vea por error el dashboard del proponente (que ademas le daria 403).
  if (user.rol === RolUsuario.OBSERVADOR) {
    redirect("/dashboard/seguimiento");
  }
  return <ProponenteDashboard nombre={user.nombre} />;
}
