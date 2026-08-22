"use client";

import Link from "next/link";
import { ArrowRight, MapPin, FolderOpen, FileText } from "lucide-react";
import type { SeguimientoConvocatoriaListItem } from "@superstars/shared";
import { StateBadge } from "@/components/shared/state-badge";
import { formatDate } from "@/lib/format";

interface Props {
  convocatoria: SeguimientoConvocatoriaListItem;
}

// Tarjeta de convocatoria del portal de seguimiento (financiador).
//
// A diferencia de la tarjeta del proponente, no muestra premio ni CTA de postular
// ni estado "ya postulaste": el observador solo consulta. La tarjeta entera es un
// enlace al detalle de seguimiento.
export function ConvocatoriaSeguimientoCard({ convocatoria }: Props) {
  return (
    <Link
      href={`/dashboard/seguimiento/${convocatoria.id}`}
      className="group flex flex-col rounded-xl border border-secondary-200 bg-card p-5 transition-colors hover:border-primary-300 hover:bg-secondary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azul-600"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 font-display text-base leading-snug font-semibold text-primary-800">
          {convocatoria.nombre}
        </h3>
        <StateBadge tipo="convocatoria" valor={convocatoria.estado} />
      </div>

      {convocatoria.descripcion && (
        <p className="mt-2 line-clamp-2 text-sm text-secondary-600">
          {convocatoria.descripcion}
        </p>
      )}

      {/* conteos: cuántas categorías y cuántas postulaciones tiene */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary-200 bg-secondary-50 px-2.5 py-1 text-xs text-secondary-700">
          <FolderOpen className="size-3.5 text-info-600" />
          {convocatoria.numCategorias}{" "}
          {convocatoria.numCategorias === 1 ? "categoría" : "categorías"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary-200 bg-secondary-50 px-2.5 py-1 text-xs text-secondary-700">
          <FileText className="size-3.5 text-primary-600" />
          {convocatoria.numPostulaciones}{" "}
          {convocatoria.numPostulaciones === 1 ? "postulación" : "postulaciones"}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-secondary-100 pt-3">
        <div className="min-w-0 text-sm">
          <p className="text-secondary-600">
            Cierre de postulación: {formatDate(convocatoria.fechaCierrePostulacion)}
          </p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-secondary-500">
            <MapPin className="size-3 shrink-0" />
            {convocatoria.departamentos.join(" · ")}
          </p>
        </div>

        <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-azul-600 group-hover:underline">
          Ver seguimiento
          <ArrowRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}
