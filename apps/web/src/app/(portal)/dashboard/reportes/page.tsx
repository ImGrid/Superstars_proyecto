"use client";

import { useQuery } from "@tanstack/react-query";
import { Icon } from "@iconify/react";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { reporteQueries } from "@/lib/api/query-keys";
import { ReporteFila } from "./_components/reporte-fila";

// Pantalla de descarga de reportes (solo administrador).
//
// Se eligio una LISTA y no una cuadricula de tarjetas. Con cinco reportes, una
// cuadricula de tres columnas deja un hueco vacio en la segunda fila y obliga a
// que cada tarjeta sea alta para que quepan descripcion, filtros y botones. La
// lista deja los nombres alineados en una sola columna, que es lo que hace que
// se recorra con la vista, y cada fila ocupa lo que necesita y nada mas.
//
// Los filtros no van en una barra comun arriba: cada reporte acepta unos
// distintos, asi que se despliegan dentro de su propia fila y solo cuando hacen
// falta. Lo habitual es descargar el reporte completo, y eso son dos clics.

export default function ReportesPage() {
  const { data, isLoading, isError, refetch } = useQuery(
    reporteQueries.catalogo(),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reportes"
        description="Descarga la información del programa en Excel o PDF."
      />

      <div className="rounded-xl border border-secondary-200 bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-secondary-100 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold text-secondary-900">
              Reportes disponibles
            </h2>
            {data && (
              <span className="text-xs text-secondary-400">
                {data.reportes.length} en total
              </span>
            )}
          </div>
          <p className="hidden items-center gap-1.5 text-xs text-secondary-400 sm:flex">
            <Icon icon="ph:lock-simple-duotone" className="size-3.5" />
            Cada descarga queda registrada
          </p>
        </div>

        {isLoading && <ListaCargando />}

        {isError && (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-error-50">
              <Icon
                icon="ph:warning-circle-duotone"
                className="size-5 text-error-600"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-secondary-900">
                No se pudo cargar la lista de reportes
              </p>
              <p className="mt-0.5 text-xs text-secondary-500">
                Revisa tu conexión y vuelve a intentarlo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-xs font-semibold text-primary-700 hover:underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {data && (
          <ul>
            {data.reportes.map((reporte) => (
              <ReporteFila key={reporte.tipo} reporte={reporte} />
            ))}
          </ul>
        )}
      </div>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-secondary-500">
        <Icon
          icon="ph:info-duotone"
          className="mt-0.5 size-4 shrink-0 text-secondary-400"
        />
        <span>
          Los archivos contienen datos personales de las personas registradas.
          Compártelos únicamente con quien deba tratarlos. Cada archivo trae una
          primera hoja con la fecha, quién lo generó y qué filtros se aplicaron.
        </span>
      </p>
    </div>
  );
}

// Esqueleto con la misma altura que una fila real, para que el contenido no
// salte al terminar de cargar.
function ListaCargando() {
  return (
    <ul>
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          className="flex items-start gap-3 border-b border-secondary-100 px-4 py-3 last:border-b-0"
        >
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-3 w-full max-w-md" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0" />
          <Skeleton className="h-8 w-20 shrink-0" />
        </li>
      ))}
    </ul>
  );
}
