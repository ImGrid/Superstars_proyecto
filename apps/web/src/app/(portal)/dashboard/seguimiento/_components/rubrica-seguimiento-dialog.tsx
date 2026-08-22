"use client";

import type { SeguimientoRubrica, NivelEnum } from "@superstars/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tipoCriterioLabels } from "@/app/(portal)/dashboard/convocatorias/_components/rubrica/_lib/tipo-criterio-labels";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rubrica: SeguimientoRubrica;
}

// etiqueta y color por nivel, de menor a mayor exigencia
const NIVEL_META: Record<NivelEnum, { label: string; className: string }> = {
  basico: {
    label: "Básico",
    className: "bg-secondary-100 text-secondary-700 border-secondary-200",
  },
  intermedio: {
    label: "Intermedio",
    className: "bg-info-50 text-info-700 border-info-200",
  },
  avanzado: {
    label: "Avanzado",
    className: "bg-success-50 text-success-700 border-success-200",
  },
};

// Vista de la rubrica de evaluacion en solo lectura (rol observador).
//
// Muestra la estructura completa con la que se califica: criterios, sub-criterios
// y los niveles (basico/intermedio/avanzado) con su rango de puntaje. NO muestra
// notas de ningun jurado: es la definicion de la rubrica, no calificaciones.
export function RubricaSeguimientoDialog({ open, onOpenChange, rubrica }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rubrica.nombre}</DialogTitle>
          <DialogDescription>
            Criterios de evaluación. Puntaje total: {rubrica.puntajeTotal} puntos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {rubrica.criterios.map((criterio) => (
            <Card key={criterio.id} className="shadow-sm">
              <CardHeader className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-sm font-semibold text-secondary-900">
                    {criterio.nombre}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {tipoCriterioLabels[criterio.tipo]}
                  </Badge>
                  <span className="text-xs font-medium text-secondary-500 tabular-nums">
                    {criterio.pesoPorcentaje}%
                  </span>
                </div>
                {criterio.descripcion && (
                  <p className="text-xs text-secondary-600">{criterio.descripcion}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {criterio.subCriterios.map((sc) => (
                  <div
                    key={sc.id}
                    className="rounded-md border border-secondary-200 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-secondary-800">
                        {sc.nombre}
                      </span>
                      <span className="shrink-0 text-xs font-normal text-secondary-400 tabular-nums">
                        {sc.pesoPorcentaje}%
                      </span>
                    </div>
                    {sc.descripcion && (
                      <p className="mt-0.5 text-xs text-secondary-600">
                        {sc.descripcion}
                      </p>
                    )}

                    {/* niveles: como se puntua este sub-criterio */}
                    {sc.niveles.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {sc.niveles.map((n) => {
                          const meta = NIVEL_META[n.nivel];
                          return (
                            <div
                              key={n.id}
                              className="flex items-start gap-2 text-xs"
                            >
                              <Badge
                                variant="outline"
                                className={`shrink-0 ${meta.className}`}
                              >
                                {meta.label}
                              </Badge>
                              <span className="shrink-0 font-medium text-secondary-500 tabular-nums">
                                {n.puntajeMin}–{n.puntajeMax}
                              </span>
                              <span className="text-secondary-600">
                                {n.descripcion}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
