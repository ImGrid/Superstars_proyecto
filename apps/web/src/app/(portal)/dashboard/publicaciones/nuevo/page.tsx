"use client";

import { PageHeader } from "@/components/shared/page-header";
import { PublicacionForm } from "../_components/publicacion-form";

export default function NuevaPublicacionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva publicación"
        description="Crea una nueva publicación o noticia. Se guardará como borrador."
      />
      <PublicacionForm />
    </div>
  );
}
