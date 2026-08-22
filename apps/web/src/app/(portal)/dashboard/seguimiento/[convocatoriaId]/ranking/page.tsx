"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import type { SeguimientoRankingItem } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { StateBadge } from "@/components/shared/state-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { seguimientoQueries } from "@/lib/api/query-keys";
import { formatShortDate } from "@/lib/format";

interface Props {
  params: Promise<{ convocatoriaId: string }>;
}

// medalla compacta: circulo de color para el top 3, numero simple para el resto.
// Combina numero + color para ser legible tambien sin distinguir el color.
function MedalBadge({ posicion }: { posicion: number }) {
  if (posicion <= 3) {
    const estilo =
      posicion === 1
        ? "bg-amarillo-600 text-primary-800"
        : posicion === 2
          ? "bg-secondary-300 text-secondary-800"
          : "bg-warning-700 text-white";
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

export default function SeguimientoRankingPage({ params }: Props) {
  const { convocatoriaId: rawId } = use(params);
  const convocatoriaId = Number(rawId);
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoriaParam = searchParams.get("categoriaId");
  const categoriaId = categoriaParam ? Number(categoriaParam) : undefined;

  const { data: categorias } = useQuery(seguimientoQueries.categorias(convocatoriaId));
  const categoria = categoriaId
    ? categorias?.find((c) => c.id === categoriaId)
    : undefined;

  const { data: ranking, isLoading } = useQuery({
    ...seguimientoQueries.ranking(convocatoriaId, categoriaId ?? 0),
    enabled: !!categoriaId,
  });

  const volver = () => router.push(`/dashboard/seguimiento/${convocatoriaId}`);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="mt-0.5 shrink-0"
          onClick={volver}
          aria-label="Volver a la convocatoria"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="font-heading text-xl font-bold text-secondary-900">
            Ranking
          </h1>
          <p className="text-sm text-secondary-600">
            {categoria ? `Categoría: ${categoria.nombre}` : "Resultados por categoría"}
          </p>
        </div>
      </div>

      {!categoriaId ? (
        <Alert>
          <AlertDescription>
            Elige una categoría desde la convocatoria para ver su ranking.
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !ranking || ranking.length === 0 ? (
        <EmptyState
          icon="ph:chart-line-up-duotone"
          title="Todavía no hay resultados"
          description="El ranking aparecerá cuando las postulaciones estén calificadas."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-secondary-100">
          <RankingTable rows={ranking} convocatoriaId={convocatoriaId} />
        </div>
      )}
    </div>
  );
}

function RankingTable({
  rows,
  convocatoriaId,
}: {
  rows: SeguimientoRankingItem[];
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
                  esGanador ? "bg-amarillo-50/70" : "hover:bg-secondary-50/60"
                }`}
              >
                <td
                  className={`px-4 py-0 text-center ${
                    esGanador ? "shadow-[inset_3px_0_0_var(--color-amarillo-600)]" : ""
                  }`}
                  style={{ height: 46 }}
                >
                  <MedalBadge posicion={pos} />
                </td>

                <td className="px-4 py-0">
                  <span className="font-medium text-secondary-900">
                    {row.empresaRazonSocial}
                  </span>
                </td>

                <td className="px-4 py-0">
                  <span className="text-secondary-500">
                    {row.fechaEnvio ? formatShortDate(row.fechaEnvio) : "—"}
                  </span>
                </td>

                <td className="px-4 py-0">
                  {puntaje !== null ? (
                    <div className="relative ml-auto h-6 w-32">
                      <div
                        className={`absolute inset-y-0 right-0 rounded ${
                          esGanador ? "bg-amarillo-200" : "bg-primary-100"
                        }`}
                        style={{ width: `${Math.min(Math.max(puntaje, 0), 100)}%` }}
                      />
                      <span
                        className={`absolute inset-0 flex items-center justify-end pr-2 font-semibold tabular-nums ${
                          esGanador ? "text-primary-800" : "text-secondary-900"
                        }`}
                      >
                        {puntaje.toFixed(1)}
                      </span>
                    </div>
                  ) : (
                    <span className="block text-right text-secondary-400">—</span>
                  )}
                </td>

                <td className="px-4 py-0">
                  <StateBadge tipo="postulacion" valor={row.estado} />
                </td>

                <td className="px-4 py-0 text-right">
                  <Button variant="ghost" size="icon" asChild>
                    <a
                      href={`/dashboard/seguimiento/${convocatoriaId}/postulaciones/${row.postulacionId}`}
                      aria-label={`Ver postulación de ${row.empresaRazonSocial}`}
                    >
                      <Eye className="size-4" />
                    </a>
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
