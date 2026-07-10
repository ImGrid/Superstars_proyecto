"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import {
  EstadoConvocatoria,
  EstadoPostulacion,
  type AdminConvocatoriaResumenItem,
  type AdminCoberturaDepartamentoItem,
  type AdminInclusion,
  type AdminTendenciaMesItem,
} from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StateBadge } from "@/components/shared/state-badge";
import { PageHeader } from "@/components/shared/page-header";
import { dashboardQueries } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";
import { StatTile } from "./stat-tile";
import { Panel, PanelHeader } from "./panel";
import { EstadoPostulacionesBars } from "./estado-postulaciones-bars";
import { BoliviaChoropleth } from "./bolivia-choropleth";
import { DashboardSkeleton } from "./dashboard-skeleton";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatBs(monto: string): string {
  const n = Math.round(Number(monto) || 0);
  return new Intl.NumberFormat("es-BO").format(n);
}

function mesLabel(ym: string): string {
  const m = parseInt(ym.slice(5, 7), 10);
  return MESES[m - 1] ?? ym;
}

interface Props {
  nombre: string;
}

export function AdminDashboard({ nombre }: Props) {
  const router = useRouter();
  const { data, isLoading } = useQuery(dashboardQueries.admin());

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  const faltanDepartamentos = 9 - data.departamentosCubiertos;
  const proximas = data.convocatoriasProximasACerrar;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Hola, ${nombre}`}
        description="Estado del programa SuperImpact360 · Bolivia"
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

      <AttentionStrip
        cerradasSinEval={data.alertas.convocatoriasCerradasSinEvaluacion}
        sinResponsable={data.alertas.convocatoriasSinResponsable}
        proximas={proximas}
      />

      {/* KPIs accionables compactos */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Convocatorias activas"
          value={data.totalConvocatoriasActivas}
          tone="primary"
          icon={<Icon icon="ph:trophy-duotone" className="size-5" />}
          href="/dashboard/convocatorias"
          foot={
            proximas > 0
              ? `${proximas} ${proximas === 1 ? "cierra" : "cierran"} en ≤7 días`
              : "ninguna cierra pronto"
          }
          footTone={proximas > 0 ? "error" : "neutral"}
        />
        <StatTile
          label="Cobertura nacional"
          value={data.departamentosCubiertos}
          unit="/9"
          tone="warning"
          icon={<Icon icon="ph:map-trifold-duotone" className="size-5" />}
          foot={
            faltanDepartamentos > 0
              ? `faltan ${faltanDepartamentos} departamentos`
              : "todo el país cubierto"
          }
          footTone={faltanDepartamentos > 0 ? "warning" : "success"}
        />
        <StatTile
          label="Empresas alcanzadas"
          value={data.totalEmpresas}
          tone="success"
          icon={<Icon icon="ph:buildings-duotone" className="size-5" />}
          href="/dashboard/empresas"
          foot={
            data.empresasNuevasEsteMes > 0
              ? `▲ +${data.empresasNuevasEsteMes} este mes`
              : "sin nuevas este mes"
          }
          footTone={data.empresasNuevasEsteMes > 0 ? "success" : "neutral"}
        />
        <StatTile
          label="Impacto en premios"
          value={formatBs(data.montoComprometidoTotal)}
          unit="Bs"
          tone="orange"
          icon={<Icon icon="ph:medal-duotone" className="size-5" />}
          href="/dashboard/resultados"
          foot={`${data.totalGanadoresHistoricos} ${data.totalGanadoresHistoricos === 1 ? "ganador" : "ganadores"}`}
          footTone="neutral"
        />
      </div>

      {/* cobertura nacional (mapa) + columna derecha (postulaciones + inclusion) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CoberturaCard
            data={data.coberturaNacional}
            faltan={faltanDepartamentos}
            onSelect={() => router.push("/dashboard/empresas")}
          />
        </div>
        <div className="flex flex-col gap-4">
          <PostulacionesEstadoCard
            dist={data.postulacionesPorEstado}
            total={data.totalPostulacionesNoBorrador}
          />
          <InclusionCard inclusion={data.inclusion} />
        </div>
      </div>

      {/* tendencia + convocatorias activas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TendenciaCard serie={data.tendenciaPostulaciones} />
        <ConvocatoriasActivasCard items={data.convocatoriasActivasResumen} />
      </div>
    </div>
  );
}

// ---------- Banda de atencion ----------

function AttentionStrip({
  cerradasSinEval,
  sinResponsable,
  proximas,
}: {
  cerradasSinEval: number;
  sinResponsable: number;
  proximas: number;
}) {
  const mensajes: { texto: string; href: string }[] = [];
  if (cerradasSinEval > 0) {
    mensajes.push({
      texto: `${cerradasSinEval} ${cerradasSinEval === 1 ? "convocatoria cerrada" : "convocatorias cerradas"} esperando iniciar la evaluación`,
      href: "/dashboard/convocatorias?estado=cerrado",
    });
  }
  if (sinResponsable > 0) {
    mensajes.push({
      texto: `${sinResponsable} ${sinResponsable === 1 ? "convocatoria sin responsable" : "convocatorias sin responsable"}`,
      href: "/dashboard/convocatorias",
    });
  }
  if (proximas > 0) {
    mensajes.push({
      texto: `${proximas} ${proximas === 1 ? "convocatoria cierra" : "convocatorias cierran"} en los próximos 7 días`,
      href: "/dashboard/convocatorias",
    });
  }

  if (mensajes.length === 0) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3">
      <Icon icon="ph:warning-duotone" className="mt-0.5 size-5 shrink-0 text-warning-600" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-warning-700">Atención requerida</p>
        <ul className="mt-1 flex flex-col gap-1 text-warning-700">
          {mensajes.map((m) => (
            <li key={m.texto} className="flex items-center gap-2">
              <span>• {m.texto}</span>
              <Link href={m.href} className="text-xs font-semibold underline hover:text-warning-800">
                Ver
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------- Cobertura nacional: mapa + ranking + leyenda ----------

function CoberturaCard({
  data,
  faltan,
  onSelect,
}: {
  data: AdminCoberturaDepartamentoItem[];
  faltan: number;
  onSelect: (slug: string) => void;
}) {
  const ranking = [...data].sort((a, b) => b.total - a.total).filter((d) => d.total > 0);
  const maxTotal = Math.max(1, ...ranking.map((d) => d.total));

  return (
    <Panel className="h-full">
      <PanelHeader title="Cobertura nacional" hint="empresas por departamento" />
      <div className="grid gap-4 p-4 sm:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="mx-auto max-w-[300px]">
            <BoliviaChoropleth data={data} onSelectDepartamento={onSelect} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-secondary-500">
            <LegendItem className="border border-dashed border-warning-500 bg-warning-100" label="Sin empresas" />
            <LegendItem className="bg-primary-200" label="1–2" />
            <LegendItem className="bg-primary-400" label="3–5" />
            <LegendItem className="bg-primary-600" label="6+" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {ranking.map((d) => (
            <div key={d.departamento} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-secondary-700">{d.label}</span>
                <span className="font-semibold tabular-nums text-secondary-900">{d.total}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary-100">
                <div
                  className="h-full rounded-full bg-primary-600"
                  style={{ width: `${(d.total / maxTotal) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {faltan > 0 && (
            <div className="mt-1 flex items-center gap-2 rounded-lg bg-warning-50 px-3 py-2 text-xs font-medium text-warning-700">
              <Icon icon="ph:flag-duotone" className="size-4 shrink-0" />
              {faltan} {faltan === 1 ? "departamento sin empresas aún" : "departamentos sin empresas aún"}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-3 rounded-[3px]", className)} />
      {label}
    </span>
  );
}

// ---------- Estado de las postulaciones (barras) ----------

function PostulacionesEstadoCard({
  dist,
  total,
}: {
  dist: Record<EstadoPostulacion, number>;
  total: number;
}) {
  return (
    <Panel className="h-full">
      <PanelHeader title="Estado de las postulaciones" hint="todo el programa" />
      <div className="flex flex-col gap-2.5 p-4">
        <EstadoPostulacionesBars dist={dist} />
        <p className="mt-1 border-t border-dashed border-secondary-100 pt-2 text-[11px] text-secondary-500">
          {total} enviadas o más allá del borrador
        </p>
      </div>
    </Panel>
  );
}

// ---------- Inclusion (dona) ----------

function InclusionCard({ inclusion }: { inclusion: AdminInclusion }) {
  const totalPersonas = inclusion.empleadasMujeres + inclusion.empleadosHombres;
  const pct = inclusion.pctMujeres;

  return (
    <Panel className="h-full">
      <PanelHeader title="Inclusión" hint="mujeres en las empresas" />
      <div className="flex items-center gap-5 p-4">
        <div
          className="relative grid size-[88px] shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(var(--color-info-600) ${pct}%, var(--color-secondary-200) ${pct}% 100%)`,
          }}
        >
          <div className="grid size-[62px] place-items-center rounded-full bg-white">
            <span className="text-xl font-bold tabular-nums text-secondary-900">{pct}%</span>
            <span className="text-[9px] uppercase tracking-wide text-secondary-400">mujeres</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 text-sm text-secondary-600">
          <p>
            <span className="font-semibold tabular-nums text-secondary-900">
              {inclusion.empleadasMujeres}
            </span>{" "}
            empleadas mujeres de{" "}
            <span className="font-semibold tabular-nums text-secondary-900">{totalPersonas}</span>{" "}
            personas
          </p>
          <p>
            <span className="font-semibold tabular-nums text-secondary-900">
              {inclusion.empresasContactoFemenino} de {inclusion.empresasConContacto}
            </span>{" "}
            empresas con contacto femenino
          </p>
        </div>
      </div>
    </Panel>
  );
}

