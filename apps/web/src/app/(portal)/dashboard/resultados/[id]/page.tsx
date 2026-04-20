"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Medal,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Icon } from "@iconify/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StateBadge } from "@/components/shared/state-badge";
import { concursoQueries } from "@/lib/api/query-keys";
import type { PostulacionRankingItem } from "@superstars/shared";

// colores por posicion en el ranking
function getBarColor(estado: string, posicion: number | null): string {
  if (estado === "ganador") return "#f59e0b"; // amber (ganador)
  if (posicion === 1) return "#f59e0b";
  if (posicion === 2) return "#94a3b8"; // silver
  if (posicion === 3) return "#b45309"; // bronze
  return "#3b5fa0"; // primary (resto)
}

// medalla para posicion
function MedalIcon({ posicion }: { posicion: number }) {
  if (posicion === 1)
    return <Icon icon="ph:trophy-duotone" className="size-4 text-amber-500" />;
  if (posicion === 2)
    return <Medal className="size-4 text-slate-400" />;
  if (posicion === 3)
    return <Medal className="size-4 text-amber-700" />;
  return (
    <span className="flex size-4 items-center justify-center text-xs font-bold text-secondary-500">
      {posicion}
    </span>
  );
}

// trunca el nombre de empresa para el eje Y del grafico
function truncarNombre(nombre: string, max = 20): string {
  return nombre.length > max ? nombre.slice(0, max) + "…" : nombre;
}

export default function RankingConcursoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const concursoId = parseInt(id, 10);
  const router = useRouter();

  const { data, isLoading } = useQuery(concursoQueries.ranking(concursoId));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) {
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
          No se encontro informacion del concurso.
        </p>
      </div>
    );
  }

  // datos del grafico: ordenar por puntaje desc
  const datosGrafico = [...data.ranking]
    .filter((r) => r.puntajeFinal !== null)
    .map((r) => ({
      nombre: truncarNombre(r.empresaNombre),
      puntaje: r.puntajeFinal ?? 0,
      estado: r.estado,
      posicion: r.posicionFinal,
    }));

  return (
    <div className="space-y-6">
      {/* navegacion de regreso */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-secondary-600"
        onClick={() => router.push("/dashboard/resultados")}
      >
        <ArrowLeft className="size-4" />
        Resultados
      </Button>

      {/* encabezado con nombre y estado */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-bold text-secondary-900">
          {data.nombre}
        </h1>
        <StateBadge tipo="concurso" valor={data.estado} />
      </div>

      {/* stats de resumen */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat
          icon={<Icon icon="ph:users-three-duotone" className="size-5 text-primary-600" />}
          label="Postulaciones calificadas"
          value={String(data.totalCalificadas)}
        />
        <MiniStat
          icon={<Icon icon="ph:star-duotone" className="size-5 text-amber-500" />}
          label="Promedio"
          value={
            data.promedioCalificadas !== null
              ? `${data.promedioCalificadas.toFixed(1)} pts`
              : "—"
          }
        />
        <MiniStat
          icon={<TrendingUp className="size-5 text-success-600" />}
          label="Puntaje maximo"
          value={
            data.maxPuntaje !== null ? `${data.maxPuntaje.toFixed(1)} pts` : "—"
          }
        />
        <MiniStat
          icon={<TrendingDown className="size-5 text-secondary-400" />}
          label="Puntaje minimo"
          value={
            data.minPuntaje !== null ? `${data.minPuntaje.toFixed(1)} pts` : "—"
          }
        />
      </div>

      {/* ranking table */}
      {data.ranking.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-secondary-500">
              No hay postulaciones calificadas en este concurso.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ranking de empresas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <RankingTable rows={data.ranking} />
          </CardContent>
        </Card>
      )}

      {/* grafico de barras horizontal */}
      {datosGrafico.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comparacion de puntajes</CardTitle>
          </CardHeader>
          <CardContent>
            <GraficoBarras datos={datosGrafico} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// tabla de ranking
function RankingTable({ rows }: { rows: PostulacionRankingItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-secondary-50 text-left text-secondary-600">
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-4 py-3 font-medium">Empresa</th>
            <th className="px-4 py-3 font-medium text-right">Puntaje</th>
            <th className="px-4 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const pos = row.posicionFinal ?? index + 1;
            const esGanador = row.estado === "ganador";
            return (
              <tr
                key={row.postulacionId}
                className={`border-b transition-colors last:border-0 ${
                  esGanador
                    ? "bg-amber-50 hover:bg-amber-100"
                    : "hover:bg-secondary-50"
                }`}
              >
                {/* posicion */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center w-6">
                    <MedalIcon posicion={pos} />
                  </div>
                </td>

                {/* empresa */}
                <td className="px-4 py-3">
                  <span
                    className={`font-medium ${
                      esGanador
                        ? "text-amber-800"
                        : "text-secondary-900"
                    }`}
                  >
                    {row.empresaNombre}
                  </span>
                </td>

                {/* puntaje */}
                <td className="px-4 py-3 text-right">
                  {row.puntajeFinal !== null ? (
                    <span
                      className={`font-semibold tabular-nums ${
                        esGanador ? "text-amber-700" : "text-secondary-900"
                      }`}
                    >
                      {row.puntajeFinal.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-secondary-400">—</span>
                  )}
                </td>

                {/* estado */}
                <td className="px-4 py-3">
                  <StateBadge tipo="postulacion" valor={row.estado} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// grafico de barras horizontal con recharts
function GraficoBarras({
  datos,
}: {
  datos: {
    nombre: string;
    puntaje: number;
    estado: string;
    posicion: number | null;
  }[];
}) {
  // altura dinamica segun cantidad de empresas
  const alturaBase = 60;
  const altura = Math.max(200, datos.length * alturaBase);

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart
        layout="vertical"
        data={datos}
        margin={{ top: 0, right: 32, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickCount={6}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          type="category"
          dataKey="nombre"
          width={140}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value) => {
            const num = typeof value === "number" ? value : Number(value);
            return [`${num.toFixed(1)} pts`, "Puntaje"];
          }}
          labelStyle={{ fontSize: 12 }}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="puntaje" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {datos.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getBarColor(entry.estado, entry.posicion)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// stat card pequeno
function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-secondary-600">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-xl font-bold text-secondary-900">{value}</p>
      </CardContent>
    </Card>
  );
}
