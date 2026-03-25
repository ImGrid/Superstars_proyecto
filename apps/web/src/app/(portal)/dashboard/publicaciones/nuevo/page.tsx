"use client";

import { PageHeader } from "@/components/shared/page-header";
import { PublicacionForm } from "../_components/publicacion-form";

export default function NuevaPublicacionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva publicacion"
        description="Crea una nueva publicacion o noticia. Se guardara como borrador."
      />
      <PublicacionForm />
    </div>
  );
}
