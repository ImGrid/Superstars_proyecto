"use client";

import { useRouter } from "next/navigation";
import { Calendar, MapPin, DollarSign, Clock, ArrowRight } from "lucide-react";
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
import { formatMoney, formatDate, getDiasRestantes } from "@/lib/format";

interface ConvocatoriaCardProps {
  convocatoria: ConvocatoriaResponse;
}

// badge de dias restantes con color segun urgencia
function DiasRestantesBadge({ fecha }: { fecha: string }) {
  const dias = getDiasRestantes(fecha);

  if (dias < 0) {
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <Clock className="size-3" />
        Cerrado
      </Badge>
    );
  }

  // color por urgencia
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
          <DiasRestantesBadge fecha={convocatoria.fechaCierrePostulacion} />
        </div>
        {convocatoria.descripcion && (
          <p className="mt-1 text-sm text-secondary-500 line-clamp-2">
            {convocatoria.descripcion}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {/* monto */}
        <div className="flex items-center gap-2">
          <DollarSign className="size-4 text-primary-600 shrink-0" />
          <span className="text-lg font-bold text-primary-700">
            {formatMoney(convocatoria.monto)}
          </span>
          <span className="text-xs text-secondary-400">
            ({convocatoria.numeroGanadores} ganador{convocatoria.numeroGanadores !== 1 && "es"})
          </span>
        </div>

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
