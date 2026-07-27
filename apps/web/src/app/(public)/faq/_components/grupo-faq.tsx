"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { FaqResponse } from "@superstars/shared";

// Isla de cliente: solo el acordeon necesita interactividad.
// Sin forceMount: con esa prop Radix nunca aplica hidden y el panel cerrado
// queda visible para siempre. El SEO se cubre con el JSON-LD FAQPage de la pagina.
export function GrupoFaq({
  label,
  items,
}: {
  label: string;
  items: FaqResponse[];
}) {
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
