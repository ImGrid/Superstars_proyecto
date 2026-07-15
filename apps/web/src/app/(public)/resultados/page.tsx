import type { Metadata } from "next";
import Link from "next/link";
import { Award, ArrowRight } from "lucide-react";
import { Icon } from "@iconify/react";
import { getConvocatorias, getResultados } from "@/lib/api/public.server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, formatMoney } from "@/lib/format";
import type { PublicResultadosResponse } from "@superstars/shared";

export const metadata: Metadata = {
  title: "Resultados y ganadores",
  description:
    "Conoce a las empresas bolivianas ganadoras de las convocatorias de SUPERIMPACT360, con los premios otorgados en cada categoría.",
  alternates: { canonical: "/resultados" },
  openGraph: {
    title: "Resultados y ganadores",
    description:
      "Empresas bolivianas ganadoras de las convocatorias de SUPERIMPACT360.",
    url: "/resultados",
  },
};

// convocatoria resuelta junto con sus resultados ya cargados
interface ConvocatoriaConResultados {
  id: number;
  nombre: string;
  fechaPublicacionResultados: string;
  resultados: PublicResultadosResponse | null;
}

async function cargarResultados(): Promise<ConvocatoriaConResultados[]> {
  // anteriores = cerrado, en_evaluacion, resultados_listos, finalizado
  const { data } = await getConvocatorias({
    page: 1,
    limit: 50,
    tipo: "anteriores",
  });

  // solo las que ya publicaron resultados
  const publicadas = data.filter((c) => c.fechaPublicacionResultados);

  // una peticion por convocatoria, en paralelo
  return Promise.all(
    publicadas.map(async (c) => ({
      id: c.id,
      nombre: c.nombre,
      fechaPublicacionResultados: c.fechaPublicacionResultados as string,
      resultados: await getResultados(c.id),
    })),
  );
}

export default async function ResultadosPage() {
  const convocatorias = await cargarResultados();

  return (
    <>
      {/* header */}
      <section className="bg-primary-800 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl leading-[1.3] tracking-wide text-white uppercase sm:text-4xl">
            Resultados y Ganadores
          </h1>
          <p className="mt-3 text-lg text-primary-200">
            Conoce a las empresas ganadoras de nuestras competencias.
          </p>
        </div>
      </section>

      {/* contenido */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {convocatorias.length === 0 ? (
            <EmptyState
              icon="ph:trophy-duotone"
              title="Sin resultados publicados"
              description="Aún no hay resultados publicados. Cuando se finalice una convocatoria, los ganadores se mostrarán aquí."
              action={
                <Button asChild variant="outline">
                  <Link href="/convocatorias">
                    Ver convocatorias activas
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-10">
              {convocatorias.map((convocatoria) => (
                <ConvocatoriaResultadosSection
                  key={convocatoria.id}
                  convocatoria={convocatoria}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

// seccion de resultados por convocatoria
function ConvocatoriaResultadosSection({
  convocatoria,
}: {
  convocatoria: ConvocatoriaConResultados;
}) {
  const { resultados } = convocatoria;

  return (
    <div>
      {/* encabezado de la convocatoria */}
      <div className="mb-6">
        <h2 className="font-display text-2xl leading-snug tracking-[0.01em] text-primary-800">
          {convocatoria.nombre}
        </h2>
        <p className="mt-1 text-sm text-secondary-500">
          Resultados publicados el{" "}
          {formatDate(convocatoria.fechaPublicacionResultados)}
        </p>
      </div>

      {/* ganadores agrupados por categoria */}
      {!resultados || resultados.categorias.length === 0 ? (
        <p className="text-sm text-secondary-500">
          No se encontraron ganadores.
        </p>
      ) : (
        <div className="space-y-8">
          {resultados.categorias.map((categoria) => (
            <div key={categoria.categoriaId}>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h3 className="font-heading text-lg font-semibold text-primary-700">
                  {categoria.categoriaNombre}
                </h3>
                <Badge variant="secondary" className="text-sm">
                  Premio: {formatMoney(categoria.monto)}
                </Badge>
              </div>
              {categoria.ganadores.length === 0 ? (
                <p className="text-sm text-secondary-500">
                  Esta categoría aún no tiene ganadores.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {categoria.ganadores.map((ganador, idx) => (
                    <GanadorCard
                      key={idx}
                      empresaNombre={ganador.empresaNombre}
                      posicion={ganador.posicionFinal}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// colores por posicion
const posicionStyles: Record<
  number,
  { bg: string; border: string; icon: string; label: string }
> = {
  1: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    icon: "text-amber-500",
    label: "1er Lugar",
  },
  2: {
    bg: "bg-slate-50",
    border: "border-slate-300",
    icon: "text-slate-400",
    label: "2do Lugar",
  },
  3: {
    bg: "bg-warning-50",
    border: "border-warning-300",
    icon: "text-warning-700",
    label: "3er Lugar",
  },
};

function getEstiloPosicion(posicion: number) {
  return (
    posicionStyles[posicion] ?? {
      bg: "bg-white",
      border: "border-secondary-200",
      icon: "text-secondary-400",
      label: `${posicion}to Lugar`,
    }
  );
}

// card individual de ganador
function GanadorCard({
  empresaNombre,
  posicion,
}: {
  empresaNombre: string;
  posicion: number;
}) {
  const estilo = getEstiloPosicion(posicion);

  return (
    <Card className={`overflow-hidden border-2 ${estilo.border} ${estilo.bg}`}>
      <CardContent className="flex items-center gap-4 p-6">
        {/* icono de posicion */}
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
          {posicion <= 3 ? (
            <Icon icon="ph:trophy-duotone" className={`size-7 ${estilo.icon}`} />
          ) : (
            <Award className={`size-7 ${estilo.icon}`} />
          )}
        </div>

        {/* info */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-secondary-400">
            {estilo.label}
          </p>
          <p className="mt-1 truncate text-lg font-bold text-primary-800">
            {empresaNombre}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
