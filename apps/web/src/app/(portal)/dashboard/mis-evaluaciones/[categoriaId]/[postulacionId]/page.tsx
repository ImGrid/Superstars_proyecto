"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Send, Loader2 } from "lucide-react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { EstadoCalificacion } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ResponseViewer } from "@/components/shared/response-viewer";
import {
  evaluacionQueries,
  rubricaQueries,
  formularioQueries,
  archivoQueries,
} from "@/lib/api/query-keys";
import { saveCalificacion, completarCalificacion } from "@/lib/api/evaluacion.api";

interface PageProps {
  params: Promise<{ convocatoriaId: string; postulacionId: string }>;
}

export default function CalificacionPage({ params }: PageProps) {
  const { convocatoriaId: cId, postulacionId: pId } = use(params);
  const convocatoriaId = Number(cId);
  const postulacionId = Number(pId);
  const router = useRouter();
  const queryClient = useQueryClient();

  // cargar detalle de postulacion + calificacion existente
  const { data: detalleData, isLoading: isLoadingDetalle } = useQuery(
    evaluacionQueries.detalle(convocatoriaId, postulacionId),
  );

  // cargar rubrica completa
  const { data: rubrica, isLoading: isLoadingRubrica } = useQuery(
    rubricaQueries.detail(convocatoriaId),
  );

  // cargar formulario (schema) para interpretar las respuestas
  const { data: formulario, isLoading: isLoadingForm } = useQuery(
    formularioQueries.detail(convocatoriaId),
  );

  // cargar archivos de la postulacion
  const { data: archivos, isLoading: isLoadingArchivos } = useQuery(
    archivoQueries.list(convocatoriaId, postulacionId),
  );

  // estado local de puntajes y justificaciones
  const [puntajes, setPuntajes] = useState<Record<number, string>>({});
  const [justificaciones, setJustificaciones] = useState<Record<number, string>>({});
  const [comentarioGeneral, setComentarioGeneral] = useState("");
  const [initialized, setInitialized] = useState(false);

  // inicializar con datos existentes (si hay calificacion previa)
  if (detalleData && rubrica && !initialized) {
    const puntajesInit: Record<number, string> = {};
    const justInit: Record<number, string> = {};

    for (const det of detalleData.detalles) {
      puntajesInit[det.subCriterioId] = det.puntaje;
      if (det.justificacion) justInit[det.subCriterioId] = det.justificacion;
    }

    setPuntajes(puntajesInit);
    setJustificaciones(justInit);
    setComentarioGeneral(detalleData.calificacion?.comentarioGeneral ?? "");
    setInitialized(true);
  }

  // mutacion guardar
  const saveMutation = useMutation({
    mutationFn: () => {
      const detalles = Object.entries(puntajes)
        .filter(([, v]) => v !== "")
        .map(([scId, puntaje]) => ({
          subCriterioId: Number(scId),
          puntaje: Number(puntaje),
          justificacion: justificaciones[Number(scId)] || undefined,
        }));

      return saveCalificacion(postulacionId, {
        comentarioGeneral: comentarioGeneral || undefined,
        detalles,
      });
    },
    onSuccess: () => {
      toast.success("Calificación guardada");
      queryClient.invalidateQueries({ queryKey: evaluacionQueries.all() });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? "Error al guardar");
    },
  });

  // mutacion completar
  const completarMutation = useMutation({
    mutationFn: () => completarCalificacion(postulacionId),
    onSuccess: () => {
      toast.success("Calificación enviada para revisión");
      queryClient.invalidateQueries({ queryKey: evaluacionQueries.all() });
      router.push(`/dashboard/mis-evaluaciones/${convocatoriaId}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? "Error al completar");
    },
  });

  const isLoading = isLoadingDetalle || isLoadingRubrica || isLoadingForm || isLoadingArchivos;
  const isBusy = saveMutation.isPending || completarMutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!rubrica || !detalleData) {
    return (
      <Alert variant="destructive">
        <AlertDescription>No se pudo cargar la informacion.</AlertDescription>
      </Alert>
    );
  }

  const calif = detalleData.calificacion;
  const isReadOnly = calif?.estado === EstadoCalificacion.COMPLETADO
    || calif?.estado === EstadoCalificacion.APROBADO;
  const isDevuelto = calif?.estado === EstadoCalificacion.DEVUELTO;

  // contar sub-criterios con puntaje vs totales
  const totalSubCriterios = rubrica.criterios.reduce(
    (sum, cr) => sum + cr.subCriterios.length, 0,
  );
  const filledCount = Object.values(puntajes).filter((v) => v !== "").length;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* header fijo */}
      <div className="flex items-center gap-3 border-b bg-white px-4 py-3 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/dashboard/mis-evaluaciones/${convocatoriaId}`)}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-lg font-bold text-secondary-900 truncate">
            Evaluacion — Empresa #{detalleData.postulacion.empresaId}
          </h1>
          <div className="flex items-center gap-2 text-xs text-secondary-500">
            <Badge variant="outline" className="text-xs">
              {filledCount}/{totalSubCriterios} calificados
            </Badge>
            {calif?.estado && (
              <Badge
                variant="outline"
                className={
                  calif.estado === EstadoCalificacion.APROBADO
                    ? "border-emerald-300 text-emerald-700"
                    : calif.estado === EstadoCalificacion.DEVUELTO
                      ? "border-amber-300 text-amber-700"
                      : "text-secondary-500"
                }
              >
                {calif.estado === EstadoCalificacion.EN_PROGRESO && "En progreso"}
                {calif.estado === EstadoCalificacion.COMPLETADO && "Enviado"}
                {calif.estado === EstadoCalificacion.APROBADO && "Aprobado"}
                {calif.estado === EstadoCalificacion.DEVUELTO && "Devuelto"}
              </Badge>
            )}
          </div>
        </div>

        {/* botones de accion en el header */}
        {!isReadOnly && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={isBusy || filledCount === 0}
              className="gap-1"
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              Guardar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                saveMutation.mutate(undefined, {
                  onSuccess: () => completarMutation.mutate(),
                });
              }}
              disabled={isBusy || filledCount < totalSubCriterios}
              className="gap-1"
            >
              {completarMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              Enviar ({filledCount}/{totalSubCriterios})
            </Button>
          </div>
        )}
      </div>

      {/* alertas */}
      {(isDevuelto || calif?.estado === EstadoCalificacion.APROBADO) && (
        <div className="px-4 pt-3 shrink-0">
          {isDevuelto && calif?.comentarioResponsable && (
            <Alert className="border-amber-300 bg-amber-50">
              <Icon icon="ph:warning-duotone"className="size-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <span className="font-medium">Devuelta por el responsable: </span>
                {calif.comentarioResponsable}
              </AlertDescription>
            </Alert>
          )}
          {calif?.estado === EstadoCalificacion.APROBADO && (
            <Alert className="border-emerald-300 bg-emerald-50">
              <Icon icon="ph:check-circle-duotone"className="size-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800">
                Calificacion aprobada. Solo lectura.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* contenido principal: split view */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup orientation="horizontal">
          {/* panel izquierdo: propuesta */}
          <ResizablePanel defaultSize={55} minSize={30}>
            <div className="h-full overflow-y-auto p-4">
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-secondary-700 uppercase tracking-wide">
                  Propuesta del postulante
                </h2>
              </div>
              {formulario ? (
                <ResponseViewer
                  schema={formulario.schemaDefinition}
                  responseData={detalleData.postulacion.responseData}
                  archivos={archivos ?? []}
                  convocatoriaId={convocatoriaId}
                  postulacionId={postulacionId}
                />
              ) : (
                <p className="text-sm text-secondary-400">
                  No se encontró el formulario de la convocatoria.
                </p>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* panel derecho: rubrica de calificacion */}
          <ResizablePanel defaultSize={45} minSize={30}>
            <div className="h-full overflow-y-auto p-4 bg-secondary-50/30">
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-secondary-700 uppercase tracking-wide">
                  Rubrica de evaluacion
                </h2>
              </div>

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
                    <CardContent className="space-y-4 px-4 pb-4 pt-0">
                      {criterio.subCriterios.map((sc) => {
                        const niveles = sc.nivelEvaluacions ?? [];
                        const basico = niveles.find((n) => n.nivel === "basico");
                        const intermedio = niveles.find((n) => n.nivel === "intermedio");
                        const avanzado = niveles.find((n) => n.nivel === "avanzado");
                        const minPuntaje = basico ? Number(basico.puntajeMin) : 0;
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
                              {puntajes[sc.id] && (
                                <Badge variant="outline" className="text-xs tabular-nums">
                                  {puntajes[sc.id]}/{maxPuntaje}
                                </Badge>
                              )}
                            </div>

                            {sc.descripcion && (
                              <p className="text-xs text-secondary-500">{sc.descripcion}</p>
                            )}

                            {/* guia de niveles compacta */}
                            <div className="flex flex-wrap gap-1.5 text-[11px]">
                              {basico && (
                                <span className="rounded bg-secondary-100 px-1.5 py-0.5 text-secondary-600">
                                  Basico {basico.puntajeMin}-{basico.puntajeMax}
                                </span>
                              )}
                              {intermedio && (
                                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-600">
                                  Intermedio {intermedio.puntajeMin}-{intermedio.puntajeMax}
                                </span>
                              )}
                              {avanzado && (
                                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-600">
                                  Avanzado {avanzado.puntajeMin}-{avanzado.puntajeMax}
                                </span>
                              )}
                            </div>

                            <Separator />

                            {/* inputs */}
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div>
                                <Label className="text-xs text-secondary-500">
                                  Puntaje ({minPuntaje}-{maxPuntaje})
                                </Label>
                                <Input
                                  type="number"
                                  min={minPuntaje}
                                  max={maxPuntaje}
                                  step="1"
                                  value={puntajes[sc.id] ?? ""}
                                  onChange={(e) =>
                                    setPuntajes((prev) => ({ ...prev, [sc.id]: e.target.value }))
                                  }
                                  disabled={isReadOnly}
                                  className="mt-1 h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-secondary-500">
                                  Justificacion
                                </Label>
                                <Textarea
                                  rows={1}
                                  placeholder="Opcional..."
                                  value={justificaciones[sc.id] ?? ""}
                                  onChange={(e) =>
                                    setJustificaciones((prev) => ({ ...prev, [sc.id]: e.target.value }))
                                  }
                                  disabled={isReadOnly}
                                  className="mt-1 text-sm min-h-8 resize-y"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}

                {/* comentario general */}
                <Card className="shadow-sm">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold">Comentario general</CardTitle>
                    <CardDescription className="text-xs">
                      Opcional. Observaciones sobre la propuesta en general.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0">
                    <Textarea
                      rows={3}
                      placeholder="Escribe un comentario general..."
                      value={comentarioGeneral}
                      onChange={(e) => setComentarioGeneral(e.target.value)}
                      disabled={isReadOnly}
                      className="text-sm"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
