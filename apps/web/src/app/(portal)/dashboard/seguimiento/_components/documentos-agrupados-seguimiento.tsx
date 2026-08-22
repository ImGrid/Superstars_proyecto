"use client";

import { useQueries } from "@tanstack/react-query";
import { Icon } from "@iconify/react";
import type { SeguimientoCategoria } from "@superstars/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { seguimientoQueries } from "@/lib/api/query-keys";
import { acentoCategoria, iconoCategoria } from "@/lib/acento-categoria";
import { DocumentoDescargable } from "./documento-descargable";

interface Props {
  convocatoriaId: number;
  categorias: SeguimientoCategoria[];
}

// Documentos de la convocatoria, agrupados como en la vista del proponente:
// primero los propios de cada categoria, despues los que aplican a todas (una
// sola vez). Evita repetir los documentos comunes en cada categoria.
//
// Un documento es "comun" si un documento con el MISMO nombre existe en todas
// las categorias. El resto son propios de su categoria.
export function DocumentosAgrupadosSeguimiento({ convocatoriaId, categorias }: Props) {
  const consultas = useQueries({
    queries: categorias.map((c) => seguimientoQueries.documentos(convocatoriaId, c.id)),
  });

  if (consultas.some((q) => q.isLoading)) {
    return <Skeleton className="h-24 w-full" />;
  }

  const porCategoria = categorias.map((c, i) => ({
    categoria: c,
    documentos: consultas[i].data ?? [],
  }));
  const total = porCategoria.reduce((n, x) => n + x.documentos.length, 0);
  if (total === 0) {
    return (
      <p className="text-sm text-secondary-500">
        Esta convocatoria todavía no tiene documentos publicados.
      </p>
    );
  }

  const nombresComunes =
    categorias.length > 1
      ? porCategoria[0].documentos
          .map((d) => d.nombre)
          .filter((nombre) =>
            porCategoria.every((x) => x.documentos.some((d) => d.nombre === nombre)),
          )
      : [];
  const comunes =
    categorias.length > 1
      ? porCategoria[0].documentos.filter((d) => nombresComunes.includes(d.nombre))
      : [];

  const conPropios = porCategoria
    .map(({ categoria, documentos }) => ({
      categoria,
      propios: documentos.filter((d) => !nombresComunes.includes(d.nombre)),
    }))
    .filter((x) => x.propios.length > 0);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-heading text-lg font-semibold text-secondary-900">
          Documentos
        </h2>
        <p className="text-sm text-secondary-600">
          Bases, criterios y formatos de la convocatoria. Descárgalos para
          revisarlos.
        </p>
      </div>

      {/* documentos propios de cada categoria, alineados con las tarjetas de arriba */}
      {conPropios.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-2">
          {conPropios.map(({ categoria, propios }) => {
            const acento = acentoCategoria(categoria.orden);
            return (
              <Card key={categoria.id} className={acento.borde}>
                <CardContent className="space-y-2 p-3">
                  <p className={`flex items-center gap-1.5 text-xs font-semibold ${acento.texto}`}>
                    <Icon
                      icon={iconoCategoria(categoria.orden)}
                      className={`size-4 ${acento.icono}`}
                    />
                    Solo para {categoria.nombre}
                  </p>
                  {propios.map((doc) => (
                    <DocumentoDescargable
                      key={doc.id}
                      convocatoriaId={convocatoriaId}
                      categoriaId={categoria.id}
                      doc={doc}
                    />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* documentos que aplican a todas las categorias, una sola vez */}
      {comunes.length > 0 && (
        <div>
          {conPropios.length > 0 && (
            <p className="mb-2 text-xs font-semibold text-secondary-600">
              Aplican a todas las categorías
            </p>
          )}
          <Card>
            <CardContent className="grid gap-2 p-3 lg:grid-cols-2">
              {comunes.map((doc) => (
                <DocumentoDescargable
                  key={doc.id}
                  convocatoriaId={convocatoriaId}
                  categoriaId={porCategoria[0].categoria.id}
                  doc={doc}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
