"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Icon } from "@iconify/react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { StateBadge } from "@/components/shared/state-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { StatTile } from "../_components/stat-tile";
import { convocatoriaQueries } from "@/lib/api/query-keys";
import type { ConvocatoriaResultadosResumenItem } from "@superstars/shared";

export default function ResultadosPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery(convocatoriaQueries.resumenResultados());

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full max-w-md" />
        <Skeleton className="h-48" />
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
    <div className="space-y-5">
      <PageHeader
        title="Resultados"
        description="Seguimiento de convocatorias en evaluación y resultados"
      />

      {/* resumen: mismos KPIs compactos que los dashboards (estilo consistente) */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="En evaluación"
          value={enEvaluacion}
          tone="primary"
          icon={<Icon icon="ph:chart-line-up-duotone" className="size-5" />}
        />
        <StatTile
          label="Finalizados"
          value={finalizados}
          tone="success"
          icon={<Icon icon="ph:check-circle-duotone" className="size-5" />}
        />
        <StatTile
          label="Postulaciones calificadas"
          value={totalCalificadas}
          tone="neutral"
          icon={<Icon icon="ph:users-three-duotone" className="size-5" />}
        />
      </div>

      {/* lista de convocatorias como tabla compacta (fila clickeable -> ranking) */}
      {convocatorias.length === 0 ? (
        <EmptyState
          icon="ph:chart-line-up-duotone"
          title="Sin convocatorias en seguimiento"
          description="No hay convocatorias en evaluación o con resultados publicados."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-secondary-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-100 bg-secondary-50 text-left text-xs uppercase tracking-wide text-secondary-500">
                  <th className="px-4 py-2.5 font-medium">Convocatoria</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 text-center font-medium">Ganadores</th>
                  <th className="px-4 py-2.5 font-medium">Calificadas</th>
                  <th className="px-4 py-2.5 text-right font-medium">Promedio</th>
                  <th className="w-10 px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {convocatorias.map((convocatoria) => (
                  <ConvocatoriaRow
                    key={convocatoria.id}
                    convocatoria={convocatoria}
                    onClick={() =>
                      router.push(`/dashboard/resultados/${convocatoria.id}`)
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// fila de convocatoria (toda la fila lleva al ranking)
function ConvocatoriaRow({
  convocatoria,
  onClick,
}: {
  convocatoria: ConvocatoriaResultadosResumenItem;
  onClick: () => void;
}) {
  const progreso =
    convocatoria.totalPostulaciones > 0
      ? Math.round(
          (convocatoria.totalCalificadas / convocatoria.totalPostulaciones) * 100,
        )
      : 0;

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer border-b border-secondary-50 last:border-0 hover:bg-secondary-50/60"
    >
      <td className="px-4 py-3">
        <span className="font-medium text-primary-700">{convocatoria.nombre}</span>
      </td>
      <td className="px-4 py-3">
        <StateBadge tipo="convocatoria" valor={convocatoria.estado} />
      </td>
      <td className="px-4 py-3 text-center tabular-nums">
        {convocatoria.totalGanadores > 0 ? (
          <span className="font-semibold text-secondary-900">
            {convocatoria.totalGanadores}
          </span>
        ) : (
          <span className="text-secondary-300">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary-100">
            <div
              className="h-full rounded-full bg-primary-600"
              style={{ width: `${progreso}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-secondary-500">
            {convocatoria.totalCalificadas} / {convocatoria.totalPostulaciones}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {convocatoria.promedioCalificadas !== null ? (
          <>
            <span className="font-semibold text-secondary-900">
              {convocatoria.promedioCalificadas.toFixed(1)}
            </span>{" "}
            <span className="text-xs text-secondary-400">pts</span>
          </>
        ) : (
          <span className="text-secondary-300">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <ChevronRight className="ml-auto size-4 text-secondary-400" />
      </td>
    </tr>
  );
}
