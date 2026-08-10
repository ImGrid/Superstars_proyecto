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
import { EmpresaHero } from "./_components/empresa-hero";

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
      {isCreating ? (
        <PageHeader
          title="Mi Empresa"
          description="Registra los datos de tu empresa para poder postularte a convocatorias."
        />
      ) : (
        <EmpresaHero empresa={data} />
      )}

      {/* Al registrar por primera vez, lo unico que hace falta es el nombre.
          Decirlo explicitamente evita que la persona salga a buscar el NIT o el
          SEPREC y no vuelva. */}
      {isCreating && (
        <div className="flex items-start gap-3 rounded-lg border border-primary-200 bg-primary-50 p-4">
          <Icon icon="ph:lightbulb-duotone" className="mt-0.5 size-5 shrink-0 text-primary-600" />
          <div className="text-sm text-primary-700">
            <p className="font-semibold">
              Para registrar la empresa es suficiente con su nombre.
            </p>
            <p className="mt-0.5">
              La razón social es el único campo obligatorio. Los demás datos —NIT,
              registro SEPREC, dirección— pueden completarse más adelante.
            </p>
          </div>
        </div>
      )}

      <EmpresaForm initialData={data} />
    </div>
  );
}
