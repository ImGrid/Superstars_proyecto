"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Icon } from "@iconify/react";
import {
  RolUsuario,
  type ResponsableResponse,
  type UsuarioResponse,
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
import { addResponsable, removeResponsable } from "@/lib/api/concurso.api";
import { concursoQueries, usuarioQueries } from "@/lib/api/query-keys";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/format";

interface ResponsablesTabProps {
  concursoId: number;
}

export function ResponsablesTab({ concursoId }: ResponsablesTabProps) {
  const { data: me } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = me?.rol === RolUsuario.ADMINISTRADOR;

  // lista de responsables del concurso
  const { data: responsables, isLoading } = useQuery(
    concursoQueries.responsables(concursoId),
  );

  // usuarios con rol responsable_concurso (solo si es admin)
  const { data: usuariosData } = useQuery({
    ...usuarioQueries.list({ rol: RolUsuario.RESPONSABLE_CONCURSO, limit: 100 }),
    enabled: isAdmin,
  });

  // filtrar usuarios que ya son responsables del concurso
  const responsableIds = new Set(responsables?.map((r) => r.usuarioId) ?? []);
  const availableUsers = (usuariosData?.data ?? []).filter(
    (u) => !responsableIds.has(u.id),
  );

  // estado del selector
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // agregar responsable
  const addMutation = useMutation({
    mutationFn: (usuarioId: number) =>
      addResponsable(concursoId, { usuarioId }),
    onSuccess: () => {
      toast.success("Responsable asignado correctamente");
      queryClient.invalidateQueries({
        queryKey: concursoQueries.responsables(concursoId).queryKey,
      });
      setSelectedUserId("");
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al asignar responsable";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  // estado para eliminar
  const [deleteTarget, setDeleteTarget] = useState<ResponsableResponse | null>(
    null,
  );

  const removeMutation = useMutation({
    mutationFn: (userId: number) => removeResponsable(concursoId, userId),
    onSuccess: () => {
      toast.success("Responsable removido correctamente");
      queryClient.invalidateQueries({
        queryKey: concursoQueries.responsables(concursoId).queryKey,
      });
      setDeleteTarget(null);
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al remover responsable";
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
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Responsables del concurso</CardTitle>
        <CardDescription>
          Usuarios asignados para gestionar este concurso.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* selector para agregar (solo admin) */}
        {isAdmin && (
          <div className="flex gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Seleccionar usuario..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.length === 0 ? (
                  <SelectItem value="_empty" disabled>
                    No hay usuarios disponibles
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
        )}

        {/* tabla de responsables */}
        {!responsables || responsables.length === 0 ? (
          <EmptyState
            icon="ph:users-three-duotone"
            title="Sin responsables"
            description="No hay responsables asignados a este concurso."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Asignado</TableHead>
                {isAdmin && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {responsables.map((resp) => (
                <TableRow key={resp.id}>
                  <TableCell className="font-medium">{resp.nombre}</TableCell>
                  <TableCell className="text-secondary-500">
                    {resp.email}
                  </TableCell>
                  <TableCell className="text-sm text-secondary-500">
                    {formatDate(resp.createdAt)}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(resp)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  )}
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
            title="Remover responsable"
            description={`Se removera a "${deleteTarget.nombre}" como responsable de este concurso.`}
            confirmLabel="Remover"
            onConfirm={() => removeMutation.mutate(deleteTarget.usuarioId)}
            isLoading={removeMutation.isPending}
          />
        )}
      </CardContent>
    </Card>
  );
}
