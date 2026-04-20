"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useQueryStates, parseAsInteger, parseAsString } from "nuqs";
import type { ListConcursosQueryDto } from "@superstars/shared";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { concursoQueries } from "@/lib/api/query-keys";
import { useDebounce } from "@/hooks/use-debounce";
import { ConcursoCard } from "./concurso-card";

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

export function ConcursosProponente() {
  return (
    <Suspense fallback={<CardsSkeleton />}>
      <ConcursosProponenteContent />
    </Suspense>
  );
}

function ConcursosProponenteContent() {
  // filtros (sin estado, proponente solo ve publicados)
  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(12),
      search: parseAsString.withDefault(""),
    },
    { history: "push" },
  );

  const debouncedSearch = useDebounce(filters.search, 300);

  // params para la API (backend fuerza estado=publicado para proponente)
  const apiParams: Record<string, unknown> = {
    page: filters.page,
    limit: filters.limit,
  };
  if (debouncedSearch) apiParams.search = debouncedSearch;

  const { data, isLoading } = useQuery(
    concursoQueries.list(apiParams as Partial<ListConcursosQueryDto>),
  );

  const concursos = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Concursos disponibles"
        description="Explora los concursos abiertos y postulate a los que apliquen para tu empresa."
      />

      {/* barra de busqueda */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary-400" />
        <Input
          placeholder="Buscar concursos..."
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value, page: 1 })}
          className="pl-9"
        />
      </div>

      {/* cargando */}
      {isLoading && <CardsSkeleton />}

      {/* sin resultados */}
      {!isLoading && concursos.length === 0 && (
        <EmptyState
          icon="ph:trophy-duotone"
          title="No hay concursos disponibles"
          description={
            debouncedSearch
              ? "No se encontraron concursos con ese criterio de busqueda."
              : "Por el momento no hay concursos abiertos. Vuelve a revisar pronto."
          }
        />
      )}

      {/* grid de cards */}
      {!isLoading && concursos.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {concursos.map((c) => (
              <ConcursoCard key={c.id} concurso={c} />
            ))}
          </div>

          {/* paginacion simple */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-secondary-500">
                {total} concurso{total !== 1 && "s"} disponible{total !== 1 && "s"}
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
  );
}
