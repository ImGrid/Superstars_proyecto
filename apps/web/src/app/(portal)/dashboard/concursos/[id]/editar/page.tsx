"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { EstadoConcurso } from "@superstars/shared";
import { PageHeader } from "@/components/shared/page-header";
import { FormSkeleton } from "@/components/shared/loading-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { concursoQueries } from "@/lib/api/query-keys";
import { ConcursoForm } from "../../_components/concurso-form";

interface EditarConcursoPageProps {
  params: Promise<{ id: string }>;
}

export default function EditarConcursoPage({ params }: EditarConcursoPageProps) {
  const { id } = use(params);
  const concursoId = Number(id);
  const router = useRouter();

  const { data, isLoading, isError } = useQuery(concursoQueries.detail(concursoId));

  // cargando
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Editar concurso" description="Cargando datos..." />
        <FormSkeleton fields={10} />
      </div>
    );
  }

  // error al cargar
  if (isError || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Editar concurso" />
        <Alert variant="destructive">
          <AlertDescription>
            No se pudo cargar el concurso. Verifica que el ID sea correcto.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/concursos")}
        >
          <ArrowLeft className="size-4" />
          Volver a concursos
        </Button>
      </div>
    );
  }

  // solo se puede editar en estado borrador
  if (data.estado !== EstadoConcurso.BORRADOR) {
    return (
      <div className="space-y-6">
        <PageHeader title="Editar concurso" />
        <Alert>
          <AlertDescription>
            Solo se puede editar un concurso en estado borrador. Este concurso esta en estado &ldquo;{data.estado}&rdquo;.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/concursos")}
        >
          <ArrowLeft className="size-4" />
          Volver a concursos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar concurso"
        description={`Editando: ${data.nombre}`}
      />
      <ConcursoForm initialData={data} />
    </div>
  );
}
