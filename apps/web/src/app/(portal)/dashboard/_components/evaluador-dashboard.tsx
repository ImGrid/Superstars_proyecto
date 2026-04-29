"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Icon } from "@iconify/react";
import type {
  EvaluadorPostulacionPendiente,
  EvaluadorCalificacionDevuelta,
  EvaluadorConvocatoriaProgreso,
} from "@superstars/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { dashboardQueries } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";
import { KpiCard } from "./kpi-card";
import { DashboardSkeleton } from "./dashboard-skeleton";

interface Props {
  nombre: string;
}

export function EvaluadorDashboard({ nombre }: Props) {
  const { data, isLoading } = useQuery(dashboardQueries.evaluador());

  if (isLoading || !data) {
    return <DashboardSkeleton kpiCount={3} />;
  }

  // descripcion contextual del header
  const descripcion =
    data.postulacionesPorCalificar > 0
      ? `Tenés ${data.postulacionesPorCalificar} ${data.postulacionesPorCalificar === 1 ? "postulación" : "postulaciones"} por calificar`
      : data.calificacionesDevueltas > 0
        ? `Tenés ${data.calificacionesDevueltas} ${data.calificacionesDevueltas === 1 ? "calificación devuelta" : "calificaciones devueltas"} para corregir`
        : "Estás al día con tus evaluaciones";

  return (
    <div className="space-y-6">
      <PageHeader title={`Hola, ${nombre}`} description={descripcion} />

      {/* alerta especial: calificaciones devueltas (alta prioridad) */}
      {data.calificacionesDevueltas > 0 && (
        <DevolucionesAlerta
          total={data.calificacionesDevueltas}
          items={data.calificacionesDevueltasLista}
        />
      )}

      {/* KPIs (3 cards) */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          title="Convocatorias asignadas"
          value={data.convocatoriasAsignadas}
          description="Donde sos evaluador"
          icon={<Icon icon="ph:trophy-duotone" className="size-5" />}
          accent="primary"
          href="/dashboard/mis-evaluaciones"
        />
        <KpiCard
          title="Por calificar"
          value={data.postulacionesPorCalificar}
          description="Postulaciones pendientes"
          icon={<Icon icon="ph:star-duotone" className="size-5" />}
          accent={data.postulacionesPorCalificar > 0 ? "warning" : "primary"}
        />
        <KpiCard
          title="Aprobadas"
          value={data.calificacionesAprobadas}
          description="Calificaciones finalizadas"
          icon={<Icon icon="ph:check-circle-duotone" className="size-5" />}
          accent="success"
        />
      </div>

      {/* trabajo pendiente: lista de postulaciones por calificar */}
      <PostulacionesPorCalificarCard items={data.postulacionesPorCalificarLista} />

      {/* progreso por convocatoria (gráfico de barras inline) */}
      {data.progresoPorConvocatoria.length > 0 && (
        <ProgresoPorConvocatoriaCard items={data.progresoPorConvocatoria} />
      )}
    </div>
  );
}

// alerta destacada para calificaciones devueltas (urgente, requiere accion del evaluador)
function DevolucionesAlerta({
  total,
  items,
}: {
  total: number;
  items: EvaluadorCalificacionDevuelta[];
}) {
  return (
    <div className="rounded-lg border border-warning-300 bg-warning-50 p-4">
      <div className="flex items-start gap-3">
        <Icon
          icon="ph:chat-circle-text-duotone"
          className="mt-0.5 size-5 shrink-0 text-warning-600"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-warning-700">
            {total === 1
              ? "1 calificación devuelta para corregir"
              : `${total} calificaciones devueltas para corregir`}
          </p>
          <p className="mt-0.5 text-xs text-warning-700">
            El responsable solicita ajustes antes de aprobar.
          </p>
          <ul className="mt-3 space-y-2">
            {items.slice(0, 3).map((c) => (
              <li
                key={c.calificacionId}
                className="rounded-md border border-warning-200 bg-white p-3"
              >
                <Link
                  href={`/dashboard/mis-evaluaciones/${c.convocatoriaId}/${c.postulacionId}`}
                  className="block"
                >
                  <p className="text-sm font-medium text-secondary-900">
                    {c.empresaNombre}
                  </p>
                  <p className="text-xs text-secondary-500">
                    {c.convocatoriaNombre}
                  </p>
                  {c.comentarioResponsable && (
                    <p className="mt-1.5 line-clamp-2 text-xs italic text-secondary-700">
                      &ldquo;{c.comentarioResponsable}&rdquo;
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// lista de postulaciones que el evaluador debe calificar
function PostulacionesPorCalificarCard({
  items,
}: {
  items: EvaluadorPostulacionPendiente[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Postulaciones por calificar</CardTitle>
        <Badge variant="secondary" className="font-normal">
          {items.length}
        </Badge>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-success-100">
              <Icon
                icon="ph:check-circle-duotone"
                className="size-6 text-success-700"
              />
            </div>
            <p className="mt-3 text-sm font-medium text-secondary-900">
              Sin postulaciones pendientes
            </p>
            <p className="mt-1 max-w-xs text-xs text-secondary-500">
              Tu responsable te asignará trabajo cuando comience la evaluación.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((p) => (
              <Link
                key={p.postulacionId}
                href={`/dashboard/mis-evaluaciones/${p.convocatoriaId}/${p.postulacionId}`}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-secondary-50"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-100">
                  <Icon
                    icon="ph:building-office-duotone"
                    className="size-4 text-primary-700"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-secondary-900">
                    {p.empresaNombre}
                  </p>
                  <p className="truncate text-xs text-secondary-500">
                    {p.convocatoriaNombre}
                  </p>
                </div>
                <div className="shrink-0">
                  {p.estadoCalificacion === "en_progreso" && (
                    <Badge className="border-transparent bg-primary-100 text-primary-700">
                      En progreso
                    </Badge>
                  )}
                  {p.estadoCalificacion === "devuelto" && (
                    <Badge className="border-transparent bg-warning-100 text-warning-700">
                      Devuelta
                    </Badge>
                  )}
                  {p.estadoCalificacion === null && (
                    <Badge variant="outline" className="font-normal">
                      Sin empezar
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
            <Link
              href="/dashboard/mis-evaluaciones"
              className="block pt-1 text-center text-sm font-medium text-primary-700 hover:text-primary-800"
            >
              Ver todas →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// progreso por convocatoria: barlist (mejor que un grafico para listas chicas)
function ProgresoPorConvocatoriaCard({
  items,
}: {
  items: EvaluadorConvocatoriaProgreso[];
}) {
  // calcular el maximo para que las barras sean comparativas
  const maxAsignadas = Math.max(...items.map((i) => i.totalAsignadas), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mi progreso por convocatoria</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((c) => {
          const completadas = c.aprobadas + c.completadas;
          const porcentaje =
            c.totalAsignadas > 0
              ? Math.round((completadas / c.totalAsignadas) * 100)
              : 0;
          const anchoBarra = (c.totalAsignadas / maxAsignadas) * 100;

          return (
            <div key={c.convocatoriaId}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="truncate font-medium text-secondary-900">
                  {c.convocatoriaNombre}
                </span>
                <span className="ml-2 shrink-0 text-secondary-600">
                  {completadas}/{c.totalAsignadas}
                </span>
              </div>
              {/* barra exterior con ancho proporcional al maximo de asignaciones */}
              <div
                className="h-2 overflow-hidden rounded-full bg-secondary-100"
                style={{ width: `${anchoBarra}%`, minWidth: "20%" }}
              >
                <div
                  className={cn(
                    "h-full rounded-full",
                    porcentaje === 100 ? "bg-success-600" : "bg-primary-600",
                  )}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
              {/* breakdown chips */}
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs text-secondary-500">
                {c.pendientes > 0 && (
                  <span>{c.pendientes} sin empezar</span>
                )}
                {c.enProgreso > 0 && (
                  <span>· {c.enProgreso} en progreso</span>
                )}
                {c.aprobadas > 0 && (
                  <span className="text-success-700">
                    · {c.aprobadas} {c.aprobadas === 1 ? "aprobada" : "aprobadas"}
                  </span>
                )}
                {c.devueltas > 0 && (
                  <span className="text-warning-700">
                    · {c.devueltas} {c.devueltas === 1 ? "devuelta" : "devueltas"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

