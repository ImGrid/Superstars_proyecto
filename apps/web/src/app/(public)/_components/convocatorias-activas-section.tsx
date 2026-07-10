"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardSkeleton } from "@/components/shared/loading-skeleton";
import { publicQueries } from "@/lib/api/query-keys";
import { ConvocatoriaCard } from "../convocatorias/_components/convocatoria-card";

export function ConvocatoriasActivasSection() {
  const { data, isLoading } = useQuery(
    publicQueries.convocatorias({ limit: 3 }),
  );

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wider text-orange-600 uppercase">
              Oportunidades
            </p>
            <h2 className="mt-2 font-display text-3xl leading-[1.3] tracking-wide text-primary-800 uppercase sm:text-4xl">
              Convocatorias activas
            </h2>
          </div>
          <Button
            asChild
            variant="outline"
            className="hidden sm:inline-flex"
          >
            <Link href="/convocatorias">
              Ver todas
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-10">
          {/* cargando */}
          {isLoading && <CardSkeleton count={3} />}

          {/* sin convocatorias */}
          {!isLoading && (!data || data.data.length === 0) && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="flex items-center justify-center border-dashed bg-secondary-50 sm:col-span-2 lg:col-span-3">
                <CardContent className="p-8 text-center">
                  <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary-100">
                    <Icon icon="ph:trophy-duotone" className="size-6 text-primary-600" />
                  </div>
                  <h3 className="font-display text-lg leading-snug tracking-wide text-primary-800 uppercase">
                    Nuevas convocatorias en camino
                  </h3>
                  <p className="mt-2 text-sm text-secondary-500">
                    Próximamente se publicarán nuevas oportunidades para tu
                    empresa.
                  </p>
                  <Button
                    asChild
                    variant="link"
                    className="mt-2 text-orange-600"
                  >
                    <Link href="/convocatorias">Ver todas las convocatorias</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* con convocatorias */}
          {!isLoading && data && data.data.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.data.map(convocatoria => (
                <ConvocatoriaCard key={convocatoria.id} convocatoria={convocatoria} />
              ))}

              {/* card CTA si hay menos de 3 */}
              {data.data.length < 3 && (
                <Card className="flex items-center justify-center border-dashed bg-secondary-50">
                  <CardContent className="p-6 text-center">
                    <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary-100">
                      <Icon icon="ph:trophy-duotone" className="size-6 text-primary-600" />
                    </div>
                    <h3 className="font-display text-lg leading-snug tracking-wide text-primary-800 uppercase">
                      Más convocatorias pronto
                    </h3>
                    <p className="mt-2 text-sm text-secondary-500">
                      Nuevas convocatorias se publicarán próximamente.
                    </p>
                    <Button
                      asChild
                      variant="link"
                      className="mt-2 text-orange-600"
                    >
                      <Link href="/convocatorias">Ver todas las convocatorias</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* boton mobile */}
        <div className="mt-6 text-center sm:hidden">
          <Button asChild variant="outline">
            <Link href="/convocatorias">
              Ver todas las convocatorias
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
