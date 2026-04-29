"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Icon } from "@iconify/react";
import { EstadoConvocatoria, DEFAULT_TEMPLATE } from "@superstars/shared";
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
import { formularioQueries } from "@/lib/api/query-keys";
import { createFormulario, deleteFormulario } from "@/lib/api/formulario.api";
import { FormBuilder } from "./form-builder";

interface FormularioTabProps {
  convocatoriaId: number;
  estadoConvocatoria: string;
}

export function FormularioTab({ convocatoriaId, estadoConvocatoria }: FormularioTabProps) {
  const queryClient = useQueryClient();
  const canEdit = estadoConvocatoria === EstadoConvocatoria.BORRADOR;

  const { data, isLoading, isError } = useQuery({
    ...formularioQueries.detail(convocatoriaId),
    // 404 es esperado si no existe formulario
    retry: (count, error: any) => {
      if (error?.response?.status === 404) return false;
      return count < 2;
    },
  });

  // estado del dialogo de crear
  const [createOpen, setCreateOpen] = useState(false);
  const [nombre, setNombre] = useState("");

  // estado del dialogo de eliminar
  const [deleteOpen, setDeleteOpen] = useState(false);

  // crear formulario con plantilla default (secciones fijas B y C)
  const createMutation = useMutation({
    mutationFn: () => {
      return createFormulario(convocatoriaId, {
        nombre: nombre.trim(),
        schemaDefinition: DEFAULT_TEMPLATE,
      });
    },
    onSuccess: () => {
      toast.success("Formulario creado correctamente");
      queryClient.invalidateQueries({
        queryKey: formularioQueries.detail(convocatoriaId).queryKey,
      });
      setCreateOpen(false);
      setNombre("");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "Error al crear el formulario";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  // eliminar formulario
  const deleteMutation = useMutation({
    mutationFn: () => deleteFormulario(convocatoriaId),
    onSuccess: () => {
      toast.success("Formulario eliminado");
      queryClient.invalidateQueries({
        queryKey: formularioQueries.detail(convocatoriaId).queryKey,
      });
      setDeleteOpen(false);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "Error al eliminar el formulario";
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

  // sin formulario (404 o error)
  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyState
            icon="ph:file-text-duotone"
            title="Sin formulario"
            description="Esta convocatoria no tiene un formulario de postulacion configurado."
            action={
              canEdit ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  Crear formulario
                </Button>
              ) : undefined
            }
          />

          {/* dialogo crear */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear formulario</DialogTitle>
                <DialogDescription>
                  Define el nombre del formulario de postulacion. Se creara con las
                  secciones fijas de contacto y empresa precargadas.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="form-nombre">Nombre del formulario</Label>
                <Input
                  id="form-nombre"
                  placeholder="Ej: Formulario de registro 2026"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && nombre.trim()) createMutation.mutate();
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

  // formulario existente → builder
  return (
    <div className="space-y-4">
      <FormBuilder
        convocatoriaId={convocatoriaId}
        formulario={data}
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
              Eliminar formulario
            </Button>
          </div>
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title="Eliminar formulario"
            description="Se eliminara permanentemente el formulario y todas sus secciones y campos. Esta accion no se puede deshacer."
            confirmLabel="Eliminar"
            onConfirm={() => deleteMutation.mutate()}
            isLoading={deleteMutation.isPending}
          />
        </>
      )}
    </div>
  );
}
