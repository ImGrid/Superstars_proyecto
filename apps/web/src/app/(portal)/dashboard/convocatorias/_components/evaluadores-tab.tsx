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
import { repartirEvaluadores } from "@/lib/api/evaluacion.api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  categoriaQueries,
  usuarioQueries,
  postulacionQueries,
} from "@/lib/api/query-keys";
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
    onSuccess: (resultado) => {
      // se informa el alcance real: postulaciones retiradas, calificaciones
      // eliminadas y puntajes que hubo que recalcular sin su nota
      const retiradas = resultado?.asignacionesEliminadas ?? 0;
      const califs = resultado?.calificacionesEliminadas ?? 0;
      const partes: string[] = [];
      if (retiradas > 0) {
        partes.push(
          `${retiradas} ${retiradas === 1 ? "postulación retirada" : "postulaciones retiradas"}`,
        );
      }
      if (califs > 0) {
        partes.push(
          `${califs} ${califs === 1 ? "calificación eliminada" : "calificaciones eliminadas"}`,
        );
      }
      toast.success(
        partes.length === 0
          ? "El evaluador ya no forma parte del jurado de esta categoría"
          : `El evaluador ya no forma parte del jurado: ${partes.join(" y ")}.`,
      );
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

  // --- Reparto automatico del jurado entre las propuestas ---

  // propuestas que ya estan en evaluacion: son las unicas que se reparten
  const { data: postulacionesEnEvaluacion } = useQuery(
    postulacionQueries.list(convocatoriaId, "en_evaluacion", categoriaId),
  );

  const totalJurados = evaluadores?.length ?? 0;
  const totalPropuestas = postulacionesEnEvaluacion?.length ?? 0;
  const [porPropuesta, setPorPropuesta] = useState("3");
  const [repartoOpen, setRepartoOpen] = useState(false);

  const cantidad = Number(porPropuesta);
  const cantidadValida =
    Number.isInteger(cantidad) && cantidad >= 1 && cantidad <= totalJurados;

  const repartoMutation = useMutation({
    mutationFn: () => repartirEvaluadores(convocatoriaId, categoriaId, cantidad),
    onSuccess: (r) => {
      toast.success(
        r.asignacionesCreadas === 0
          ? "Todas las propuestas ya tenían la cantidad de evaluadores indicada"
          : `Se asignaron ${r.asignacionesCreadas} evaluaciones en ${r.postulacionesAfectadas} ${
              r.postulacionesAfectadas === 1 ? "propuesta" : "propuestas"
            }.`,
      );
      queryClient.invalidateQueries();
      setRepartoOpen(false);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "No se pudo repartir el jurado";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
      setRepartoOpen(false);
    },
  });

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

        {/* reparto automatico: solo tiene sentido si hay jurado y propuestas */}
        {totalJurados > 0 && totalPropuestas > 0 && (
          <div className="rounded-md border border-secondary-200 bg-secondary-50/60 p-4">
            <p className="text-sm font-medium text-secondary-900">
              Repartir el jurado automáticamente
            </p>
            <p className="mt-1 text-sm text-secondary-500">
              Hay {totalPropuestas}{" "}
              {totalPropuestas === 1 ? "propuesta" : "propuestas"} en evaluación y{" "}
              {totalJurados} {totalJurados === 1 ? "evaluador" : "evaluadores"} en el
              jurado. El sistema reparte la carga en partes iguales y respeta las
              asignaciones que ya hiciste.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="w-56">
                <Label htmlFor="por-propuesta" className="text-xs">
                  Evaluadores por propuesta
                </Label>
                <Input
                  id="por-propuesta"
                  type="number"
                  min={1}
                  max={totalJurados}
                  value={porPropuesta}
                  onChange={(e) => setPorPropuesta(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                variant="secondary"
                disabled={!cantidadValida || repartoMutation.isPending}
                onClick={() => setRepartoOpen(true)}
              >
                {repartoMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Icon icon="ph:shuffle-duotone" className="size-4" />
                )}
                Repartir
              </Button>
            </div>
            {!cantidadValida && (
              <p className="mt-2 text-xs text-destructive">
                Indica un número entre 1 y {totalJurados}, que es la cantidad de
                evaluadores que tiene este jurado.
              </p>
            )}
          </div>
        )}

        {/* dialogo confirmar reparto */}
        <ConfirmDialog
          open={repartoOpen}
          onOpenChange={setRepartoOpen}
          title="Repartir el jurado entre las propuestas"
          description={`Cada una de las ${totalPropuestas} propuestas en evaluación quedará con ${cantidad} ${
            cantidad === 1 ? "evaluador" : "evaluadores"
          }. Se crearán hasta ${totalPropuestas * cantidad} asignaciones repartidas en partes iguales entre los ${totalJurados} evaluadores del jurado. Las asignaciones que ya hiciste se respetan. Después puedes ajustar propuesta por propuesta si hace falta.`}
          confirmLabel="Repartir"
          onConfirm={() => repartoMutation.mutate()}
          isLoading={repartoMutation.isPending}
        />

        {/* dialogo de confirmacion para remover */}
        {deleteTarget && (
          <ConfirmDialog
            open={!!deleteTarget}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
            title="Quitar evaluador del jurado"
            description={`${deleteTarget.nombre} dejará de formar parte del jurado de esta categoría. Perderá el acceso a las propuestas, se le retirarán las postulaciones que tenga asignadas y se eliminarán las calificaciones que haya registrado. Los puntajes de las propuestas afectadas se volverán a calcular sin su nota. Esta acción no se puede deshacer.`}
            confirmLabel="Quitar del jurado"
            onConfirm={() => removeMutation.mutate(deleteTarget.evaluadorId)}
            isLoading={removeMutation.isPending}
          />
        )}
      </CardContent>
    </Card>
  );
}
