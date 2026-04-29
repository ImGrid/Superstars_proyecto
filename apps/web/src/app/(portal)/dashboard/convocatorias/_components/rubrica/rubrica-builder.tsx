"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { Icon } from "@iconify/react";
import type { RubricaFullResponse } from "@superstars/shared";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { rubricaQueries } from "@/lib/api/query-keys";
import { PesoProgress } from "./peso-progress";
import { CriterioItem } from "./criterio-item";
import { AddCriterioDialog } from "./add-criterio-dialog";

interface RubricaBuilderProps {
  convocatoriaId: number;
  rubrica: RubricaFullResponse;
  canEdit: boolean;
}

export function RubricaBuilder({
  convocatoriaId,
  rubrica,
  canEdit,
}: RubricaBuilderProps) {
  const [addCriterioOpen, setAddCriterioOpen] = useState(false);

  // validacion server-side
  const { data: validacion } = useQuery({
    ...rubricaQueries.validacion(convocatoriaId),
    refetchOnWindowFocus: true,
  });

  // calcular suma de pesos de criterios
  const puntajeTotal = Number(rubrica.puntajeTotal);
  const sumaCriterios = rubrica.criterios.reduce(
    (sum, c) => sum + Number(c.pesoPorcentaje),
    0,
  );

  const criteriosCount = rubrica.criterios.length;
  const subCriteriosCount = rubrica.criterios.reduce(
    (sum, c) => sum + c.subCriterios.length,
    0,
  );

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-secondary-200 bg-white p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-secondary-900">
            {rubrica.nombre}
          </h3>
          <p className="text-xs text-secondary-500">
            {criteriosCount} {criteriosCount === 1 ? "criterio" : "criterios"},{" "}
            {subCriteriosCount}{" "}
            {subCriteriosCount === 1 ? "sub-criterio" : "sub-criterios"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* estado de validacion */}
          {validacion && (
            <Tooltip>
              <TooltipTrigger asChild>
                {validacion.completa ? (
                  <Badge
                    variant="outline"
                    className="gap-1 border-emerald-300 text-emerald-600"
                  >
                    <Icon icon="ph:check-circle-duotone"className="size-3" />
                    Completa
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <Icon icon="ph:warning-duotone"className="size-3" />
                    {validacion.errores.length}{" "}
                    {validacion.errores.length === 1 ? "error" : "errores"}
                  </Badge>
                )}
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm">
                {validacion.completa ? (
                  <p>La rubrica esta completa y lista para publicar</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {validacion.errores.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </TooltipContent>
            </Tooltip>
          )}

          <Badge variant="outline" className="text-secondary-500">
            Total: {puntajeTotal} pts
          </Badge>
        </div>
      </div>

      {/* barra de progreso global de pesos */}
      <PesoProgress
        actual={sumaCriterios}
        objetivo={puntajeTotal}
        label="Suma de pesos de criterios"
      />

      {/* lista de criterios */}
      {rubrica.criterios.length === 0 ? (
        <div className="rounded-lg border border-dashed border-secondary-300 bg-white p-8 text-center">
          <Info className="mx-auto size-8 text-secondary-300" />
          <p className="mt-2 text-sm text-secondary-500">
            No hay criterios definidos. Agrega el primer criterio para comenzar
            a construir la rubrica.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rubrica.criterios
            .sort((a, b) => a.orden - b.orden)
            .map((criterio, idx) => (
              <CriterioItem
                key={criterio.id}
                convocatoriaId={convocatoriaId}
                criterio={criterio}
                isFirst={idx === 0}
                isLast={idx === rubrica.criterios.length - 1}
                canEdit={canEdit}
              />
            ))}
        </div>
      )}

      {/* boton agregar criterio */}
      {canEdit && (
        <AddCriterioDialog
          convocatoriaId={convocatoriaId}
          nextOrden={rubrica.criterios.length + 1}
          open={addCriterioOpen}
          onOpenChange={setAddCriterioOpen}
        />
      )}
    </div>
  );
}
