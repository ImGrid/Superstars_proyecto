"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { StateBadge } from "@/components/shared/state-badge";
import { ResponseViewer } from "@/components/shared/response-viewer";
import { seguimientoQueries } from "@/lib/api/query-keys";
import { formatDate } from "@/lib/format";

interface Props {
  params: Promise<{ convocatoriaId: string; postulacionId: string }>;
}

export default function SeguimientoPostulacionPage({ params }: Props) {
  const { convocatoriaId: cId, postulacionId: pId } = use(params);
  const convocatoriaId = Number(cId);
  const postulacionId = Number(pId);
  const router = useRouter();

  const {
    data: postulacion,
    isLoading: cargandoPost,
    isError,
  } = useQuery(seguimientoQueries.postulacionDetail(convocatoriaId, postulacionId));

  // el formulario (schema) de la categoria interpreta las respuestas; se carga
  // cuando ya sabemos a que categoria pertenece la postulacion
  const { data: formulario, isLoading: cargandoForm } = useQuery({
    ...seguimientoQueries.formulario(convocatoriaId, postulacion?.categoriaId ?? 0),
    enabled: !!postulacion?.categoriaId,
  });

  const volver = () =>
    router.push(`/dashboard/seguimiento/${convocatoriaId}/postulaciones`);

  if (cargandoPost) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !postulacion) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>
            No se pudo cargar esta postulación. Vuelve al listado para intentarlo
            de nuevo.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={volver}>
          <ArrowLeft className="size-4" />
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-start gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="mt-0.5 shrink-0"
          onClick={volver}
          aria-label="Volver a postulaciones"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-xl font-bold text-secondary-900">
              {postulacion.empresaRazonSocial}
            </h1>
            <StateBadge tipo="postulacion" valor={postulacion.estado} />
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-secondary-600">
            {postulacion.fechaEnvio && (
              <span>Enviada el {formatDate(postulacion.fechaEnvio)}</span>
            )}
            <span>Completada al {postulacion.porcentajeCompletado}%</span>
            {postulacion.puntajeFinal !== null && (
              <span>Puntaje: {postulacion.puntajeFinal}</span>
            )}
            {postulacion.posicionFinal !== null && (
              <span>Posición: {postulacion.posicionFinal}</span>
            )}
          </div>
        </div>
      </div>

      {/* observacion del responsable, si la hay */}
      {postulacion.observacion && (
        <Alert>
          <MessageSquare className="size-4" />
          <AlertDescription>
            <span className="font-medium text-secondary-800">Observación: </span>
            {postulacion.observacion}
          </AlertDescription>
        </Alert>
      )}

      {/* respuestas del formulario */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Respuestas del formulario</CardTitle>
        </CardHeader>
        <CardContent>
          {cargandoForm ? (
            <Skeleton className="h-64 w-full" />
          ) : !formulario ? (
            <p className="text-sm text-secondary-500">
              No se pudo cargar el formulario de esta categoría.
            </p>
          ) : (
            <ResponseViewer
              schema={formulario.schemaDefinition}
              responseData={postulacion.responseData}
              archivos={[]}
              convocatoriaId={convocatoriaId}
              postulacionId={postulacionId}
              adjuntosOcultos
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
