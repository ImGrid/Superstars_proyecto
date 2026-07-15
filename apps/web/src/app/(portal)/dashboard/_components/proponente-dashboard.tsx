"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Icon } from "@iconify/react";
import type {
  ProponenteDashboardStats,
  ProponenteConvocatoriaAbiertaItem,
  PublicHistoriaExitoItem,
} from "@superstars/shared";
import { PageHeader } from "@/components/shared/page-header";
import { dashboardQueries, publicQueries } from "@/lib/api/query-keys";
import { getConvocatoriaImagenUrl } from "@/lib/api/convocatoria.api";
import { cn } from "@/lib/utils";
import { Panel, PanelHeader } from "./panel";
import { DashboardSkeleton } from "./dashboard-skeleton";

function formatBs(monto: string | null): string {
  if (!monto) return "—";
  return new Intl.NumberFormat("es-BO").format(Math.round(Number(monto) || 0));
}

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

interface Props {
  nombre: string;
}

export function ProponenteDashboard({ nombre }: Props) {
  const { data, isLoading } = useQuery(dashboardQueries.proponente());
  const { data: historias } = useQuery(publicQueries.historiasExito());

  if (isLoading || !data) {
    return <DashboardSkeleton kpiCount={3} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Hola, ${data.empresaRazonSocial ?? nombre}`}
        description={
          data.convocatoriasAbiertas > 0
            ? `Hay ${data.convocatoriasAbiertas} ${data.convocatoriasAbiertas === 1 ? "convocatoria abierta" : "convocatorias abiertas"} ahora mismo — no te quedes afuera.`
            : "Aquí verás las convocatorias abiertas para tu empresa."
        }
      />

      <ProximoPaso data={data} />

      {/* convocatorias abiertas: el corazon, con el premio adelante */}
      {data.convocatoriasAbiertasResumen.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-secondary-900">
              <Icon icon="ph:trophy-duotone" className="size-5 text-primary-600" />
              Convocatorias abiertas
            </h2>
            <Link
              href="/dashboard/convocatorias"
              className="text-sm font-medium text-primary-700 hover:text-primary-800"
            >
              Ver todas →
            </Link>
          </div>
          <div className="flex flex-col gap-4">
            {data.convocatoriasAbiertasResumen.map((c) => (
              <OportunidadCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}

      {/* mis postulaciones: resumen por estado */}
      {data.totalMisPostulaciones > 0 && (
        <MisPostulacionesResumen dist={data.misPostulacionesPorEstado} />
      )}

      {/* historias de exito: prueba social */}
      <HistoriasSection historias={historias ?? []} />
    </div>
  );
}

// proximo paso (next best action): una sola cosa clara para hacer ahora
function ProximoPaso({ data }: { data: ProponenteDashboardStats }) {
  let icon = "ph:check-circle-duotone";
  let titulo = "Estás al día";
  let detalle = "No hay convocatorias abiertas ahora. Te avisaremos cuando se abra una nueva.";
  let cta: string | null = null;
  let href = "";

  if (!data.tieneEmpresa) {
    icon = "ph:building-office-duotone";
    titulo = "Registra tu empresa para poder postular";
    detalle = "Necesitas completar los datos de tu empresa antes de competir por los premios.";
    cta = "Registrar empresa";
    href = "/dashboard/mi-empresa";
  } else if (data.postulacionesObservadas > 0) {
    const n = data.postulacionesObservadas;
    icon = "ph:note-pencil-duotone";
    titulo = `Tienes ${n} postulación${n === 1 ? "" : "es"} con observaciones`;
    detalle = "Un responsable revisó tu postulación y pide ajustes. Corrige para seguir en carrera.";
    cta = "Ver y corregir";
    href = "/dashboard/mis-postulaciones";
  } else if (data.misPostulacionesPorEstado.borrador > 0) {
    const n = data.misPostulacionesPorEstado.borrador;
    icon = "ph:pencil-line-duotone";
    titulo = "Te falta poco: termina tu postulación";
    detalle = `Tienes ${n} postulación${n === 1 ? "" : "es"} sin enviar. Puedes guardar y seguir cuando quieras.`;
    cta = "Continuar";
    href = "/dashboard/mis-postulaciones";
  } else if (data.convocatoriasAbiertas > 0) {
    icon = "ph:rocket-launch-duotone";
    titulo = "Hay convocatorias abiertas para ti";
    detalle = "Elige una y compite por el premio. La postulación se guarda automáticamente.";
    cta = "Ver convocatorias";
    href = "/dashboard/convocatorias";
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-primary-600 px-5 py-4 text-white shadow-sm">
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/15">
        <Icon icon={icon} className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold">{titulo}</p>
        <p className="mt-0.5 text-sm text-white/80">{detalle}</p>
      </div>
      {cta && (
        <Link
          href={href}
          className="shrink-0 rounded-lg bg-amarillo-600 px-4 py-2.5 text-sm font-semibold text-primary-600 transition-colors hover:bg-amarillo-500"
        >
          {cta} →
        </Link>
      )}
    </div>
  );
}

// tarjeta de oportunidad: premio grande + urgencia + categorias + CTA
function OportunidadCard({ c }: { c: ProponenteConvocatoriaAbiertaItem }) {
  const dias = c.diasParaCerrar;
  const urg =
    dias <= 3
      ? {
          cls: "bg-error-100 text-error-700",
          txt: dias <= 0 ? "Cierra hoy" : `Cierra en ${dias} ${dias === 1 ? "día" : "días"}`,
          ic: "ph:fire-duotone",
        }
      : dias <= 7
        ? { cls: "bg-warning-100 text-warning-700", txt: `Cierra en ${dias} días`, ic: "ph:clock-duotone" }
        : { cls: "bg-success-100 text-success-700", txt: `Cierra en ${dias} días`, ic: "ph:clock-duotone" };

  return (
    <div className="grid grid-cols-[120px_1fr] overflow-hidden rounded-2xl border border-secondary-200 bg-white shadow-sm transition-shadow hover:shadow-md sm:grid-cols-[170px_1fr]">
      {/* portada */}
      <div className="relative grid min-h-[130px] place-items-center bg-gradient-to-br from-primary-600 to-info-600 text-white">
        {c.tieneImagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getConvocatoriaImagenUrl(c.id)}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <Icon icon="ph:trophy-duotone" className="size-12 opacity-90" />
        )}
      </div>

      {/* cuerpo */}
      <div className="flex flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-base font-semibold text-secondary-900">{c.nombre}</h3>
          <span className={cn("inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", urg.cls)}>
            <Icon icon={urg.ic} className="size-3.5" />
            {urg.txt}
          </span>
        </div>

        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-2xl font-bold tabular-nums text-primary-700">
            Bs {formatBs(c.montoMax)}
          </span>
          <span className="text-xs text-secondary-500">
            en premios · hasta {c.numeroGanadores} {c.numeroGanadores === 1 ? "ganador" : "ganadores"}
          </span>
        </p>

        {c.categorias.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {c.categorias.map((cat) => (
              <span
                key={cat.nombre}
                className="rounded-full bg-secondary-100 px-2.5 py-1 text-xs text-secondary-600"
              >
                {cat.nombre} <b className="font-semibold text-secondary-900">Bs {formatBs(cat.monto)}</b>
              </span>
            ))}
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-secondary-400">
            {c.departamentos.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Icon icon="ph:map-pin-duotone" className="size-3.5" />
                {c.departamentos.join(" · ")}
              </span>
            )}
            {c.totalPostulantes > 0 && (
              <span className="inline-flex items-center gap-1">
                <Icon icon="ph:users-duotone" className="size-3.5" />
                {c.totalPostulantes} postulante{c.totalPostulantes === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {c.yaPostule ? (
            <Link
              href={`/dashboard/convocatorias/${c.id}`}
              className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-success-700 hover:text-success-800"
            >
              <Icon icon="ph:check-circle-fill" className="size-4" />
              Ya te postulaste
            </Link>
          ) : (
            <Link
              href={`/dashboard/convocatorias/${c.id}`}
              className="shrink-0 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
            >
              Postularme →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// resumen compacto de mis postulaciones por estado (solo los estados con al menos una)
const ESTADOS_POST: { key: string; label: string; cls: string }[] = [
  { key: "borrador", label: "En borrador", cls: "bg-secondary-100 text-secondary-700" },
  { key: "enviado", label: "Enviadas", cls: "bg-info-50 text-info-700" },
  { key: "observado", label: "Con observaciones", cls: "bg-warning-100 text-warning-700" },
  { key: "en_evaluacion", label: "En evaluación", cls: "bg-primary-100 text-primary-700" },
  { key: "calificado", label: "Calificadas", cls: "bg-primary-100 text-primary-700" },
  { key: "ganador", label: "Ganadoras", cls: "bg-success-100 text-success-700" },
  { key: "no_seleccionado", label: "No seleccionadas", cls: "bg-secondary-100 text-secondary-600" },
  { key: "rechazado", label: "Rechazadas", cls: "bg-error-100 text-error-700" },
];

function MisPostulacionesResumen({
  dist,
}: {
  dist: ProponenteDashboardStats["misPostulacionesPorEstado"];
}) {
  const items = ESTADOS_POST.filter((i) => dist[i.key as keyof typeof dist] > 0);

  return (
    <Panel>
      <PanelHeader
        title="Mis postulaciones"
        right={
          <Link
            href="/dashboard/mis-postulaciones"
            className="text-sm font-medium text-primary-700 hover:text-primary-800"
          >
            Ver todas →
          </Link>
        }
      />
      <div className="flex flex-wrap gap-2 p-4">
        {items.map((i) => (
          <div key={i.key} className={cn("flex items-center gap-2 rounded-lg px-3 py-2", i.cls)}>
            <span className="text-lg font-bold tabular-nums">{dist[i.key as keyof typeof dist]}</span>
            <span className="text-xs font-medium">{i.label}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// historias de exito: prueba social (reusa el endpoint publico). Si esta vacio,
// muestra una franja que invita, no un hueco roto.
function HistoriasSection({ historias }: { historias: PublicHistoriaExitoItem[] }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-secondary-900">
          <Icon icon="ph:star-duotone" className="size-5 text-warning-500" />
          Historias de éxito
        </h2>
      </div>
      {historias.length === 0 ? (
        <Panel>
          <div className="flex items-center gap-3 p-5 text-sm text-secondary-500">
            <Icon icon="ph:star-duotone" className="size-6 shrink-0 text-warning-500" />
            Pronto verás historias de emprendedores que ganaron y crecieron con el programa.
          </div>
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {historias.slice(0, 2).map((h) => (
            <Panel key={h.id} className="flex flex-col gap-2.5 p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 text-sm font-bold text-white">
                  {iniciales(h.empresaNombre ?? h.titulo)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-secondary-900">
                    {h.empresaNombre ?? h.titulo}
                  </p>
                  {h.badge && <p className="text-xs text-secondary-500">{h.badge}</p>}
                </div>
              </div>
              <p className="line-clamp-3 text-sm italic text-secondary-700">
                &ldquo;{h.descripcion}&rdquo;
              </p>
            </Panel>
          ))}
        </div>
      )}
    </section>
  );
}
