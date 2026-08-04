"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { Icon } from "@iconify/react";
import { EstadoConvocatoria, EstadoPostulacion } from "@superstars/shared";
import type { PostulacionListItem } from "@superstars/shared";
import { formatShortDate, formatPercent } from "@/lib/format";
import { acentoCategoria, iconoCategoria } from "@/lib/acento-categoria";

interface PostulacionCardProps {
  postulacion: PostulacionListItem;
}

// Icono, color y etiqueta propia del proponente. No se usa StateBadge porque ese
// componente es compartido con administrador, responsable y evaluador, y ahi
// los estados se pintan todos en gris casi identico: "Borrador" y "No
// Seleccionado" comparten exactamente el mismo color, que para quien postula
// son las dos situaciones mas distintas que existen.
// Ademas el texto cambia: al postulante le sirve "Sin enviar", no "Borrador".
const VISUAL_POR_ESTADO: Record<
  EstadoPostulacion,
  { icono: string; color: string; fondo: string; titulo: string; etiqueta: string; badge: string }
> = {
  [EstadoPostulacion.BORRADOR]: {
    icono: "ph:pencil-line-duotone",
    color: "text-warning-700",
    fondo: "bg-warning-100",
    titulo: "text-warning-900",
    etiqueta: "Sin enviar",
    badge: "bg-warning-100 text-warning-800 border-warning-300",
  },
  [EstadoPostulacion.ENVIADO]: {
    icono: "ph:paper-plane-tilt-duotone",
    color: "text-info-700",
    fondo: "bg-info-100",
    titulo: "text-info-900",
    etiqueta: "Recibida",
    badge: "bg-info-100 text-info-800 border-info-300",
  },
  [EstadoPostulacion.OBSERVADO]: {
    icono: "ph:warning-duotone",
    color: "text-warning-700",
    fondo: "bg-warning-100",
    titulo: "text-warning-900",
    etiqueta: "Debes corregir",
    badge: "bg-warning-200 text-warning-900 border-warning-400",
  },
  [EstadoPostulacion.RECHAZADO]: {
    icono: "ph:x-circle-duotone",
    color: "text-error-700",
    fondo: "bg-error-100",
    titulo: "text-error-900",
    etiqueta: "Rechazada",
    badge: "bg-error-100 text-error-800 border-error-300",
  },
  [EstadoPostulacion.EN_EVALUACION]: {
    icono: "ph:magnifying-glass-duotone",
    color: "text-azul-700",
    fondo: "bg-azul-100",
    titulo: "text-azul-900",
    etiqueta: "En evaluación",
    badge: "bg-azul-100 text-azul-800 border-azul-300",
  },
  [EstadoPostulacion.CALIFICADO]: {
    icono: "ph:check-square-offset-duotone",
    color: "text-purple-700",
    fondo: "bg-purple-100",
    titulo: "text-purple-900",
    etiqueta: "Ya calificada",
    badge: "bg-purple-100 text-purple-800 border-purple-300",
  },
  [EstadoPostulacion.GANADOR]: {
    icono: "ph:trophy-duotone",
    color: "text-success-700",
    fondo: "bg-success-100",
    titulo: "text-success-900",
    etiqueta: "Ganadora",
    badge: "bg-success-200 text-success-900 border-success-400",
  },
  [EstadoPostulacion.NO_SELECCIONADO]: {
    icono: "ph:flag-duotone",
    color: "text-secondary-600",
    fondo: "bg-secondary-200",
    titulo: "text-secondary-800",
    etiqueta: "No seleccionada",
    badge: "bg-secondary-200 text-secondary-800 border-secondary-400",
  },
};

// accion principal segun estado. Si la convocatoria ya no admite envios, no se
// ofrece editar: el backend rechazaria el guardado y el usuario quedaria trabado.
function getMainAction(estado: EstadoPostulacion, puedeEditar: boolean) {
  if (estado === EstadoPostulacion.BORRADOR && puedeEditar) {
    return { label: "Continuar postulación", destacada: true };
  }
  if (estado === EstadoPostulacion.OBSERVADO && puedeEditar) {
    return { label: "Corregir postulación", destacada: true };
  }
  return { label: "Ver detalle", destacada: false };
}

