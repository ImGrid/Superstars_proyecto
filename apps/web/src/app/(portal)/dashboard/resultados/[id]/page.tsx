"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StateBadge } from "@/components/shared/state-badge";
import { RowActions, RowAction } from "@/components/shared/row-actions";
import { convocatoriaQueries, categoriaQueries } from "@/lib/api/query-keys";
import { formatMoney, formatShortDate } from "@/lib/format";
import type { PostulacionRankingItem } from "@superstars/shared";

// medalla compacta: circulo de color para el top 3, numero simple para el resto.
// Combina numero + color para ser legible tambien sin distinguir el color.
function MedalBadge({ posicion }: { posicion: number }) {
  if (posicion <= 3) {
    const estilo =
      posicion === 1
        ? "bg-amber-400 text-amber-950"
        : posicion === 2
          ? "bg-slate-300 text-slate-800"
          : "bg-amber-700 text-white";
    return (
      <span
        className={`inline-grid size-5 place-items-center rounded-full text-[11px] font-bold tabular-nums ${estilo}`}
      >
        {posicion}
      </span>
    );
  }
  return (
    <span className="inline-block w-5 text-center text-xs font-semibold tabular-nums text-secondary-400">
      {posicion}
    </span>
  );
}

export default function RankingConvocatoriaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const convocatoriaId = parseInt(id, 10);
  const router = useRouter();

  // datos transversales de la convocatoria (nombre/estado) para el encabezado
  const { data: convocatoria, isLoading: isLoadingConv } = useQuery(
    convocatoriaQueries.detail(convocatoriaId),
  );
  // el ranking es por categoria (DENSE_RANK independiente por categoria)
  const { data: categorias, isLoading: isLoadingCats } = useQuery(
    categoriaQueries.list(convocatoriaId),
  );

  if (isLoadingConv || isLoadingCats) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!convocatoria) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={() => router.push("/dashboard/resultados")}
        >
          <ArrowLeft className="size-4" />
          Resultados
        </Button>
        <p className="text-sm text-secondary-500">
          No se encontró información de la convocatoria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* navegacion de regreso */}
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 gap-1 text-secondary-600"
        onClick={() => router.push("/dashboard/resultados")}
      >
        <ArrowLeft className="size-4" />
        Resultados
      </Button>

      {/* encabezado con nombre y estado */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-bold text-secondary-900">
          {convocatoria.nombre}
        </h1>
        <StateBadge tipo="convocatoria" valor={convocatoria.estado} />
      </div>

      {/* ranking por categoria: secciones apiladas (sin tabs) */}
      {!categorias || categorias.length === 0 ? (
        <p className="rounded-lg border border-secondary-100 py-10 text-center text-sm text-secondary-500">
          Esta convocatoria no tiene categorías.
        </p>
      ) : (
        <div className="space-y-6">
          {categorias.map((cat) => (
            <CategoriaRankingBlock
              key={cat.id}
              convocatoriaId={convocatoriaId}
              categoriaId={cat.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// bloque de ranking de una categoria: encabezado + stat strip + ganadores + tabla
function CategoriaRankingBlock({
  convocatoriaId,
  categoriaId,
}: {
  convocatoriaId: number;
  categoriaId: number;
}) {
  const { data, isLoading } = useQuery(
    categoriaQueries.ranking(convocatoriaId, categoriaId),
  );

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (!data) return null;

  // los ganadores para la franja de arriba (conclusion primero: quien gano)
  const ganadores = data.ranking.filter((r) => r.estado === "ganador");

  return (
    <section className="border-t border-secondary-100 pt-5">
      {/* encabezado de categoria en una linea: nombre + monto + ganadores + estado
          + stat strip a la derecha (reemplaza las 4 tarjetas KPI) */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="font-heading text-lg font-semibold text-secondary-900">
          {data.categoriaNombre}
        </h2>
        <span className="text-sm text-secondary-500">
          {formatMoney(data.monto)} ·{" "}
          {data.numeroGanadores}{" "}
          {data.numeroGanadores === 1 ? "ganador" : "ganadores"}
        </span>
        {data.resuelta ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-medium text-success-700">
            <Check className="size-3" />
            Ganadores seleccionados
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-warning-500 px-2.5 py-0.5 text-xs font-medium text-warning-600">
            Pendiente de selección
          </span>
        )}

        {/* stat strip inline: solo lo que la tabla no dice de un vistazo */}
        <span className="ml-auto text-sm text-secondary-500 tabular-nums">
          <span className="font-medium text-secondary-900">
            {data.totalCalificadas}
          </span>{" "}
          calificadas
          {data.promedioCalificadas !== null && (
            <>
              {" · promedio "}
              <span className="font-medium text-secondary-900">
                {data.promedioCalificadas.toFixed(1)}
              </span>{" "}
              pts
            </>
          )}
        </span>
      </div>

      {/* franja de ganadores (solo si ya se resolvio y hay ganadores) */}
      {data.resuelta && ganadores.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {ganadores.map((g) => (
            <span
              key={g.postulacionId}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm"
            >
              <span className="font-bold tabular-nums text-amber-600">
                {g.posicionFinal}º
              </span>
              <span className="font-medium text-secondary-900">
                {g.empresaNombre}
              </span>
              {g.puntajeFinal !== null && (
                <span className="font-semibold tabular-nums text-secondary-900">
                  {g.puntajeFinal.toFixed(1)}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* tabla de ranking (el nucleo) */}
      {data.ranking.length === 0 ? (
        <p className="mt-3 rounded-lg border border-secondary-100 py-8 text-center text-sm text-secondary-500">
          No hay postulaciones calificadas en esta categoría.
        </p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-lg border border-secondary-100">
          <RankingTable rows={data.ranking} convocatoriaId={convocatoriaId} />
        </div>
      )}
    </section>
  );
}

// tabla de ranking con barra de puntaje inline (reemplaza al grafico duplicado)
function RankingTable({
  rows,
  convocatoriaId,
}: {
  rows: PostulacionRankingItem[];
  convocatoriaId: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-secondary-100 bg-secondary-50 text-left text-xs uppercase tracking-wide text-secondary-500">
            <th className="w-12 px-4 py-2.5 text-center font-medium">#</th>
            <th className="px-4 py-2.5 font-medium">Empresa</th>
            <th className="w-32 px-4 py-2.5 font-medium">Enviado</th>
            <th className="w-44 px-4 py-2.5 text-right font-medium">Puntaje</th>
            <th className="w-36 px-4 py-2.5 font-medium">Estado</th>
            <th className="w-14 px-4 py-2.5 text-right font-medium">Ver</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const pos = row.posicionFinal ?? index + 1;
            const esGanador = row.estado === "ganador";
            const puntaje = row.puntajeFinal;
            return (
              <tr
                key={row.postulacionId}
                className={`border-b border-secondary-50 last:border-0 ${
                  esGanador
                    ? "bg-amber-50/70"
                    : "hover:bg-secondary-50/60"
                }`}
              >
                {/* posicion (con borde dorado a la izquierda si es ganador) */}
                <td
                  className={`px-4 py-0 text-center ${
                    esGanador ? "shadow-[inset_3px_0_0_#fbbf24]" : ""
                  }`}
                  style={{ height: 46 }}
                >
                  <MedalBadge posicion={pos} />
                </td>

                {/* empresa */}
                <td className="px-4 py-0">
                  <span className="font-medium text-secondary-900">
                    {row.empresaNombre}
                  </span>
                </td>

                {/* fecha de envio (contexto + llena el espacio) */}
                <td className="px-4 py-0">
                  <span className="text-secondary-500">
                    {row.fechaEnvio ? formatShortDate(row.fechaEnvio) : "—"}
                  </span>
                </td>

                {/* puntaje con barra inline proporcional (0-100) */}
                <td className="px-4 py-0">
                  {puntaje !== null ? (
                    <div className="relative ml-auto h-6 w-32">
                      <div
                        className={`absolute inset-y-0 right-0 rounded ${
                          esGanador ? "bg-amber-200" : "bg-primary-100"
                        }`}
                        style={{
                          width: `${Math.min(Math.max(puntaje, 0), 100)}%`,
                        }}
                      />
                      <span
                        className={`absolute inset-0 flex items-center justify-end pr-2 font-semibold tabular-nums ${
                          esGanador ? "text-amber-800" : "text-secondary-900"
                        }`}
                      >
                        {puntaje.toFixed(1)}
                      </span>
                    </div>
                  ) : (
                    <span className="block text-right text-secondary-400">—</span>
                  )}
                </td>

                {/* estado */}
                <td className="px-4 py-0">
                  <StateBadge tipo="postulacion" valor={row.estado} />
                </td>

                {/* accion: ver la postulacion completa de esta empresa */}
                <td className="px-4 py-0">
                  <RowActions>
                    <RowAction
                      icon={<Eye className="size-4" />}
                      label="Ver postulación"
                      href={`/dashboard/convocatorias/${convocatoriaId}/postulaciones/${row.postulacionId}`}
                    />
                  </RowActions>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
