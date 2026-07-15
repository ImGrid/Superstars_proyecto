"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  XCircle,
  MessageSquare,
  Loader2,
  User,
} from "lucide-react";
import { Icon } from "@iconify/react";
import { EstadoPostulacion, EstadoCalificacion } from "@superstars/shared";
import type { CalificacionListItem } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { StateBadge } from "@/components/shared/state-badge";
import { ResponseViewer } from "@/components/shared/response-viewer";
import { EvaluadoresAsignadosTab } from "../../../_components/evaluadores-asignados-tab";
import {
  postulacionQueries,
  formularioQueries,
  archivoQueries,
  calificacionQueries,
} from "@/lib/api/query-keys";
import {
  aprobarPostulacion,
  observarPostulacion,
  rechazarPostulacion,
} from "@/lib/api/postulacion.api";
import { formatDate, formatPercent } from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string; postulacionId: string }>;
  // ?tab=calificaciones abre directo el tab de calificaciones (ej. desde "Revisar")
  searchParams: Promise<{ tab?: string }>;
}

export default function PostulacionDetallePage({ params, searchParams }: PageProps) {
  const { id: cId, postulacionId: pId } = use(params);
  const { tab: tabParam } = use(searchParams);
  const convocatoriaId = Number(cId);
  const postulacionId = Number(pId);
  const router = useRouter();
  const queryClient = useQueryClient();

  // cargar postulacion con responseData
  const { data: postulacion, isLoading: isLoadingPost } = useQuery(
    postulacionQueries.detail(convocatoriaId, postulacionId),
  );

  // cargar formulario (schema) de la categoria de la postulacion para interpretar respuestas
  const { data: formulario, isLoading: isLoadingForm } = useQuery({
    ...formularioQueries.detail(convocatoriaId, postulacion?.categoriaId ?? 0),
    enabled: !!postulacion?.categoriaId,
  });

  // cargar calificaciones de la convocatoria (para mostrar las de esta postulacion)
  const { data: calificaciones } = useQuery(calificacionQueries.list(convocatoriaId));

  // cargar archivos de la postulacion
  const { data: archivos, isLoading: isLoadingArchivos } = useQuery(
    archivoQueries.list(convocatoriaId, postulacionId),
  );

  // estado de dialogos
  const [observarOpen, setObservarOpen] = useState(false);
  const [observacion, setObservacion] = useState("");
  const [rechazarOpen, setRechazarOpen] = useState(false);
  const [motivo, setMotivo] = useState("");

  // acciones disponibles segun el estado de la postulacion
  const isEnviado = postulacion?.estado === EstadoPostulacion.ENVIADO;
  const isEnEvaluacion = postulacion?.estado === EstadoPostulacion.EN_EVALUACION;

  // mutaciones
  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: postulacionQueries.all() });
    queryClient.invalidateQueries({
      queryKey: postulacionQueries.detail(convocatoriaId, postulacionId).queryKey,
    });
  };

  const aprobarMutation = useMutation({
    mutationFn: () => aprobarPostulacion(convocatoriaId, postulacionId),
    onSuccess: () => {
      // recordatorio proactivo: aprobar no basta, hay que asignar evaluadores
      toast.success(
        "Postulación aprobada. Ahora asígnale evaluadores en la pestaña Evaluadores para que la califiquen.",
      );
      invalidar();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? "Error al aprobar");
    },
  });

  const observarMutation = useMutation({
    mutationFn: () => observarPostulacion(convocatoriaId, postulacionId, { observacion }),
    onSuccess: () => {
      toast.success("Postulación observada");
      setObservarOpen(false);
      setObservacion("");
      invalidar();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? "Error al observar");
    },
  });

  const rechazarMutation = useMutation({
    mutationFn: () => rechazarPostulacion(convocatoriaId, postulacionId, { motivo }),
    onSuccess: () => {
      toast.success(
        isEnEvaluacion ? "Postulación sacada del concurso" : "Postulación rechazada",
      );
      setRechazarOpen(false);
      setMotivo("");
      invalidar();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? "Error al rechazar");
    },
  });

  const isLoading = isLoadingPost || isLoadingForm || isLoadingArchivos;
  const isBusy = aprobarMutation.isPending || observarMutation.isPending || rechazarMutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!postulacion || !formulario) {
    return (
      <Alert variant="destructive">
        <AlertDescription>No se pudo cargar la postulación o el formulario.</AlertDescription>
      </Alert>
    );
  }

  // filtrar calificaciones de esta postulacion
  const califsDeEstaPostulacion = (calificaciones ?? []).filter(
    (c: CalificacionListItem) => c.postulacionId === postulacionId,
  );

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/dashboard/convocatorias/${convocatoriaId}`)}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-heading text-xl font-bold text-secondary-900">
            {postulacion.empresaRazonSocial}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <StateBadge tipo="postulacion" valor={postulacion.estado} />
            <span className="text-sm text-secondary-500">
              Completado: {formatPercent(postulacion.porcentajeCompletado)}
            </span>
            {postulacion.fechaEnvio && (
              <span className="text-sm text-secondary-500">
                Enviado: {formatDate(postulacion.fechaEnvio)}
              </span>
            )}
            {postulacion.puntajeFinal && (
              <span className="text-sm font-medium">
                Puntaje: {postulacion.puntajeFinal}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* observacion existente */}
      {postulacion.observacion && (
        <Alert className="border-warning-300 bg-warning-50">
          <Icon icon="ph:warning-duotone"className="size-4 text-warning-600" />
          <AlertDescription className="text-warning-800">
            <span className="font-medium">Observacion: </span>
            {postulacion.observacion}
          </AlertDescription>
        </Alert>
      )}

      {/* tabs: propuesta, evaluadores, calificaciones. El tab inicial puede venir
          por URL (?tab=calificaciones) para el boton "Revisar" de la lista */}
      <Tabs
        defaultValue={
          tabParam === "calificaciones" && califsDeEstaPostulacion.length > 0
            ? "calificaciones"
            : tabParam === "evaluadores"
              ? "evaluadores"
              : "propuesta"
        }
      >
        <TabsList>
          <TabsTrigger value="propuesta">Propuesta</TabsTrigger>
          <TabsTrigger value="evaluadores">
            Evaluadores
          </TabsTrigger>
          {califsDeEstaPostulacion.length > 0 && (
            <TabsTrigger value="calificaciones">
              Calificaciones ({califsDeEstaPostulacion.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* tab propuesta */}
        <TabsContent value="propuesta" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Respuestas del formulario</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponseViewer
                schema={formulario.schemaDefinition}
                responseData={postulacion.responseData}
                archivos={archivos ?? []}
                convocatoriaId={convocatoriaId}
                postulacionId={postulacionId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* tab evaluadores asignados */}
        <TabsContent value="evaluadores" className="mt-4">
          <EvaluadoresAsignadosTab
            convocatoriaId={convocatoriaId}
            categoriaId={postulacion.categoriaId}
            postulacionId={postulacionId}
          />
        </TabsContent>

        {/* tab calificaciones */}
        {califsDeEstaPostulacion.length > 0 && (
          <TabsContent value="calificaciones" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon icon="ph:clipboard-text-duotone"className="size-5 text-secondary-400" />
                  Calificaciones ({califsDeEstaPostulacion.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Evaluador</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Puntaje</TableHead>
                        <TableHead className="text-right">Accion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {califsDeEstaPostulacion.map((c: CalificacionListItem) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <User className="size-3.5 text-secondary-400" />
                              {c.evaluadorNombre}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                c.estado === EstadoCalificacion.COMPLETADO
                                  ? "border-info-300 text-info-700"
                                  : c.estado === EstadoCalificacion.APROBADO
                                    ? "border-success-300 text-success-700"
                                    : c.estado === EstadoCalificacion.DEVUELTO
                                      ? "border-warning-300 text-warning-700"
                                      : "text-secondary-500"
                              }
                            >
                              {c.estado === EstadoCalificacion.EN_PROGRESO && "En progreso"}
                              {c.estado === EstadoCalificacion.COMPLETADO && "Pendiente de revisión"}
                              {c.estado === EstadoCalificacion.APROBADO && "Aprobado"}
                              {c.estado === EstadoCalificacion.DEVUELTO && "Devuelto"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {c.puntajeTotal ?? "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="ghost" size="sm" className="gap-1">
                              <Link href={`/dashboard/convocatorias/${convocatoriaId}/calificaciones/${c.id}`}>
                                Revisar
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* acciones del responsable */}
      {isEnviado && (
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Button
              className="gap-1"
              onClick={() => aprobarMutation.mutate()}
              disabled={isBusy}
            >
              {aprobarMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Icon icon="ph:check-circle-duotone"className="size-4" />
              )}
              Aprobar para evaluación
            </Button>
            <Button
              variant="outline"
              className="gap-1 text-warning-600 border-warning-300 hover:bg-warning-50"
              onClick={() => { setObservacion(""); setObservarOpen(true); }}
              disabled={isBusy}
            >
              <Icon icon="ph:warning-duotone"className="size-4" />
              Observar
            </Button>
            <Button
              variant="outline"
              className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => { setMotivo(""); setRechazarOpen(true); }}
              disabled={isBusy}
            >
              <XCircle className="size-4" />
              Rechazar
            </Button>

            <div className="flex-1" />

            {/* boton mensajeria (sin logica, placeholder futuro) */}
            <Button variant="outline" className="gap-1" disabled>
              <MessageSquare className="size-4" />
              Mensajería
            </Button>
          </CardContent>
        </Card>
      )}

      {/* accion: sacar del concurso una postulacion que no se pudo evaluar */}
      {isEnEvaluacion && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-secondary-600">
              Si esta postulación no se pudo evaluar (ningún jurado la calificó), puedes
              sacarla del concurso para continuar con la selección de ganadores.
            </p>
            <Button
              variant="outline"
              className="shrink-0 gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => { setMotivo(""); setRechazarOpen(true); }}
              disabled={isBusy}
            >
              <XCircle className="size-4" />
              Sacar del concurso
            </Button>
          </CardContent>
        </Card>
      )}

      {/* boton mensajeria para otros estados (no enviado) */}
      {!isEnviado && (
        <div className="flex justify-end">
          <Button variant="outline" className="gap-1" disabled>
            <MessageSquare className="size-4" />
            Mensajería
          </Button>
        </div>
      )}

      {/* dialog observar */}
      <Dialog open={observarOpen} onOpenChange={setObservarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observar postulación</DialogTitle>
            <DialogDescription>
              Escribe las observaciones para que el proponente corrija su propuesta.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Describe que debe corregir el proponente..."
            rows={4}
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setObservarOpen(false)}
              disabled={observarMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => observarMutation.mutate()}
              disabled={observarMutation.isPending || !observacion.trim()}
              className="gap-1"
            >
              {observarMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Enviar observacion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* dialog rechazar / sacar del concurso (pide motivo obligatorio) */}
      <Dialog open={rechazarOpen} onOpenChange={setRechazarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEnEvaluacion ? "Sacar del concurso" : "Rechazar postulación"}
            </DialogTitle>
            <DialogDescription>
              {isEnEvaluacion
                ? "La postulación saldrá del concurso y no podrá ganar. Escribe el motivo; se guardará para poder informar a la empresa."
                : "La postulación quedará fuera del concurso y la empresa no podrá reenviarla. Escribe el motivo; se guardará para poder informar a la empresa."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo (por ejemplo: no cumple los requisitos, o no se pudo evaluar dentro del plazo)"
            rows={4}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRechazarOpen(false)}
              disabled={rechazarMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => rechazarMutation.mutate()}
              disabled={rechazarMutation.isPending || !motivo.trim()}
              className="gap-1"
            >
              {rechazarMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              {isEnEvaluacion ? "Sacar del concurso" : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
