"use client";

import { memo } from "react";
import { Icon } from "@iconify/react";
import type { SchemaDefinition } from "@superstars/shared";
import { calculateCompletionPercentage, isFieldFilled } from "@superstars/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
      {/* barra de progreso global */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-secondary-700">
              Progreso total
            </span>
            <span
              className={`text-sm font-bold ${
                isComplete ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {Math.round(porcentaje)}%
            </span>
          </div>
          <Progress value={porcentaje} className="h-3" />
          {isComplete ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
              <Icon icon="ph:check-circle-duotone"className="size-4" />
              Tu formulario esta completo. Puedes enviar tu postulacion.
            </p>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-sm text-amber-600">
              <Icon icon="ph:warning-duotone"className="size-4" />
              Completa todos los campos requeridos antes de enviar.
            </p>
          )}
        </CardContent>
      </Card>

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
                    <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                      <Icon icon="ph:check-circle-duotone"className="size-3 mr-1" />
                      Completa
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
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
                {seccion.campos.map((campo) => {
                  const value = responseData[campo.id];
                  const isFilled = isFieldFilled(campo.tipo, value);
                  const displayValue = formatFieldValue(campo.tipo, value);

                  return (
                    <div
                      key={campo.id}
                      className="flex items-start justify-between gap-4 text-sm"
                    >
                      <span className="text-secondary-500 shrink-0">
                        {campo.etiqueta}
                        {campo.requerido && !isFilled && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </span>
                      <span
                        className={`text-right ${
                          isFilled
                            ? "text-secondary-900"
                            : "text-secondary-300 italic"
                        }`}
                      >
                        {isFilled ? displayValue : "Sin completar"}
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

// formatea el valor de un campo para mostrarlo en el resumen
function formatFieldValue(tipo: string, value: unknown): string {
  if (value === undefined || value === null) return "";

  switch (tipo) {
    case "texto_corto":
    case "texto_largo":
    case "texto_url":
    case "seleccion_unica":
      return String(value);

    case "numerico":
      return String(value);

    case "seleccion_multiple":
      if (Array.isArray(value)) return value.join(", ");
      return "";

    case "tabla":
      if (Array.isArray(value)) return `${value.length} fila(s)`;
      return "";

    case "archivo":
      if (Array.isArray(value)) return `${value.length} archivo(s)`;
      return "";

    case "si_no":
      return value === true ? "Si" : value === false ? "No" : "";

    default:
      return String(value);
  }
}
