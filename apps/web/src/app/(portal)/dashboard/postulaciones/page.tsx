"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryStates, parseAsInteger, parseAsString } from "nuqs";
import { Eye } from "lucide-react";
import { Icon } from "@iconify/react";
import type {
  ListPostulacionesQueryDto,
  PostulacionAdminListItem,
  ConvocatoriaResponse,
} from "@superstars/shared";
import Link from "next/link";
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
import { RowActions, RowAction } from "@/components/shared/row-actions";
import { StateBadge } from "@/components/shared/state-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { postulacionQueries, convocatoriaQueries, categoriaQueries } from "@/lib/api/query-keys";
import { formatShortDate, formatPercent } from "@/lib/format";

// opciones de filtro por estado
const ESTADOS_FILTRO = [
  { value: "all", label: "Todos los estados" },
  { value: "borrador", label: "Borrador" },
  { value: "enviado", label: "Enviado" },
  { value: "observado", label: "Observado" },
  { value: "rechazado", label: "Rechazado" },
  { value: "en_evaluacion", label: "En evaluación" },
  { value: "calificado", label: "Calificado" },
  { value: "ganador", label: "Ganador" },
  { value: "no_seleccionado", label: "No seleccionado" },
];

const ALL = "all";

// columnas de la tabla
const columns: Column<PostulacionAdminListItem>[] = [
  {
    key: "empresa",
    header: "Empresa",
    cell: (row) => (
      <span className="font-medium text-secondary-900">
        {row.empresaRazonSocial}
      </span>
    ),
  },
  {
    key: "convocatoria",
    header: "Convocatoria",
    cell: (row) => (
      <span className="text-secondary-600 text-sm">{row.convocatoriaNombre}</span>
    ),
  },
  {
    key: "categoria",
    header: "Categoría",
    cell: (row) => (
      <span className="text-secondary-600 text-sm">{row.categoriaNombre}</span>
    ),
  },
  {
    key: "estado",
    header: "Estado",
    cell: (row) => <StateBadge tipo="postulacion" valor={row.estado} />,
  },
  {
    key: "completado",
    header: "Completado",
    cell: (row) => {
      const pct = Math.round(Number(row.porcentajeCompletado));
      return (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 rounded-full bg-secondary-100">
            <div
              className={`h-2 rounded-full ${pct >= 100 ? "bg-success-500" : "bg-primary-500"}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className="text-xs text-secondary-500">
            {formatPercent(row.porcentajeCompletado)}
          </span>
        </div>
      );
    },
  },
  {
    key: "fechaEnvio",
    header: "Enviado",
    cell: (row) => (
      <span className="text-sm text-secondary-500">
        {row.fechaEnvio ? formatShortDate(row.fechaEnvio) : "-"}
      </span>
    ),
  },
  {
    key: "puntaje",
    header: "Puntaje",
    cell: (row) => (
      <span className="text-sm">{row.puntajeFinal ?? "-"}</span>
    ),
  },
  {
    key: "acciones",
    header: "",
    cell: (row) => (
      <RowActions>
        {row.calificacionesPendientes > 0 && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1 text-primary-700 hover:text-primary-800"
          >
            <Link
              href={`/dashboard/convocatorias/${row.convocatoriaId}/postulaciones/${row.id}?tab=calificaciones`}
            >
              <Icon icon="ph:clipboard-text-duotone" className="size-3.5" />
              Revisar ({row.calificacionesPendientes})
            </Link>
          </Button>
        )}
        <RowAction
          icon={<Eye className="size-4" />}
          label="Ver detalle"
          href={`/dashboard/convocatorias/${row.convocatoriaId}/postulaciones/${row.id}`}
        />
      </RowActions>
    ),
    className: "text-right",
  },
];

export default function PostulacionesAdminPage() {
  return (
    <Suspense fallback={<TableSkeleton columns={6} rows={8} />}>
      <PostulacionesContent />
    </Suspense>
  );
}

function PostulacionesContent() {
  // filtros sincronizados con la URL
  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(10),
      estado: parseAsString.withDefault(ALL),
      convocatoriaId: parseAsString.withDefault(ALL),
      categoriaId: parseAsString.withDefault(ALL),
    },
    { history: "push" },
  );

  const hayConvocatoria = filters.convocatoriaId !== ALL;

  // construir params para la API
  const apiParams: Record<string, unknown> = {
    page: filters.page,
    limit: filters.limit,
  };
  if (filters.estado !== ALL) apiParams.estado = filters.estado;
  if (hayConvocatoria) apiParams.convocatoriaId = Number(filters.convocatoriaId);
  // el filtro por categoria solo aplica dentro de una convocatoria elegida
  if (hayConvocatoria && filters.categoriaId !== ALL) {
    apiParams.categoriaId = Number(filters.categoriaId);
  }

  // cargar postulaciones
  const { data, isLoading } = useQuery(
    postulacionQueries.adminList(apiParams),
  );

  // cargar convocatorias para el filtro (sin paginacion, solo lista)
  const { data: convocatoriasData } = useQuery(convocatoriaQueries.list());

  // categorias de la convocatoria elegida (para el filtro por categoria). Las
  // categorias pertenecen a una convocatoria, asi que el filtro solo tiene sentido
  // cuando ya se eligio una.
  const { data: categorias } = useQuery({
    ...categoriaQueries.list(Number(filters.convocatoriaId)),
    enabled: hayConvocatoria,
  });

  const convocatorias = convocatoriasData?.data ?? [];
  const postulaciones = data?.data ?? [];
  const total = data?.total ?? 0;

  // resetear a pagina 1 cuando cambia un filtro. Al cambiar de convocatoria se
  // limpia tambien la categoria: la de la convocatoria anterior ya no aplica.
  function updateFilter(key: string, value: string) {
    if (key === "convocatoriaId") {
      setFilters({ convocatoriaId: value, categoriaId: ALL, page: 1 });
    } else {
      setFilters({ [key]: value, page: 1 });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Postulaciones"
        description="Revisa las postulaciones recibidas en las convocatorias."
      />

      {/* filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* filtro por convocatoria */}
        <Select
          value={filters.convocatoriaId}
          onValueChange={(v) => updateFilter("convocatoriaId", v)}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Todos las convocatorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos las convocatorias</SelectItem>
            {convocatorias.map((c: ConvocatoriaResponse) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* filtro por categoria: solo habilitado cuando hay una convocatoria elegida */}
        <Select
          value={filters.categoriaId}
          onValueChange={(v) => updateFilter("categoriaId", v)}
          disabled={!hayConvocatoria}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue
              placeholder={
                hayConvocatoria ? "Todas las categorías" : "Elige una convocatoria"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las categorías</SelectItem>
            {(categorias ?? []).map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                {cat.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* filtro por estado */}
        <Select
          value={filters.estado}
          onValueChange={(v) => updateFilter("estado", v)}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            {ESTADOS_FILTRO.map((e) => (
              <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* tabla */}
      <DataTable
        columns={columns}
        data={postulaciones}
        total={total}
        page={filters.page}
        limit={filters.limit}
        onPageChange={(p) => setFilters({ page: p })}
        itemName="postulaciones"
        onLimitChange={(limit) => setFilters({ limit, page: 1 })}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon="ph:file-text-duotone"
            title="No hay postulaciones"
            description={
              filters.estado !== ALL ||
              filters.convocatoriaId !== ALL ||
              filters.categoriaId !== ALL
                ? "No hay postulaciones con los filtros seleccionados."
                : "Aun no se han recibido postulaciones."
            }
          />
        }
      />
    </div>
  );
}
