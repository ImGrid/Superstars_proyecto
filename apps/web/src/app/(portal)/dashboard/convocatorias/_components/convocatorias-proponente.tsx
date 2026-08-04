"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useQueryStates, parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs";
import type { ListConvocatoriasQueryDto, TipoListadoProponente } from "@superstars/shared";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { convocatoriaQueries } from "@/lib/api/query-keys";
import { useDebounce } from "@/hooks/use-debounce";
import { LienzoProponente } from "@/components/portal/lienzo-proponente";
import { ConvocatoriaCard } from "./convocatoria-card";

// skeleton de carga para las cards
function CardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-6">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

const TIPOS = ["abiertas", "anteriores"] as const satisfies readonly TipoListadoProponente[];

export function ConvocatoriasProponente() {
  return (
    <Suspense fallback={<CardsSkeleton />}>
      <ConvocatoriasProponenteContent />
    </Suspense>
  );
}

function ConvocatoriasProponenteContent() {
  // filtros: tipo separa abiertas (estado=publicado y fecha vigente) de anteriores
  // (cerrado/en_evaluacion/resultados_listos/finalizado). El backend aplica el
  // filtro real, ver convocatoria.repository.ts findAllVisiblesParaProponente
  const [filters, setFilters] = useQueryStates(
    {
      tipo: parseAsStringLiteral(TIPOS).withDefault("abiertas"),
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(12),
      search: parseAsString.withDefault(""),
    },
    { history: "push" },
  );

  const debouncedSearch = useDebounce(filters.search, 300);

  const apiParams: Record<string, unknown> = {
    tipo: filters.tipo,
    page: filters.page,
    limit: filters.limit,
  };
  if (debouncedSearch) apiParams.search = debouncedSearch;

  const { data, isLoading } = useQuery(
    convocatoriaQueries.list(apiParams as Partial<ListConvocatoriasQueryDto>),
  );

  const convocatorias = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const esAbiertas = filters.tipo === "abiertas";

  return (
    <LienzoProponente>
    <div className="space-y-6">
      <PageHeader
        title="Convocatorias"
        description={
          esAbiertas
            ? "Postúlate a las convocatorias abiertas que apliquen para tu empresa."
            : "Convocatorias previas: cerradas, en evaluación o finalizadas."
        }
      />

      {/* tabs activos / anteriores + busqueda */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={filters.tipo}
          onValueChange={(v) =>
            setFilters({ tipo: v as TipoListadoProponente, page: 1 })
          }
        >
          <TabsList>
            <TabsTrigger value="abiertas">Abiertas</TabsTrigger>
            <TabsTrigger value="anteriores">Anteriores</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary-400" />
          <Input
            placeholder="Buscar convocatorias..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value, page: 1 })}
            className="pl-9"
          />
        </div>
      </div>

      {/* cargando */}
      {isLoading && <CardsSkeleton />}

      {/* sin resultados */}
      {!isLoading && convocatorias.length === 0 && (
        <EmptyState
          icon="ph:trophy-duotone"
          title={esAbiertas ? "No hay convocatorias abiertas" : "No hay convocatorias anteriores"}
          description={
            debouncedSearch
              ? "No se encontraron convocatorias con ese criterio de búsqueda."
              : esAbiertas
                ? "Por el momento no hay convocatorias abiertas para postular. Vuelve a revisar pronto."
                : "Aun no se han cerrado convocatorias anteriores."
          }
        />
      )}

      {/* grid de cards */}
      {!isLoading && convocatorias.length > 0 && (
        <>
          {/* auto-fit (no auto-fill) en vez de 3 columnas fijas: auto-fill deja
              las pistas vacias reservadas y con una sola convocatoria quedaban
              dos huecos; auto-fit las colapsa y la tarjeta ocupa el ancho.
              El maximo de 560px evita que una sola tarjeta se estire de mas. */}
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(300px,560px))]">
            {convocatorias.map((c) => (
              <ConvocatoriaCard key={c.id} convocatoria={c} />
            ))}
          </div>

          {/* paginacion simple */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-secondary-500">
                {total} convocatoria{total !== 1 && "s"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="rounded px-3 py-1.5 text-sm font-medium text-secondary-700 hover:bg-secondary-100 disabled:opacity-40"
                  disabled={filters.page <= 1}
                  onClick={() => setFilters({ page: filters.page - 1 })}
                >
                  Anterior
                </button>
                <span className="text-sm text-secondary-500">
                  {filters.page} de {totalPages}
                </span>
                <button
                  className="rounded px-3 py-1.5 text-sm font-medium text-secondary-700 hover:bg-secondary-100 disabled:opacity-40"
                  disabled={filters.page >= totalPages}
                  onClick={() => setFilters({ page: filters.page + 1 })}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </LienzoProponente>
  );
}
