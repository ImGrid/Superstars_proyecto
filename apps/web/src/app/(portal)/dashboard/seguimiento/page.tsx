"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { seguimientoQueries } from "@/lib/api/query-keys";
import { ConvocatoriaSeguimientoCard } from "./_components/convocatoria-seguimiento-card";

// Portal de seguimiento (rol observador / financiador): pantalla de entrada.
// Cae directo aca (sin dashboard). Lista todas las convocatorias del programa en
// modo consulta; cada tarjeta lleva al detalle de seguimiento.

function CardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border p-5">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

export default function SeguimientoPage() {
  const { data: convocatorias, isLoading } = useQuery(seguimientoQueries.convocatorias());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Convocatorias"
        description="Seguimiento de todas las convocatorias del programa. Consulta categorías, documentos, postulaciones y resultados."
      />

      {isLoading ? (
        <CardsSkeleton />
      ) : !convocatorias || convocatorias.length === 0 ? (
        <EmptyState
          icon="ph:eye-duotone"
          title="Todavía no hay convocatorias"
          description="Cuando se cree una convocatoria, aparecerá aquí para su seguimiento."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {convocatorias.map((c) => (
            <ConvocatoriaSeguimientoCard key={c.id} convocatoria={c} />
          ))}
        </div>
      )}
    </div>
  );
}
