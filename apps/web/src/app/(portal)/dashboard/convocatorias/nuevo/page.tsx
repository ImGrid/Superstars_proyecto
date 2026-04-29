"use client";

import { PageHeader } from "@/components/shared/page-header";
import { ConvocatoriaForm } from "../_components/convocatoria-form";

export default function NuevaConvocatoriaPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva convocatoria"
        description="Completa los datos para crear una nueva convocatoria. Los campos marcados con * son obligatorios."
      />
      <ConvocatoriaForm />
    </div>
  );
}
