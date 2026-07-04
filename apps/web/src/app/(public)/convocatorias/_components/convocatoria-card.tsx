import Link from "next/link";
import { Icon } from "@iconify/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StateBadge } from "@/components/shared/state-badge";
import { getDiasRestantes, formatShortMonth } from "@/lib/format";
import { getConvocatoriaImagenUrl } from "@/lib/api/convocatoria.api";
import type { PublicConvocatoriaResponse } from "@superstars/shared";

interface ConvocatoriaCardProps {
  convocatoria: PublicConvocatoriaResponse;
}

// texto y color del deadline segun dias restantes
function getDeadlineDisplay(fechaCierre: string) {
  const dias = getDiasRestantes(fechaCierre);

  if (dias < 0) {
    return { text: "Cerrado", className: "text-secondary-500" };
  }
  if (dias === 0) {
    return { text: "Cierra hoy", className: "text-error-600 font-semibold" };
  }
  if (dias <= 7) {
    return {
      text: `Últimos ${dias} día${dias > 1 ? "s" : ""}`,
      className: "text-warning-600 font-semibold",
    };
  }
  if (dias <= 30) {
    return {
      text: `Quedan ${dias} días`,
      className: "text-primary-700",
    };
  }
  return {
    text: `Cierra: ${formatShortMonth(fechaCierre)}`,
    className: "text-secondary-600",
  };
}

export function ConvocatoriaCard({ convocatoria }: ConvocatoriaCardProps) {
  const fechaCierreReal = convocatoria.fechaCierreEfectiva ?? convocatoria.fechaCierrePostulacion;
  const deadline = getDeadlineDisplay(fechaCierreReal);
  const deptos = convocatoria.departamentos ?? [];
  const maxTags = 3;

  return (
    <Link href={`/convocatorias/${convocatoria.id}`}>
      <Card className="group overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
        {/* header: imagen subida por el responsable o fallback con icono trofeo
            sobre fondo azul institucional plano */}
        <div className="relative h-28 w-full overflow-hidden bg-primary-700">
          {convocatoria.imagenKey ? (
            <img
              src={`${getConvocatoriaImagenUrl(convocatoria.id)}?v=${encodeURIComponent(convocatoria.imagenKey)}`}
              alt={convocatoria.nombre}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon icon="ph:trophy-duotone" className="size-14 text-white/30" />
            </div>
          )}
          <div className="absolute top-3 right-3">
            <StateBadge tipo="convocatoria" valor={convocatoria.estado} />
          </div>
        </div>

        <CardContent className="p-5">
          {/* titulo */}
          <h3 className="line-clamp-2 font-heading text-lg font-bold text-primary-800">
            {convocatoria.nombre}
          </h3>

          {/* descripcion */}
          {convocatoria.descripcion && (
            <p className="mt-2 line-clamp-2 text-sm text-secondary-600">
              {convocatoria.descripcion}
            </p>
          )}

          {/* departamentos */}
          {deptos.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {deptos.slice(0, maxTags).map((d) => (
                <Badge
                  key={d}
                  variant="secondary"
                  className="text-xs font-normal"
                >
                  {d}
                </Badge>
              ))}
              {deptos.length > maxTags && (
                <Badge variant="outline" className="text-xs font-normal">
                  +{deptos.length - maxTags}
                </Badge>
              )}
            </div>
          )}

          <Separator className="my-4" />

          {/* footer: fecha limite */}
          <div className="flex items-center justify-end text-sm">
            <span className={deadline.className}>{deadline.text}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
