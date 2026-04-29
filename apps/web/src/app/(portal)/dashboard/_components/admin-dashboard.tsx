"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Icon } from "@iconify/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import type {
  AdminConvocatoriaResumenItem,
  EstadoConvocatoria,
} from "@superstars/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StateBadge } from "@/components/shared/state-badge";
import { PageHeader } from "@/components/shared/page-header";
import { dashboardQueries } from "@/lib/api/query-keys";
import { KpiCard } from "./kpi-card";
import { DashboardSkeleton } from "./dashboard-skeleton";

// labels legibles para los estados de convocatoria (para el grafico)
const estadoConvocatoriaLabels: Record<string, string> = {
  borrador: "Borrador",
  publicado: "Publicado",
  cerrado: "Cerrado",
  en_evaluacion: "En evaluación",
  resultados_listos: "Resultados",
  finalizado: "Finalizado",
};

// colores alineados con la paleta del proyecto
const estadoConvocatoriaColors: Record<string, string> = {
  borrador: "#94a3b8",
  publicado: "#3a893d",
  cerrado: "#d4880c",
  en_evaluacion: "#0d2b5b",
  resultados_listos: "#7c3aed",
  finalizado: "#475569",
};

// labels y colores para roles de usuario
const rolLabels: Record<string, string> = {
  administrador: "Administradores",
  responsable_convocatoria: "Responsables",
  evaluador: "Evaluadores",
  proponente: "Proponentes",
};

const rolColors: Record<string, string> = {
  administrador: "#0d2b5b",
  responsable_convocatoria: "#0b244e",
  evaluador: "#d4880c",
  proponente: "#3a893d",
};

interface Props {
  nombre: string;
}

