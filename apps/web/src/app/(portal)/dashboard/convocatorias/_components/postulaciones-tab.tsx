"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Eye, UserCheck } from "lucide-react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { EstadoCalificacion, EstadoConvocatoria, EstadoPostulacion } from "@superstars/shared";
import type { PostulacionListItem } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StateBadge } from "@/components/shared/state-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { RowAction } from "@/components/shared/row-actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  postulacionQueries,
  calificacionQueries,
  convocatoriaQueries,
  categoriaQueries,
} from "@/lib/api/query-keys";
import { seleccionarGanadores } from "@/lib/api/convocatoria.api";
import { formatShortDate, formatPercent } from "@/lib/format";

interface PostulacionesTabProps {
  convocatoriaId: number;
  categoriaId: number;
  estadoConvocatoria: string;
  numeroGanadores: number;
}

// estados disponibles para filtrar
const ESTADOS_FILTRO = [
  { valor: "all", label: "Todos" },
  { valor: "borrador", label: "Borrador" },
  { valor: "enviado", label: "Enviado" },
  { valor: "observado", label: "Observado" },
  { valor: "rechazado", label: "Rechazado" },
  { valor: "en_evaluacion", label: "En evaluación" },
  { valor: "calificado", label: "Calificado" },
  { valor: "ganador", label: "Ganador" },
  { valor: "no_seleccionado", label: "No seleccionado" },
];

