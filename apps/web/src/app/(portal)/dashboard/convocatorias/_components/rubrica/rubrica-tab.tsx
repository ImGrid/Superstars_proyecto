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
  estadoConvocatoria: string;
}

export function RubricaTab({ convocatoriaId, estadoConvocatoria }: RubricaTabProps) {
  const queryClient = useQueryClient();
  const canEdit = estadoConvocatoria === EstadoConvocatoria.BORRADOR;

  const { data, isLoading, isError } = useQuery({
    ...rubricaQueries.detail(convocatoriaId),
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
      createRubrica(convocatoriaId, {
        nombre: nombre.trim(),
        puntajeTotal: 100,
      }),
    onSuccess: () => {
      toast.success("Rubrica creada correctamente");
      queryClient.invalidateQueries({
        queryKey: rubricaQueries.detail(convocatoriaId).queryKey,
      });
      setCreateOpen(false);
      setNombre("");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "Error al crear la rubrica";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  // eliminar rubrica
  const deleteMutation = useMutation({
    mutationFn: () => deleteRubrica(convocatoriaId),
    onSuccess: () => {
      toast.success("Rubrica eliminada");
      queryClient.invalidateQueries({
        queryKey: rubricaQueries.detail(convocatoriaId).queryKey,
      });
      setDeleteOpen(false);
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al eliminar la rubrica";
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
            title="Sin rubrica"
            description="Esta convocatoria no tiene una rubrica de evaluacion configurada."
            action={
              canEdit ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  Crear rubrica
                </Button>
              ) : undefined
            }
          />

          {/* dialogo crear */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear rubrica de evaluacion</DialogTitle>
                <DialogDescription>
                  Define el nombre de la rubrica. Se creara con un puntaje total
                  de 100 puntos. Luego podras agregar criterios y sub-criterios.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="rub-nombre">Nombre de la rubrica</Label>
                <Input
                  id="rub-nombre"
                  placeholder="Ej: Rubrica de evaluacion 2026"
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
              Eliminar rubrica
            </Button>
          </div>
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title="Eliminar rubrica"
            description="Se eliminara permanentemente la rubrica con todos sus criterios, sub-criterios y niveles. Esta accion no se puede deshacer."
            confirmLabel="Eliminar"
            onConfirm={() => deleteMutation.mutate()}
            isLoading={deleteMutation.isPending}
          />
        </>
      )}
    </div>
  );
}
