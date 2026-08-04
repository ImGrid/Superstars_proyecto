"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { EstadoConvocatoria } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { rubricaQueries } from "@/lib/api/query-keys";
import { createRubrica, deleteRubrica } from "@/lib/api/rubrica.api";
import { RubricaBuilder } from "./rubrica-builder";

interface RubricaTabProps {
  convocatoriaId: number;
  categoriaId: number;
  estadoConvocatoria: string;
}

export function RubricaTab({ convocatoriaId, categoriaId, estadoConvocatoria }: RubricaTabProps) {
  const queryClient = useQueryClient();
  const canEdit = estadoConvocatoria === EstadoConvocatoria.BORRADOR;

  const { data, isLoading, isError } = useQuery({
    ...rubricaQueries.detail(convocatoriaId, categoriaId),
    retry: (count, error: any) => {
      if (error?.response?.status === 404) return false;
      return count < 2;
    },
  });

  // estado dialogo crear
  const [createOpen, setCreateOpen] = useState(false);
  const [nombre, setNombre] = useState("");

  // estado dialogo eliminar
  const [deleteOpen, setDeleteOpen] = useState(false);

  // crear rubrica
  const createMutation = useMutation({
    mutationFn: () =>
      createRubrica(convocatoriaId, categoriaId, {
        nombre: nombre.trim(),
        puntajeTotal: 100,
      }),
    onSuccess: () => {
      toast.success("Rúbrica creada correctamente");
      queryClient.invalidateQueries({
        queryKey: rubricaQueries.detail(convocatoriaId, categoriaId).queryKey,
      });
      setCreateOpen(false);
      setNombre("");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "Error al crear la rúbrica";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  // eliminar rubrica
  const deleteMutation = useMutation({
    mutationFn: () => deleteRubrica(convocatoriaId, categoriaId),
    onSuccess: () => {
      toast.success("Rúbrica eliminada");
      queryClient.invalidateQueries({
        queryKey: rubricaQueries.detail(convocatoriaId, categoriaId).queryKey,
      });
      setDeleteOpen(false);
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al eliminar la rúbrica";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  // cargando
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // sin rubrica (404 o error)
  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyState
            icon="ph:clipboard-text-duotone"
            title="Sin rúbrica"
            description="Esta categoría no tiene una rúbrica de evaluación configurada."
            action={
              canEdit ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  Crear rúbrica
                </Button>
              ) : undefined
            }
          />

          {/* dialogo crear */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear rúbrica de evaluación</DialogTitle>
                <DialogDescription>
                  Define el nombre de la rúbrica. Se creará con un puntaje total
                  de 100 puntos. Luego podrás agregar criterios y sub-criterios.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="rub-nombre">Nombre de la rúbrica</Label>
                <Input
                  id="rub-nombre"
                  placeholder="Ej: Rúbrica de evaluación 2026"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && nombre.trim())
                      createMutation.mutate();
                  }}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  disabled={createMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!nombre.trim() || createMutation.isPending}
                >
                  {createMutation.isPending && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Crear
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  // rubrica existente
  return (
    <div className="space-y-4">
      <RubricaBuilder
        convocatoriaId={convocatoriaId}
        categoriaId={categoriaId}
        rubrica={data}
        canEdit={canEdit}
      />
      {canEdit && (
        <>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              Eliminar rúbrica
            </Button>
          </div>
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title="Eliminar rúbrica"
            description="Se eliminará permanentemente la rúbrica con todos sus criterios, sub-criterios y niveles. Esta acción no se puede deshacer."
            confirmLabel="Eliminar"
            onConfirm={() => deleteMutation.mutate()}
            isLoading={deleteMutation.isPending}
          />
        </>
      )}
    </div>
  );
}
