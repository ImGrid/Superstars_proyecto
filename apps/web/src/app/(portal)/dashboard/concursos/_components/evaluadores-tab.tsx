"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ClipboardCheck } from "lucide-react";
import {
  RolUsuario,
  type EvaluadorConcursoResponse,
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
import { addEvaluador, removeEvaluador } from "@/lib/api/concurso.api";
import { concursoQueries, usuarioQueries } from "@/lib/api/query-keys";
import { formatDate } from "@/lib/format";

interface EvaluadoresTabProps {
  concursoId: number;
}

export function EvaluadoresTab({ concursoId }: EvaluadoresTabProps) {
  const queryClient = useQueryClient();

  // lista de evaluadores del concurso
  const { data: evaluadores, isLoading } = useQuery(
    concursoQueries.evaluadores(concursoId),
  );

  // usuarios con rol evaluador (para el selector)
  const { data: usuariosData } = useQuery(
    usuarioQueries.list({ rol: RolUsuario.EVALUADOR, limit: 100 }),
  );

  // filtrar usuarios que ya son evaluadores del concurso
  const evaluadorIds = new Set(evaluadores?.map((e) => e.evaluadorId) ?? []);
  const availableUsers = (usuariosData?.data ?? []).filter(
    (u) => !evaluadorIds.has(u.id),
  );

  // estado del selector
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // agregar evaluador
  const addMutation = useMutation({
    mutationFn: (evaluadorId: number) =>
      addEvaluador(concursoId, { evaluadorId }),
    onSuccess: () => {
      toast.success("Evaluador asignado correctamente");
      queryClient.invalidateQueries({
        queryKey: concursoQueries.evaluadores(concursoId).queryKey,
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
  const [deleteTarget, setDeleteTarget] = useState<EvaluadorConcursoResponse | null>(
    null,
  );

  const removeMutation = useMutation({
    mutationFn: (evaluadorId: number) => removeEvaluador(concursoId, evaluadorId),
    onSuccess: () => {
      toast.success("Evaluador removido correctamente");
      queryClient.invalidateQueries({
        queryKey: concursoQueries.evaluadores(concursoId).queryKey,
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
        <CardTitle>Evaluadores del concurso</CardTitle>
        <CardDescription>
          Jurados asignados para evaluar las postulaciones de este concurso.
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

        {/* tabla de evaluadores */}
        {!evaluadores || evaluadores.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Sin evaluadores"
            description="No hay evaluadores asignados a este concurso. Agrega jurados para que puedan evaluar las postulaciones."
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(ev)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
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
            description={`Se removera a "${deleteTarget.nombre}" como evaluador de este concurso.`}
            confirmLabel="Remover"
            onConfirm={() => removeMutation.mutate(deleteTarget.evaluadorId)}
            isLoading={removeMutation.isPending}
          />
        )}
      </CardContent>
    </Card>
  );
}
