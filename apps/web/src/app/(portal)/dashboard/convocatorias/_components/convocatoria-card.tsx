"use client";

import { useRouter } from "next/navigation";
import { Calendar, MapPin, Clock, ArrowRight } from "lucide-react";
import { isConvocatoriaAbierta } from "@superstars/shared";
import type { ConvocatoriaResponse } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StateBadge } from "@/components/shared/state-badge";
import { formatDate, getDiasRestantes } from "@/lib/format";

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

  // abierta: countdown coloreado por urgencia (la fecha vigente puede ser la efectiva)
  const cierre = convocatoria.fechaCierreEfectiva ?? convocatoria.fechaCierrePostulacion;
  const dias = getDiasRestantes(cierre);

  let className = "gap-1 text-xs ";
  if (dias <= 3) {
    className += "bg-red-100 text-red-700 border-red-200";
  } else if (dias <= 7) {
    className += "bg-amber-100 text-amber-700 border-amber-200";
  } else {
    className += "bg-emerald-100 text-emerald-700 border-emerald-200";
  }

  return (
    <Badge variant="outline" className={className}>
      <Clock className="size-3" />
      {dias === 0
        ? "Cierra hoy"
        : dias === 1
          ? "Queda 1 dia"
          : `Quedan ${dias} dias`}
    </Badge>
  );
}

export function ConvocatoriaCard({ convocatoria }: ConvocatoriaCardProps) {
  const router = useRouter();

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight line-clamp-2">
            {convocatoria.nombre}
          </CardTitle>
          <HeaderBadge convocatoria={convocatoria} />
        </div>
        {convocatoria.descripcion && (
          <p className="mt-1 text-sm text-secondary-500 line-clamp-2">
            {convocatoria.descripcion}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {/* fechas */}
        <div className="flex items-center gap-2 text-sm text-secondary-600">
          <Calendar className="size-4 shrink-0 text-secondary-400" />
          <span>
            {formatDate(convocatoria.fechaInicioPostulacion)} — {formatDate(convocatoria.fechaCierrePostulacion)}
          </span>
        </div>

        {/* departamentos */}
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-secondary-400" />
          <div className="flex flex-wrap gap-1">
            {convocatoria.departamentos.map((dep) => (
              <Badge key={dep} variant="outline" className="text-xs">
                {dep}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3">
        <Button
          className="w-full gap-2"
          onClick={() => router.push(`/dashboard/convocatorias/${convocatoria.id}`)}
        >
          Ver detalles
          <ArrowRight className="size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
