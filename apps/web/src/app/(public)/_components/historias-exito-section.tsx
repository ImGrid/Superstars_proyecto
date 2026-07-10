"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import type { PublicHistoriaExitoItem } from "@superstars/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/shared/loading-skeleton";
import { publicQueries } from "@/lib/api/query-keys";

// Card individual (visual igual al diseño actual de la landing)
function HistoriaCard({ historia }: { historia: PublicHistoriaExitoItem }) {
  const imageUrl = `${process.env.NEXT_PUBLIC_API_URL}/historias-exito/${historia.id}/imagen`;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/10] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={historia.titulo}
          className="size-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
      <CardContent className="p-6">
        {historia.badge && (
          <Badge className="mb-2 bg-primary-50 text-primary-700">
            {historia.badge}
          </Badge>
        )}
        <h3 className="font-display text-lg leading-snug tracking-[0.01em] text-primary-800">
          {historia.titulo}
        </h3>
        {historia.empresaNombre && (
          <p className="mt-1 flex items-center gap-1 text-xs text-secondary-500">
            <Building2 className="size-3" />
            <span>{historia.empresaNombre}</span>
          </p>
        )}
        <p className="mt-2 text-sm leading-relaxed text-secondary-600">
          {historia.descripcion}
        </p>
      </CardContent>
    </Card>
  );
}

// Wrapper de layout adaptativo segun la cantidad de historias (1-6)
// Garantiza que la grilla siempre se vea simetrica/balanceada
function HistoriasGrid({ historias }: { historias: PublicHistoriaExitoItem[] }) {
  const n = historias.length;

  // N = 1: card unica centrada con ancho controlado
  if (n === 1) {
    return (
      <div className="mx-auto max-w-md">
        <HistoriaCard historia={historias[0]} />
      </div>
    );
  }

  // N = 2: dos cards en una fila, contenedor limitado para que no se vean enormes
  if (n === 2) {
    return (
      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
        {historias.map((h) => (
          <HistoriaCard key={h.id} historia={h} />
        ))}
      </div>
    );
  }

  // N = 4: grilla 2x2 con ancho controlado (cards mas amplias)
  if (n === 4) {
    return (
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
        {historias.map((h) => (
          <HistoriaCard key={h.id} historia={h} />
        ))}
      </div>
    );
  }

  // N = 5: 3 arriba + 2 abajo centradas (mismo ancho que las de arriba)
  if (n === 5) {
    return (
      <div className="space-y-6 lg:space-y-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {historias.slice(0, 3).map((h) => (
            <HistoriaCard key={h.id} historia={h} />
          ))}
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
          {historias.slice(3, 5).map((h) => (
            <HistoriaCard key={h.id} historia={h} />
          ))}
        </div>
      </div>
    );
  }

  // N = 3 o N = 6: grilla 3 columnas (filas perfectas)
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
      {historias.map((h) => (
        <HistoriaCard key={h.id} historia={h} />
      ))}
    </div>
  );
}

// Seccion completa de la landing publica
export function HistoriasExitoSection() {
  const { data, isLoading } = useQuery(publicQueries.historiasExito());

  // mientras carga, mostrar skeleton (manteniendo la altura visual)
  if (isLoading) {
    return (
      <section className="bg-secondary-50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader />
          <div className="mt-12">
            <CardSkeleton count={3} />
          </div>
        </div>
      </section>
    );
  }

  // sin historias activas → ocultar la seccion completa (no mostrar empty state al publico)
  if (!data || data.length === 0) {
    return null;
  }

  return (
    <section className="bg-secondary-50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader />
        <div className="mt-12">
          <HistoriasGrid historias={data} />
        </div>
      </div>
    </section>
  );
}

// Header de la seccion (titulo + descripcion)
function SectionHeader() {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold tracking-wider text-orange-600 uppercase">
        Casos de éxito
      </p>
      <h2 className="mt-2 font-display text-3xl leading-[1.3] tracking-wide text-primary-800 uppercase sm:text-4xl">
        Historias que inspiran
      </h2>
      <p className="mt-4 text-lg text-secondary-600">
        Conoce las empresas que transformaron sus ideas en negocios sostenibles y exitosos.
      </p>
    </div>
  );
}
