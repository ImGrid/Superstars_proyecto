"use client";

import { memo } from "react";
import type { FormField as FormFieldType } from "@superstars/shared";
import type { UseFormReturn } from "react-hook-form";
import { TextoCortoField } from "./fields/texto-corto-field";
import { TextoLargoField } from "./fields/texto-largo-field";
import { NumericoField } from "./fields/numerico-field";
import { SeleccionUnicaField } from "./fields/seleccion-unica-field";
import { SeleccionMultipleField } from "./fields/seleccion-multiple-field";
import { TablaField } from "./fields/tabla-field";
import { ArchivoField } from "./fields/archivo-field";
import { SiNoField } from "./fields/si-no-field";
import { TextoUrlField } from "./fields/texto-url-field";

interface CampoRendererProps {
  campo: FormFieldType;
  form: UseFormReturn<Record<string, unknown>>;
  convocatoriaId: number;
  postulacionId: number | undefined;
}

// renderiza un campo segun su tipo
export const CampoRenderer = memo(function CampoRenderer({
  campo,
  form,
  convocatoriaId,
  postulacionId,
}: CampoRendererProps) {
  switch (campo.tipo) {
    case "texto_corto":
      return <TextoCortoField campo={campo} form={form} />;

    case "texto_largo":
      return <TextoLargoField campo={campo} form={form} />;

    case "numerico":
      return <NumericoField campo={campo} form={form} />;

    case "seleccion_unica":
      return <SeleccionUnicaField campo={campo} form={form} />;

    case "seleccion_multiple":
      return <SeleccionMultipleField campo={campo} form={form} />;

    case "tabla":
      return <TablaField campo={campo} form={form} />;

    case "archivo":
      return (
        <ArchivoField
          campo={campo}
          form={form}
          convocatoriaId={convocatoriaId}
          postulacionId={postulacionId}
        />
      );

    case "si_no":
      return <SiNoField campo={campo} form={form} />;

    case "texto_url":
      return <TextoUrlField campo={campo} form={form} />;

    default:
      return null;
  }
});
