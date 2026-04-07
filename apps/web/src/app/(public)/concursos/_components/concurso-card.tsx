import Link from "next/link";
import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StateBadge } from "@/components/shared/state-badge";
import { formatMoney, getDiasRestantes, formatShortMonth } from "@/lib/format";
import type { PublicConcursoResponse } from "@superstars/shared";

interface ConcursoCardProps {
  concurso: PublicConcursoResponse;
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
      text: `Ultimos ${dias} dia${dias > 1 ? "s" : ""}`,
      className: "text-warning-600 font-semibold",
    };
  }
  if (dias <= 30) {
    return {
      text: `Quedan ${dias} dias`,
      className: "text-primary-700",
    };
  }
  return {
    text: `Cierra: ${formatShortMonth(fechaCierre)}`,
    className: "text-secondary-600",
  };
}

export function ConcursoCard({ concurso }: ConcursoCardProps) {
  const fechaCierreReal = concurso.fechaCierreEfectiva ?? concurso.fechaCierrePostulacion;
  const deadline = getDeadlineDisplay(fechaCierreReal);
  const deptos = concurso.departamentos ?? [];
  const maxTags = 3;

  return (
    <Link href={`/concursos/${concurso.id}`}>
      <Card className="group overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
        {/* header con gradiente */}
        <div className="relative flex h-28 items-center justify-center bg-gradient-to-r from-primary-700 via-primary-600 to-orange-500">
          <Trophy className="size-14 text-white/15" />
          <div className="absolute top-3 right-3">
            <StateBadge tipo="concurso" valor={concurso.estado} />
          </div>
        </div>

        <CardContent className="p-5">
          {/* titulo */}
          <h3 className="line-clamp-2 font-heading text-lg font-bold text-primary-800">
            {concurso.nombre}
          </h3>

          {/* descripcion */}
          {concurso.descripcion && (
            <p className="mt-2 line-clamp-2 text-sm text-secondary-600">
              {concurso.descripcion}
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

          {/* footer: monto + deadline */}
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-orange-600">
              {formatMoney(concurso.montoPremio)}
            </span>
            <span className={deadline.className}>{deadline.text}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
