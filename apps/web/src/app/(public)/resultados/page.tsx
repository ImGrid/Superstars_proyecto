"use client";

import { useQuery } from "@tanstack/react-query";
import { Award, ArrowRight } from "lucide-react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { publicQueries } from "@/lib/api/query-keys";
import { getPublicResultados } from "@/lib/api/public.api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, formatMoney } from "@/lib/format";
import type { PublicConvocatoriaResponse } from "@superstars/shared";

export default function ResultadosPage() {
  // traer convocatorias anteriores (cerrado, en_evaluacion, resultados_listos, finalizado)
  const { data, isLoading } = useQuery(
    publicQueries.convocatorias({ page: 1, limit: 50, tipo: "anteriores" }),
  );

  // filtrar solo los que tienen resultados publicados
  const convocatoriasConResultados = (data?.data ?? []).filter(
    (c: PublicConvocatoriaResponse) => c.fechaPublicacionResultados,
  );

  return (
    <>
      {/* header */}
      <section className="bg-primary-800 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-3xl font-bold text-white sm:text-4xl">
            Resultados y Ganadores
          </h1>
          <p className="mt-3 text-lg text-primary-200">
            Conoce a las empresas ganadoras de nuestras competencias.
          </p>
        </div>
      </section>

      {/* contenido */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="space-y-8">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-64 w-full rounded-lg" />
              ))}
            </div>
          ) : convocatoriasConResultados.length === 0 ? (
            <EmptyState
              icon="ph:trophy-duotone"
              title="Sin resultados publicados"
              description="Aún no hay resultados publicados. Cuando se finalice una convocatoria, los ganadores se mostrarán aquí."
              action={
                <Button asChild variant="outline">
                  <Link href="/convocatorias">
                    Ver convocatorias activas
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-10">
              {convocatoriasConResultados.map((convocatoria: PublicConvocatoriaResponse) => (
                <ConvocatoriaResultadosSection key={convocatoria.id} convocatoria={convocatoria} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

// seccion de resultados por convocatoria
function ConvocatoriaResultadosSection({ convocatoria }: { convocatoria: PublicConvocatoriaResponse }) {
  const { data, isLoading } = useQuery({
    queryKey: ["public", "convocatorias", "resultados", convocatoria.id],
    queryFn: () => getPublicResultados(convocatoria.id),
  });

  return (
    <div>
      {/* encabezado de la convocatoria */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-primary-800">
            {convocatoria.nombre}
          </h2>
          {convocatoria.fechaPublicacionResultados && (
            <p className="mt-1 text-sm text-secondary-500">
              Resultados publicados el {formatDate(convocatoria.fechaPublicacionResultados)}
            </p>
          )}
        </div>
        <Badge variant="secondary" className="w-fit text-sm">
          Monto: {formatMoney(convocatoria.monto)}
        </Badge>
      </div>

      {/* cards de ganadores */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : !data || data.ganadores.length === 0 ? (
        <p className="text-sm text-secondary-500">No se encontraron ganadores.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.ganadores.map((ganador, idx) => (
            <GanadorCard
              key={idx}
              empresaNombre={ganador.empresaNombre}
              posicion={ganador.posicionFinal}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// colores por posicion
const posicionStyles: Record<number, { bg: string; border: string; icon: string; label: string }> = {
  1: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    icon: "text-amber-500",
    label: "1er Lugar",
  },
  2: {
    bg: "bg-slate-50",
    border: "border-slate-300",
    icon: "text-slate-400",
    label: "2do Lugar",
  },
  3: {
    bg: "bg-orange-50",
    border: "border-orange-300",
    icon: "text-orange-400",
    label: "3er Lugar",
  },
};

function getEstiloPosicion(posicion: number) {
  return posicionStyles[posicion] ?? {
    bg: "bg-white",
    border: "border-secondary-200",
    icon: "text-secondary-400",
    label: `${posicion}to Lugar`,
  };
}

// card individual de ganador
function GanadorCard({
  empresaNombre,
  posicion,
}: {
  empresaNombre: string;
  posicion: number;
}) {
  const estilo = getEstiloPosicion(posicion);

  return (
    <Card className={`overflow-hidden border-2 ${estilo.border} ${estilo.bg}`}>
      <CardContent className="flex items-center gap-4 p-6">
        {/* icono de posicion */}
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
          {posicion <= 3 ? (
            <Icon icon="ph:trophy-duotone" className={`size-7 ${estilo.icon}`} />
          ) : (
            <Award className={`size-7 ${estilo.icon}`} />
          )}
        </div>

        {/* info */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-secondary-400">
            {estilo.label}
          </p>
          <p className="mt-1 truncate text-lg font-bold text-primary-800">
            {empresaNombre}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
