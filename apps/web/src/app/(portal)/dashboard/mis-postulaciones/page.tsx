"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FileText, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { postulacionQueries } from "@/lib/api/query-keys";
import { PostulacionCard } from "./_components/postulacion-card";

// skeleton de carga
function PostulacionesSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-6">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

export default function MisPostulacionesPage() {
  return (
    <Suspense fallback={<PostulacionesSkeleton />}>
      <MisPostulacionesContent />
    </Suspense>
  );
}

function MisPostulacionesContent() {
  const router = useRouter();

  const { data, isLoading, isError } = useQuery(postulacionQueries.myList());

  // cargando
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mis Postulaciones"
          description="Cargando tus postulaciones..."
        />
        <PostulacionesSkeleton />
      </div>
    );
  }

  // error
  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mis Postulaciones" />
        <Alert variant="destructive">
          <AlertDescription>
            Error al cargar tus postulaciones. Intenta recargar la pagina.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const postulaciones = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis Postulaciones"
        description="Revisa el estado de tus postulaciones a concursos."
        action={
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/concursos")}
          >
            <Trophy className="size-4" />
            Ver concursos
          </Button>
        }
      />

      {/* sin postulaciones */}
      {postulaciones.length === 0 && (
        <EmptyState
          icon={FileText}
          title="Aun no tienes postulaciones"
          description="Explora los concursos disponibles y postulate a los que apliquen para tu empresa."
          action={
            <Button onClick={() => router.push("/dashboard/concursos")}>
              <Trophy className="size-4" />
              Ver concursos disponibles
            </Button>
          }
        />
      )}

      {/* grid de postulaciones */}
      {postulaciones.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {postulaciones.map((p) => (
            <PostulacionCard key={p.id} postulacion={p} />
          ))}
        </div>
      )}
    </div>
  );
}
