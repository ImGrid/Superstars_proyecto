"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StateBadge } from "@/components/shared/state-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { seguimientoQueries } from "@/lib/api/query-keys";
import { formatDate } from "@/lib/format";

interface Props {
  params: Promise<{ convocatoriaId: string }>;
}

export default function SeguimientoPostulacionesPage({ params }: Props) {
  const { convocatoriaId: rawId } = use(params);
  const convocatoriaId = Number(rawId);
  const router = useRouter();
  const searchParams = useSearchParams();

  // categoriaId opcional en la URL: si viene, la lista se filtra por esa categoria
  const categoriaParam = searchParams.get("categoriaId");
  const categoriaId = categoriaParam ? Number(categoriaParam) : undefined;

  const { data: postulaciones, isLoading } = useQuery(
    seguimientoQueries.postulaciones(convocatoriaId, categoriaId),
  );

  // para mostrar el nombre de la categoria en el encabezado cuando esta filtrada
  const { data: categorias } = useQuery(seguimientoQueries.categorias(convocatoriaId));
  const categoria = categoriaId
    ? categorias?.find((c) => c.id === categoriaId)
    : undefined;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="mt-0.5 shrink-0"
          onClick={() => router.push(`/dashboard/seguimiento/${convocatoriaId}`)}
          aria-label="Volver a la convocatoria"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="font-heading text-xl font-bold text-secondary-900">
            Postulaciones
          </h1>
          <p className="text-sm text-secondary-600">
            {categoria
              ? `Categoría: ${categoria.nombre}`
              : "Todas las categorías de la convocatoria"}
          </p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !postulaciones || postulaciones.length === 0 ? (
        <EmptyState
          icon="ph:file-text-duotone"
          title="Todavía no hay postulaciones"
          description="Cuando las empresas envíen sus propuestas, aparecerán aquí."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-secondary-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Enviada</TableHead>
                <TableHead className="text-right">Puntaje</TableHead>
                <TableHead className="text-right">Posición</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {postulaciones.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/dashboard/seguimiento/${convocatoriaId}/postulaciones/${p.id}`,
                    )
                  }
                >
                  <TableCell className="font-medium text-secondary-900">
                    {p.empresaRazonSocial}
                  </TableCell>
                  <TableCell>
                    <StateBadge tipo="postulacion" valor={p.estado} />
                  </TableCell>
                  <TableCell className="text-secondary-600">
                    {p.fechaEnvio ? formatDate(p.fechaEnvio) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-secondary-700">
                    {p.puntajeFinal ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-secondary-700">
                    {p.posicionFinal ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
