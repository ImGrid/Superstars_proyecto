"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Icon } from "@iconify/react";
import { PageHeader } from "@/components/shared/page-header";
import { FormSkeleton } from "@/components/shared/loading-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { empresaQueries } from "@/lib/api/query-keys";
import { EmpresaForm } from "./_components/empresa-form";

export default function MiEmpresaPage() {
  return (
    <Suspense fallback={<FormSkeleton fields={10} />}>
      <MiEmpresaContent />
    </Suspense>
  );
}

function MiEmpresaContent() {
  const { data, isLoading, isError, error } = useQuery({
    ...empresaQueries.me(),
    retry: (failureCount, err) => {
      // no reintentar en 404 (no tiene empresa, es estado valido)
      if (isAxiosError(err) && err.response?.status === 404) return false;
      return failureCount < 2;
    },
  });

  // cargando
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mi Empresa"
          description="Cargando datos de la empresa..."
        />
        <FormSkeleton fields={10} />
      </div>
    );
  }

  // error real (no 404)
  const is404 = isAxiosError(error) && error.response?.status === 404;
  if (isError && !is404) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mi Empresa" />
        <Alert variant="destructive">
          <AlertDescription>
            Error al cargar los datos de la empresa. Intenta recargar la pagina.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // modo crear (404 o sin datos) o modo editar (tiene datos)
  const isCreating = !data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi Empresa"
        description={
          isCreating
            ? "Registra los datos de tu empresa para poder postularte a concursos."
            : "Actualiza los datos de tu empresa."
        }
      />

      {isCreating && (
        <div className="flex items-center gap-3 rounded-lg border border-primary-200 bg-primary-50 p-4">
          <Icon icon="ph:building-office-duotone" className="size-5 text-primary-600 shrink-0" />
          <p className="text-sm text-primary-700">
            Aun no tienes una empresa registrada. Completa el formulario para crear el perfil de tu empresa.
            Los campos marcados con * son obligatorios.
          </p>
        </div>
      )}

      <EmpresaForm initialData={data} />
    </div>
  );
}
