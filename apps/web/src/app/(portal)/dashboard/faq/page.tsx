"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import type { FaqResponse } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { faqQueries, concursoQueries } from "@/lib/api/query-keys";
import { formatDateTime } from "@/lib/format";
import { FaqFormDialog } from "./_components/faq-form-dialog";
import { FaqActions } from "./_components/faq-actions";

// colores de badge por categoria
const CATEGORIA_BADGE: Record<string, { label: string; className: string }> = {
  general: {
    label: "General",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  participacion: {
    label: "Participacion",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  proceso: {
    label: "Proceso",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
};

export default function FaqAdminPage() {
  return (
    <Suspense fallback={<TableSkeleton columns={6} rows={6} />}>
      <FaqContent />
    </Suspense>
  );
}

function FaqContent() {
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery(faqQueries.list());
  // concursos para mostrar el nombre en lugar del id
  const { data: concursos } = useQuery(concursoQueries.list({ limit: 100 }));

  // mapa id -> nombre para lookup rapido
  const concursoMap = new Map(
    concursos?.data.map((c) => [c.id, c.nombre]) ?? [],
  );

  // columnas definidas aqui para acceder al concursoMap del closure
  const columns: Column<FaqResponse>[] = [
    {
      key: "orden",
      header: "Orden",
      cell: (row) => (
        <span className="font-mono text-sm text-secondary-500">{row.orden}</span>
      ),
      className: "w-16",
    },
    {
      key: "pregunta",
      header: "Pregunta",
      cell: (row) => (
        <span className="font-medium text-secondary-900 line-clamp-2">
          {row.pregunta}
        </span>
      ),
      className: "whitespace-normal max-w-xs",
    },
    {
      key: "categoria",
      header: "Categoria",
      cell: (row) => {
        const badge = CATEGORIA_BADGE[row.categoria] ?? {
          label: row.categoria,
          className: "bg-secondary-100 text-secondary-700",
        };
        return (
          <Badge variant="outline" className={badge.className}>
            {badge.label}
          </Badge>
        );
      },
      className: "w-36",
    },
    {
      key: "concurso",
      header: "Concurso",
      cell: (row) =>
        row.concursoId ? (
          <span className="text-sm text-secondary-700">
            {concursoMap.get(row.concursoId) ?? `#${row.concursoId}`}
          </span>
        ) : (
          <span className="text-sm text-secondary-400">General</span>
        ),
      className: "w-48",
    },
    {
      key: "updatedAt",
      header: "Actualizado",
      cell: (row) => (
        <span className="text-sm text-secondary-500">
          {formatDateTime(row.updatedAt)}
        </span>
      ),
      className: "w-40",
    },
    {
      key: "acciones",
      header: "",
      cell: (row) => <FaqActions faq={row} />,
      className: "w-12",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Preguntas frecuentes"
        description="Gestiona las preguntas del FAQ general y las especificas de cada concurso."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nueva pregunta
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.total ?? 0}
        page={data?.page ?? 1}
        limit={data?.limit ?? 20}
        onPageChange={() => {}}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon="ph:question-duotone"
            title="No hay preguntas frecuentes"
            description="Crea la primera pregunta para que los visitantes puedan resolver sus dudas."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Nueva pregunta
              </Button>
            }
          />
        }
      />

      <FaqFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
