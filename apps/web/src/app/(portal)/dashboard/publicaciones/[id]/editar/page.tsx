"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { EstadoPublicacion } from "@superstars/shared";
import { PageHeader } from "@/components/shared/page-header";
import { FormSkeleton } from "@/components/shared/loading-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { publicacionQueries } from "@/lib/api/query-keys";
import { PublicacionForm } from "../../_components/publicacion-form";

interface EditarPublicacionPageProps {
  params: Promise<{ id: string }>;
}

export default function EditarPublicacionPage({
  params,
}: EditarPublicacionPageProps) {
  const { id } = use(params);
  const publicacionId = Number(id);
  const router = useRouter();

  const { data, isLoading, isError } = useQuery(
    publicacionQueries.detail(publicacionId),
  );

  // cargando
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Editar publicacion"
          description="Cargando datos..."
        />
        <FormSkeleton fields={6} />
      </div>
    );
  }

  // error al cargar
  if (isError || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Editar publicacion" />
        <Alert variant="destructive">
          <AlertDescription>
            No se pudo cargar la publicacion. Verifica que el ID sea correcto.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/publicaciones")}
        >
          <ArrowLeft className="size-4" />
          Volver a publicaciones
        </Button>
      </div>
    );
  }

  // no editable si esta expirado
  if (data.estado === EstadoPublicacion.EXPIRADO) {
    return (
      <div className="space-y-6">
        <PageHeader title="Editar publicacion" />
        <Alert>
          <AlertDescription>
            No se puede editar una publicacion en estado
            &ldquo;expirado&rdquo;. Puedes republicarla o archivarla desde la
            lista.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/publicaciones")}
        >
          <ArrowLeft className="size-4" />
          Volver a publicaciones
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar publicacion"
        description={`Editando: ${data.titulo}`}
      />
      <PublicacionForm initialData={data} />
    </div>
  );
}
