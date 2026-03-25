"use client";

import { useQuery } from "@tanstack/react-query";
import { HelpCircle, Mail } from "lucide-react";
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

export default function FaqPage() {
  const { data: faqs, isLoading } = useQuery(faqQueries.public());

  return (
    <>
      {/* hero */}
      <section className="bg-primary-800 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-3xl font-bold text-white sm:text-4xl">
            Preguntas frecuentes
          </h1>
          <p className="mt-3 text-lg text-primary-200">
            Encuentra respuestas a las consultas más comunes sobre el programa.
          </p>
        </div>
      </section>

      {/* contenido */}
      <section className="py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* carga */}
          {isLoading && <FaqSkeleton />}

          {/* sin datos */}
          {!isLoading && (!faqs || faqs.length === 0) && (
            <div className="flex flex-col items-center py-16 text-center">
              <HelpCircle className="size-12 text-secondary-300" />
              <h2 className="mt-4 text-lg font-semibold text-secondary-900">
                Aún no hay preguntas frecuentes
              </h2>
              <p className="mt-2 text-sm text-secondary-500">
                Pronto publicaremos las respuestas a las consultas más comunes.
              </p>
            </div>
          )}

          {/* accordion de preguntas */}
          {!isLoading && faqs && faqs.length > 0 && (
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq) => (
                <AccordionItem key={faq.id} value={`faq-${faq.id}`}>
                  <AccordionTrigger className="text-base font-medium text-secondary-900 hover:no-underline hover:text-primary-700">
                    {faq.pregunta}
                  </AccordionTrigger>
                  <AccordionContent className="text-secondary-600 leading-relaxed">
                    {faq.respuesta}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </section>

      {/* CTA contacto */}
      <section className="border-t bg-secondary-50 py-12">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-heading text-xl font-semibold text-secondary-900">
            ¿No encontraste lo que buscabas?
          </h2>
          <p className="mt-2 text-secondary-600">
            Nuestro equipo está disponible para resolver tus dudas.
          </p>
          <Button asChild className="mt-6 bg-orange-600 hover:bg-orange-700">
            <Link href="/contacto">
              <Mail className="size-4" />
              Contáctanos
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

// skeleton mientras carga
function FaqSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border-b pb-4">
          <Skeleton className="h-6 w-3/4" />
        </div>
      ))}
    </div>
  );
}
