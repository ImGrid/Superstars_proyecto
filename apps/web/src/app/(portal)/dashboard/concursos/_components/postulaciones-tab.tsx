"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FileText, Eye, ClipboardCheck, UserCheck } from "lucide-react";
import { EstadoCalificacion, EstadoPostulacion } from "@superstars/shared";
import type { PostulacionListItem } from "@superstars/shared";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StateBadge } from "@/components/shared/state-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { postulacionQueries, calificacionQueries, concursoQueries } from "@/lib/api/query-keys";
import { formatShortDate, formatPercent } from "@/lib/format";

interface PostulacionesTabProps {
  concursoId: number;
  estadoConcurso: string;
}

// estados disponibles para filtrar
const ESTADOS_FILTRO = [
  { valor: "all", label: "Todos" },
  { valor: "borrador", label: "Borrador" },
  { valor: "enviado", label: "Enviado" },
  { valor: "observado", label: "Observado" },
  { valor: "rechazado", label: "Rechazado" },
  { valor: "en_evaluacion", label: "En evaluacion" },
  { valor: "calificado", label: "Calificado" },
  { valor: "ganador", label: "Ganador" },
  { valor: "no_seleccionado", label: "No seleccionado" },
];

export function PostulacionesTab({ concursoId, estadoConcurso }: PostulacionesTabProps) {
  const router = useRouter();
  const [filtroEstado, setFiltroEstado] = useState<string>("all");

  const estado = filtroEstado === "all" ? undefined : filtroEstado;
  const { data, isLoading } = useQuery(postulacionQueries.list(concursoId, estado));

  // cargar calificaciones para mostrar indicadores
  const { data: calificaciones } = useQuery(calificacionQueries.list(concursoId));

  // cargar evaluadores del pool para mostrar total
  const { data: poolEvaluadores } = useQuery(concursoQueries.evaluadores(concursoId));
  const totalEvaluadoresPool = poolEvaluadores?.length ?? 0;

  // contar evaluadores con calificacion por postulacion
  const califsPorPostulacion = new Map<number, number>();
  for (const c of calificaciones ?? []) {
    califsPorPostulacion.set(c.postulacionId, (califsPorPostulacion.get(c.postulacionId) ?? 0) + 1);
  }

  const postulaciones = data ?? [];
  const pendientesRevision = (calificaciones ?? []).filter(
    (c) => c.estado === EstadoCalificacion.COMPLETADO,
  );

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
            <FileText className="size-5 text-secondary-400" />
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
          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <ClipboardCheck className="size-5 text-blue-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">
                {pendientesRevision.length} calificacion{pendientesRevision.length !== 1 ? "es" : ""} pendiente{pendientesRevision.length !== 1 ? "s" : ""} de revision
              </p>
              <p className="text-xs text-blue-600">
                Los evaluadores han enviado sus calificaciones y esperan tu aprobacion.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {pendientesRevision.map((c) => (
                <Button
                  key={c.id}
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-100"
                  onClick={() =>
                    router.push(`/dashboard/concursos/${concursoId}/calificaciones/${c.id}`)
                  }
                >
                  {c.empresaRazonSocial} — {c.evaluadorNombre}
                </Button>
              ))}
            </div>
          </div>
        )}

        {postulaciones.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No hay postulaciones"
            description={
              filtroEstado !== "all"
                ? "No hay postulaciones con ese estado."
                : "Aun no se han recibido postulaciones para este concurso."
            }
          />
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Completado</TableHead>
                  <TableHead>Evaluadores</TableHead>
                  <TableHead>Fecha envio</TableHead>
                  <TableHead>Puntaje</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {postulaciones.map((p) => (
                  <PostulacionRow
                    key={p.id}
                    postulacion={p}
                    concursoId={concursoId}
                    evaluadoresAsignados={califsPorPostulacion.get(p.id) ?? 0}
                    totalEvaluadores={totalEvaluadoresPool}
                    onVerDetalle={() =>
                      router.push(`/dashboard/concursos/${concursoId}/postulaciones/${p.id}`)
                    }
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
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
  concursoId,
  evaluadoresAsignados,
  totalEvaluadores,
  onVerDetalle,
}: {
  postulacion: PostulacionListItem;
  concursoId: number;
  evaluadoresAsignados: number;
  totalEvaluadores: number;
  onVerDetalle: () => void;
}) {
  const router = useRouter();
  const pct = Math.round(Number(postulacion.porcentajeCompletado));
  const pendientes = postulacion.calificacionesPendientes ?? 0;
  const esEvaluable = ESTADOS_EVALUABLES.includes(postulacion.estado as EstadoPostulacion);

  return (
    <TableRow>
      <TableCell className="font-medium">
        {postulacion.empresaRazonSocial}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <StateBadge tipo="postulacion" valor={postulacion.estado} />
          {pendientes > 0 && (
            <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">
              {pendientes} por revisar
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 rounded-full bg-secondary-100">
            <div
              className={`h-2 rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-primary-500"}`}
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
                ? "text-red-600 hover:text-red-700"
                : evaluadoresAsignados < totalEvaluadores
                  ? "text-amber-600 hover:text-amber-700"
                  : "text-emerald-600 hover:text-emerald-700"
            }`}
            onClick={() =>
              router.push(`/dashboard/concursos/${concursoId}/postulaciones/${postulacion.id}`)
            }
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
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={onVerDetalle}
          >
            <Eye className="size-3.5" />
            Ver detalle
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
