"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, HelpCircle } from "lucide-react";
import type { FaqResponse } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { faqQueries } from "@/lib/api/query-keys";
import { formatDateTime } from "@/lib/format";
import { FaqFormDialog } from "./_components/faq-form-dialog";
import { FaqActions } from "./_components/faq-actions";

// columnas de la tabla
const columns: Column<FaqResponse>[] = [
  {
    key: "orden",
    header: "Orden",
    cell: (row) => (
      <span className="font-mono text-sm text-secondary-500">{row.orden}</span>
    ),
    className: "w-20",
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
    key: "respuesta",
    header: "Respuesta",
    cell: (row) => (
      <span className="text-secondary-600 line-clamp-1">{row.respuesta}</span>
    ),
    className: "whitespace-normal max-w-sm",
  },
  {
    key: "updatedAt",
    header: "Actualizado",
    cell: (row) => (
      <span className="text-sm text-secondary-500">
        {formatDateTime(row.updatedAt)}
      </span>
    ),
    className: "w-48",
  },
  {
    key: "acciones",
    header: "",
    cell: (row) => <FaqActions faq={row} />,
    className: "w-12",
  },
];

export default function FaqAdminPage() {
  return (
    <Suspense fallback={<TableSkeleton columns={5} rows={6} />}>
      <FaqContent />
    </Suspense>
  );
}

function FaqContent() {
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery(faqQueries.list());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Preguntas frecuentes"
        description="Gestiona las preguntas que se muestran en la página pública."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nueva pregunta
          </Button>
        }
      />

      {/* tabla */}
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
            icon={HelpCircle}
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

      {/* dialog crear */}
      <FaqFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
