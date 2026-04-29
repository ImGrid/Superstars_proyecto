"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryStates, parseAsInteger, parseAsString } from "nuqs";
import { Plus, Search } from "lucide-react";
import { Icon } from "@iconify/react";
import {
  RolUsuario,
  type ListUsuariosQueryDto,
  type UsuarioResponse,
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
import { usuarioQueries } from "@/lib/api/query-keys";
import { formatDateTime } from "@/lib/format";
import { useDebounce } from "@/hooks/use-debounce";
import { UsuarioFormDialog } from "./_components/usuario-form-dialog";
import { UsuarioActions } from "./_components/usuario-actions";

// labels legibles para el select de roles
const rolOptions = [
  { value: "all", label: "Todos los roles" },
  { value: RolUsuario.ADMINISTRADOR, label: "Administrador" },
  { value: RolUsuario.RESPONSABLE_CONVOCATORIA, label: "Responsable" },
  { value: RolUsuario.PROPONENTE, label: "Proponente" },
  { value: RolUsuario.EVALUADOR, label: "Evaluador" },
];

const activoOptions = [
  { value: "all", label: "Todos" },
  { value: "true", label: "Activos" },
  { value: "false", label: "Inactivos" },
];

// columnas de la tabla
const columns: Column<UsuarioResponse>[] = [
  {
    key: "nombre",
    header: "Nombre",
    cell: (row) => (
      <span className="font-medium text-secondary-900">{row.nombre}</span>
    ),
  },
  {
    key: "email",
    header: "Email",
    cell: (row) => (
      <span className="text-secondary-600">{row.email}</span>
    ),
  },
  {
    key: "rol",
    header: "Rol",
    cell: (row) => <StateBadge tipo="rol" valor={row.rol} />,
  },
  {
    key: "activo",
    header: "Estado",
    cell: (row) =>
      row.activo ? (
        <Badge
          variant="default"
          className="bg-success-600 text-white border-transparent"
        >
          Activo
        </Badge>
      ) : (
        <Badge variant="secondary">Inactivo</Badge>
      ),
  },
  {
    key: "createdAt",
    header: "Creado",
    cell: (row) => (
      <span className="text-sm text-secondary-500">
        {formatDateTime(row.createdAt)}
      </span>
    ),
  },
  {
    key: "acciones",
    header: "",
    cell: (row) => <UsuarioActions usuario={row} />,
    className: "w-12",
  },
];

// valor especial para representar "sin filtro"
const ALL = "all";

export default function UsuariosPage() {
  return (
    <Suspense fallback={<TableSkeleton columns={6} rows={8} />}>
      <UsuariosContent />
    </Suspense>
  );
}

function UsuariosContent() {
  const [createOpen, setCreateOpen] = useState(false);

  // filtros sincronizados con la URL
  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(20),
      search: parseAsString.withDefault(""),
      rol: parseAsString.withDefault(ALL),
      activo: parseAsString.withDefault(ALL),
    },
    { history: "push" },
  );

  // debounce del search para no hacer peticiones en cada tecla
  const debouncedSearch = useDebounce(filters.search, 300);

  // construir params para la API (excluir "all" y strings vacios)
  // activo se envia como string en query params, el backend lo transforma con Zod
  const apiParams: Record<string, unknown> = {
    page: filters.page,
    limit: filters.limit,
  };
  if (debouncedSearch) apiParams.search = debouncedSearch;
  if (filters.rol !== ALL) apiParams.rol = filters.rol;
  if (filters.activo !== ALL) apiParams.activo = filters.activo;

  const { data, isLoading } = useQuery(
    usuarioQueries.list(apiParams as Partial<ListUsuariosQueryDto>),
  );

  // resetear a pagina 1 cuando cambia un filtro
  function updateFilter(key: string, value: string) {
    setFilters({ [key]: value, page: 1 });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Gestiona los usuarios de la plataforma."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nuevo usuario
          </Button>
        }
      />

      {/* barra de filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary-400" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.rol}
          onValueChange={(v) => updateFilter("rol", v)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {rolOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.activo}
          onValueChange={(v) => updateFilter("activo", v)}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {activoOptions.map((opt) => (
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
            icon="ph:users-three-duotone"
            title="No se encontraron usuarios"
            description={
              debouncedSearch || filters.rol !== ALL || filters.activo !== ALL
                ? "Intenta ajustar los filtros de busqueda."
                : "Crea el primer usuario para comenzar."
            }
            action={
              !debouncedSearch &&
              filters.rol === ALL &&
              filters.activo === ALL ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  Nuevo usuario
                </Button>
              ) : undefined
            }
          />
        }
      />

      {/* dialog crear */}
      <UsuarioFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
