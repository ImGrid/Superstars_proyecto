"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Calendar, DollarSign, ArrowRight } from "lucide-react";
import type { EvaluadorConvocatoriaItem } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StateBadge } from "@/components/shared/state-badge";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { evaluacionQueries } from "@/lib/api/query-keys";
import { formatDate, formatMoney } from "@/lib/format";

export default function MisEvaluacionesPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery(evaluacionQueries.misConvocatorias());

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mis Evaluaciones" description="Cargando..." />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const convocatorias = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis Evaluaciones"
        description="Convocatorias donde estás asignado como evaluador."
      />

      {convocatorias.length === 0 ? (
        <EmptyState
          icon="ph:clipboard-text-duotone"
          title="Sin convocatorias asignadas"
          description="Aún no te han asignado como evaluador en ninguna convocatoria."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {convocatorias.map((c) => (
            <ConvocatoriaEvaluadorCard
              key={c.id}
              convocatoria={c}
              onClick={() => router.push(`/dashboard/mis-evaluaciones/${c.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ConvocatoriaEvaluadorCard({
  convocatoria,
  onClick,
}: {
  convocatoria: EvaluadorConvocatoriaItem;
  onClick: () => void;
}) {
  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight line-clamp-2">
            {convocatoria.nombre}
          </CardTitle>
          <StateBadge tipo="convocatoria" valor={convocatoria.estado} />
        </div>
        {convocatoria.descripcion && (
          <CardDescription className="line-clamp-2">
            {convocatoria.descripcion}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <div className="flex items-center gap-4 text-sm text-secondary-500">
          <div className="flex items-center gap-1">
            <DollarSign className="size-3.5" />
            {formatMoney(convocatoria.monto)}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="size-3.5" />
            {formatDate(convocatoria.fechaCierrePostulacion)}
          </div>
        </div>
        <div className="text-xs text-secondary-400">
          Asignado el {formatDate(convocatoria.asignadoEn)}
        </div>
      </CardContent>
      <div className="px-6 pb-4">
        <Button variant="outline" className="w-full gap-2" size="sm">
          Ver postulaciones
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </Card>
  );
}
