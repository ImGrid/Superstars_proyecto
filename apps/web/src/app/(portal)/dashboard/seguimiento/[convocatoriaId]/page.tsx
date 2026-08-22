"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { ArrowLeft, MapPin, CalendarClock, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { StateBadge } from "@/components/shared/state-badge";
import { seguimientoQueries } from "@/lib/api/query-keys";
import { formatDate } from "@/lib/format";
import { CategoriaSeguimientoCard } from "../_components/categoria-seguimiento-card";
import { DocumentosAgrupadosSeguimiento } from "../_components/documentos-agrupados-seguimiento";

interface Props {
  params: Promise<{ convocatoriaId: string }>;
}

export default function SeguimientoConvocatoriaPage({ params }: Props) {
  const { convocatoriaId: rawId } = use(params);
  const convocatoriaId = Number(rawId);
  const router = useRouter();

  const {
    data: convocatoria,
    isLoading: cargandoConv,
    isError,
  } = useQuery(seguimientoQueries.convocatoriaDetail(convocatoriaId));

  const { data: categorias, isLoading: cargandoCats } = useQuery(
    seguimientoQueries.categorias(convocatoriaId),
  );

  if (cargandoConv) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !convocatoria) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>
            No se pudo cargar esta convocatoria. Es posible que el enlace no sea
            correcto. Vuelve al listado para intentarlo de nuevo.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.push("/dashboard/seguimiento")}>
          <ArrowLeft className="size-4" />
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* header general de la convocatoria */}
      <div className="flex items-start gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="mt-0.5 shrink-0"
          onClick={() => router.push("/dashboard/seguimiento")}
          aria-label="Volver a convocatorias"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl leading-tight font-bold text-balance text-primary-800">
              {convocatoria.nombre}
            </h1>
            <StateBadge tipo="convocatoria" valor={convocatoria.estado} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-secondary-700">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-4 text-info-600" />
              Cierre: {formatDate(convocatoria.fechaCierreEfectiva ?? convocatoria.fechaCierrePostulacion)}
            </span>
            {convocatoria.fechaAnuncioGanadores && (
              <span className="inline-flex items-center gap-1.5">
                <Trophy className="size-4 text-amarillo-700" />
                Ganadores: {formatDate(convocatoria.fechaAnuncioGanadores)}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4 text-info-600" />
              {convocatoria.departamentos.join(" · ")}
            </span>
          </div>

          {convocatoria.descripcion && (
            <DescripcionPlegable texto={convocatoria.descripcion} />
          )}
        </div>
      </div>

      {/* categorias de la convocatoria */}
      <div className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-secondary-900">
          Categorías
        </h2>
        {cargandoCats ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !categorias || categorias.length === 0 ? (
          <p className="text-sm text-secondary-600">
            Esta convocatoria todavía no tiene categorías configuradas.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {categorias.map((cat) => (
              <CategoriaSeguimientoCard
                key={cat.id}
                convocatoriaId={convocatoriaId}
                categoria={cat}
              />
            ))}
          </div>
        )}
      </div>

      {/* documentos de la convocatoria: agrupados (propios de cada categoria +
          comunes a todas), en vez de repetir los comunes en cada categoria */}
      {categorias && categorias.length > 0 && (
        <DocumentosAgrupadosSeguimiento
          convocatoriaId={convocatoriaId}
          categorias={categorias}
        />
      )}
    </div>
  );
}

// Descripcion de la convocatoria con "Ver mas / Ver menos": las descripciones
// suelen ser largas y ocupaban toda la primera pantalla. Se muestran dos lineas
// (a ancho completo) y el resto queda a un clic. Mismo patron que la vista del
// proponente.
function DescripcionPlegable({ texto }: { texto: string }) {
  const [abierta, setAbierta] = useState(false);
  // con textos cortos no tiene sentido ofrecer "Ver mas"
  const esLargo = texto.length > 180;

  return (
    <div className="mt-3">
      <p
        className={`text-sm leading-relaxed break-words whitespace-pre-line text-secondary-700 ${
          esLargo && !abierta ? "line-clamp-2" : ""
        }`}
      >
        {texto}
      </p>
      {esLargo && (
        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-azul-600 hover:underline"
        >
          {abierta ? "Ver menos" : "Ver más"}
          <Icon
            icon={abierta ? "ph:caret-up-bold" : "ph:caret-down-bold"}
            className="size-3.5"
          />
        </button>
      )}
    </div>
  );
}
