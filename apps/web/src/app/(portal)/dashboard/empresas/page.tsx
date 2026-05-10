"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useQueryStates, parseAsInteger, parseAsString } from "nuqs";
import { Search } from "lucide-react";
import type {
  ListEmpresasQueryDto,
  EmpresaResponse,
} from "@superstars/shared";
import { OPCIONES_DEPARTAMENTO, OPCIONES_RUBRO } from "@superstars/shared";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { empresaQueries } from "@/lib/api/query-keys";
import { formatShortDate } from "@/lib/format";
import { getOpcionLabel } from "@/lib/opciones";
import { useDebounce } from "@/hooks/use-debounce";
import { EmpresaActions } from "./_components/empresa-actions";

// Helper para mostrar campos opcionales con un guion en gris cuando estan vacios.
// Mantiene la tabla compacta y comunica claramente "sin dato" sin texto largo.
function dash(value: string | null | undefined): React.ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-secondary-300">—</span>;
  }
  return value;
}

// Columnas mostradas en la lista. El detalle completo (22 campos) va en /[id].
// Razon social como primera columna para escaneo rapido (NN/G).
const columns: Column<EmpresaResponse>[] = [
  {
    key: "razonSocial",
    header: "Razón social",
    cell: (row) => (
      <Link
        href={`/dashboard/empresas/${row.id}`}
        className="font-medium text-secondary-900 hover:text-primary-700"
      >
        {row.razonSocial}
      </Link>
    ),
  },
  {
    key: "nit",
    header: "NIT",
    cell: (row) => (
      <span className="text-secondary-700 font-mono text-sm">
        {dash(row.nit)}
      </span>
    ),
  },
  {
    key: "rubro",
    header: "Rubro",
    cell: (row) => (
      <span className="text-secondary-700">
        {dash(getOpcionLabel(row.rubro, OPCIONES_RUBRO))}
      </span>
    ),
  },
  {
    key: "departamento",
    header: "Departamento",
    cell: (row) => (
      <span className="text-secondary-700">
        {dash(getOpcionLabel(row.departamento, OPCIONES_DEPARTAMENTO))}
      </span>
    ),
  },
  {
    key: "createdAt",
    header: "Registrada",
    cell: (row) => (
      <span className="text-sm text-secondary-500">
        {formatShortDate(row.createdAt)}
      </span>
    ),
  },
  {
    key: "acciones",
    header: "",
    cell: (row) => <EmpresaActions empresaId={row.id} />,
    className: "w-32",
  },
];

export default function EmpresasPage() {
  return (
    <Suspense fallback={<TableSkeleton columns={5} rows={8} />}>
      <EmpresasContent />
    </Suspense>
  );
}

function EmpresasContent() {
  // Filtros sincronizados con la URL para que sea posible compartir un link
  // con la busqueda aplicada y para que el back/forward del navegador funcione.
  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(20),
      search: parseAsString.withDefault(""),
    },
    { history: "push" },
  );

  // Debounce 300ms: evita una peticion por cada tecla. Mismo valor que usuarios.
  const debouncedSearch = useDebounce(filters.search, 300);

  // Construir parametros para la API. Excluir search vacio.
  const apiParams: Partial<ListEmpresasQueryDto> = {
    page: filters.page,
    limit: filters.limit,
  };
  if (debouncedSearch) apiParams.search = debouncedSearch;

  const { data, isLoading } = useQuery(empresaQueries.list(apiParams));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empresas"
        description="Empresas registradas en la plataforma. Busca por nombre o NIT."
      />

      {/* barra de busqueda */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary-400" />
        <Input
          placeholder="Buscar por razón social o NIT..."
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value, page: 1 })}
          className="pl-9"
        />
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
            icon="ph:buildings-duotone"
            title="No se encontraron empresas"
            description={
              debouncedSearch
                ? "Prueba con otro término de búsqueda."
                : "Aún no hay empresas registradas en la plataforma."
            }
          />
        }
      />
    </div>
  );
}