export function AdminDashboard({ nombre }: Props) {
  const { data, isLoading } = useQuery(dashboardQueries.admin());

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  // datos para el grafico de convocatorias por estado (solo los que tienen valor > 0)
  const convocatoriasChartData = Object.entries(data.convocatoriasPorEstado)
    .filter(([, total]) => total > 0)
    .map(([estado, total]) => ({
      name: estadoConvocatoriaLabels[estado] ?? estado,
      value: total,
      estado,
    }));

  // datos del grafico de usuarios por rol
  const usuariosChartData = Object.entries(data.usuariosActivosPorRol)
    .filter(([, total]) => total > 0)
    .map(([rol, total]) => ({
      name: rolLabels[rol] ?? rol,
      value: total,
      rol,
    }));

  const tieneAlertas =
    data.alertas.convocatoriasCerradasSinEvaluacion > 0 ||
    data.alertas.convocatoriasSinResponsable > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hola, ${nombre}`}
        description="Resumen del programa SuperImpact360"
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/usuarios">
                <Icon icon="ph:users-duotone" className="size-4" />
                Nuevo usuario
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-orange-600 hover:bg-orange-700">
              <Link href="/dashboard/convocatorias/nuevo">
                <Icon icon="ph:plus-circle-duotone" className="size-4" />
                Nueva convocatoria
              </Link>
            </Button>
          </div>
        }
      />

      {/* alertas operativas */}
      {tieneAlertas && (
        <AlertasAdmin
          convocatoriasCerradasSinEval={data.alertas.convocatoriasCerradasSinEvaluacion}
          convocatoriasSinResponsable={data.alertas.convocatoriasSinResponsable}
        />
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Convocatorias activas"
          value={data.totalConvocatoriasActivas}
          description="En curso o evaluación"
          icon={<Icon icon="ph:trophy-duotone" className="size-5" />}
          accent="primary"
          href="/dashboard/convocatorias"
        />
        <KpiCard
          title="Empresas"
          value={data.totalEmpresas}
          description="Registradas en la plataforma"
          icon={<Icon icon="ph:building-office-duotone" className="size-5" />}
          accent="primary"
        />
        <KpiCard
          title="Postulaciones"
          value={data.totalPostulacionesNoBorrador}
          description="Total enviadas o más allá"
          icon={<Icon icon="ph:file-text-duotone" className="size-5" />}
          accent="primary"
          href="/dashboard/postulaciones"
        />
        <KpiCard
          title="Ganadores"
          value={data.totalGanadoresHistoricos}
          description="Históricos del programa"
          icon={<Icon icon="ph:medal-duotone" className="size-5" />}
          accent="success"
          href="/dashboard/resultados"
        />
      </div>

      {/* convocatorias activas */}
      <ConvocatoriasActivasCard items={data.convocatoriasActivasResumen} />

      {/* graficos lado a lado */}
      <div className="grid gap-4 lg:grid-cols-2">
        {convocatoriasChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Distribución de convocatorias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={convocatoriasChartData}
                  layout="vertical"
                  margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {convocatoriasChartData.map((entry) => (
                      <Cell
                        key={entry.estado}
                        fill={estadoConvocatoriaColors[entry.estado] ?? "#94a3b8"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {usuariosChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usuarios activos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={usuariosChartData}
                  layout="vertical"
                  margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {usuariosChartData.map((entry) => (
                      <Cell
                        key={entry.rol}
                        fill={rolColors[entry.rol] ?? "#94a3b8"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// banda de alertas operativas (solo si hay convocatorias requiriendo accion)
function AlertasAdmin({
  convocatoriasCerradasSinEval,
  convocatoriasSinResponsable,
}: {
  convocatoriasCerradasSinEval: number;
  convocatoriasSinResponsable: number;
}) {
  const mensajes: { texto: string; href?: string }[] = [];
  if (convocatoriasCerradasSinEval > 0) {
    mensajes.push({
      texto: `${convocatoriasCerradasSinEval} ${convocatoriasCerradasSinEval === 1 ? "convocatoria cerrada" : "convocatorias cerradas"} esperando que alguien inicie la evaluación`,
      href: "/dashboard/convocatorias?estado=cerrado",
    });
  }
  if (convocatoriasSinResponsable > 0) {
    mensajes.push({
      texto: `${convocatoriasSinResponsable} ${convocatoriasSinResponsable === 1 ? "convocatoria sin responsable asignado" : "convocatorias sin responsable asignado"}`,
      href: "/dashboard/convocatorias",
    });
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning-300 bg-warning-50 p-4">
      <Icon
        icon="ph:warning-duotone"
        className="mt-0.5 size-5 shrink-0 text-warning-600"
      />
      <div className="flex-1 text-sm">
        <p className="font-medium text-warning-700">Atención requerida</p>
        <ul className="mt-1 space-y-1 text-warning-700">
          {mensajes.map((m) => (
            <li key={m.texto} className="flex items-center gap-2">
              <span>• {m.texto}</span>
              {m.href && (
                <Link
                  href={m.href}
                  className="text-xs font-medium underline hover:text-warning-800"
                >
                  Ver
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// lista de convocatorias activas con acceso directo al detalle
function ConvocatoriasActivasCard({
  items,
}: {
  items: AdminConvocatoriaResumenItem[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Convocatorias activas</CardTitle>
        <Badge variant="secondary" className="font-normal">
          {items.length}
        </Badge>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-secondary-100">
              <Icon
                icon="ph:trophy-duotone"
                className="size-6 text-secondary-400"
              />
            </div>
            <p className="mt-3 text-sm font-medium text-secondary-900">
              No hay convocatorias activas
            </p>
            <p className="mt-1 max-w-sm text-xs text-secondary-500">
              Cuando publiques una convocatoria aparecerá aquí. Empezá creando una.
            </p>
            <Button asChild size="sm" className="mt-4 bg-orange-600 hover:bg-orange-700">
              <Link href="/dashboard/convocatorias/nuevo">Crear primera convocatoria</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/convocatorias/${c.id}`}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-secondary-50"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-100">
                  <Icon
                    icon="ph:trophy-duotone"
                    className="size-4 text-primary-700"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-secondary-900">
                    {c.nombre}
                  </p>
                  <p className="text-xs text-secondary-500">
                    {c.totalPostulaciones}{" "}
                    {c.totalPostulaciones === 1 ? "postulación" : "postulaciones"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {c.diasParaCerrar !== null && c.diasParaCerrar >= 0 && (
                    <DiasParaCerrarBadge dias={c.diasParaCerrar} />
                  )}
                  <StateBadge tipo="convocatoria" valor={c.estado as EstadoConvocatoria} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// badge con dias para cerrar, escalado por urgencia
function DiasParaCerrarBadge({ dias }: { dias: number }) {
  if (dias === 0) {
    return (
      <Badge className="border-transparent bg-error-100 text-error-700">
        Cierra hoy
      </Badge>
    );
  }
  if (dias <= 3) {
    return (
      <Badge className="border-transparent bg-error-100 text-error-700">
        {dias} {dias === 1 ? "día" : "días"}
      </Badge>
    );
  }
  if (dias <= 7) {
    return (
      <Badge className="border-transparent bg-warning-100 text-warning-700">
        {dias} días
      </Badge>
    );
  }
  return null;
}
