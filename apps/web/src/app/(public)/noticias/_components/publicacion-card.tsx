import Link from "next/link";
import { Newspaper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { PublicPublicacionListItem } from "@superstars/shared";

interface PublicacionCardProps {
  publicacion: PublicPublicacionListItem;
}

// card de publicacion para el listado publico
export function PublicacionCard({ publicacion }: PublicacionCardProps) {
  const imageUrl = publicacion.imagenDestacadaKey
    ? `${process.env.NEXT_PUBLIC_API_URL}/publicaciones/${publicacion.id}/imagen`
    : null;

  return (
    <Link href={`/noticias/${publicacion.slug}`}>
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        {/* imagen o placeholder */}
        <div className="aspect-[16/9] overflow-hidden bg-secondary-100">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={publicacion.titulo}
              className="size-full object-cover transition-transform duration-300 hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Newspaper className="size-10 text-secondary-300" />
            </div>
          )}
        </div>

        <CardContent className="p-5">
          {/* categoria y fecha */}
          <div className="mb-2 flex items-center gap-2">
            {publicacion.categoriaNombre && (
              <Badge variant="secondary" className="text-xs">
                {publicacion.categoriaNombre}
              </Badge>
            )}
            <span className="text-xs text-secondary-400">
              {formatDate(publicacion.fechaPublicacion)}
            </span>
          </div>

          {/* titulo */}
          <h3 className="line-clamp-2 font-heading text-base font-bold text-primary-800">
            {publicacion.titulo}
          </h3>

          {/* extracto */}
          {publicacion.extracto && (
            <p className="mt-2 line-clamp-3 text-sm text-secondary-600">
              {publicacion.extracto}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
