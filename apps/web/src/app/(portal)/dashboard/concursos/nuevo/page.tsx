"use client";

import { PageHeader } from "@/components/shared/page-header";
import { ConcursoForm } from "../_components/concurso-form";

export default function NuevoConcursoPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo concurso"
        description="Completa los datos para crear un nuevo concurso. Los campos marcados con * son obligatorios."
      />
      <ConcursoForm />
    </div>
  );
}
