"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Icon } from "@iconify/react";
import type {
  EvaluadorPostulacionPendiente,
  EvaluadorCalificacionDevuelta,
  EvaluadorConvocatoriaProgreso,
} from "@superstars/shared";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { dashboardQueries } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";
import { StatTile } from "./stat-tile";
import { Panel, PanelHeader } from "./panel";
import { AlDiaStrip } from "./al-dia-strip";
import { DashboardSkeleton } from "./dashboard-skeleton";

interface Props {
  nombre: string;
}

export function EvaluadorDashboard({ nombre }: Props) {
  const { data, isLoading } = useQuery(dashboardQueries.evaluador());

  if (isLoading || !data) {
    return <DashboardSkeleton kpiCount={4} />;
  }

  // total de items de trabajo = suma de todos los estados. NO usamos totalAsignadas
  // como denominador: las calificaciones (nivel 2) pueden superar a las asignaciones
  // vigentes y dar progresos imposibles (> 100%). La suma de estados siempre es
  // >= lo hecho, asi que el porcentaje queda consistente.
  const totalTrabajo = (c: EvaluadorConvocatoriaProgreso) =>
    c.pendientes + c.enProgreso + c.completadas + c.aprobadas + c.devueltas;

  const totalItems = data.progresoPorConvocatoria.reduce((a, c) => a + totalTrabajo(c), 0);
  const hechas = data.progresoPorConvocatoria.reduce(
    (a, c) => a + c.completadas + c.aprobadas,
    0,
  );
  const pctProgreso = totalItems > 0 ? Math.round((hechas / totalItems) * 100) : 0;

  // solo las convocatorias donde el evaluador tiene trabajo (asignado o calificado)
  const convocatoriasConTrabajo = data.progresoPorConvocatoria.filter(
    (c) => totalTrabajo(c) > 0,
  );

  const descripcion =
    data.postulacionesPorCalificar > 0
      ? `Tienes ${data.postulacionesPorCalificar} ${data.postulacionesPorCalificar === 1 ? "postulación" : "postulaciones"} por calificar`
      : data.calificacionesDevueltas > 0
        ? `Tienes ${data.calificacionesDevueltas} ${data.calificacionesDevueltas === 1 ? "calificación devuelta" : "calificaciones devueltas"} para corregir`
        : "Estás al día con tus evaluaciones";

  return (
    <div className="space-y-4">
      <PageHeader title={`Hola, ${nombre}`} description={descripcion} />

      {/* devueltas: lo mas urgente, arriba */}
      {data.calificacionesDevueltas > 0 && (
        <DevolucionesAlerta
          items={data.calificacionesDevueltasLista}
          total={data.calificacionesDevueltas}
        />
      )}

      {/* KPIs compactos */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Por calificar"
          value={data.postulacionesPorCalificar}
          tone={data.postulacionesPorCalificar > 0 ? "warning" : "neutral"}
          icon={<Icon icon="ph:star-duotone" className="size-5" />}
          foot={data.postulacionesPorCalificar > 0 ? "requiere tu acción" : "nada pendiente"}
          footTone={data.postulacionesPorCalificar > 0 ? "warning" : "neutral"}
        />
        <StatTile
          label="Devueltas"
          value={data.calificacionesDevueltas}
          tone={data.calificacionesDevueltas > 0 ? "error" : "neutral"}
          icon={<Icon icon="ph:arrow-u-down-left-duotone" className="size-5" />}
          foot={data.calificacionesDevueltas > 0 ? "para corregir" : "ninguna"}
          footTone={data.calificacionesDevueltas > 0 ? "error" : "neutral"}
        />
        <StatTile
          label="Aprobadas"
          value={data.calificacionesAprobadas}
          tone="success"
          icon={<Icon icon="ph:check-circle-duotone" className="size-5" />}
          foot="finalizadas"
          footTone="success"
        />
        <StatTile
          label="Mi progreso"
          value={totalItems > 0 ? `${hechas}/${totalItems}` : "—"}
          tone="primary"
          icon={<Icon icon="ph:chart-pie-slice-duotone" className="size-5" />}
          foot={totalItems > 0 ? `${pctProgreso}% hecho` : "sin asignaciones"}
          footTone="neutral"
        />
      </div>

      {/* cola de trabajo, o franja compacta si esta al dia */}
      {data.postulacionesPorCalificarLista.length > 0 ? (
        <PorCalificarCard
          items={data.postulacionesPorCalificarLista}
          total={data.postulacionesPorCalificar}
        />
      ) : (
        <AlDiaStrip
          titulo="Estás al día"
          detalle={`no tienes postulaciones por calificar · ${data.calificacionesAprobadas} aprobadas en total`}
          ctaLabel="Ver mis evaluaciones"
          ctaHref="/dashboard/mis-evaluaciones"
        />
      )}

      {/* progreso por convocatoria */}
      {convocatoriasConTrabajo.length > 0 && (
        <ProgresoCard items={convocatoriasConTrabajo} />
      )}
    </div>
  );
}

// alerta compacta de calificaciones devueltas (con el comentario del responsable)
function DevolucionesAlerta({
  items,
  total,
}: {
  items: EvaluadorCalificacionDevuelta[];
  total: number;
}) {
  return (
    <div className="rounded-lg border border-warning-500/30 bg-warning-50 p-3">
      <div className="flex items-center gap-2">
        <Icon icon="ph:arrow-u-down-left-duotone" className="size-4 shrink-0 text-warning-700" />
        <p className="text-sm font-semibold text-warning-700">
          {total === 1
            ? "1 calificación devuelta para corregir"
            : `${total} calificaciones devueltas para corregir`}
        </p>
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {items.slice(0, 3).map((c) => (
          <Link
            key={c.calificacionId}
            href={`/dashboard/mis-evaluaciones/${c.categoriaId}/${c.postulacionId}`}
            className="rounded-md border border-warning-200 bg-white px-3 py-2 transition-colors hover:bg-warning-50"
          >
            <p className="truncate text-sm font-medium text-secondary-900">
              {c.empresaNombre}
            </p>
            <p className="truncate text-xs text-secondary-500">{c.convocatoriaNombre}</p>
            {c.comentarioResponsable && (
              <p className="mt-1 line-clamp-2 text-xs italic text-secondary-700">
                &ldquo;{c.comentarioResponsable}&rdquo;
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

// cola de postulaciones por calificar
function PorCalificarCard({
  items,
  total,
}: {
  items: EvaluadorPostulacionPendiente[];
  total: number;
}) {
  return (
    <Panel>
      <PanelHeader
        title="Por calificar"
        right={
          <Badge variant="secondary" className="font-normal">
            {total}
          </Badge>
        }
      />
      <div className="flex flex-col gap-1.5 p-3">
        {items.map((p) => (
          <Link
            key={p.postulacionId}
            href={`/dashboard/mis-evaluaciones/${p.categoriaId}/${p.postulacionId}`}
            className="flex items-center gap-3 rounded-lg border border-secondary-100 px-3 py-2 transition-colors hover:border-secondary-200 hover:bg-secondary-50"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-100">
              <Icon icon="ph:building-office-duotone" className="size-4 text-primary-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-secondary-900">
                {p.empresaNombre}
              </p>
              <p className="truncate text-xs text-secondary-500">{p.convocatoriaNombre}</p>
            </div>
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
            <span className="shrink-0 text-xs font-semibold text-purple-600">
              {p.estadoCalificacion === "en_progreso" ? "Continuar →" : "Calificar →"}
            </span>
          </Link>
        ))}
        {total > items.length && (
          <Link
            href="/dashboard/mis-evaluaciones"
            className="block pt-1 text-center text-sm font-medium text-primary-700 hover:text-primary-800"
          >
            Ver todas →
          </Link>
        )}
      </div>
    </Panel>
  );
}

// progreso por convocatoria (barras compactas)
function ProgresoCard({ items }: { items: EvaluadorConvocatoriaProgreso[] }) {
  return (
    <Panel>
      <PanelHeader title="Mi progreso por convocatoria" />
      <div className="flex flex-col gap-3 p-4">
        {items.map((c) => {
          const total =
            c.pendientes + c.enProgreso + c.completadas + c.aprobadas + c.devueltas;
          const hechas = c.completadas + c.aprobadas;
          const pct = total > 0 ? Math.round((hechas / total) * 100) : 0;
          return (
            <div key={c.convocatoriaId}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium text-secondary-800">
                  {c.convocatoriaNombre}
                </span>
                <span className="shrink-0 font-medium tabular-nums text-secondary-600">
                  {hechas}/{total}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary-100">
                <div
                  className={cn(
                    "h-full rounded-full",
                    pct === 100 ? "bg-success-600" : "bg-primary-600",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-secondary-500">
                {c.pendientes > 0 && <span>{c.pendientes} sin empezar</span>}
                {c.enProgreso > 0 && <span>{c.enProgreso} en progreso</span>}
                {c.aprobadas > 0 && (
                  <span className="text-success-700">{c.aprobadas} aprobadas</span>
                )}
                {c.devueltas > 0 && (
                  <span className="text-warning-700">{c.devueltas} devueltas</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
