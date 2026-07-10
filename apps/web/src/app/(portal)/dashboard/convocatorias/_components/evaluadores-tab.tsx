"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Icon } from "@iconify/react";
import {
  RolUsuario,
  type EvaluadorCategoriaResponse,
} from "@superstars/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { RowAction } from "@/components/shared/row-actions";
import {
  addCategoriaEvaluador,
  removeCategoriaEvaluador,
} from "@/lib/api/categoria.api";
import { categoriaQueries, usuarioQueries } from "@/lib/api/query-keys";
import { formatDate } from "@/lib/format";

interface EvaluadoresTabProps {
  convocatoriaId: number;
  categoriaId: number;
}

export function EvaluadoresTab({ convocatoriaId, categoriaId }: EvaluadoresTabProps) {
  const queryClient = useQueryClient();

  // pool de evaluadores (jurado) de la categoria
  const { data: evaluadores, isLoading } = useQuery(
    categoriaQueries.evaluadores(convocatoriaId, categoriaId),
  );

  // usuarios con rol evaluador (para el selector)
  const { data: usuariosData } = useQuery(
    usuarioQueries.list({ rol: RolUsuario.EVALUADOR, limit: 100 }),
  );

  // filtrar usuarios que ya son evaluadores de la convocatoria
  const evaluadorIds = new Set(evaluadores?.map((e) => e.evaluadorId) ?? []);
  const availableUsers = (usuariosData?.data ?? []).filter(
    (u) => !evaluadorIds.has(u.id),
  );

  // estado del selector
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // agregar evaluador
  const addMutation = useMutation({
    mutationFn: (evaluadorId: number) =>
      addCategoriaEvaluador(convocatoriaId, categoriaId, { evaluadorId }),
    onSuccess: () => {
      toast.success("Evaluador asignado correctamente");
      queryClient.invalidateQueries({
        queryKey: categoriaQueries.evaluadores(convocatoriaId, categoriaId).queryKey,
      });
      setSelectedUserId("");
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al asignar evaluador";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  // estado para eliminar
  const [deleteTarget, setDeleteTarget] = useState<EvaluadorCategoriaResponse | null>(
    null,
  );

  const removeMutation = useMutation({
    mutationFn: (evaluadorId: number) =>
      removeCategoriaEvaluador(convocatoriaId, categoriaId, evaluadorId),
    onSuccess: () => {
      toast.success("Evaluador removido correctamente");
      queryClient.invalidateQueries({
        queryKey: categoriaQueries.evaluadores(convocatoriaId, categoriaId).queryKey,
      });
      setDeleteTarget(null);
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al remover evaluador";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
      setDeleteTarget(null);
    },
  });

  function handleAdd() {
    if (!selectedUserId) return;
    addMutation.mutate(Number(selectedUserId));
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon
            icon="ph:clipboard-text-duotone"
            className="size-5 text-primary-600"
          />
          Evaluadores de la categoría
        </CardTitle>
        <CardDescription>
          Jurados que pueden evaluar las postulaciones de esta categoría.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* selector para agregar */}
        <div className="flex gap-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Seleccionar evaluador..." />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.length === 0 ? (
                <SelectItem value="_empty" disabled>
                  No hay evaluadores disponibles
                </SelectItem>
              ) : (
                availableUsers.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {user.nombre} ({user.email})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAdd}
            disabled={!selectedUserId || addMutation.isPending}
          >
            {addMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Agregar
          </Button>
        </div>

        {/* aviso cuando no hay evaluadores para asignar (guia al coordinador) */}
        {availableUsers.length === 0 && (
          <p className="text-xs text-secondary-400">
            {(usuariosData?.data?.length ?? 0) === 0
              ? "No hay usuarios con rol Evaluador. Crea uno en la sección Usuarios."
              : "Todos los usuarios con rol Evaluador ya están asignados."}
          </p>
        )}

        {/* conteo */}
        {evaluadores && evaluadores.length > 0 && (
          <p className="text-sm text-secondary-500">
            <span className="font-medium text-secondary-900">
              {evaluadores.length}
            </span>{" "}
            {evaluadores.length === 1 ? "evaluador" : "evaluadores"}
          </p>
        )}

        {/* tabla de evaluadores */}
        {!evaluadores || evaluadores.length === 0 ? (
          <EmptyState
            icon="ph:clipboard-text-duotone"
            title="Sin evaluadores"
            description="No hay evaluadores asignados a esta categoría. Agrega jurados para que puedan evaluar las postulaciones."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Asignado</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluadores.map((ev) => (
                <TableRow key={ev.id}>
                  <TableCell className="font-medium">{ev.nombre}</TableCell>
                  <TableCell className="text-secondary-500">
                    {ev.email}
                  </TableCell>
                  <TableCell className="text-sm text-secondary-500">
                    {formatDate(ev.createdAt)}
                  </TableCell>
                  <TableCell>
                    <RowAction
                      icon={<Trash2 className="size-4" />}
                      label="Remover evaluador"
                      onClick={() => setDeleteTarget(ev)}
                      destructive
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* dialogo de confirmacion para remover */}
        {deleteTarget && (
          <ConfirmDialog
            open={!!deleteTarget}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
            title="Remover evaluador"
            description={`Se removerá a "${deleteTarget.nombre}" de los evaluadores de esta categoría.`}
            confirmLabel="Remover"
            onConfirm={() => removeMutation.mutate(deleteTarget.evaluadorId)}
            isLoading={removeMutation.isPending}
          />
        )}
      </CardContent>
    </Card>
  );
}
