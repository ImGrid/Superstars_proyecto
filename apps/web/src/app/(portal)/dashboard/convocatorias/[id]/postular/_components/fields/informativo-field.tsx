"use client";

import { memo } from "react";
import { Icon } from "@iconify/react";
import type { FormField } from "@superstars/shared";

type CampoInformativo = Extract<FormField, { tipo: "informativo" }>;

// clases compartidas para el HTML sencillo del contenido (listas, enlaces, negrita, tablas)
const prosa =
  "[&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:font-semibold [&_a]:text-primary-600 [&_a]:underline [&_table]:w-full [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1";

// bloque de solo presentacion: no captura dato, no valida, no aparece en el resumen.
// el contenido es HTML sencillo autorizado por el responsable (se sanitiza al guardar el formulario).
export const InformativoField = memo(function InformativoField({
  campo,
}: {
  campo: CampoInformativo;
}) {
  const html = { __html: campo.contenido };

  switch (campo.variante) {
    case "subtitulo":
      return (
        <h3
          className="font-heading text-base font-semibold text-secondary-900 pt-2"
          dangerouslySetInnerHTML={html}
        />
      );

    case "nota":
      return (
        <div
          className={`rounded-lg border border-secondary-200 bg-secondary-50 p-4 text-sm leading-relaxed text-secondary-700 ${prosa}`}
          dangerouslySetInnerHTML={html}
        />
      );

    case "advertencia":
      return (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
          <Icon icon="ph:warning-duotone" className="size-4 shrink-0 mt-0.5 text-amber-600" />
          <div className={prosa} dangerouslySetInnerHTML={html} />
        </div>
      );

    case "detalle":
      return (
        <details className="rounded-lg border border-secondary-200 p-3 text-sm">
          <summary className="cursor-pointer font-medium text-secondary-800">
            {campo.etiqueta || "Ver más"}
          </summary>
          <div
            className={`mt-2 leading-relaxed text-secondary-700 ${prosa}`}
            dangerouslySetInnerHTML={html}
          />
        </details>
      );

    case "parrafo":
    default:
      return (
        <div
          className={`text-sm leading-relaxed text-secondary-700 ${prosa}`}
          dangerouslySetInnerHTML={html}
        />
      );
  }
});
