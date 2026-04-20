"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useQueryStates, parseAsInteger, parseAsString } from "nuqs";
import { Plus, Search } from "lucide-react";
import {
  EstadoConcurso,
  RolUsuario,
  type ListConcursosQueryDto,
  type ConcursoResponse,
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
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { concursoQueries } from "@/lib/api/query-keys";
import { formatMoney, formatShortDate } from "@/lib/format";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/hooks/use-auth";
import { ConcursoActions } from "./_components/concurso-actions";
import { ConcursosProponente } from "./_components/concursos-proponente";

// opciones del filtro de estado
const estadoOptions = [
  { value: "all", label: "Todos los estados" },
  { value: EstadoConcurso.BORRADOR, label: "Borrador" },
  { value: EstadoConcurso.PUBLICADO, label: "Publicado" },
  { value: EstadoConcurso.CERRADO, label: "Cerrado" },
  { value: EstadoConcurso.EN_EVALUACION, label: "En Evaluacion" },
  { value: EstadoConcurso.FINALIZADO, label: "Finalizado" },
];

// columnas de la tabla
const columns: Column<ConcursoResponse>[] = [
  {
    key: "nombre",
    header: "Nombre",
    cell: (row) => (
      <span className="font-medium text-secondary-900">{row.nombre}</span>
    ),
  },
  {
    key: "estado",
    header: "Estado",
    cell: (row) => <StateBadge tipo="concurso" valor={row.estado} />,
  },
  {
    key: "montoPremio",
    header: "Premio",
    cell: (row) => (
      <span className="text-secondary-700">{formatMoney(row.montoPremio)}</span>
    ),
  },
  {
    key: "departamentos",
    header: "Departamentos",
    cell: (row) => (
      <div className="flex flex-wrap gap-1">
        {row.departamentos.slice(0, 2).map((dep) => (
          <Badge key={dep} variant="outline" className="text-xs">
            {dep}
          </Badge>
        ))}
        {row.departamentos.length > 2 && (
          <Badge variant="outline" className="text-xs">
            +{row.departamentos.length - 2}
          </Badge>
        )}
      </div>
    ),
  },
  {
    key: "fechaCierrePostulacion",
    header: "Cierre",
    cell: (row) => (
      <span className="text-sm text-secondary-500">
        {formatShortDate(row.fechaCierrePostulacion)}
      </span>
    ),
  },
  {
    key: "acciones",
    header: "",
    cell: (row) => <ConcursoActions concurso={row} />,
    className: "w-12",
  },
];

const ALL = "all";

export default function ConcursosPage() {
  const { data: user } = useAuth();

  // proponente ve vista de cards
  if (user?.rol === RolUsuario.PROPONENTE) {
    return <ConcursosProponente />;
  }

  // admin y responsable ven la tabla de gestion
  return (
    <Suspense fallback={<TableSkeleton columns={6} rows={8} />}>
      <ConcursosAdminContent />
    </Suspense>
  );
}

function ConcursosAdminContent() {
  const router = useRouter();

  // filtros sincronizados con la URL
  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(20),
      search: parseAsString.withDefault(""),
      estado: parseAsString.withDefault(ALL),
    },
    { history: "push" },
  );

  const debouncedSearch = useDebounce(filters.search, 300);

  // construir params para la API (excluir "all" y strings vacios)
  const apiParams: Record<string, unknown> = {
    page: filters.page,
    limit: filters.limit,
  };
  if (debouncedSearch) apiParams.search = debouncedSearch;
  if (filters.estado !== ALL) apiParams.estado = filters.estado;

  const { data, isLoading } = useQuery(
    concursoQueries.list(apiParams as Partial<ListConcursosQueryDto>),
  );

  // resetear a pagina 1 cuando cambia un filtro
  function updateFilter(key: string, value: string) {
    setFilters({ [key]: value, page: 1 });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Concursos"
        description="Gestiona los concursos de la plataforma."
        action={
          <Button onClick={() => router.push("/dashboard/concursos/nuevo")}>
            <Plus className="size-4" />
            Nuevo concurso
          </Button>
        }
      />

      {/* barra de filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary-400" />
          <Input
            placeholder="Buscar por nombre..."
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
            icon="ph:trophy-duotone"
            title="No se encontraron concursos"
            description={
              debouncedSearch || filters.estado !== ALL
                ? "Intenta ajustar los filtros de busqueda."
                : "Crea el primer concurso para comenzar."
            }
            action={
              !debouncedSearch && filters.estado === ALL ? (
                <Button onClick={() => router.push("/dashboard/concursos/nuevo")}>
                  <Plus className="size-4" />
                  Nuevo concurso
                </Button>
              ) : undefined
            }
          />
        }
      />
    </div>
  );
}