export function PostulacionesTab({ convocatoriaId, categoriaId, estadoConvocatoria, numeroGanadores }: PostulacionesTabProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filtroEstado, setFiltroEstado] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const estado = filtroEstado === "all" ? undefined : filtroEstado;
  const { data, isLoading } = useQuery(postulacionQueries.list(convocatoriaId, estado, categoriaId));

  // calificaciones de la convocatoria, filtradas a esta categoria
  const { data: calificacionesRaw } = useQuery(calificacionQueries.list(convocatoriaId));
  const calificaciones = (calificacionesRaw ?? []).filter((c) => c.categoriaId === categoriaId);

  // pool de evaluadores de la categoria (para mostrar total)
  const { data: poolEvaluadores } = useQuery(categoriaQueries.evaluadores(convocatoriaId, categoriaId));
  const totalEvaluadoresPool = poolEvaluadores?.length ?? 0;

  // contar evaluadores con calificacion por postulacion
  const califsPorPostulacion = new Map<number, number>();
  for (const c of calificaciones) {
    califsPorPostulacion.set(c.postulacionId, (califsPorPostulacion.get(c.postulacionId) ?? 0) + 1);
  }

  const postulaciones = data ?? [];
  const pendientesRevision = calificaciones.filter(
    (c) => c.estado === EstadoCalificacion.COMPLETADO,
  );

  // postulaciones calificadas (elegibles para seleccion de ganadores)
  const calificadas = postulaciones
    .filter((p) => p.estado === EstadoPostulacion.CALIFICADO)
    .sort((a, b) => Number(b.puntajeFinal ?? 0) - Number(a.puntajeFinal ?? 0));

  // determinar si estamos en modo seleccion de ganadores
  const puedeSeleccionarGanadores =
    estadoConvocatoria === EstadoConvocatoria.EN_EVALUACION &&
    calificadas.length > 0 &&
    pendientesRevision.length === 0;

  // verificar si todas las postulaciones en_evaluacion ya estan calificadas
  const pendientesEvaluacion = postulaciones.filter(
    (p) => p.estado === EstadoPostulacion.EN_EVALUACION,
  );
  const todasCalificadas = pendientesEvaluacion.length === 0 && calificadas.length > 0;

  // mutation para seleccionar ganadores
  const seleccionarMutation = useMutation({
    mutationFn: () => seleccionarGanadores(convocatoriaId, categoriaId, { ganadorIds: Array.from(selectedIds) }),
    onSuccess: () => {
      toast.success("Ganadores seleccionados correctamente");
      setSelectedIds(new Set());
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: convocatoriaQueries.all() });
      queryClient.invalidateQueries({ queryKey: postulacionQueries.all() });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "Error al seleccionar ganadores";
      if (Array.isArray(msg)) {
        msg.forEach((m: string) => toast.error(m));
      } else {
        toast.error(msg);
      }
      setConfirmOpen(false);
    },
  });

  // toggle seleccion de una postulacion
  function toggleSelection(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size < numeroGanadores) {
          next.add(id);
        } else {
          toast.error(`Solo puedes seleccionar hasta ${numeroGanadores} ganadores`);
        }
      }
      return next;
    });
  }

  // seleccionar top N automaticamente
  function seleccionarTopN() {
    const topN = calificadas.slice(0, numeroGanadores).map((p) => p.id);
    setSelectedIds(new Set(topN));
  }

  // nombres de los seleccionados para el dialog de confirmacion
  const seleccionadosInfo = calificadas
    .filter((p) => selectedIds.has(p.id))
    .map((p, idx) => `${idx + 1}. ${p.empresaRazonSocial} (${p.puntajeFinal} pts)`);

  const noSeleccionadosCount = calificadas.length - selectedIds.size;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="ph:file-text-duotone" className="size-5 text-primary-600" />
            Postulaciones ({postulaciones.length})
          </CardTitle>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS_FILTRO.map((e) => (
                <SelectItem key={e.valor} value={e.valor}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* banner de calificaciones pendientes de revision */}
        {pendientesRevision.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-info-200 bg-info-50 px-4 py-3">
            <Icon icon="ph:clipboard-text-duotone" className="size-5 text-info-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-info-800">
                {pendientesRevision.length}{" "}
                {pendientesRevision.length !== 1 ? "calificaciones" : "calificación"}{" "}
                pendiente{pendientesRevision.length !== 1 ? "s" : ""} de revisión
              </p>
              <p className="text-xs text-info-600">
                Los evaluadores han enviado sus calificaciones y esperan tu aprobación.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {pendientesRevision.map((c) => (
                <Button
                  key={c.id}
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1 border-info-300 text-info-700 hover:bg-info-100"
                  onClick={() =>
                    router.push(`/dashboard/convocatorias/${convocatoriaId}/calificaciones/${c.id}`)
                  }
                >
                  {c.empresaRazonSocial} — {c.evaluadorNombre}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* banner-guia: hay postulaciones aun en evaluacion que bloquean elegir ganadores */}
        {estadoConvocatoria === EstadoConvocatoria.EN_EVALUACION &&
          pendientesEvaluacion.length > 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3">
            <Icon icon="ph:info-duotone" className="mt-0.5 size-5 shrink-0 text-warning-600" />
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-sm font-medium text-warning-800">
                  Aún no puedes elegir ganadores
                </p>
                <p className="text-xs text-warning-700">
                  {pendientesEvaluacion.length === 1
                    ? "Esta postulación sigue en evaluación. Ábrela para asignarle un evaluador, revisar su calificación, o sacarla de la convocatoria si no se pudo evaluar."
                    : `Estas ${pendientesEvaluacion.length} postulaciones siguen en evaluación. Ábrelas para asignarles un evaluador, revisar su calificación, o sacarlas de la convocatoria si no se pudieron evaluar.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pendientesEvaluacion.map((p) => (
                  <Button
                    key={p.id}
                    variant="outline"
                    size="sm"
                    className="gap-1 border-warning-300 text-xs text-warning-700 hover:bg-warning-100"
                    onClick={() =>
                      router.push(`/dashboard/convocatorias/${convocatoriaId}/postulaciones/${p.id}`)
                    }
                  >
                    {p.empresaRazonSocial}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* banner de seleccion de ganadores */}
        {puedeSeleccionarGanadores && todasCalificadas && (
          <div className="flex items-center gap-3 rounded-lg border border-amarillo-200 bg-amarillo-50 px-4 py-3">
            <Icon icon="ph:trophy-duotone" className="size-5 text-amarillo-700 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-primary-900">
                Todas las postulaciones están calificadas
              </p>
              <p className="text-xs text-primary-700">
                Selecciona hasta {numeroGanadores} ganador{numeroGanadores !== 1 ? "es" : ""} en la tabla y confirma la selección.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-amarillo-300 text-primary-700 hover:bg-amarillo-100"
              onClick={seleccionarTopN}
            >
              Seleccionar top {Math.min(numeroGanadores, calificadas.length)}
            </Button>
          </div>
        )}

        {postulaciones.length === 0 ? (
          <EmptyState
            icon="ph:file-text-duotone"
            title="No hay postulaciones"
            description={
              filtroEstado !== "all"
                ? "No hay postulaciones con ese estado."
                : "Aún no se han recibido postulaciones para esta categoría."
            }
          />
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* checkbox column solo si puede seleccionar */}
                  {puedeSeleccionarGanadores && todasCalificadas && (
                    <TableHead className="w-10" />
                  )}
                  <TableHead>Empresa</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Completado</TableHead>
                  <TableHead>Evaluadores</TableHead>
                  <TableHead>Fecha envío</TableHead>
                  <TableHead>Puntaje</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {postulaciones.map((p) => (
                  <PostulacionRow
                    key={p.id}
                    postulacion={p}
                    convocatoriaId={convocatoriaId}
                    evaluadoresAsignados={califsPorPostulacion.get(p.id) ?? 0}
                    totalEvaluadores={totalEvaluadoresPool}
                    showCheckbox={puedeSeleccionarGanadores && todasCalificadas}
                    isSelected={selectedIds.has(p.id)}
                    onToggle={() => toggleSelection(p.id)}
                    onVerDetalle={() =>
                      router.push(`/dashboard/convocatorias/${convocatoriaId}/postulaciones/${p.id}`)
                    }
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* barra de accion pegajosa: vive dentro de la columna de contenido (no
            tapa el sidebar) y flota cerca del fondo mientras se hace scroll */}
        {selectedIds.size > 0 && (
          <div className="sticky bottom-4 z-10 rounded-xl border border-secondary-200 bg-white p-3 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Icon icon="ph:check-circle-duotone" className="size-5 text-success-600" />
                <span className="text-sm font-medium">
                  {selectedIds.size} de {Math.min(numeroGanadores, calificadas.length)} ganador{selectedIds.size !== 1 ? "es" : ""} seleccionado{selectedIds.size !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Limpiar selección
                </Button>
                <Button
                  size="sm"
                  className="bg-amarillo-600 text-primary-600 hover:bg-amarillo-500"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Icon icon="ph:trophy-duotone" className="size-4" />
                  Confirmar ganadores
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* dialog de confirmacion */}
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Confirmar selección de ganadores"
          description={
            `Se seleccionarán ${selectedIds.size} ganador${selectedIds.size !== 1 ? "es" : ""}:\n\n` +
            seleccionadosInfo.join("\n") +
            (noSeleccionadosCount > 0
              ? `\n\nLas ${noSeleccionadosCount} postulación${noSeleccionadosCount !== 1 ? "es" : ""} restante${noSeleccionadosCount !== 1 ? "s" : ""} serán marcadas como no seleccionadas.`
              : "") +
            "\n\nEsta acción no se puede deshacer."
          }
          confirmLabel="Confirmar ganadores"
          onConfirm={() => seleccionarMutation.mutate()}
          isLoading={seleccionarMutation.isPending}
          destructive={false}
        />
      </CardContent>
    </Card>
  );
}

// estados donde se puede asignar evaluadores
const ESTADOS_EVALUABLES = [
  EstadoPostulacion.EN_EVALUACION,
  EstadoPostulacion.CALIFICADO,
  EstadoPostulacion.GANADOR,
  EstadoPostulacion.NO_SELECCIONADO,
];

// fila de la tabla
function PostulacionRow({
  postulacion,
  convocatoriaId,
  evaluadoresAsignados,
  totalEvaluadores,
  showCheckbox,
  isSelected,
  onToggle,
  onVerDetalle,
}: {
  postulacion: PostulacionListItem;
  convocatoriaId: number;
  evaluadoresAsignados: number;
  totalEvaluadores: number;
  showCheckbox: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onVerDetalle: () => void;
}) {
  const router = useRouter();
  const pct = Math.round(Number(postulacion.porcentajeCompletado));
  const pendientes = postulacion.calificacionesPendientes ?? 0;
  const esEvaluable = ESTADOS_EVALUABLES.includes(postulacion.estado as EstadoPostulacion);
  const esCalificado = postulacion.estado === EstadoPostulacion.CALIFICADO;

  return (
    <TableRow
      className={isSelected ? "bg-amarillo-50" : undefined}
      onClick={showCheckbox && esCalificado ? onToggle : undefined}
      style={showCheckbox && esCalificado ? { cursor: "pointer" } : undefined}
    >
      {/* checkbox */}
      {showCheckbox && (
        <TableCell onClick={(e) => e.stopPropagation()}>
          {esCalificado ? (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggle}
              aria-label={`Seleccionar ${postulacion.empresaRazonSocial}`}
            />
          ) : null}
        </TableCell>
      )}
      <TableCell className="font-medium">
        {postulacion.empresaRazonSocial}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <StateBadge tipo="postulacion" valor={postulacion.estado} />
          {pendientes > 0 && (
            <Badge className="bg-info-100 text-info-700 text-[10px] px-1.5 py-0">
              {pendientes} por revisar
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 rounded-full bg-secondary-100">
            <div
              className={`h-2 rounded-full ${pct >= 100 ? "bg-success-500" : "bg-primary-500"}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className="text-xs text-secondary-500">{formatPercent(postulacion.porcentajeCompletado)}</span>
        </div>
      </TableCell>
      <TableCell>
        {esEvaluable ? (
          <Button
            variant="ghost"
            size="sm"
            className={`gap-1 text-xs ${
              evaluadoresAsignados === 0
                ? "text-error-600 hover:text-error-700"
                : evaluadoresAsignados < totalEvaluadores
                  ? "text-warning-600 hover:text-warning-700"
                  : "text-success-600 hover:text-success-700"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/convocatorias/${convocatoriaId}/postulaciones/${postulacion.id}`);
            }}
          >
            <UserCheck className="size-3.5" />
            {evaluadoresAsignados}/{totalEvaluadores}
          </Button>
        ) : (
          <span className="text-xs text-secondary-400">-</span>
        )}
      </TableCell>
      <TableCell className="text-sm text-secondary-500">
        {postulacion.fechaEnvio ? formatShortDate(postulacion.fechaEnvio) : "-"}
      </TableCell>
      <TableCell className="text-sm">
        {postulacion.puntajeFinal ? postulacion.puntajeFinal : "-"}
      </TableCell>
      <TableCell className="text-right">
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <RowAction
            icon={<Eye className="size-4" />}
            label="Ver detalle"
            onClick={onVerDetalle}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
