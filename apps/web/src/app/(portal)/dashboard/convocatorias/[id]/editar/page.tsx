"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { EstadoConvocatoria } from "@superstars/shared";
import { PageHeader } from "@/components/shared/page-header";
import { FormSkeleton } from "@/components/shared/loading-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { convocatoriaQueries } from "@/lib/api/query-keys";
import { ConvocatoriaForm } from "../../_components/convocatoria-form";

interface EditarConvocatoriaPageProps {
  params: Promise<{ id: string }>;
}

export default function EditarConvocatoriaPage({ params }: EditarConvocatoriaPageProps) {
  const { id } = use(params);
  const convocatoriaId = Number(id);
  const router = useRouter();

  const { data, isLoading, isError } = useQuery(convocatoriaQueries.detail(convocatoriaId));

  // cargando
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Editar convocatoria" description="Cargando datos..." />
        <FormSkeleton fields={10} />
      </div>
    );
  }

  // error al cargar
  if (isError || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Editar convocatoria" />
        <Alert variant="destructive">
          <AlertDescription>
            No se pudo cargar la convocatoria. Verifica que el ID sea correcto.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/convocatorias")}
        >
          <ArrowLeft className="size-4" />
          Volver a convocatorias
        </Button>
      </div>
    );
  }

  // solo se puede editar en estado borrador
  if (data.estado !== EstadoConvocatoria.BORRADOR) {
    return (
      <div className="space-y-6">
        <PageHeader title="Editar convocatoria" />
        <Alert>
          <AlertDescription>
            Solo se puede editar una convocatoria en estado borrador. Esta convocatoria está en estado &ldquo;{data.estado}&rdquo;.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/convocatorias")}
        >
          <ArrowLeft className="size-4" />
          Volver a convocatorias
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar convocatoria"
        description={`Editando: ${data.nombre}`}
      />
      <ConvocatoriaForm initialData={data} />
    </div>
  );
}