// ---------- Tendencia (sparkline) ----------

function TendenciaCard({ serie }: { serie: AdminTendenciaMesItem[] }) {
  const maxT = Math.max(1, ...serie.map((s) => s.total));

  return (
    <Panel className="h-full">
      <PanelHeader title="Postulaciones por mes" hint="últimos 6 meses" />
      <div className="p-4">
        <div className="flex h-[88px] items-end gap-2.5">
          {serie.map((s) => {
            const hasData = s.total > 0;
            return (
              <div key={s.mes} className="flex flex-1 flex-col items-center justify-end gap-1">
                <span
                  className={cn(
                    "text-[11px] font-semibold tabular-nums",
                    hasData ? "text-secondary-700" : "text-secondary-300",
                  )}
                >
                  {s.total}
                </span>
                <div
                  className={cn(
                    "w-full max-w-[38px] rounded-t",
                    hasData ? "bg-success-500" : "bg-secondary-100",
                  )}
                  style={{ height: hasData ? `${Math.max((s.total / maxT) * 100, 8)}%` : "4px" }}
                />
                <span className="text-[10px] text-secondary-400">{mesLabel(s.mes)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

// ---------- Convocatorias activas (lista compacta) ----------

function ConvocatoriasActivasCard({ items }: { items: AdminConvocatoriaResumenItem[] }) {
  return (
    <Panel>
      <PanelHeader
        title="Convocatorias activas"
        right={
          <Badge variant="secondary" className="font-normal">
            {items.length}
          </Badge>
        }
      />
      <div className="p-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-secondary-100">
              <Icon icon="ph:trophy-duotone" className="size-6 text-secondary-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-secondary-900">No hay convocatorias activas</p>
              <p className="mt-1 text-xs text-secondary-500">Empieza creando una convocatoria.</p>
            </div>
            <Button asChild size="sm" className="bg-orange-600 hover:bg-orange-700">
              <Link href="/dashboard/convocatorias/nuevo">Crear primera convocatoria</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {items.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/convocatorias/${c.id}`}
                className="flex items-center gap-3 rounded-lg border border-secondary-100 px-3 py-2 transition-colors hover:border-secondary-200 hover:bg-secondary-50"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-100">
                  <Icon icon="ph:trophy-duotone" className="size-4 text-primary-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-secondary-900">{c.nombre}</p>
                  <p className="text-xs text-secondary-500">
                    {c.totalPostulaciones}{" "}
                    {c.totalPostulaciones === 1 ? "postulación" : "postulaciones"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {c.diasParaCerrar !== null && c.diasParaCerrar >= 0 && (
                    <DiasBadge dias={c.diasParaCerrar} />
                  )}
                  <StateBadge tipo="convocatoria" valor={c.estado as EstadoConvocatoria} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

function DiasBadge({ dias }: { dias: number }) {
  if (dias === 0) {
    return <Badge className="border-transparent bg-error-100 text-error-700">Cierra hoy</Badge>;
  }
  if (dias <= 3) {
    return (
      <Badge className="border-transparent bg-error-100 text-error-700">
        {dias} {dias === 1 ? "día" : "días"}
      </Badge>
    );
  }
  if (dias <= 7) {
    return <Badge className="border-transparent bg-warning-100 text-warning-700">{dias} días</Badge>;
  }
  return null;
}
