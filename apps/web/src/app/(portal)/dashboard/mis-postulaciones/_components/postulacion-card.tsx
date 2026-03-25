"use client";

import { useRouter } from "next/navigation";
import {
  Clock,
  FileEdit,
  AlertTriangle,
  Eye,
  Trophy as TrophyIcon,
} from "lucide-react";
import { EstadoPostulacion } from "@superstars/shared";
import type { PostulacionListItem } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StateBadge } from "@/components/shared/state-badge";
import { formatShortDate, formatPercent } from "@/lib/format";

interface PostulacionCardProps {
  postulacion: PostulacionListItem;
}

// barra de progreso del formulario
function CompletionBar({ porcentaje }: { porcentaje: string }) {
  const pct = Math.round(Number(porcentaje));
  let barColor = "bg-secondary-300";
  if (pct >= 100) barColor = "bg-emerald-500";
  else if (pct >= 50) barColor = "bg-primary-500";
  else if (pct > 0) barColor = "bg-amber-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-secondary-500">Formulario completado</span>
        <span className="text-xs font-medium text-secondary-700">
          {formatPercent(porcentaje)}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary-100">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

// accion principal segun estado
function getMainAction(estado: EstadoPostulacion): {
  label: string;
  icon: React.ReactNode;
  variant: "default" | "outline" | "destructive";
} | null {
  switch (estado) {
    case EstadoPostulacion.BORRADOR:
      return {
        label: "Continuar postulacion",
        icon: <FileEdit className="size-4" />,
        variant: "default",
      };
    case EstadoPostulacion.OBSERVADO:
      return {
        label: "Corregir postulacion",
        icon: <AlertTriangle className="size-4" />,
        variant: "default",
      };
    default:
      return {
        label: "Ver detalle",
        icon: <Eye className="size-4" />,
        variant: "outline",
      };
  }
}

export function PostulacionCard({ postulacion }: PostulacionCardProps) {
  const router = useRouter();
  const action = getMainAction(postulacion.estado);
  const isBorrador = postulacion.estado === EstadoPostulacion.BORRADOR;
  const isObservado = postulacion.estado === EstadoPostulacion.OBSERVADO;
  const isGanador = postulacion.estado === EstadoPostulacion.GANADOR;

  return (
    <Card
      className={`flex flex-col ${
        isObservado
          ? "border-amber-300 bg-amber-50/30"
          : isGanador
            ? "border-emerald-300 bg-emerald-50/30"
            : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight line-clamp-2">
            {postulacion.concursoNombre ?? `Concurso #${postulacion.concursoId}`}
          </CardTitle>
          <StateBadge tipo="postulacion" valor={postulacion.estado} />
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {/* ganador: destacado especial */}
        {isGanador && (
          <div className="flex items-center gap-2 rounded-md bg-emerald-100 px-3 py-2">
            <TrophyIcon className="size-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">
              Tu empresa fue seleccionada como ganadora
            </span>
          </div>
        )}

        {/* observacion del responsable */}
        {isObservado && postulacion.observacion && (
          <div className="flex items-start gap-2 rounded-md bg-amber-100 px-3 py-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800 line-clamp-3">
              {postulacion.observacion}
            </p>
          </div>
        )}

        {/* progreso del formulario (solo borrador/observado) */}
        {(isBorrador || isObservado) && (
          <CompletionBar porcentaje={postulacion.porcentajeCompletado} />
        )}

        {/* info */}
        <div className="flex items-center gap-4 text-xs text-secondary-500">
          {postulacion.fechaEnvio && (
            <div className="flex items-center gap-1">
              <Clock className="size-3" />
              Enviado {formatShortDate(postulacion.fechaEnvio)}
            </div>
          )}
          {!postulacion.fechaEnvio && (
            <div className="flex items-center gap-1">
              <Clock className="size-3" />
              Creado {formatShortDate(postulacion.createdAt)}
            </div>
          )}
        </div>
      </CardContent>

      {action && (
        <CardFooter className="pt-3">
          <Button
            variant={action.variant}
            className="w-full gap-2"
            onClick={() =>
              router.push(`/dashboard/concursos/${postulacion.concursoId}`)
            }
          >
            {action.icon}
            {action.label}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
