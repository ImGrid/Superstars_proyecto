"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { publicQueries } from "@/lib/api/query-keys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/format";

export default function NoticiaDetallePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const { data: publicacion, isLoading, isError } = useQuery(
    publicQueries.publicacionDetail(slug),
  );

  // estado de carga
  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-28 pb-12 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-5 w-40" />
        <Skeleton className="mb-3 h-6 w-24" />
        <Skeleton className="mb-2 h-10 w-full" />
        <Skeleton className="mb-8 h-5 w-48" />
        <Skeleton className="mb-8 aspect-video w-full rounded-xl" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  // error o no encontrado
  if (isError || !publicacion) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-28 pb-12 sm:px-6 lg:px-8">
        <EmptyState
          icon="ph:newspaper-duotone"
          title="Publicación no encontrada"
          description="La publicación que buscas no existe o fue removida."
          action={
            <Button asChild variant="outline">
              <Link href="/noticias">
                <ArrowLeft className="mr-2 size-4" />
                Volver a noticias
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const imageUrl = publicacion.imagenDestacadaKey
    ? `${process.env.NEXT_PUBLIC_API_URL}/publicaciones/${publicacion.id}/imagen`
    : null;

  return (
    <article className="pt-28 pb-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* titulo + categoria */}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl font-bold text-primary-800 sm:text-4xl">
            {publicacion.titulo}
          </h1>
          {publicacion.categoriaNombre && (
            <Badge variant="secondary">
              {publicacion.categoriaNombre}
            </Badge>
          )}
        </div>

        {/* fecha */}
        <p className="mt-3 text-sm text-secondary-500">
          {formatDate(publicacion.fechaPublicacion)}
        </p>

        {/* imagen de portada */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt={publicacion.titulo}
            className="mt-8 aspect-video w-full rounded-xl object-cover"
          />
        )}

        {/* contenido */}
        <div
          className="prose prose-lg mt-8 max-w-none"
          dangerouslySetInnerHTML={{ __html: publicacion.contenido }}
        />

        {/* volver (final) */}
        <div className="mt-12 border-t pt-8">
          <Link
            href="/noticias"
            className="inline-flex items-center gap-1 text-sm text-secondary-500 transition-colors hover:text-primary-700"
          >
            <ArrowLeft className="size-4" />
            Volver a noticias
          </Link>
        </div>
      </div>
    </article>
  );
}
