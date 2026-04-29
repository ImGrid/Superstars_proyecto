"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, UserCheck } from "lucide-react";
import { EstadoCalificacion } from "@superstars/shared";
import type { AsignacionEvaluadorResponse } from "@superstars/shared";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
  assignEvaluadorPostulacion,
  removeAsignacionEvaluador,
} from "@/lib/api/evaluacion.api";
import {
  asignacionQueries,
  convocatoriaQueries,
  calificacionQueries,
} from "@/lib/api/query-keys";
import { formatDate } from "@/lib/format";
import type { CalificacionListItem } from "@superstars/shared";

interface EvaluadoresAsignadosTabProps {
  convocatoriaId: number;
  postulacionId: number;
}

export function EvaluadoresAsignadosTab({
  convocatoriaId,
  postulacionId,
}: EvaluadoresAsignadosTabProps) {
  const queryClient = useQueryClient();

  // evaluadores asignados a esta postulacion
  const { data: asignaciones, isLoading } = useQuery(
    asignacionQueries.list(convocatoriaId, postulacionId),
  );

  // pool de evaluadores de la convocatoria (para el selector)
  const { data: poolEvaluadores } = useQuery(
    convocatoriaQueries.evaluadores(convocatoriaId),
  );

  // calificaciones de la convocatoria para mostrar estado por evaluador
  const { data: calificaciones } = useQuery(
    calificacionQueries.list(convocatoriaId),
  );

  // evaluadores del pool que NO estan asignados a esta postulacion
  const asignadoIds = new Set(asignaciones?.map((a) => a.evaluadorId) ?? []);
  const disponibles = (poolEvaluadores ?? []).filter(
    (e) => !asignadoIds.has(e.evaluadorId),
  );

  // mapa de calificaciones de esta postulacion por evaluadorId
  const califMap = new Map<number, CalificacionListItem>();
  for (const c of calificaciones ?? []) {
    if (c.postulacionId === postulacionId) {
      califMap.set(c.evaluadorId, c);
    }
  }

  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const invalidar = () => {
    queryClient.invalidateQueries({
      queryKey: asignacionQueries.list(convocatoriaId, postulacionId).queryKey,
    });
  };

  // asignar
  const addMutation = useMutation({
    mutationFn: (evaluadorId: number) =>
      assignEvaluadorPostulacion(convocatoriaId, postulacionId, evaluadorId),
    onSuccess: () => {
      toast.success("Evaluador asignado a esta postulacion");
      invalidar();
      setSelectedUserId("");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "Error al asignar";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  // desasignar
  const [deleteTarget, setDeleteTarget] = useState<AsignacionEvaluadorResponse | null>(null);

  const removeMutation = useMutation({
    mutationFn: (evaluadorId: number) =>
      removeAsignacionEvaluador(convocatoriaId, postulacionId, evaluadorId),
    onSuccess: () => {
      toast.success("Evaluador removido de esta postulacion");
      invalidar();
      setDeleteTarget(null);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "Error al remover";
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
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const totalPool = poolEvaluadores?.length ?? 0;
  const totalAsignados = asignaciones?.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="size-5 text-secondary-400" />
          Evaluadores asignados ({totalAsignados} de {totalPool})
        </CardTitle>
        <CardDescription>
          Selecciona que evaluadores de la convocatoria calificaran esta postulacion.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* selector para agregar */}
        <div className="flex gap-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Seleccionar evaluador de la convocatoria..." />
            </SelectTrigger>
            <SelectContent>
              {disponibles.length === 0 ? (
                <SelectItem value="_empty" disabled>
                  {totalPool === 0
                    ? "No hay evaluadores en la convocatoria"
                    : "Todos los evaluadores ya estan asignados"}
                </SelectItem>
              ) : (
                disponibles.map((ev) => (
                  <SelectItem key={ev.evaluadorId} value={String(ev.evaluadorId)}>
                    {ev.nombre} ({ev.email})
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
            Asignar
          </Button>
        </div>

        {/* tabla de evaluadores asignados */}
        {totalAsignados === 0 ? (
          <EmptyState
            icon="ph:user-check-duotone"
            title="Sin evaluadores asignados"
            description="Asigna evaluadores de la convocatoria para que califiquen esta postulacion."
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evaluador</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado calificacion</TableHead>
                  <TableHead>Asignado el</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {asignaciones!.map((a) => {
                  const calif = califMap.get(a.evaluadorId);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.evaluadorNombre}
                      </TableCell>
                      <TableCell className="text-secondary-500">
                        {a.evaluadorEmail}
                      </TableCell>
                      <TableCell>
                        <CalificacionEstadoBadge calif={calif} />
                      </TableCell>
                      <TableCell className="text-sm text-secondary-500">
                        {formatDate(a.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(a)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* dialogo confirmar remocion */}
        {deleteTarget && (
          <ConfirmDialog
            open={!!deleteTarget}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
            title="Remover evaluador de esta postulación"
            description={`Se removerá a "${deleteTarget.evaluadorNombre}" de la evaluación de esta postulación.`}
            confirmLabel="Remover"
            onConfirm={() => removeMutation.mutate(deleteTarget.evaluadorId)}
            isLoading={removeMutation.isPending}
          />
        )}
      </CardContent>
    </Card>
  );
}

// badge de estado de calificacion del evaluador
function CalificacionEstadoBadge({ calif }: { calif?: CalificacionListItem }) {
  if (!calif) {
    return (
      <Badge variant="outline" className="text-secondary-400">
        Sin iniciar
      </Badge>
    );
  }

  const estilos: Record<string, string> = {
    [EstadoCalificacion.EN_PROGRESO]: "border-secondary-300 text-secondary-600",
    [EstadoCalificacion.COMPLETADO]: "border-blue-300 text-blue-700",
    [EstadoCalificacion.APROBADO]: "border-emerald-300 text-emerald-700",
    [EstadoCalificacion.DEVUELTO]: "border-amber-300 text-amber-700",
  };

  const labels: Record<string, string> = {
    [EstadoCalificacion.EN_PROGRESO]: "En progreso",
    [EstadoCalificacion.COMPLETADO]: "Pendiente revision",
    [EstadoCalificacion.APROBADO]: "Aprobado",
    [EstadoCalificacion.DEVUELTO]: "Devuelto",
  };

  return (
    <Badge variant="outline" className={estilos[calif.estado] ?? ""}>
      {labels[calif.estado] ?? calif.estado}
      {calif.puntajeTotal && ` (${calif.puntajeTotal})`}
    </Badge>
  );
}
