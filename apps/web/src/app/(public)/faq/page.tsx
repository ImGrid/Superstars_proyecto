"use client";

import { useQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { faqQueries } from "@/lib/api/query-keys";
import type { FaqResponse } from "@superstars/shared";

// orden y labels de las categorias
const CATEGORIAS = [
  { slug: "general", label: "General" },
  { slug: "participacion", label: "Participacion" },
  { slug: "proceso", label: "Proceso de evaluacion" },
] as const;

export default function FaqPage() {
  const { data: faqs, isLoading } = useQuery(faqQueries.public());

  // agrupar por categoria manteniendo el orden definido
  const grupos = CATEGORIAS.map((cat) => ({
    ...cat,
    items: (faqs ?? []).filter((f) => f.categoria === cat.slug),
  })).filter((g) => g.items.length > 0);

  const hayPreguntas = grupos.length > 0;

  return (
    <>
      {/* hero */}
      <section className="bg-primary-800 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-3xl font-bold text-white sm:text-4xl">
            Preguntas frecuentes
          </h1>
          <p className="mt-3 text-lg text-primary-200">
            Encuentra respuestas a las consultas mas comunes sobre el programa.
          </p>
        </div>
      </section>

      {/* contenido */}
      <section className="py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* carga */}
          {isLoading && <FaqSkeleton />}

          {/* sin datos */}
          {!isLoading && !hayPreguntas && (
            <div className="flex flex-col items-center py-16 text-center">
              <Icon icon="ph:question-duotone" className="size-12 text-secondary-300" />
              <h2 className="mt-4 text-lg font-semibold text-secondary-900">
                Aun no hay preguntas frecuentes
              </h2>
              <p className="mt-2 text-sm text-secondary-500">
                Pronto publicaremos las respuestas a las consultas mas comunes.
              </p>
            </div>
          )}

          {/* grupos por categoria */}
          {!isLoading && hayPreguntas && (
            <div className="space-y-10">
              {grupos.map((grupo) => (
                <GrupoFaq
                  key={grupo.slug}
                  label={grupo.label}
                  items={grupo.items}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA contacto */}
      <section className="border-t bg-secondary-50 py-12">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-heading text-xl font-semibold text-secondary-900">
            No encontraste lo que buscabas?
          </h2>
          <p className="mt-2 text-secondary-600">
            Nuestro equipo esta disponible para resolver tus dudas.
          </p>
          <Button asChild className="mt-6 bg-orange-600 hover:bg-orange-700">
            <Link href="/contacto">
              <Mail className="size-4" />
              Contactanos
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

// grupo de preguntas bajo un header de categoria
function GrupoFaq({ label, items }: { label: string; items: FaqResponse[] }) {
  return (
    <div>
      <h2 className="mb-4 border-b border-secondary-200 pb-2 text-base font-semibold uppercase tracking-wide text-primary-700">
        {label}
      </h2>
      {/* type="multiple" permite tener varias respuestas abiertas a la vez */}
      <Accordion type="multiple" className="w-full">
        {items.map((faq) => (
          <AccordionItem key={faq.id} value={`faq-${faq.id}`}>
            <AccordionTrigger className="text-base font-medium text-secondary-900 hover:no-underline hover:text-primary-700">
              {faq.pregunta}
            </AccordionTrigger>
            <AccordionContent className="leading-relaxed text-secondary-600">
              {faq.respuesta}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

// skeleton mientras carga
function FaqSkeleton() {
  return (
    <div className="space-y-10">
      {[1, 2].map((g) => (
        <div key={g}>
          <Skeleton className="mb-4 h-5 w-40" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border-b pb-4">
                <Skeleton className="h-6 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
