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
  cerrarEvaluacionPostulacion,
} from "@/lib/api/evaluacion.api";
import {
  asignacionQueries,
  categoriaQueries,
  calificacionQueries,
} from "@/lib/api/query-keys";
import { formatDate } from "@/lib/format";
import type { CalificacionListItem } from "@superstars/shared";

interface EvaluadoresAsignadosTabProps {
  convocatoriaId: number;
  categoriaId: number;
  postulacionId: number;
  // solo se puede cerrar la evaluacion mientras la propuesta esta en evaluacion
  enEvaluacion: boolean;
}

export function EvaluadoresAsignadosTab({
  convocatoriaId,
  categoriaId,
  postulacionId,
  enEvaluacion,
}: EvaluadoresAsignadosTabProps) {
  const queryClient = useQueryClient();

  // evaluadores asignados a esta postulacion
  const { data: asignaciones, isLoading } = useQuery(
    asignacionQueries.list(convocatoriaId, postulacionId),
  );

  // pool de evaluadores de la categoria (para el selector)
  const { data: poolEvaluadores } = useQuery(
    categoriaQueries.evaluadores(convocatoriaId, categoriaId),
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
      toast.success("Evaluador asignado a esta postulación");
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
      toast.success("Evaluador removido de esta postulación");
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

  // --- Cierre de la evaluacion ---

  // se clasifica a los jurados asignados por lo que hicieron con su nota
  const aprobados = (asignaciones ?? []).filter(
    (a) => califMap.get(a.evaluadorId)?.estado === EstadoCalificacion.APROBADO,
  );
  const porRevisar = (asignaciones ?? []).filter(
    (a) => califMap.get(a.evaluadorId)?.estado === EstadoCalificacion.COMPLETADO,
  );
  const sinEntregar = (asignaciones ?? []).filter((a) => {
    const estado = califMap.get(a.evaluadorId)?.estado;
    return estado !== EstadoCalificacion.APROBADO && estado !== EstadoCalificacion.COMPLETADO;
  });

  const [cerrarOpen, setCerrarOpen] = useState(false);

  const cerrarMutation = useMutation({
    mutationFn: () => cerrarEvaluacionPostulacion(convocatoriaId, postulacionId),
    onSuccess: (resultado) => {
      toast.success(
        `Evaluación cerrada. Puntaje final: ${resultado.puntajeFinal} (calculado con ${resultado.calificacionesConsideradas} ${
          resultado.calificacionesConsideradas === 1 ? "calificación" : "calificaciones"
        }).`,
      );
      queryClient.invalidateQueries();
      setCerrarOpen(false);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "No se pudo cerrar la evaluación";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
      setCerrarOpen(false);
    },
  });

  // texto del aviso: cambia segun cuantos jurados quedarian fuera
  const descripcionCierre =
    sinEntregar.length === 0
      ? `La propuesta quedará calificada con el promedio de las ${aprobados.length} calificaciones aprobadas. Esta acción no se puede deshacer.`
      : `${sinEntregar.length} de los ${asignaciones?.length ?? 0} evaluadores asignados ${
          sinEntregar.length === 1 ? "no entregó" : "no entregaron"
        } su calificación: ${sinEntregar
          .map((a) => a.evaluadorNombre)
          .join(", ")}. Si cierras la evaluación, el puntaje se calculará solo con ${
          aprobados.length === 1
            ? "la calificación aprobada"
            : `las ${aprobados.length} calificaciones aprobadas`
        } y ${
          sinEntregar.length === 1 ? "ese evaluador ya no podrá" : "esos evaluadores ya no podrán"
        } calificar esta propuesta. Esta acción no se puede deshacer.`;

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
          Selecciona qué evaluadores de la categoría calificarán esta postulación.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* selector para agregar */}
        <div className="flex gap-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Seleccionar evaluador de la categoría..." />
            </SelectTrigger>
            <SelectContent>
              {disponibles.length === 0 ? (
                <SelectItem value="_empty" disabled>
                  {totalPool === 0
                    ? "No hay evaluadores asignados a esta categoría"
                    : "Todos los evaluadores ya están asignados"}
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
            description="Asigna evaluadores de la categoría para que califiquen esta postulación."
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evaluador</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado calificación</TableHead>
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

        {/* cierre de la evaluacion: solo mientras la propuesta esta en evaluacion
            y hay al menos una calificacion aprobada con la que calcular */}
        {enEvaluacion && totalAsignados > 0 && (
          <div className="rounded-md border border-secondary-200 bg-secondary-50/60 p-4">
            <p className="text-sm font-medium text-secondary-900">
              Cerrar la evaluación de esta propuesta
            </p>
            <p className="mt-1 text-sm text-secondary-500">
              {porRevisar.length > 0
                ? `Hay ${porRevisar.length} ${
                    porRevisar.length === 1
                      ? "calificación enviada que todavía no revisaste"
                      : "calificaciones enviadas que todavía no revisaste"
                  }. Apruébalas o devuélvelas antes de cerrar.`
                : aprobados.length === 0
                  ? "Todavía no hay ninguna calificación aprobada, así que no hay con qué calcular el puntaje."
                  : sinEntregar.length === 0
                    ? `Los ${aprobados.length} evaluadores entregaron su calificación y ya fueron aprobadas.`
                    : `${aprobados.length} de ${totalAsignados} evaluadores entregaron su calificación. Al cerrar, el puntaje se calculará solo con esas notas.`}
            </p>
            <Button
              className="mt-3"
              variant="secondary"
              disabled={porRevisar.length > 0 || aprobados.length === 0 || cerrarMutation.isPending}
              onClick={() => setCerrarOpen(true)}
            >
              {cerrarMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserCheck className="size-4" />
              )}
              Cerrar evaluación y calcular puntaje
            </Button>
          </div>
        )}

        {/* dialogo confirmar cierre */}
        <ConfirmDialog
          open={cerrarOpen}
          onOpenChange={setCerrarOpen}
          title="Cerrar la evaluación de esta propuesta"
          description={descripcionCierre}
          confirmLabel="Cerrar evaluación"
          onConfirm={() => cerrarMutation.mutate()}
          isLoading={cerrarMutation.isPending}
        />

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
    [EstadoCalificacion.COMPLETADO]: "Pendiente revisión",
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
