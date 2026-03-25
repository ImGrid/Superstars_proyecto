"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardCheck, FileText } from "lucide-react";
import { EstadoCalificacion } from "@superstars/shared";
import type { PostulacionEvaluableItem } from "@superstars/shared";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StateBadge } from "@/components/shared/state-badge";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { evaluacionQueries } from "@/lib/api/query-keys";
import { formatShortDate } from "@/lib/format";

interface PageProps {
  params: Promise<{ concursoId: string }>;
}

export default function PostulacionesEvaluadorPage({ params }: PageProps) {
  const { concursoId: concursoIdStr } = use(params);
  const concursoId = Number(concursoIdStr);
  const router = useRouter();

  const { data, isLoading } = useQuery(
    evaluacionQueries.postulaciones(concursoId),
  );

  const postulaciones = data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/mis-evaluaciones")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <PageHeader
          title="Postulaciones a evaluar"
          description="Selecciona una postulacion para calificar."
        />
      </div>

      {postulaciones.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin postulaciones"
          description="No hay postulaciones disponibles para evaluar en este concurso."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-5 text-secondary-400" />
              {postulaciones.length} postulacion{postulaciones.length !== 1 ? "es" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Estado postulacion</TableHead>
                    <TableHead>Mi calificacion</TableHead>
                    <TableHead>Puntaje</TableHead>
                    <TableHead>Enviado</TableHead>
                    <TableHead className="text-right">Accion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postulaciones.map((p) => (
                    <PostulacionRow
                      key={p.id}
                      postulacion={p}
                      onCalificar={() =>
                        router.push(`/dashboard/mis-evaluaciones/${concursoId}/${p.id}`)
                      }
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PostulacionRow({
  postulacion,
  onCalificar,
}: {
  postulacion: PostulacionEvaluableItem;
  onCalificar: () => void;
}) {
  // determinar label y color del estado de calificacion
  const califEstado = postulacion.calificacionEstado;
  let califBadge: React.ReactNode;

  if (!califEstado) {
    califBadge = <Badge variant="outline" className="text-secondary-400">Sin iniciar</Badge>;
  } else if (califEstado === EstadoCalificacion.EN_PROGRESO) {
    califBadge = <Badge variant="outline" className="text-blue-600 border-blue-300">En progreso</Badge>;
  } else if (califEstado === EstadoCalificacion.COMPLETADO) {
    califBadge = <Badge variant="outline" className="text-amber-600 border-amber-300">Completado</Badge>;
  } else if (califEstado === EstadoCalificacion.APROBADO) {
    califBadge = <Badge variant="outline" className="text-emerald-600 border-emerald-300">Aprobado</Badge>;
  } else if (califEstado === EstadoCalificacion.DEVUELTO) {
    califBadge = <Badge variant="outline" className="text-red-600 border-red-300">Devuelto</Badge>;
  }

  // determinar texto del boton
  let actionLabel = "Calificar";
  if (califEstado === EstadoCalificacion.EN_PROGRESO) actionLabel = "Continuar";
  if (califEstado === EstadoCalificacion.DEVUELTO) actionLabel = "Corregir";
  if (califEstado === EstadoCalificacion.COMPLETADO) actionLabel = "Ver";
  if (califEstado === EstadoCalificacion.APROBADO) actionLabel = "Ver";

  return (
    <TableRow>
      <TableCell className="font-medium">{postulacion.empresaRazonSocial}</TableCell>
      <TableCell>
        <StateBadge tipo="postulacion" valor={postulacion.estado} />
      </TableCell>
      <TableCell>{califBadge}</TableCell>
      <TableCell className="text-sm">
        {postulacion.calificacionPuntaje ?? "-"}
      </TableCell>
      <TableCell className="text-sm text-secondary-500">
        {postulacion.fechaEnvio ? formatShortDate(postulacion.fechaEnvio) : "-"}
      </TableCell>
      <TableCell className="text-right">
        <Button variant="outline" size="sm" onClick={onCalificar}>
          {actionLabel}
        </Button>
      </TableCell>
    </TableRow>
  );
}
