"use client";

import { memo } from "react";
import { Icon } from "@iconify/react";
import type { SchemaDefinition, FormField } from "@superstars/shared";
import { calculateCompletionPercentage, isFieldFilled, esCampoDeDato } from "@superstars/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ReviewStepProps {
  schema: SchemaDefinition;
  responseData: Record<string, unknown>;
  onGoToStep: (step: number) => void;
}

// paso final de revision antes de enviar
export const ReviewStep = memo(function ReviewStep({
  schema,
  responseData,
  onGoToStep,
}: ReviewStepProps) {
  const porcentaje = calculateCompletionPercentage(schema, responseData);
  const isComplete = porcentaje >= 100;

  return (
    <div className="space-y-6">
      {/* Mensaje de estado del formulario. Antes habia una segunda barra de progreso
          aqui que duplicaba la del header del wizard, lo que confundia al usuario
          (cliente reporto: "no se a cual hacer caso"). Mantener solo el mensaje
          guia con el icono y la accion clara segun el estado. */}
      {isComplete ? (
        <div className="flex items-center gap-3 rounded-lg border border-success-200 bg-success-50 p-4">
          <Icon icon="ph:check-circle-duotone" className="size-5 text-success-600 shrink-0" />
          <p className="text-sm font-medium text-success-800">
            Tu formulario está completo. Revisa los datos abajo y envía cuando estés listo.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-warning-300 bg-warning-50 p-4">
          <Icon icon="ph:warning-duotone" className="size-5 text-warning-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-warning-800">
              Te faltan campos obligatorios por completar
            </p>
            <p className="mt-0.5 text-xs text-warning-700">
              Los campos resaltados abajo son obligatorios y aún no tienen respuesta.
              Haz clic en "Editar" en cada sección para completarlos.
            </p>
          </div>
        </div>
      )}

      {/* resumen por seccion */}
      {schema.secciones.map((seccion, secIdx) => {
        const required = seccion.campos.filter((c) => c.requerido);
        const filled = required.filter((c) =>
          isFieldFilled(c.tipo, responseData[c.id]),
        );
        const secComplete = required.length === 0 || filled.length === required.length;

        return (
          <Card key={seccion.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{seccion.titulo}</CardTitle>
                <div className="flex items-center gap-2">
                  {secComplete ? (
                    <Badge variant="outline" className="text-success-600 border-success-300">
                      <Icon icon="ph:check-circle-duotone"className="size-3 mr-1" />
                      Completa
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-warning-600 border-warning-300">
                      {filled.length}/{required.length} campos
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => onGoToStep(secIdx)}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Editar
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {seccion.campos.filter(esCampoDeDato).map((campo) => {
                  const value = responseData[campo.id];
                  const otraValue = responseData[`${campo.id}__otra`] as string | undefined;
                  const isFilled = isFieldFilled(campo.tipo, value);
                  const displayValue = formatFieldValue(campo, value, otraValue);

                  // 3 estados visuales distintos:
                  //  - lleno: valor en gris oscuro (info normal)
                  //  - obligatorio sin completar: resaltado en ambar con icono warning;
                  //    asi el usuario detecta de inmediato lo que le falta
                  //  - opcional sin completar: "Opcional" en gris sutil; no genera urgencia
                  //    para que el usuario no confunda lo que "se permite vacio" con lo
                  //    que "le falta para enviar"
                  const requeridoSinCompletar = !isFilled && campo.requerido;
                  const opcionalSinCompletar = !isFilled && !campo.requerido;

                  return (
                    <div
                      key={campo.id}
                      className={`flex items-start justify-between gap-4 text-sm rounded-md px-2 py-1.5 -mx-2 ${
                        requeridoSinCompletar ? "bg-warning-50/60" : ""
                      }`}
                    >
                      <span className={`shrink-0 ${requeridoSinCompletar ? "text-warning-800 font-medium" : "text-secondary-500"}`}>
                        {campo.etiqueta}
                        {campo.requerido && (
                          <span className={`ml-1 ${requeridoSinCompletar ? "text-warning-600" : "text-error-500"}`}>*</span>
                        )}
                      </span>
                      <span
                        className={`text-right ${
                          requeridoSinCompletar
                            ? "text-warning-700 font-medium inline-flex items-center gap-1"
                            : opcionalSinCompletar
                              ? "text-secondary-400"
                              : "text-secondary-900"
                        }`}
                      >
                        {requeridoSinCompletar && (
                          <Icon icon="ph:warning-circle-fill" className="size-3.5 text-warning-600" />
                        )}
                        {isFilled
                          ? displayValue
                          : requeridoSinCompletar
                            ? "Falta completar"
                            : "Opcional"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

// resuelve un slug a su etiqueta visible buscandolo en las opciones del campo.
// El centinela "__otra__" se reemplaza por "Otra: <texto libre>" cuando hay
// otraValue (texto del sub-campo). Sin otraValue cae en "Otra".
function labelDeOpcion(
  slug: string,
  opciones: Array<{ valor: string; label: string }>,
  otraValue?: string,
): string {
  if (slug === "__otra__") {
    return otraValue ? `Otra: ${otraValue}` : "Otra";
  }
  const opcion = opciones.find((o) => o.valor === slug);
  return opcion?.label ?? slug;
}

// formatea el valor de un campo para mostrarlo en el resumen
function formatFieldValue(campo: FormField, value: unknown, otraValue?: string): string {
  if (value === undefined || value === null) return "";

  switch (campo.tipo) {
    case "texto_corto":
    case "texto_largo":
    case "texto_url":
      return String(value);

    case "numerico":
      return String(value);

    case "seleccion_unica":
      return labelDeOpcion(String(value), campo.opciones, otraValue);

    case "seleccion_multiple":
      if (!Array.isArray(value)) return "";
      return (value as string[])
        .map((v) => labelDeOpcion(v, campo.opciones, otraValue))
        .join(", ");

    case "tabla":
      if (Array.isArray(value)) return `${value.length} fila(s)`;
      return "";

    case "archivo":
      if (Array.isArray(value)) return `${value.length} archivo(s)`;
      return "";

    case "si_no":
      return value === true
        ? (campo.labelSi ?? "Si")
        : value === false
          ? (campo.labelNo ?? "No")
          : "";

    default:
      return String(value);
  }
}
