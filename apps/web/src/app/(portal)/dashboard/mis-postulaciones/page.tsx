"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { postulacionQueries } from "@/lib/api/query-keys";
import { esFaltaEmpresa } from "@/lib/api/reintentos";
import { LienzoProponente } from "@/components/portal/lienzo-proponente";
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

  const { data, isLoading, isError, error } = useQuery({
    ...postulacionQueries.myList(),
    retry: (failureCount, err) => (esFaltaEmpresa(err) ? false : failureCount < 2),
  });

  // "todavia no registro su empresa" no es un fallo: antes caia en el error
  // rojo generico que pedia recargar la pagina, y parecia el sistema caido
  const faltaEmpresa = esFaltaEmpresa(error);

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

  // todavia no tiene empresa: no es un error, le falta un paso
  if (faltaEmpresa) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mis Postulaciones"
          description="Revisa el estado de tus postulaciones a convocatorias."
        />
        <EmptyState
          icon="ph:building-office-duotone"
          title="Todavía no tienes una empresa registrada"
          description="Las postulaciones se registran a nombre de la empresa. Para crearla solo se requiere la razón social; los demás datos pueden completarse más adelante."
          action={
            <Button onClick={() => router.push("/dashboard/mi-empresa")}>
              <Icon icon="ph:building-office-duotone" className="size-4" />
              Registrar mi empresa
            </Button>
          }
        />
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
            No fue posible cargar tus postulaciones. Inténtalo nuevamente en unos
            minutos.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const postulaciones = data ?? [];

  return (
    <LienzoProponente>
    <div className="space-y-6">
      <PageHeader
        title="Mis Postulaciones"
        description="Revisa el estado de tus postulaciones a convocatorias."
        action={
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/convocatorias")}
          >
            <Icon icon="ph:trophy-duotone" className="size-4" />
            Ver convocatorias
          </Button>
        }
      />

      {/* sin postulaciones */}
      {postulaciones.length === 0 && (
        <EmptyState
          icon="ph:file-text-duotone"
          title="Aún no tienes postulaciones"
          description="Explora las convocatorias disponibles y postúlate a las que apliquen para tu empresa."
          action={
            <Button onClick={() => router.push("/dashboard/convocatorias")}>
              <Icon icon="ph:trophy-duotone" className="size-4" />
              Ver convocatorias disponibles
            </Button>
          }
        />
      )}

      {/* items-start es la clave: sin el, la rejilla estira todas las tarjetas
          al alto de la mas alta y aparece el hueco muerto. Con el, cada una
          mide lo que necesita y ademas se aprovecha el ancho. */}
      {postulaciones.length > 0 && (
        <div className="grid items-start gap-3 xl:grid-cols-2">
          {postulaciones.map((p) => (
            <PostulacionCard key={p.id} postulacion={p} />
          ))}
        </div>
      )}
    </div>
    </LienzoProponente>
  );
}
