import { EstadoPostulacion } from "@superstars/shared";
import { cn } from "@/lib/utils";

// orden del ciclo de vida + color de barra por estado
export const ESTADO_POSTULACION_ORDEN: {
  key: EstadoPostulacion;
  label: string;
  bar: string;
}[] = [
  { key: EstadoPostulacion.BORRADOR, label: "Borrador", bar: "bg-secondary-400" },
  { key: EstadoPostulacion.ENVIADO, label: "Enviado", bar: "bg-info-500" },
  { key: EstadoPostulacion.OBSERVADO, label: "Observado", bar: "bg-warning-500" },
  { key: EstadoPostulacion.RECHAZADO, label: "Rechazado", bar: "bg-error-500" },
  { key: EstadoPostulacion.EN_EVALUACION, label: "En evaluación", bar: "bg-primary-500" },
  { key: EstadoPostulacion.CALIFICADO, label: "Calificado", bar: "bg-primary-700" },
  { key: EstadoPostulacion.GANADOR, label: "Ganador", bar: "bg-success-600" },
  { key: EstadoPostulacion.NO_SELECCIONADO, label: "No seleccionado", bar: "bg-orange-600" },
];

// barras horizontales compactas de la distribucion de postulaciones por estado.
// Solo muestra los estados con al menos una postulacion.
export function EstadoPostulacionesBars({
  dist,
}: {
  dist: Record<EstadoPostulacion, number>;
}) {
  const filas = ESTADO_POSTULACION_ORDEN.filter((e) => dist[e.key] > 0);
  const maxE = Math.max(1, ...filas.map((e) => dist[e.key]));

  if (filas.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-secondary-400">
        Aún no hay postulaciones.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {filas.map((e) => (
        <div
          key={e.key}
          className="grid grid-cols-[7rem_1fr_1.5rem] items-center gap-2 text-xs"
        >
          <span className="truncate text-right text-secondary-600">{e.label}</span>
          <div className="h-3.5 overflow-hidden rounded bg-secondary-100">
            <div
              className={cn("h-full rounded", e.bar)}
              style={{ width: `${Math.max((dist[e.key] / maxE) * 100, 5)}%` }}
            />
          </div>
          <span className="text-right font-semibold tabular-nums text-secondary-800">
            {dist[e.key]}
          </span>
        </div>
      ))}
    </div>
  );
}
