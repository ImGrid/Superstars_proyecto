"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Icon } from "@iconify/react";
import { RolUsuario, EstadoPostulacion } from "@superstars/shared";
import type { PostulacionListItem } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/hooks/use-auth";
import { postulacionQueries, empresaQueries, concursoQueries } from "@/lib/api/query-keys";

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

  // proponente ve su dashboard personalizado
  if (user.rol === RolUsuario.PROPONENTE) {
    return <DashboardProponente nombre={user.nombre} />;
  }

  // admin y responsable ven el dashboard generico (se puede expandir despues)
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Bienvenido, ${user.nombre}`}
      />
    </div>
  );
}

// dashboard especifico para proponente
function DashboardProponente({ nombre }: { nombre: string }) {
  const router = useRouter();

  // cargar datos en paralelo
  const { data: postulaciones, isLoading: loadingPost } = useQuery(
    postulacionQueries.myList(),
  );
  const { data: empresa, isLoading: loadingEmp } = useQuery({
    ...empresaQueries.me(),
    retry: false,
  });
  const { data: concursosData, isLoading: loadingConc } = useQuery(
    concursoQueries.list({ page: 1, limit: 1 }),
  );

  // contadores de postulaciones por estado
  const counts = getPostulacionCounts(postulaciones ?? []);
  const totalConcursos = concursosData?.total ?? 0;
  const hasEmpresa = !!empresa;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hola, ${nombre}`}
        description="Este es tu panel de control. Aqui puedes ver el resumen de tu actividad."
      />

      {/* alerta si no tiene empresa */}
      {!loadingEmp && !hasEmpresa && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <Icon icon="ph:warning-duotone" className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Registra tu empresa para poder postularte
            </p>
            <p className="mt-0.5 text-sm text-amber-700">
              Necesitas completar los datos de tu empresa antes de postularte a un concurso.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => router.push("/dashboard/mi-empresa")}
            >
              <Icon icon="ph:building-office-duotone" className="size-4" />
              Registrar empresa
            </Button>
          </div>
        </div>
      )}

      {/* cards resumen */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* concursos disponibles */}
        <SummaryCard
          title="Concursos disponibles"
          value={loadingConc ? null : String(totalConcursos)}
          description="Concursos abiertos para postularte"
          icon={<Icon icon="ph:trophy-duotone" className="size-5 text-primary-600" />}
          action={
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => router.push("/dashboard/concursos")}
            >
              Ver concursos
              <ArrowRight className="size-3" />
            </Button>
          }
        />

        {/* mis postulaciones */}
        <SummaryCard
          title="Mis postulaciones"
          value={loadingPost ? null : String(postulaciones?.length ?? 0)}
          description={
            counts.borrador > 0
              ? `${counts.borrador} en borrador`
              : "Total de postulaciones"
          }
          icon={<Icon icon="ph:file-text-duotone" className="size-5 text-primary-600" />}
          action={
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => router.push("/dashboard/mis-postulaciones")}
            >
              Ver postulaciones
              <ArrowRight className="size-3" />
            </Button>
          }
        />

        {/* mi empresa */}
        <SummaryCard
          title="Mi empresa"
          value={loadingEmp ? null : (hasEmpresa ? empresa.razonSocial ?? "Registrada" : "Sin registrar")}
          description={hasEmpresa ? "Datos de empresa completos" : "Completa el registro"}
          icon={<Icon icon="ph:building-office-duotone" className="size-5 text-primary-600" />}
          action={
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => router.push("/dashboard/mi-empresa")}
            >
              {hasEmpresa ? "Ver empresa" : "Registrar"}
              <ArrowRight className="size-3" />
            </Button>
          }
        />
      </div>

      {/* alertas de postulaciones observadas */}
      {counts.observado > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <Icon icon="ph:warning-duotone" className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Tienes {counts.observado} postulacion{counts.observado !== 1 && "es"} con observaciones
            </p>
            <p className="mt-0.5 text-sm text-amber-700">
              Un responsable ha revisado tu postulacion y solicita cambios. Revisa las observaciones y corrige.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => router.push("/dashboard/mis-postulaciones")}
            >
              Ver postulaciones observadas
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// card de resumen reutilizable
function SummaryCard({
  title,
  value,
  description,
  icon,
  action,
}: {
  title: string;
  value: string | null;
  description: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-secondary-600">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {value === null ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-2xl font-bold text-secondary-900">{value}</p>
        )}
        <CardDescription className="mt-1">{description}</CardDescription>
        {action && <div className="mt-3">{action}</div>}
      </CardContent>
    </Card>
  );
}

// contadores de postulaciones por estado
function getPostulacionCounts(postulaciones: PostulacionListItem[]) {
  return {
    borrador: postulaciones.filter(
      (p) => p.estado === EstadoPostulacion.BORRADOR,
    ).length,
    enviado: postulaciones.filter(
      (p) => p.estado === EstadoPostulacion.ENVIADO,
    ).length,
    observado: postulaciones.filter(
      (p) => p.estado === EstadoPostulacion.OBSERVADO,
    ).length,
    ganador: postulaciones.filter(
      (p) => p.estado === EstadoPostulacion.GANADOR,
    ).length,
  };
}