export function PostulacionCard({ postulacion }: PostulacionCardProps) {
  // el backend solo acepta guardar/enviar si la convocatoria esta publicada
  const puedeEditar =
    postulacion.convocatoriaEstado === undefined ||
    postulacion.convocatoriaEstado === EstadoConvocatoria.PUBLICADO;
  const action = getMainAction(postulacion.estado, puedeEditar);
  const isBorrador = postulacion.estado === EstadoPostulacion.BORRADOR;
  const isObservado = postulacion.estado === EstadoPostulacion.OBSERVADO;
  const isGanador = postulacion.estado === EstadoPostulacion.GANADOR;
  const sinEnviar = isBorrador || isObservado;
  const sinEnviarACierre = sinEnviar && !puedeEditar;
  const pct = Math.round(Number(postulacion.porcentajeCompletado));
  const visual = VISUAL_POR_ESTADO[postulacion.estado];
  const acentoCat = acentoCategoria(postulacion.categoriaOrden ?? 1);

  return (
    <Link
      href={`/dashboard/convocatorias/${postulacion.convocatoriaId}`}
      className={`group flex items-start gap-3 rounded-xl border p-4 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azul-600 ${
        isObservado
          ? "border-warning-300 bg-warning-50 hover:bg-warning-100/60"
          : isGanador
            ? "border-success-300 bg-success-50 hover:bg-success-100/60"
            : "border-secondary-200 bg-card hover:border-azul-300 hover:bg-azul-50/40"
      }`}
    >
      {/* marca de estado: color y forma antes que texto */}
      <span
        className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-lg ${visual.fondo}`}
        aria-hidden="true"
      >
        <Icon icon={visual.icono} className={`size-5 ${visual.color}`} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className={`line-clamp-2 font-semibold ${visual.titulo}`}>
            {postulacion.convocatoriaNombre ?? `Convocatoria #${postulacion.convocatoriaId}`}
          </p>
          {/* 14 px y color propio: es el dato que define la situacion */}
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[13px] font-semibold whitespace-nowrap ${visual.badge}`}
          >
            {visual.etiqueta}
          </span>
        </div>

        {/* la categoria lleva SU color, el mismo que en el detalle de la
            convocatoria: asi la persona reconoce "la mia" en cualquier pantalla */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
          {postulacion.categoriaNombre && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${acentoCat.chip}`}
            >
              <Icon
                icon={iconoCategoria(postulacion.categoriaOrden ?? 1)}
                className={`size-3.5 ${acentoCat.icono}`}
              />
              {postulacion.categoriaNombre}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-secondary-600">
            <CalendarDays className="size-4 shrink-0 text-azul-500" />
            {postulacion.fechaEnvio
              ? `Enviada el ${formatShortDate(postulacion.fechaEnvio)}`
              : `Creada el ${formatShortDate(postulacion.createdAt)}`}
          </span>
        </div>

        {/* progreso: se muestra siempre que quedo sin enviar, aunque el plazo ya
            haya cerrado. Antes desaparecia justo en ese caso y la persona no
            llegaba a ver cuanto habia avanzado. */}
        {sinEnviar && (
          <div className="mt-2.5 flex items-center gap-2.5">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary-100">
              <div
                className={`h-full rounded-full ${
                  !puedeEditar
                    ? "bg-secondary-300"
                    : pct >= 100
                      ? "bg-success-500"
                      : pct >= 50
                        ? "bg-primary-500"
                        : "bg-warning-500"
                }`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-secondary-700">
              {formatPercent(postulacion.porcentajeCompletado)}
            </span>
          </div>
        )}

        {/* mensajes que cambian lo que la persona puede hacer */}
        {isGanador && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-success-700">
            <Icon icon="ph:confetti-duotone" className="size-4 shrink-0" />
            Tu empresa fue seleccionada como ganadora
          </p>
        )}
        {isObservado && postulacion.observacion && (
          <p className="mt-2 line-clamp-2 rounded-md bg-warning-100 px-2.5 py-1.5 text-sm text-warning-800">
            <span className="font-semibold">Debes corregir: </span>
            {postulacion.observacion}
          </p>
        )}
        {sinEnviarACierre && (
          <p className="mt-2 text-sm text-secondary-600">
            El plazo cerró y no llegaste a enviarla. Ya no se puede editar.
          </p>
        )}

        <span
          className={`mt-2 flex items-center gap-1 text-sm font-semibold ${
            action.destacada ? "text-azul-600" : "text-secondary-600"
          } group-hover:underline`}
        >
          {action.label}
          <ChevronRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}
