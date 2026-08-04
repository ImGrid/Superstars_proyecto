"use client";

import Link from "next/link";
import { Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import { isConvocatoriaAbierta } from "@superstars/shared";
import type { ConvocatoriaResponse } from "@superstars/shared";
import { Badge } from "@/components/ui/badge";
import { StateBadge } from "@/components/shared/state-badge";
import { formatDate, formatMoney, getDiasRestantes } from "@/lib/format";

interface ConvocatoriaCardProps {
  convocatoria: ConvocatoriaResponse;
}

// badge superior: dias restantes solo cuando la convocatoria esta realmente abierta;
// para los demas estados (cerrado, en_evaluacion, resultados_listos, finalizado)
// reusamos StateBadge para no inducir al proponente a creer que puede postular
function HeaderBadge({ convocatoria }: { convocatoria: ConvocatoriaResponse }) {
  if (!isConvocatoriaAbierta(convocatoria)) {
    return <StateBadge tipo="convocatoria" valor={convocatoria.estado} />;
  }

  const cierre = convocatoria.fechaCierreEfectiva ?? convocatoria.fechaCierrePostulacion;
  const dias = getDiasRestantes(cierre);

  let className = "gap-1 shrink-0 ";
  if (dias <= 3) {
    className += "bg-error-50 text-error-700 border-error-200";
  } else if (dias <= 7) {
    className += "bg-warning-50 text-warning-700 border-warning-200";
  } else {
    className += "bg-success-50 text-success-700 border-success-200";
  }

  return (
    <Badge variant="outline" className={className}>
      <Clock className="size-3" />
      {dias === 0 ? "Cierra hoy" : dias === 1 ? "Cierra mañana" : `Cierra en ${dias} días`}
    </Badge>
  );
}

export function ConvocatoriaCard({ convocatoria }: ConvocatoriaCardProps) {
  const categorias = convocatoria.categorias ?? [];
  const montos = categorias
    .map((c) => Number(c.monto))
    .filter((n) => !Number.isNaN(n));
  const premioMayor = montos.length > 0 ? Math.max(...montos) : null;
  // con varias categorias el monto que se destaca es el mayor, y se aclara;
  // con una sola no hace falta aclarar nada
  const hayVariosMontos = new Set(montos).size > 1;
  const yaPostulo = Boolean(convocatoria.miCategoria);

  // La tarjeta entera es el enlace: da un area de toque grande y evita el boton
  // pesado que competia con el contenido.
  return (
    <Link
      href={`/dashboard/convocatorias/${convocatoria.id}`}
      className="group flex flex-col rounded-xl border border-secondary-200 bg-card p-5 transition-colors hover:border-primary-300 hover:bg-secondary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azul-600"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 font-display text-base leading-snug font-semibold text-primary-800">
          {convocatoria.nombre}
        </h3>
        <HeaderBadge convocatoria={convocatoria} />
      </div>

      {/* el premio es el gancho: va destacado y no escondido en texto gris */}
      {premioMayor !== null && (
        <p className="mt-3">
          <span className="font-display text-2xl font-bold tracking-tight text-primary-700">
            {formatMoney(String(premioMayor))}
          </span>
          {hayVariosMontos && (
            <span className="ml-1.5 text-sm text-secondary-600">el premio mayor</span>
          )}
        </p>
      )}

      {/* una categoria por chip, con su monto */}
      {categorias.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {categorias.map((c) => (
            <span
              key={c.nombre}
              className="inline-flex items-center gap-1.5 rounded-full border border-secondary-200 bg-secondary-50 px-2.5 py-1 text-xs text-secondary-700"
            >
              {c.nombre}
              <b className="font-semibold text-primary-700 tabular-nums">
                {formatMoney(c.monto)}
              </b>
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-secondary-100 pt-3">
        <div className="min-w-0 text-sm">
          {yaPostulo ? (
            <p className="flex items-start gap-1.5 font-medium text-success-700">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <span>Ya postulaste a {convocatoria.miCategoria}</span>
            </p>
          ) : (
            <p className="text-secondary-600">
              Cierra el {formatDate(convocatoria.fechaCierreEfectiva ?? convocatoria.fechaCierrePostulacion)}
            </p>
          )}
          <p className="mt-0.5 truncate text-xs text-secondary-500">
            {convocatoria.departamentos.join(" · ")}
          </p>
        </div>

        <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-azul-600 group-hover:underline">
          Ver detalles
          <ArrowRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}
