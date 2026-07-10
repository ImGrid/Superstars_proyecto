import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getPublicacion,
  getTodasLasPublicacionesPublicadas,
} from "@/lib/api/public.server";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

interface Props {
  params: Promise<{ slug: string }>;
}

// url publica de la imagen destacada (el endpoint es @Public y cachea 24h)
function imagenUrl(id: number): string {
  return `${process.env.NEXT_PUBLIC_API_URL}/publicaciones/${id}/imagen`;
}

// el API devuelve la fecha en formato Postgres ("2026-04-07 11:32:17.95-04")
// y Open Graph exige ISO 8601
function fechaIso(fecha: string | null): string | undefined {
  if (!fecha) return undefined;
  const d = new Date(fecha);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

// prerenderiza las noticias publicadas en el build
export async function generateStaticParams() {
  try {
    const publicaciones = await getTodasLasPublicacionesPublicadas();
    return publicaciones.map((p) => ({ slug: p.slug }));
  } catch {
    // sin API en el build, las paginas se generan al primer visitante
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const publicacion = await getPublicacion(slug);

  if (!publicacion) {
    return { title: "Publicación no encontrada" };
  }

  const url = `/noticias/${slug}`;
  // el extracto ya viene con la longitud de un snippet (107-162 caracteres)
  const descripcion = publicacion.extracto ?? undefined;

  return {
    title: publicacion.titulo,
    description: descripcion,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: publicacion.titulo,
      description: descripcion,
      url,
      publishedTime: fechaIso(publicacion.fechaPublicacion),
      images: publicacion.imagenDestacadaKey
        ? [imagenUrl(publicacion.id)]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: publicacion.titulo,
      description: descripcion,
    },
  };
}

export default async function NoticiaDetallePage({ params }: Props) {
  const { slug } = await params;
  const publicacion = await getPublicacion(slug);

  // 404 real en vez de responder 200 con "no encontrada"
  if (!publicacion) notFound();

  const imageUrl = publicacion.imagenDestacadaKey
    ? imagenUrl(publicacion.id)
    : null;

  return (
    <article className="pt-28 pb-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* titulo + categoria */}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl leading-[1.2] tracking-[0.01em] text-primary-800 sm:text-4xl">
            {publicacion.titulo}
          </h1>
          {publicacion.categoriaNombre && (
            <Badge variant="secondary">{publicacion.categoriaNombre}</Badge>
          )}
        </div>

        {/* fecha */}
        {publicacion.fechaPublicacion && (
          <p className="mt-3 text-sm text-secondary-500">
            {formatDate(publicacion.fechaPublicacion)}
          </p>
        )}

        {/* imagen de portada */}
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={publicacion.titulo}
            className="mt-8 aspect-video w-full rounded-xl object-cover"
          />
        )}

        {/* contenido (ya sanitizado en el backend con sanitize-html) */}
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
