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
  SubCriterioResponse,
  NivelEvaluacionResponse,
} from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { rubricaQueries } from "@/lib/api/query-keys";
import {
  updateSubCriterio,
  deleteSubCriterio,
} from "@/lib/api/rubrica.api";
import { NivelesEditor } from "./niveles-editor";

// tipo extendido con niveles anidados
type SubCriterioWithNiveles = SubCriterioResponse & {
  nivelEvaluacions: NivelEvaluacionResponse[];
};

interface SubCriterioItemProps {
  convocatoriaId: number;
  subCriterio: SubCriterioWithNiveles;
  isFirst: boolean;
  isLast: boolean;
  canEdit: boolean;
}

export function SubCriterioItem({
  convocatoriaId,
  subCriterio,
  isFirst,
  isLast,
  canEdit,
}: SubCriterioItemProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editNombre, setEditNombre] = useState(subCriterio.nombre);
  const [editPeso, setEditPeso] = useState(subCriterio.pesoPorcentaje);

  const peso = Number(subCriterio.pesoPorcentaje);

  // invalidar queries
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: rubricaQueries.detail(convocatoriaId).queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: rubricaQueries.validacion(convocatoriaId).queryKey,
    });
  }, [queryClient, convocatoriaId]);

  // actualizar sub-criterio
  const updateMutation = useMutation({
    mutationFn: (data: { nombre?: string; pesoPorcentaje?: number; orden?: number }) =>
      updateSubCriterio(convocatoriaId, subCriterio.id, data),
    onSuccess: () => {
      toast.success("Sub-criterio actualizado");
      setIsEditing(false);
      invalidate();
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al actualizar";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  // eliminar sub-criterio
  const deleteMutation = useMutation({
    mutationFn: () => deleteSubCriterio(convocatoriaId, subCriterio.id),
    onSuccess: () => {
      toast.success("Sub-criterio eliminado");
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
      updateSubCriterio(convocatoriaId, subCriterio.id, { orden: newOrden }),
    onSuccess: () => invalidate(),
    onError: () => toast.error("Error al reordenar"),
  });

  function handleSaveEdit() {
    const changes: { nombre?: string; pesoPorcentaje?: number } = {};
    if (editNombre.trim() !== subCriterio.nombre) {
      changes.nombre = editNombre.trim();
    }
    if (editPeso !== subCriterio.pesoPorcentaje) {
      changes.pesoPorcentaje = Number(editPeso);
    }
    if (Object.keys(changes).length > 0) {
      updateMutation.mutate(changes);
    } else {
      setIsEditing(false);
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-md border border-secondary-100 bg-secondary-50/30">
        {/* header */}
        <div className="flex items-center gap-2 px-3 py-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="size-6 shrink-0">
              {isOpen ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronUp className="size-3.5" />
              )}
            </Button>
          </CollapsibleTrigger>

          {isEditing ? (
            <div className="flex flex-1 items-center gap-2">
              <Input
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                className="h-7 flex-1 text-xs"
              />
              <Input
                type="number"
                value={editPeso}
                onChange={(e) => setEditPeso(e.target.value)}
                className="h-7 w-20 text-xs"
                min={1}
                max={100}
              />
              <span className="text-xs text-secondary-500">%</span>
              <Button
                size="icon"
                variant="ghost"
                className="size-6"
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Save className="size-3" />
                )}
              </Button>
            </div>
          ) : (
            <>
              <span className="flex-1 text-xs font-medium text-secondary-800 truncate">
                {subCriterio.nombre}
              </span>
              <Badge variant="outline" className="text-xs shrink-0">
                {peso}%
              </Badge>
            </>
          )}

          {/* acciones */}
          {canEdit && !isEditing && (
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => {
                  setEditNombre(subCriterio.nombre);
                  setEditPeso(subCriterio.pesoPorcentaje);
                  setIsEditing(true);
                }}
              >
                <Pencil className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                disabled={isFirst}
                onClick={() =>
                  reorderMutation.mutate(subCriterio.orden - 1)
                }
              >
                <ArrowUp className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                disabled={isLast}
                onClick={() =>
                  reorderMutation.mutate(subCriterio.orden + 1)
                }
              >
                <ArrowDown className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          )}
        </div>

        {/* contenido colapsable: niveles */}
        <CollapsibleContent>
          <div className="border-t border-secondary-100 px-3 py-2">
            <NivelesEditor
              convocatoriaId={convocatoriaId}
              niveles={subCriterio.nivelEvaluacions}
              canEdit={canEdit}
            />
          </div>
        </CollapsibleContent>
      </div>

      {/* dialogo confirmar eliminacion */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar sub-criterio"
        description={`Se eliminara "${subCriterio.nombre}" y sus 3 niveles de evaluacion. Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => deleteMutation.mutate()}
        isLoading={deleteMutation.isPending}
      />
    </Collapsible>
  );
}
