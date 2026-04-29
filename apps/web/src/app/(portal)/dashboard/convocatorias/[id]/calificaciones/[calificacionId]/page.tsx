"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  RotateCcw,
  Loader2,
  User,
} from "lucide-react";
import { Icon } from "@iconify/react";
import { EstadoCalificacion } from "@superstars/shared";
import type { CalificacionDetalleResponsable } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ResponseViewer } from "@/components/shared/response-viewer";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  calificacionQueries,
  formularioQueries,
  archivoQueries,
  rubricaQueries,
} from "@/lib/api/query-keys";
import { aprobarCalificacion, devolverCalificacion } from "@/lib/api/evaluacion.api";

interface PageProps {
  params: Promise<{ id: string; calificacionId: string }>;
}

export default function RevisionCalificacionPage({ params }: PageProps) {
  const { id: cId, calificacionId: calId } = use(params);
  const convocatoriaId = Number(cId);
  const calificacionId = Number(calId);
  const router = useRouter();
  const queryClient = useQueryClient();

  // cargar detalle de calificacion (incluye postulacion con responseData)
  const { data, isLoading: isLoadingCalif } = useQuery(
    calificacionQueries.detalle(convocatoriaId, calificacionId),
  );

  // cargar formulario (schema)
  const { data: formulario, isLoading: isLoadingForm } = useQuery(
    formularioQueries.detail(convocatoriaId),
  );

  // cargar rubrica
  const { data: rubrica, isLoading: isLoadingRubrica } = useQuery(
    rubricaQueries.detail(convocatoriaId),
  );

  // cargar archivos
  const { data: archivos, isLoading: isLoadingArchivos } = useQuery({
    ...archivoQueries.list(convocatoriaId, data?.postulacion?.id ?? 0),
    enabled: !!data?.postulacion?.id,
  });

  // estado dialogos
  const [devolverOpen, setDevolverOpen] = useState(false);
  const [comentarioDevolucion, setComentarioDevolucion] = useState("");
  const [aprobarOpen, setAprobarOpen] = useState(false);

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: calificacionQueries.all() });
    queryClient.invalidateQueries({ queryKey: ["postulaciones"] });
  };

  const aprobarMutation = useMutation({
    mutationFn: () => aprobarCalificacion(convocatoriaId, calificacionId),
    onSuccess: () => {
      toast.success("Calificación aprobada");
      setAprobarOpen(false);
      invalidar();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? "Error al aprobar");
    },
  });

  const devolverMutation = useMutation({
    mutationFn: () =>
      devolverCalificacion(convocatoriaId, calificacionId, {
        comentarioResponsable: comentarioDevolucion,
      }),
    onSuccess: () => {
      toast.success("Calificación devuelta al evaluador");
      setDevolverOpen(false);
      setComentarioDevolucion("");
      invalidar();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? "Error al devolver");
    },
  });

  const isLoading = isLoadingCalif || isLoadingForm || isLoadingRubrica || isLoadingArchivos;
  const isBusy = aprobarMutation.isPending || devolverMutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!data || !rubrica) {
    return (
      <Alert variant="destructive">
        <AlertDescription>No se pudo cargar la informacion.</AlertDescription>
      </Alert>
    );
  }

  const { calificacion: calif, detalles, postulacion: post, evaluadorNombre } = data;
  const canActOnCalif = calif.estado === EstadoCalificacion.COMPLETADO;

  // construir mapa de puntajes por subCriterioId
  type DetalleItem = CalificacionDetalleResponsable["detalles"][number];
  const puntajesMap = new Map<number, DetalleItem>(
    detalles.map((d: DetalleItem) => [d.subCriterioId, d]),
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* header fijo */}
      <div className="flex items-center gap-3 border-b bg-white px-4 py-3 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/dashboard/convocatorias/${convocatoriaId}`)}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-lg font-bold text-secondary-900 truncate">
            Revision de calificacion
          </h1>
          <div className="flex items-center gap-2 text-xs text-secondary-500">
            <User className="size-3" />
            <span>Evaluador: {evaluadorNombre ?? `#${calif.evaluadorId}`}</span>
            <span className="text-secondary-300">|</span>
            <span>Puntaje total: {calif.puntajeTotal ?? "-"}</span>
            <Badge
              variant="outline"
              className={
                calif.estado === EstadoCalificacion.COMPLETADO
                  ? "border-blue-300 text-blue-700"
                  : calif.estado === EstadoCalificacion.APROBADO
                    ? "border-emerald-300 text-emerald-700"
                    : calif.estado === EstadoCalificacion.DEVUELTO
                      ? "border-amber-300 text-amber-700"
                      : "text-secondary-500"
              }
            >
              {calif.estado === EstadoCalificacion.EN_PROGRESO && "En progreso"}
              {calif.estado === EstadoCalificacion.COMPLETADO && "Pendiente de revision"}
              {calif.estado === EstadoCalificacion.APROBADO && "Aprobado"}
              {calif.estado === EstadoCalificacion.DEVUELTO && "Devuelto"}
            </Badge>
          </div>
        </div>

        {/* acciones del responsable */}
        {canActOnCalif && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-amber-600 border-amber-300 hover:bg-amber-50"
              onClick={() => { setComentarioDevolucion(""); setDevolverOpen(true); }}
              disabled={isBusy}
            >
              <RotateCcw className="size-3.5" />
              Devolver
            </Button>
            <Button
              size="sm"
              className="gap-1"
              onClick={() => setAprobarOpen(true)}
              disabled={isBusy}
            >
              {aprobarMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Icon icon="ph:check-circle-duotone"className="size-3.5" />
              )}
              Aprobar calificacion
            </Button>
          </div>
        )}
      </div>

      {/* alerta si fue devuelta */}
      {calif.estado === EstadoCalificacion.DEVUELTO && calif.comentarioResponsable && (
        <div className="px-4 pt-3 shrink-0">
          <Alert className="border-amber-300 bg-amber-50">
            <Icon icon="ph:warning-duotone"className="size-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <span className="font-medium">Motivo de devolucion: </span>
              {calif.comentarioResponsable}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* split view: propuesta izquierda + rubrica calificada derecha */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup orientation="horizontal">
          {/* panel izquierdo: propuesta */}
          <ResizablePanel defaultSize={55} minSize={30}>
            <div className="h-full overflow-y-auto p-4">
              <h2 className="mb-3 text-sm font-semibold text-secondary-700 uppercase tracking-wide">
                Propuesta del postulante
              </h2>
              {formulario ? (
                <ResponseViewer
                  schema={formulario.schemaDefinition}
                  responseData={post.responseData}
                  archivos={archivos ?? []}
                  convocatoriaId={convocatoriaId}
                  postulacionId={post.id}
                />
              ) : (
                <p className="text-sm text-secondary-400">Formulario no disponible.</p>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* panel derecho: rubrica con puntajes del evaluador (solo lectura) */}
          <ResizablePanel defaultSize={45} minSize={30}>
            <div className="h-full overflow-y-auto p-4 bg-secondary-50/30">
              <h2 className="mb-3 text-sm font-semibold text-secondary-700 uppercase tracking-wide">
                Calificacion del evaluador
              </h2>

              <div className="space-y-4">
                {rubrica.criterios.map((criterio) => (
                  <Card key={criterio.id} className="shadow-sm">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm font-semibold">
                        {criterio.nombre}
                        <span className="ml-1.5 font-normal text-secondary-500">
                          ({criterio.pesoPorcentaje}%)
                        </span>
                      </CardTitle>
                      {criterio.descripcion && (
                        <CardDescription className="text-xs">{criterio.descripcion}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3 px-4 pb-4 pt-0">
                      {criterio.subCriterios.map((sc) => {
                        const det = puntajesMap.get(sc.id);
                        const niveles = sc.nivelEvaluacions ?? [];
                        const basico = niveles.find((n) => n.nivel === "basico");
                        const avanzado = niveles.find((n) => n.nivel === "avanzado");
                        const maxPuntaje = avanzado ? Number(avanzado.puntajeMax) : Number(sc.pesoPorcentaje);

                        return (
                          <div key={sc.id} className="rounded-md border bg-white p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-secondary-800">
                                {sc.nombre}
                                <span className="ml-1 text-xs font-normal text-secondary-400">
                                  ({sc.pesoPorcentaje}%)
                                </span>
                              </span>
                              <Badge
                                variant={det ? "default" : "outline"}
                                className={det ? "tabular-nums" : "text-secondary-400"}
                              >
                                {det ? `${det.puntaje} / ${maxPuntaje}` : "Sin puntaje"}
                              </Badge>
                            </div>

                            {/* guia de niveles compacta */}
                            <div className="flex flex-wrap gap-1.5 text-[11px]">
                              {niveles.map((n) => (
                                <span
                                  key={n.nivel}
                                  className={`rounded px-1.5 py-0.5 ${
                                    n.nivel === "basico"
                                      ? "bg-secondary-100 text-secondary-600"
                                      : n.nivel === "intermedio"
                                        ? "bg-blue-50 text-blue-600"
                                        : "bg-emerald-50 text-emerald-600"
                                  }`}
                                >
                                  {n.nivel === "basico" ? "Basico" : n.nivel === "intermedio" ? "Intermedio" : "Avanzado"}{" "}
                                  {n.puntajeMin}-{n.puntajeMax}
                                </span>
                              ))}
                            </div>

                            {/* justificacion del evaluador */}
                            {det?.justificacion && (
                              <>
                                <Separator />
                                <p className="text-xs text-secondary-600 italic">
                                  &ldquo;{det.justificacion}&rdquo;
                                </p>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}

                {/* comentario general del evaluador */}
                {calif.comentarioGeneral && (
                  <Card className="shadow-sm">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm font-semibold">Comentario general del evaluador</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0">
                      <p className="text-sm text-secondary-700 italic">
                        &ldquo;{calif.comentarioGeneral}&rdquo;
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* dialog devolver */}
      <Dialog open={devolverOpen} onOpenChange={setDevolverOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devolver calificacion</DialogTitle>
            <DialogDescription>
              Explica al evaluador por que debe revisar su calificacion.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Describe que debe corregir el evaluador..."
            rows={4}
            value={comentarioDevolucion}
            onChange={(e) => setComentarioDevolucion(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDevolverOpen(false)}
              disabled={devolverMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => devolverMutation.mutate()}
              disabled={devolverMutation.isPending || !comentarioDevolucion.trim()}
              className="gap-1"
            >
              {devolverMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Devolver al evaluador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* confirm aprobar */}
      <ConfirmDialog
        open={aprobarOpen}
        onOpenChange={setAprobarOpen}
        title="Aprobar calificación"
        description="Al aprobar, el puntaje del evaluador será considerado para el cálculo final. Si todos los evaluadores están aprobados, se calculará el puntaje final automáticamente."
        confirmLabel="Aprobar"
        onConfirm={() => aprobarMutation.mutate()}
        isLoading={aprobarMutation.isPending}
        destructive={false}
      />
    </div>
  );
}
