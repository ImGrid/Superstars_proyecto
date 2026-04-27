"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useQueryStates, parseAsInteger, parseAsString } from "nuqs";
import { Eye } from "lucide-react";
import { Icon } from "@iconify/react";
import type {
  ListPostulacionesQueryDto,
  PostulacionAdminListItem,
  ConcursoResponse,
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
import { StateBadge } from "@/components/shared/state-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { postulacionQueries, concursoQueries } from "@/lib/api/query-keys";
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
    key: "concurso",
    header: "Concurso",
    cell: (row) => (
      <span className="text-secondary-600 text-sm">{row.concursoNombre}</span>
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
              className={`h-2 rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-primary-500"}`}
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
      <div className="flex items-center justify-end gap-1">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href={`/dashboard/concursos/${row.concursoId}/postulaciones/${row.id}`}>
            <Eye className="size-3.5" />
            Ver detalle
          </Link>
        </Button>
        {row.calificacionesPendientes > 0 && (
          <Button asChild variant="ghost" size="sm" className="gap-1 text-blue-600">
            <Link href={`/dashboard/concursos/${row.concursoId}/postulaciones/${row.id}`}>
              <Icon icon="ph:clipboard-text-duotone" className="size-3.5" />
              {row.calificacionesPendientes} por revisar
            </Link>
          </Button>
        )}
      </div>
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
  const router = useRouter();

  // filtros sincronizados con la URL
  const [filters, setFilters] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(20),
      estado: parseAsString.withDefault(ALL),
      concursoId: parseAsString.withDefault(ALL),
    },
    { history: "push" },
  );

  // construir params para la API
  const apiParams: Record<string, unknown> = {
    page: filters.page,
    limit: filters.limit,
  };
  if (filters.estado !== ALL) apiParams.estado = filters.estado;
  if (filters.concursoId !== ALL) apiParams.concursoId = Number(filters.concursoId);

  // cargar postulaciones
  const { data, isLoading } = useQuery(
    postulacionQueries.adminList(apiParams),
  );

  // cargar concursos para el filtro (sin paginacion, solo lista)
  const { data: concursosData } = useQuery(concursoQueries.list());

  const concursos = concursosData?.data ?? [];
  const postulaciones = data?.data ?? [];
  const total = data?.total ?? 0;

  // resetear a pagina 1 cuando cambia un filtro
  function updateFilter(key: string, value: string) {
    setFilters({ [key]: value, page: 1 });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Postulaciones"
        description="Revisa las postulaciones recibidas en los concursos."
      />

      {/* filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* filtro por concurso */}
        <Select
          value={filters.concursoId}
          onValueChange={(v) => updateFilter("concursoId", v)}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Todos los concursos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los concursos</SelectItem>
            {concursos.map((c: ConcursoResponse) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.nombre}
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

        {/* conteo de resultados */}
        <span className="text-sm text-secondary-500 sm:ml-auto">
          {total} postulacion{total !== 1 ? "es" : ""}
        </span>
      </div>

      {/* tabla */}
      <DataTable
        columns={columns}
        data={postulaciones}
        total={total}
        page={filters.page}
        limit={filters.limit}
        onPageChange={(p) => setFilters({ page: p })}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon="ph:file-text-duotone"
            title="No hay postulaciones"
            description={
              filters.estado !== ALL || filters.concursoId !== ALL
                ? "No hay postulaciones con los filtros seleccionados."
                : "Aun no se han recibido postulaciones."
            }
          />
        }
      />
    </div>
  );
}
