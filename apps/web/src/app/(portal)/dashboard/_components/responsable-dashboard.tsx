"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { EstadoConvocatoria } from "@superstars/shared";
import type {
  ResponsableConvocatoriaResumenItem,
} from "@superstars/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StateBadge } from "@/components/shared/state-badge";
import { PageHeader } from "@/components/shared/page-header";
import { dashboardQueries } from "@/lib/api/query-keys";
import { formatShortMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StatTile } from "./stat-tile";
import { Panel, PanelHeader } from "./panel";
import { EstadoPostulacionesBars } from "./estado-postulaciones-bars";
import { DashboardSkeleton } from "./dashboard-skeleton";

// dias transcurridos desde una fecha ISO
function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

// antiguedad de una tarea, con escalado de color por urgencia
function AntiguedadBadge({ dias }: { dias: number }) {
  if (dias >= 14) {
    return <span className="shrink-0 text-xs font-semibold text-error-600">Hace {dias} días</span>;
  }
  if (dias >= 7) {
    return <span className="shrink-0 text-xs font-semibold text-warning-700">Hace {dias} días</span>;
  }
  return (
    <span className="shrink-0 text-xs text-secondary-500">
      {dias === 0 ? "Hoy" : `Hace ${dias} ${dias === 1 ? "día" : "días"}`}
    </span>
  );
}

interface Props {
  nombre: string;
}

