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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
}

export default function PostulacionDetallePage({ params }: PageProps) {
  const { id: cId, postulacionId: pId } = use(params);
  const concursoId = Number(cId);
  const postulacionId = Number(pId);
  const router = useRouter();
  const queryClient = useQueryClient();

  // cargar postulacion con responseData
  const { data: postulacion, isLoading: isLoadingPost } = useQuery(
    postulacionQueries.detail(concursoId, postulacionId),
  );

  // cargar formulario (schema) para interpretar respuestas
  const { data: formulario, isLoading: isLoadingForm } = useQuery(
    formularioQueries.detail(concursoId),
  );

  // cargar calificaciones del concurso (para mostrar las de esta postulacion)
  const { data: calificaciones } = useQuery(calificacionQueries.list(concursoId));

  // cargar archivos de la postulacion
  const { data: archivos, isLoading: isLoadingArchivos } = useQuery(
    archivoQueries.list(concursoId, postulacionId),
  );

  // estado de dialogos
  const [observarOpen, setObservarOpen] = useState(false);
  const [observacion, setObservacion] = useState("");
  const [rechazarOpen, setRechazarOpen] = useState(false);

  // mutaciones
  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: postulacionQueries.all() });
    queryClient.invalidateQueries({
      queryKey: postulacionQueries.detail(concursoId, postulacionId).queryKey,
    });
  };

  const aprobarMutation = useMutation({
    mutationFn: () => aprobarPostulacion(concursoId, postulacionId),
    onSuccess: () => {
      toast.success("Postulacion aprobada para evaluacion");
      invalidar();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? "Error al aprobar");
    },
  });

  const observarMutation = useMutation({
    mutationFn: () => observarPostulacion(concursoId, postulacionId, { observacion }),
    onSuccess: () => {
      toast.success("Postulacion observada");
      setObservarOpen(false);
      setObservacion("");
      invalidar();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? "Error al observar");
    },
  });

  const rechazarMutation = useMutation({
    mutationFn: () => rechazarPostulacion(concursoId, postulacionId),
    onSuccess: () => {
      toast.success("Postulacion rechazada");
      setRechazarOpen(false);
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
        <AlertDescription>No se pudo cargar la postulacion o el formulario.</AlertDescription>
      </Alert>
    );
  }

  const isEnviado = postulacion.estado === EstadoPostulacion.ENVIADO;

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
          onClick={() => router.push(`/dashboard/concursos/${concursoId}`)}
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
        <Alert className="border-amber-300 bg-amber-50">
          <Icon icon="ph:warning-duotone"className="size-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <span className="font-medium">Observacion: </span>
            {postulacion.observacion}
          </AlertDescription>
        </Alert>
      )}

      {/* tabs: propuesta, evaluadores, calificaciones */}
      <Tabs defaultValue="propuesta">
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
                concursoId={concursoId}
                postulacionId={postulacionId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* tab evaluadores asignados */}
        <TabsContent value="evaluadores" className="mt-4">
          <EvaluadoresAsignadosTab
            concursoId={concursoId}
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
                                  ? "border-blue-300 text-blue-700"
                                  : c.estado === EstadoCalificacion.APROBADO
                                    ? "border-emerald-300 text-emerald-700"
                                    : c.estado === EstadoCalificacion.DEVUELTO
                                      ? "border-amber-300 text-amber-700"
                                      : "text-secondary-500"
                              }
                            >
                              {c.estado === EstadoCalificacion.EN_PROGRESO && "En progreso"}
                              {c.estado === EstadoCalificacion.COMPLETADO && "Pendiente de revision"}
                              {c.estado === EstadoCalificacion.APROBADO && "Aprobado"}
                              {c.estado === EstadoCalificacion.DEVUELTO && "Devuelto"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {c.puntajeTotal ?? "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="ghost" size="sm" className="gap-1">
                              <Link href={`/dashboard/concursos/${concursoId}/calificaciones/${c.id}`}>
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
              Aprobar para evaluacion
            </Button>
            <Button
              variant="outline"
              className="gap-1 text-amber-600 border-amber-300 hover:bg-amber-50"
              onClick={() => { setObservacion(""); setObservarOpen(true); }}
              disabled={isBusy}
            >
              <Icon icon="ph:warning-duotone"className="size-4" />
              Observar
            </Button>
            <Button
              variant="outline"
              className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => setRechazarOpen(true)}
              disabled={isBusy}
            >
              <XCircle className="size-4" />
              Rechazar
            </Button>

            <div className="flex-1" />

            {/* boton mensajeria (sin logica, placeholder futuro) */}
            <Button variant="outline" className="gap-1" disabled>
              <MessageSquare className="size-4" />
              Mensajeria
            </Button>
          </CardContent>
        </Card>
      )}

      {/* boton mensajeria para otros estados (no enviado) */}
      {!isEnviado && (
        <div className="flex justify-end">
          <Button variant="outline" className="gap-1" disabled>
            <MessageSquare className="size-4" />
            Mensajeria
          </Button>
        </div>
      )}

      {/* dialog observar */}
      <Dialog open={observarOpen} onOpenChange={setObservarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observar postulacion</DialogTitle>
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

      {/* confirm rechazar */}
      <ConfirmDialog
        open={rechazarOpen}
        onOpenChange={setRechazarOpen}
        title="Rechazar postulacion"
        description="Esta accion es irreversible. La postulacion sera rechazada definitivamente y el proponente no podra reenviarla."
        onConfirm={() => rechazarMutation.mutate()}
        isLoading={rechazarMutation.isPending}
        destructive
      />
    </div>
  );
}
