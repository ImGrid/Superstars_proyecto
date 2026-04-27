"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Icon } from "@iconify/react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { EstadoConcurso } from "@superstars/shared";
import type {
  ResponsablePostulacionPendiente,
  ResponsableCalificacionPendiente,
  ResponsableConcursoResumenItem,
} from "@superstars/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StateBadge } from "@/components/shared/state-badge";
import { PageHeader } from "@/components/shared/page-header";
import { dashboardQueries } from "@/lib/api/query-keys";
import { formatShortMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import { KpiCard } from "./kpi-card";
import { DashboardSkeleton } from "./dashboard-skeleton";

// labels legibles para los estados de postulacion en el grafico
const estadoPostulacionLabels: Record<string, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  observado: "Observado",
  rechazado: "Rechazado",
  en_evaluacion: "En evaluación",
  calificado: "Calificado",
  ganador: "Ganador",
  no_seleccionado: "No seleccionado",
};

// colores del grafico alineados con la paleta del proyecto
const estadoPostulacionColors: Record<string, string> = {
  borrador: "#94a3b8",
  enviado: "#0d2b5b",
  observado: "#d4880c",
  rechazado: "#dc2626",
  en_evaluacion: "#0b244e",
  calificado: "#475569",
  ganador: "#3a893d",
  no_seleccionado: "#cbd5e1",
};

