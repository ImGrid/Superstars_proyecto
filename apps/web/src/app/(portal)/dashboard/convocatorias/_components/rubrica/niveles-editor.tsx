"use client";

import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import type { NivelEvaluacionResponse } from "@superstars/shared";
import { NivelEnum } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { rubricaQueries } from "@/lib/api/query-keys";
import { updateNivel } from "@/lib/api/rubrica.api";

interface NivelesEditorProps {
  convocatoriaId: number;
  niveles: NivelEvaluacionResponse[];
  canEdit: boolean;
}

// colores por nivel
const nivelConfig: Record<
  string,
  { label: string; color: string }
> = {
  [NivelEnum.BASICO]: {
    label: "Basico",
    color: "border-amber-200 bg-amber-50/50",
  },
  [NivelEnum.INTERMEDIO]: {
    label: "Intermedio",
    color: "border-blue-200 bg-blue-50/50",
  },
  [NivelEnum.AVANZADO]: {
    label: "Avanzado",
    color: "border-emerald-200 bg-emerald-50/50",
  },
};

// orden fijo
const nivelOrden = [NivelEnum.BASICO, NivelEnum.INTERMEDIO, NivelEnum.AVANZADO];

export function NivelesEditor({
  convocatoriaId,
  niveles,
  canEdit,
}: NivelesEditorProps) {
  // ordenar por nivel fijo
  const sorted = nivelOrden
    .map((n) => niveles.find((niv) => niv.nivel === n))
    .filter(Boolean) as NivelEvaluacionResponse[];

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {sorted.map((nivel) => (
        <NivelCard
          key={nivel.id}
          convocatoriaId={convocatoriaId}
          nivel={nivel}
          canEdit={canEdit}
        />
      ))}
    </div>
  );
}

// card individual de nivel
function NivelCard({
  convocatoriaId,
  nivel,
  canEdit,
}: {
  convocatoriaId: number;
  nivel: NivelEvaluacionResponse;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const config = nivelConfig[nivel.nivel];

  const [desc, setDesc] = useState(nivel.descripcion);
  const [pMin, setPMin] = useState(nivel.puntajeMin);
  const [pMax, setPMax] = useState(nivel.puntajeMax);

  // detectar si hay cambios
  const isDirty =
    desc !== nivel.descripcion ||
    pMin !== nivel.puntajeMin ||
    pMax !== nivel.puntajeMax;

  const mutation = useMutation({
    mutationFn: () =>
      updateNivel(convocatoriaId, nivel.id, {
        descripcion: desc,
        puntajeMin: Number(pMin),
        puntajeMax: Number(pMax),
      }),
    onSuccess: () => {
      toast.success(`Nivel ${config.label} actualizado`);
      queryClient.invalidateQueries({
        queryKey: rubricaQueries.detail(convocatoriaId).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: rubricaQueries.validacion(convocatoriaId).queryKey,
      });
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al actualizar el nivel";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  const handleSave = useCallback(() => {
    if (!isDirty) return;
    mutation.mutate();
  }, [isDirty, mutation]);

  return (
    <div className={`rounded-lg border p-2.5 space-y-2 ${config.color}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-secondary-700">
          {config.label}
        </span>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={pMin}
            onChange={(e) => setPMin(e.target.value)}
            className="h-6 w-14 text-center text-xs bg-white"
            min={0}
            disabled={!canEdit}
          />
          <span className="text-xs text-secondary-400">-</span>
          <Input
            type="number"
            value={pMax}
            onChange={(e) => setPMax(e.target.value)}
            className="h-6 w-14 text-center text-xs bg-white"
            min={0}
            disabled={!canEdit}
          />
        </div>
      </div>
      <Textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        className="min-h-[48px] text-xs bg-white resize-none"
        rows={2}
        disabled={!canEdit}
      />
      {canEdit && isDirty && (
        <Button
          size="sm"
          variant="outline"
          className="h-6 w-full text-xs gap-1"
          onClick={handleSave}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Save className="size-3" />
          )}
          Guardar
        </Button>
      )}
    </div>
  );
}
