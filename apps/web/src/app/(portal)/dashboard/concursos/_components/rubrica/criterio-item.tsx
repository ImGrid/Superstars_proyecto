"use client";

import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Loader2,
  Save,
} from "lucide-react";
import type {
  CriterioResponse,
  SubCriterioResponse,
  NivelEvaluacionResponse,
} from "@superstars/shared";
import { TipoCriterio } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { rubricaQueries } from "@/lib/api/query-keys";
import { updateCriterio, deleteCriterio } from "@/lib/api/rubrica.api";
import { tipoCriterioLabels, tipoCriterioOptions } from "./_lib/tipo-criterio-labels";
import { PesoProgress } from "./peso-progress";
import { SubCriterioItem } from "./sub-criterio-item";
import { AddSubCriterioDialog } from "./add-sub-criterio-dialog";

// tipo extendido con sub-criterios + niveles
type CriterioWithChildren = CriterioResponse & {
  subCriterios: (SubCriterioResponse & {
    nivelEvaluacions: NivelEvaluacionResponse[];
  })[];
};

interface CriterioItemProps {
  concursoId: number;
  criterio: CriterioWithChildren;
  isFirst: boolean;
  isLast: boolean;
  canEdit: boolean;
}

export function CriterioItem({
  concursoId,
  criterio,
  isFirst,
  isLast,
  canEdit,
}: CriterioItemProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // estado local de edicion
  const [editNombre, setEditNombre] = useState(criterio.nombre);
  const [editTipo, setEditTipo] = useState(criterio.tipo);
  const [editPeso, setEditPeso] = useState(criterio.pesoPorcentaje);

  const peso = Number(criterio.pesoPorcentaje);
  const sumaSubCriterios = criterio.subCriterios.reduce(
    (sum, sc) => sum + Number(sc.pesoPorcentaje),
    0,
  );

  // invalidar queries
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: rubricaQueries.detail(concursoId).queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: rubricaQueries.validacion(concursoId).queryKey,
    });
  }, [queryClient, concursoId]);

  // actualizar criterio
  const updateMutation = useMutation({
    mutationFn: (data: { nombre?: string; tipo?: TipoCriterio; pesoPorcentaje?: number; orden?: number }) =>
      updateCriterio(concursoId, criterio.id, data),
    onSuccess: () => {
      toast.success("Criterio actualizado");
      setIsEditing(false);
      invalidate();
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al actualizar";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  // eliminar criterio
  const deleteMutation = useMutation({
    mutationFn: () => deleteCriterio(concursoId, criterio.id),
    onSuccess: () => {
      toast.success("Criterio eliminado");
      setDeleteOpen(false);
      invalidate();
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al eliminar";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  // reordenar
  const reorderMutation = useMutation({
    mutationFn: (newOrden: number) =>
      updateCriterio(concursoId, criterio.id, { orden: newOrden }),
    onSuccess: () => invalidate(),
    onError: () => toast.error("Error al reordenar"),
  });

  function handleSaveEdit() {
    const changes: { nombre?: string; tipo?: TipoCriterio; pesoPorcentaje?: number } = {};
    if (editNombre.trim() !== criterio.nombre) {
      changes.nombre = editNombre.trim();
    }
    if (editTipo !== criterio.tipo) {
      changes.tipo = editTipo;
    }
    if (editPeso !== criterio.pesoPorcentaje) {
      changes.pesoPorcentaje = Number(editPeso);
    }
    if (Object.keys(changes).length > 0) {
      updateMutation.mutate(changes);
    } else {
      setIsEditing(false);
    }
  }

  function startEdit() {
    setEditNombre(criterio.nombre);
    setEditTipo(criterio.tipo);
    setEditPeso(criterio.pesoPorcentaje);
    setIsEditing(true);
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border border-secondary-200 bg-white">
        {/* header */}
        <div className="flex items-center gap-2 p-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7 shrink-0">
              {isOpen ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronUp className="size-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          {isEditing ? (
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <Input
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                className="h-8 flex-1 min-w-[200px] text-sm font-semibold"
              />
              <Select
                value={editTipo}
                onValueChange={(v) => setEditTipo(v as TipoCriterio)}
              >
                <SelectTrigger className="h-8 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tipoCriterioOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={editPeso}
                  onChange={(e) => setEditPeso(e.target.value)}
                  className="h-8 w-20 text-sm"
                  min={1}
                  max={100}
                />
                <span className="text-sm text-secondary-500">%</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-secondary-900 truncate block">
                  {criterio.nombre}
                </span>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">
                {tipoCriterioLabels[criterio.tipo]}
              </Badge>
              <Badge variant="outline" className="text-xs font-semibold shrink-0">
                {peso}%
              </Badge>
            </>
          )}

          {/* badge conteo cuando colapsada */}
          {!isOpen && criterio.subCriterios.length > 0 && !isEditing && (
            <Badge variant="secondary" className="text-xs">
              {criterio.subCriterios.length} sub-criterio
              {criterio.subCriterios.length !== 1 && "s"}
            </Badge>
          )}

          {/* spacer */}
          {!isEditing && <div className="flex-1" />}

          {/* acciones */}
          {canEdit && !isEditing && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={startEdit}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={isFirst}
                onClick={() =>
                  reorderMutation.mutate(criterio.orden - 1)
                }
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={isLast}
                onClick={() =>
                  reorderMutation.mutate(criterio.orden + 1)
                }
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        </div>

        {/* contenido colapsable */}
        <CollapsibleContent>
          <div className="border-t border-secondary-100 px-3 py-2 space-y-2">
            {/* barra de progreso de sub-criterios */}
            <PesoProgress
              actual={sumaSubCriterios}
              objetivo={peso}
              label="Peso sub-criterios"
            />

            {/* lista de sub-criterios */}
            {criterio.subCriterios.length === 0 ? (
              <p className="py-3 text-center text-xs text-secondary-400">
                Sin sub-criterios. Agrega al menos uno.
              </p>
            ) : (
              <div className="space-y-1.5">
                {criterio.subCriterios
                  .sort((a, b) => a.orden - b.orden)
                  .map((sc, idx) => (
                    <SubCriterioItem
                      key={sc.id}
                      concursoId={concursoId}
                      subCriterio={sc}
                      isFirst={idx === 0}
                      isLast={idx === criterio.subCriterios.length - 1}
                      canEdit={canEdit}
                    />
                  ))}
              </div>
            )}

            {/* boton agregar sub-criterio */}
            {canEdit && (
              <div className="pt-1">
                <AddSubCriterioDialog
                  concursoId={concursoId}
                  criterioId={criterio.id}
                  nextOrden={criterio.subCriterios.length + 1}
                />
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>

      {/* dialogo confirmar eliminacion */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar criterio"
        description={`Se eliminara "${criterio.nombre}" con todos sus sub-criterios y niveles. Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => deleteMutation.mutate()}
        isLoading={deleteMutation.isPending}
      />
    </Collapsible>
  );
}