export function ResponsableDashboard({ nombre }: Props) {
  const { data, isLoading } = useQuery(dashboardQueries.responsable());

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  const trabajoTotal = data.postulacionesPorRevisar + data.calificacionesPorAprobar;
  const postulacionesViejas = data.postulacionesPendientesLista.filter(
    (p) => daysSince(p.fechaEnvio) >= 7,
  ).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Hola, ${nombre}`}
        description={
          trabajoTotal > 0
            ? `Tienes ${trabajoTotal} ${trabajoTotal === 1 ? "tarea pendiente" : "tareas pendientes"} hoy`
            : "Estás al día con tus tareas"
        }
      />

      {(data.convocatoriasProximasACerrar > 0 || postulacionesViejas > 0) && (
        <AlertasUrgentes
          proximas={data.convocatoriasProximasACerrar}
          viejas={postulacionesViejas}
        />
      )}

      {/* KPIs compactos */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Por revisar"
          value={data.postulacionesPorRevisar}
          tone={data.postulacionesPorRevisar > 0 ? "warning" : "neutral"}
          icon={<Icon icon="ph:envelope-open-duotone" className="size-5" />}
          foot={data.postulacionesPorRevisar > 0 ? "postulaciones" : "nada pendiente"}
          footTone={data.postulacionesPorRevisar > 0 ? "warning" : "neutral"}
        />
        <StatTile
          label="Por aprobar"
          value={data.calificacionesPorAprobar}
          tone={data.calificacionesPorAprobar > 0 ? "warning" : "neutral"}
          icon={<Icon icon="ph:check-square-duotone" className="size-5" />}
          foot={data.calificacionesPorAprobar > 0 ? "calificaciones" : "nada pendiente"}
          footTone={data.calificacionesPorAprobar > 0 ? "warning" : "neutral"}
        />
        <StatTile
          label="Cierra pronto"
          value={data.convocatoriasProximasACerrar}
          tone={data.convocatoriasProximasACerrar > 0 ? "error" : "neutral"}
          icon={<Icon icon="ph:clock-countdown-duotone" className="size-5" />}
          foot={data.convocatoriasProximasACerrar > 0 ? "en ≤7 días" : "ninguna"}
          footTone={data.convocatoriasProximasACerrar > 0 ? "error" : "neutral"}
        />
        <StatTile
          label="Mis convocatorias"
          value={data.totalMisConvocatorias}
          tone="primary"
          icon={<Icon icon="ph:trophy-duotone" className="size-5" />}
          foot={
            data.misConvocatoriasActivas > 0
              ? `${data.misConvocatoriasActivas} ${data.misConvocatoriasActivas === 1 ? "activa" : "activas"}`
              : "ninguna activa"
          }
          footTone="neutral"
          href="/dashboard/convocatorias"
        />
      </div>

      {/* inbox de trabajo */}
      <div className="grid gap-4 lg:grid-cols-2">
        <InboxCard
          title="Por revisar"
          count={data.postulacionesPorRevisar}
          emptyText="No hay postulaciones esperando revisión."
        >
          {data.postulacionesPendientesLista.map((p) => (
            <Link
              key={p.postulacionId}
              href={`/dashboard/convocatorias/${p.convocatoriaId}/postulaciones/${p.postulacionId}`}
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
              <AntiguedadBadge dias={daysSince(p.fechaEnvio)} />
            </Link>
          ))}
        </InboxCard>

        <InboxCard
          title="Por aprobar"
          count={data.calificacionesPorAprobar}
          emptyText="Sin calificaciones esperando aprobación."
        >
          {data.calificacionesPendientesLista.map((c) => (
            <Link
              key={c.calificacionId}
              href={`/dashboard/convocatorias/${c.convocatoriaId}/calificaciones/${c.calificacionId}`}
              className="flex items-center gap-3 rounded-lg border border-secondary-100 px-3 py-2 transition-colors hover:border-secondary-200 hover:bg-secondary-50"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning-100">
                <Icon icon="ph:star-duotone" className="size-4 text-warning-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-secondary-900">
                  {c.empresaNombre}
                </p>
                <p className="truncate text-xs text-secondary-500">
                  Por {c.evaluadorNombre}
                  {c.puntajeTotal !== null && ` · ${c.puntajeTotal} pts`}
                </p>
              </div>
              <AntiguedadBadge dias={daysSince(c.fechaCompletada)} />
            </Link>
          ))}
        </InboxCard>
      </div>

      {/* mis convocatorias */}
      <MisConvocatoriasCard items={data.misConvocatoriasResumen} />

      {/* estado de postulaciones (clickeable -> lista completa de postulaciones) */}
      <Link href="/dashboard/postulaciones" className="block">
        <Panel className="transition-colors hover:border-secondary-300">
          <PanelHeader
            title="Estado de las postulaciones"
            hint="en mis convocatorias"
            right={<span className="text-xs font-medium text-primary-700">Ver todas →</span>}
          />
          <div className="p-4">
            <EstadoPostulacionesBars dist={data.distribucionEstadosPostulaciones} />
          </div>
        </Panel>
      </Link>
    </div>
  );
}

// banda de alertas urgentes (compacta, sin riel de color)
function AlertasUrgentes({ proximas, viejas }: { proximas: number; viejas: number }) {
  const mensajes: string[] = [];
  if (viejas > 0) {
    mensajes.push(
      `${viejas} ${viejas === 1 ? "postulación lleva" : "postulaciones llevan"} más de 7 días esperando revisión`,
    );
  }
  if (proximas > 0) {
    mensajes.push(
      `${proximas} ${proximas === 1 ? "convocatoria cierra" : "convocatorias cierran"} esta semana`,
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning-500/30 bg-warning-50 px-4 py-3">
      <Icon icon="ph:warning-duotone" className="mt-0.5 size-5 shrink-0 text-warning-600" />
      <div className="text-sm">
        <p className="font-semibold text-warning-700">Atención requerida</p>
        <ul className="mt-1 flex flex-col gap-0.5 text-warning-700">
          {mensajes.map((m) => (
            <li key={m}>• {m}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// panel de bandeja: cuando esta vacio muestra una franja compacta, no un card gigante
function InboxCard({
  title,
  count,
  emptyText,
  children,
}: {
  title: string;
  count: number;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <Panel className="h-full">
      <PanelHeader
        title={title}
        right={
          <Badge variant="secondary" className="font-normal">
            {count}
          </Badge>
        }
      />
      {count === 0 ? (
        <div className="flex items-center gap-2 px-4 py-4 text-sm text-secondary-500">
          <Icon icon="ph:check-circle-duotone" className="size-5 shrink-0 text-success-600" />
          {emptyText}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 p-3">{children}</div>
      )}
    </Panel>
  );
}

// resumen de mis convocatorias en mini-cards con progreso
function MisConvocatoriasCard({ items }: { items: ResponsableConvocatoriaResumenItem[] }) {
  if (items.length === 0) {
    return (
      <Panel>
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-secondary-100">
            <Icon icon="ph:trophy-duotone" className="size-6 text-secondary-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-secondary-900">
              No tienes convocatorias vigentes
            </p>
            <p className="mt-1 text-xs text-secondary-500">
              Las convocatorias en curso aparecerán aquí.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/convocatorias">Ver todas las convocatorias</Link>
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader
        title="Convocatorias vigentes"
        right={
          <Link
            href="/dashboard/convocatorias"
            className="text-xs font-medium text-primary-700 hover:text-primary-800"
          >
            Ver todas →
          </Link>
        }
      />
      <div className="grid gap-3 p-3 sm:grid-cols-2">
        {items.map((c) => (
          <ConvocatoriaMini key={c.id} c={c} />
        ))}
      </div>
    </Panel>
  );
}

function ConvocatoriaMini({ c }: { c: ResponsableConvocatoriaResumenItem }) {
  const progPost =
    c.totalPostulaciones > 0
      ? Math.round((c.postulacionesAprobadas / c.totalPostulaciones) * 100)
      : 0;
  const progCalif =
    c.totalCalificaciones > 0
      ? Math.round((c.calificacionesAprobadas / c.totalCalificaciones) * 100)
      : 0;

  return (
    <Link
      href={`/dashboard/convocatorias/${c.id}`}
      className="block rounded-lg border border-secondary-100 p-3 transition-colors hover:border-secondary-200 hover:bg-secondary-50"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-semibold text-secondary-900">{c.nombre}</h3>
        <StateBadge tipo="convocatoria" valor={c.estado as EstadoConvocatoria} />
      </div>

      <div className="mt-2 space-y-1.5 text-xs">
        <div>
          <div className="mb-0.5 flex items-center justify-between">
            <span className="text-secondary-600">Postulaciones aprobadas</span>
            <span className="font-medium tabular-nums text-secondary-900">
              {c.postulacionesAprobadas}/{c.totalPostulaciones}
            </span>
          </div>
          <MiniBar value={progPost} />
        </div>
        {c.totalCalificaciones > 0 && (
          <div>
            <div className="mb-0.5 flex items-center justify-between">
              <span className="text-secondary-600">Calificaciones aprobadas</span>
              <span className="font-medium tabular-nums text-secondary-900">
                {c.calificacionesAprobadas}/{c.totalCalificaciones}
              </span>
            </div>
            <MiniBar value={progCalif} accent="success" />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-secondary-500">
        <span>
          {c.diasParaCerrar !== null
            ? c.diasParaCerrar > 0
              ? `Cierra en ${c.diasParaCerrar} días`
              : "Cerrado"
            : `Cierre: ${formatShortMonth(c.fechaCierreReal)}`}
        </span>
        {c.postulacionesEnviadas > 0 && (
          <Badge className="border-transparent bg-warning-100 text-warning-700">
            {c.postulacionesEnviadas} sin revisar
          </Badge>
        )}
      </div>
    </Link>
  );
}

function MiniBar({ value, accent = "primary" }: { value: number; accent?: "primary" | "success" }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-secondary-100">
      <div
        className={cn(
          "h-full rounded-full",
          accent === "success" ? "bg-success-600" : "bg-primary-600",
        )}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
