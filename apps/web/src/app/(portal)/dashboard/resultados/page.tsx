"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { StateBadge } from "@/components/shared/state-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { convocatoriaQueries } from "@/lib/api/query-keys";
import { formatMoney } from "@/lib/format";
import type { ConvocatoriaResultadosResumenItem } from "@superstars/shared";

export default function ResultadosPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery(convocatoriaQueries.resumenResultados());

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const convocatorias = data ?? [];

  // contadores para el resumen superior
  const enEvaluacion = convocatorias.filter(
    (c) => c.estado === "en_evaluacion" || c.estado === "resultados_listos",
  ).length;
  const finalizados = convocatorias.filter((c) => c.estado === "finalizado").length;
  const totalCalificadas = convocatorias.reduce(
    (sum, c) => sum + c.totalCalificadas,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resultados"
        description="Seguimiento de convocatorias en evaluacion y resultados"
      />

      {/* resumen global */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat
          icon={<Icon icon="ph:chart-line-up-duotone" className="size-5 text-primary-600" />}
          label="En evaluacion"
          value={String(enEvaluacion)}
        />
        <MiniStat
          icon={<Icon icon="ph:check-circle-duotone" className="size-5 text-secondary-600" />}
          label="Finalizados"
          value={String(finalizados)}
        />
        <MiniStat
          icon={<Icon icon="ph:users-three-duotone" className="size-5 text-primary-600" />}
          label="Postulaciones calificadas"
          value={String(totalCalificadas)}
        />
      </div>

      {/* lista de convocatorias */}
      {convocatorias.length === 0 ? (
        <EmptyState
          icon="ph:chart-line-up-duotone"
          title="Sin convocatorias en seguimiento"
          description="No hay convocatorias en evaluacion o con resultados publicados."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {convocatorias.map(convocatoria => (
            <ConvocatoriaCard
              key={convocatoria.id}
              convocatoria={convocatoria}
              onVerRanking={() =>
                router.push(`/dashboard/resultados/${convocatoria.id}`)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// card individual por convocatoria
function ConvocatoriaCard({
  convocatoria,
  onVerRanking,
}: {
  convocatoria: ConvocatoriaResultadosResumenItem;
  onVerRanking: () => void;
}) {
  const progreso =
    convocatoria.totalPostulaciones > 0
      ? Math.round(
          (convocatoria.totalCalificadas / convocatoria.totalPostulaciones) * 100,
        )
      : 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">
            {convocatoria.nombre}
          </CardTitle>
          <StateBadge tipo="convocatoria" valor={convocatoria.estado} />
        </div>
        <p className="text-sm text-secondary-500">
          Monto: {formatMoney(convocatoria.monto)}
        </p>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {/* progreso de calificaciones */}
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-secondary-600">Postulaciones calificadas</span>
            <span className="font-medium text-secondary-900">
              {convocatoria.totalCalificadas} / {convocatoria.totalPostulaciones}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary-100">
            <div
              className="h-full rounded-full bg-primary-600 transition-all"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>

        {/* puntaje promedio */}
        {convocatoria.promedioCalificadas !== null && (
          <div className="flex items-center gap-2 text-sm">
            <Icon icon="ph:star-duotone" className="size-4 text-amber-500" />
            <span className="text-secondary-600">Promedio:</span>
            <span className="font-semibold text-secondary-900">
              {convocatoria.promedioCalificadas.toFixed(1)} pts
            </span>
          </div>
        )}

        {/* ganadores si los hay */}
        {convocatoria.totalGanadores > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Icon icon="ph:trophy-duotone" className="size-4 text-amber-500" />
            <span className="text-secondary-600">Ganadores seleccionados:</span>
            <span className="font-semibold text-secondary-900">
              {convocatoria.totalGanadores}
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1"
          onClick={onVerRanking}
        >
          Ver ranking
          <ArrowRight className="size-3" />
        </Button>
      </CardFooter>
    </Card>
  );
}

// stat card pequeno
function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-secondary-600">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-secondary-900">{value}</p>
      </CardContent>
    </Card>
  );
}