// dias transcurridos desde una fecha ISO
function daysSince(isoDate: string): number {
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// devuelve el badge segun urgencia (escalacion visual NN/G + Smashing)
function urgenciaBadge(dias: number) {
  if (dias >= 14) {
    return (
      <Badge className="border-transparent bg-error-100 text-error-700">
        Hace {dias} días
      </Badge>
    );
  }
  if (dias >= 7) {
    return (
      <Badge className="border-transparent bg-warning-100 text-warning-700">
        Hace {dias} días
      </Badge>
    );
  }
  return (
    <span className="text-xs text-secondary-500">
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

  // construir datos del pie chart solo con estados con valor > 0
  const distribucionData = Object.entries(data.distribucionEstadosPostulaciones)
    .filter(([, total]) => total > 0)
    .map(([estado, total]) => ({
      name: estadoPostulacionLabels[estado] ?? estado,
      value: total,
      estado,
    }));

  // alertas a mostrar arriba (solo aparecen si hay algo concreto que avisar)
  const tieneAlertasUrgentes =
    data.concursosProximosACerrar > 0 ||
    data.postulacionesPendientesLista.some((p) => daysSince(p.fechaEnvio) >= 7);

  // descripcion contextual del header segun el trabajo pendiente total
  const trabajoTotal =
    data.postulacionesPorRevisar + data.calificacionesPorAprobar;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hola, ${nombre}`}
        description={
          trabajoTotal > 0
            ? `Tenés ${trabajoTotal} ${trabajoTotal === 1 ? "tarea" : "tareas"} pendientes hoy`
            : "Estás al día con tus tareas"
        }
      />

      {/* alertas urgentes solo si hay algo accionable */}
      {tieneAlertasUrgentes && (
        <AlertasUrgentes
          concursosProximos={data.concursosProximosACerrar}
          postulacionesViejas={
            data.postulacionesPendientesLista.filter(
              (p) => daysSince(p.fechaEnvio) >= 7,
            ).length
          }
        />
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Mis concursos"
          value={data.totalMisConcursos}
          description={
            data.misConcursosActivos > 0
              ? `${data.misConcursosActivos} ${data.misConcursosActivos === 1 ? "activo" : "activos"}`
              : "Ninguno activo"
          }
          icon={<Icon icon="ph:trophy-duotone" className="size-5" />}
          accent="primary"
          href="/dashboard/concursos"
        />
        <KpiCard
          title="Por revisar"
          value={data.postulacionesPorRevisar}
          description="Postulaciones esperando aprobación"
          icon={<Icon icon="ph:envelope-open-duotone" className="size-5" />}
          accent={data.postulacionesPorRevisar > 0 ? "warning" : "primary"}
        />
        <KpiCard
          title="Por aprobar"
          value={data.calificacionesPorAprobar}
          description="Calificaciones de evaluadores"
          icon={<Icon icon="ph:check-square-duotone" className="size-5" />}
          accent={data.calificacionesPorAprobar > 0 ? "warning" : "primary"}
        />
        <KpiCard
          title="Próximos cierres"
          value={data.concursosProximosACerrar}
          description="Concursos cierran en 7 días"
          icon={<Icon icon="ph:clock-countdown-duotone" className="size-5" />}
          accent={data.concursosProximosACerrar > 0 ? "error" : "primary"}
        />
      </div>

      {/* inbox de tareas: postulaciones por revisar + calificaciones por aprobar */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PostulacionesPendientesCard items={data.postulacionesPendientesLista} />
        <CalificacionesPendientesCard items={data.calificacionesPendientesLista} />
      </div>

      {/* mis concursos en curso (cards) */}
      <ConcursosResumenSection items={data.misConcursosResumen} />

      {/* grafico de distribucion */}
      {distribucionData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Distribución de postulaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={distribucionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={2}
                  dataKey="value"
                  label={(entry) =>
                    `${entry.name ?? ""}: ${entry.value ?? 0}`
                  }
                  labelLine={false}
                >
                  {distribucionData.map((entry) => (
                    <Cell
                      key={entry.estado}
                      fill={estadoPostulacionColors[entry.estado] ?? "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// banda de alertas urgentes (solo si hay algo)
function AlertasUrgentes({
  concursosProximos,
  postulacionesViejas,
}: {
  concursosProximos: number;
  postulacionesViejas: number;
}) {
  const mensajes: string[] = [];
  if (concursosProximos > 0) {
    mensajes.push(
      `${concursosProximos} ${concursosProximos === 1 ? "concurso cierra" : "concursos cierran"} esta semana`,
    );
  }
  if (postulacionesViejas > 0) {
    mensajes.push(
      `${postulacionesViejas} ${postulacionesViejas === 1 ? "postulación lleva" : "postulaciones llevan"} más de 7 días esperando revisión`,
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning-300 bg-warning-50 p-4">
      <Icon
        icon="ph:warning-duotone"
        className="mt-0.5 size-5 shrink-0 text-warning-600"
      />
      <div className="flex-1 text-sm">
        <p className="font-medium text-warning-700">Atención requerida</p>
        <ul className="mt-1 space-y-0.5 text-warning-700">
          {mensajes.map((m) => (
            <li key={m}>• {m}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// card con la lista de postulaciones esperando revision (max 10 del backend)
function PostulacionesPendientesCard({
  items,
}: {
  items: ResponsablePostulacionPendiente[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Postulaciones por revisar</CardTitle>
        <Badge variant="secondary" className="font-normal">
          {items.length}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <EmptyTaskState
            icon="ph:check-circle-duotone"
            title="¡Estás al día!"
            description="No hay postulaciones esperando revisión en este momento."
          />
        ) : (
          <>
            {items.map((p) => {
              const dias = daysSince(p.fechaEnvio);
              return (
                <Link
                  key={p.postulacionId}
                  href={`/dashboard/concursos/${p.concursoId}/postulaciones/${p.postulacionId}`}
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
                      {p.concursoNombre}
                    </p>
                  </div>
                  <div className="shrink-0">{urgenciaBadge(dias)}</div>
                </Link>
              );
            })}
            <Link
              href="/dashboard/postulaciones?estado=enviado"
              className="block pt-1 text-center text-sm font-medium text-primary-700 hover:text-primary-800"
            >
              Ver todas →
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// card con la lista de calificaciones esperando aprobacion (max 10 del backend)
function CalificacionesPendientesCard({
  items,
}: {
  items: ResponsableCalificacionPendiente[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Calificaciones por aprobar</CardTitle>
        <Badge variant="secondary" className="font-normal">
          {items.length}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <EmptyTaskState
            icon="ph:check-circle-duotone"
            title="Sin calificaciones pendientes"
            description="Te avisaremos cuando los evaluadores envíen sus calificaciones."
          />
        ) : (
          <>
            {items.map((c) => {
              const dias = daysSince(c.fechaCompletada);
              return (
                <Link
                  key={c.calificacionId}
                  href={`/dashboard/concursos/${c.concursoId}/postulaciones/${c.postulacionId}/calificaciones/${c.calificacionId}`}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-secondary-50"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-100">
                    <Icon
                      icon="ph:star-duotone"
                      className="size-4 text-primary-700"
                    />
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
                  <div className="shrink-0">{urgenciaBadge(dias)}</div>
                </Link>
              );
            })}
            <Link
              href="/dashboard/concursos"
              className="block pt-1 text-center text-sm font-medium text-primary-700 hover:text-primary-800"
            >
              Ver todas →
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// resumen de mis concursos como cards con barras de progreso
function ConcursosResumenSection({
  items,
}: {
  items: ResponsableConcursoResumenItem[];
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyTaskState
            icon="ph:trophy-duotone"
            title="No tenés concursos asignados"
            description="Cuando un administrador te asigne como responsable de un concurso, aparecerá aquí."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/concursos">Ver concursos</Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mis concursos</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {items.map((c) => (
          <ConcursoMiniCard key={c.id} concurso={c} />
        ))}
      </CardContent>
    </Card>
  );
}

// card individual de concurso con progreso de postulaciones y calificaciones
function ConcursoMiniCard({
  concurso,
}: {
  concurso: ResponsableConcursoResumenItem;
}) {
  const progresoPost =
    concurso.totalPostulaciones > 0
      ? Math.round(
          (concurso.postulacionesAprobadas / concurso.totalPostulaciones) * 100,
        )
      : 0;
  const progresoCalif =
    concurso.totalCalificaciones > 0
      ? Math.round(
          (concurso.calificacionesAprobadas / concurso.totalCalificaciones) *
            100,
        )
      : 0;

  return (
    <Link
      href={`/dashboard/concursos/${concurso.id}`}
      className="block rounded-lg border p-4 transition-colors hover:bg-secondary-50"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-semibold text-secondary-900">
          {concurso.nombre}
        </h3>
        <StateBadge tipo="concurso" valor={concurso.estado as EstadoConcurso} />
      </div>

      <div className="mt-3 space-y-2 text-xs">
        {/* progreso postulaciones */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-secondary-600">Postulaciones aprobadas</span>
            <span className="font-medium text-secondary-900">
              {concurso.postulacionesAprobadas}/{concurso.totalPostulaciones}
            </span>
          </div>
          <ProgressBar value={progresoPost} />
        </div>

        {/* progreso calificaciones (solo si ya hay alguna) */}
        {concurso.totalCalificaciones > 0 && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-secondary-600">Calificaciones aprobadas</span>
              <span className="font-medium text-secondary-900">
                {concurso.calificacionesAprobadas}/{concurso.totalCalificaciones}
              </span>
            </div>
            <ProgressBar value={progresoCalif} accent="success" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-secondary-500">
        <span>
          {concurso.diasParaCerrar !== null
            ? concurso.diasParaCerrar > 0
              ? `Cierra en ${concurso.diasParaCerrar} días`
              : "Cerrado"
            : `Cierre: ${formatShortMonth(concurso.fechaCierreReal)}`}
        </span>
        {concurso.postulacionesEnviadas > 0 && (
          <Badge className="border-transparent bg-warning-100 text-warning-700">
            {concurso.postulacionesEnviadas} sin revisar
          </Badge>
        )}
      </div>
    </Link>
  );
}

// barra de progreso simple
function ProgressBar({
  value,
  accent = "primary",
}: {
  value: number;
  accent?: "primary" | "success";
}) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary-100">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          accent === "success" ? "bg-success-600" : "bg-primary-600",
        )}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// empty state inline (para secciones donde no hay nada que mostrar pero no debe verse como error)
function EmptyTaskState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-success-100">
        <Icon icon={icon} className="size-6 text-success-700" />
      </div>
      <p className="mt-3 text-sm font-medium text-secondary-900">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-secondary-500">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

