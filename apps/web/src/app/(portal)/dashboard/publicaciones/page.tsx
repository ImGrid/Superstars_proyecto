"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useQueryStates, parseAsInteger, parseAsString } from "nuqs";
import { Plus, Search } from "lucide-react";
import { Icon } from "@iconify/react";
import {
  EstadoPublicacion,
  type ListPublicacionesQueryDto,
  type PublicacionResponse,
} from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StateBadge } from "@/components/shared/state-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { publicacionQueries } from "@/lib/api/query-keys";
import { formatShortDate } from "@/lib/format";
import { useDebounce } from "@/hooks/use-debounce";
import { PublicacionActions } from "./_components/publicacion-actions";

// opciones del filtro de estado
const estadoOptions = [
  { value: "all", label: "Todos los estados" },
  { value: EstadoPublicacion.BORRADOR, label: "Borrador" },
  { value: EstadoPublicacion.PROGRAMADO, label: "Programado" },
  { value: EstadoPublicacion.PUBLICADO, label: "Publicado" },
  { value: EstadoPublicacion.EXPIRADO, label: "Expirado" },
  { value: EstadoPublicacion.ARCHIVADO, label: "Archivado" },
];

// columnas de la tabla
const columns: Column<PublicacionResponse>[] = [
  {
    key: "titulo",
    header: "Titulo",
    cell: (row) => (
      <span className="font-medium text-secondary-900 line-clamp-1">
        {row.titulo}
      </span>
    ),
  },
  {
    key: "estado",
    header: "Estado",
    cell: (row) => <StateBadge tipo="publicacion" valor={row.estado} />,
  },
  {
    key: "fechaPublicacion",
    header: "Fecha pub.",
    cell: (row) => (
      <span className="text-sm text-secondary-500">
        {row.fechaPublicacion ? formatShortDate(row.fechaPublicacion) : "\u2014"}
      </span>
    ),
  },
  {
    key: "destacado",
    header: "Dest.",
    cell: (row) =>
      row.destacado ? (
        <Icon icon="ph:star-duotone" className="size-4 text-warning-500" />
      ) : null,
    className: "w-16",
  },
  {
    key: "acciones",
    header: "",
    cell: (row) => <PublicacionActions publicacion={row} />,
    className: "w-12",
  },
];

const ALL = "all";

export default function PublicacionesPage() {
  return (
    <Suspense fallback={<TableSkeleton columns={5} rows={8} />}>
      <PublicacionesContent />
    </Suspense>
  );
}

function PublicacionesContent() {
  const router = useRouter();

  // filtros sincronizados con la URL
  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(12),
      search: parseAsString.withDefault(""),
      estado: parseAsString.withDefault(ALL),
    },
    { history: "push" },
  );

  const debouncedSearch = useDebounce(filters.search, 300);

  // construir params para la API
  const apiParams: Record<string, unknown> = {
    page: filters.page,
    limit: filters.limit,
  };
  if (debouncedSearch) apiParams.search = debouncedSearch;
  if (filters.estado !== ALL) apiParams.estado = filters.estado;

  const { data, isLoading } = useQuery(
    publicacionQueries.list(apiParams as Partial<ListPublicacionesQueryDto>),
  );

  // resetear a pagina 1 cuando cambia un filtro
  function updateFilter(key: string, value: string) {
    setFilters({ [key]: value, page: 1 });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Publicaciones"
        description="Gestiona las noticias y publicaciones de la plataforma."
        action={
          <Button
            onClick={() => router.push("/dashboard/publicaciones/nuevo")}
          >
            <Plus className="size-4" />
            Nueva publicacion
          </Button>
        }
      />

      {/* barra de filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary-400" />
          <Input
            placeholder="Buscar por titulo..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.estado}
          onValueChange={(v) => updateFilter("estado", v)}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {estadoOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* tabla */}
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.total ?? 0}
        page={filters.page}
        limit={filters.limit}
        onPageChange={(page) => setFilters({ page })}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon="ph:newspaper-duotone"
            title="No se encontraron publicaciones"
            description={
              debouncedSearch || filters.estado !== ALL
                ? "Intenta ajustar los filtros de busqueda."
                : "Crea la primera publicacion para comenzar."
            }
            action={
              !debouncedSearch && filters.estado === ALL ? (
                <Button
                  onClick={() =>
                    router.push("/dashboard/publicaciones/nuevo")
                  }
                >
                  <Plus className="size-4" />
                  Nueva publicacion
                </Button>
              ) : undefined
            }
          />
        }
      />
    </div>
  );
}
