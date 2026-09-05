"use client";

import { memo } from "react";
import { useWatch } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import type { FormField as FormFieldType } from "@superstars/shared";
import { campoVisible } from "@superstars/shared";
import { CampoRenderer } from "./campo-renderer";

// Nombre que no existe en el formulario. Se observa este cuando el campo no
// depende de nadie: asi el hook se llama siempre (no puede ir dentro de un if)
// y no provoca renders de mas.
const SIN_CONDICION = "__campo_sin_condicion__";

interface CampoCondicionalProps {
  campo: FormFieldType;
  form: UseFormReturn<Record<string, unknown>>;
  convocatoriaId: number;
  postulacionId: number | undefined;
  modoPreview?: boolean;
}

// Muestra u oculta un campo segun la respuesta de otro.
// Se observa solo el campo del que depende, no el formulario entero: si no,
// cada tecla que escribe el postulante volveria a dibujar toda la seccion.
export const CampoCondicional = memo(function CampoCondicional({
  campo,
  form,
  convocatoriaId,
  postulacionId,
  modoPreview = false,
}: CampoCondicionalProps) {
  const dependeDe = campo.mostrarSi?.campo;
  const valorDelQueDepende = useWatch({
    control: form.control,
    name: dependeDe ?? SIN_CONDICION,
  });

  if (dependeDe && !campoVisible(campo, { [dependeDe]: valorDelQueDepende })) {
    return null;
  }

  return (
    <CampoRenderer
      campo={campo}
      form={form}
      convocatoriaId={convocatoriaId}
      postulacionId={postulacionId}
      modoPreview={modoPreview}
    />
  );
});
