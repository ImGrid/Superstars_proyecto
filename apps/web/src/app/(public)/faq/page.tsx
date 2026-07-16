import type { Metadata } from "next";
import { CircleHelp } from "lucide-react";
import { getFaqPublico } from "@/lib/api/public.server";
import { GrupoFaq } from "./_components/grupo-faq";
import { ContactBanner } from "@/components/public/contact-banner";

// orden y labels de las categorias
const CATEGORIAS = [
  { slug: "general", label: "General" },
  { slug: "participacion", label: "Participación" },
  { slug: "proceso", label: "Proceso de evaluación" },
] as const;

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description:
    "Respuestas a las consultas más comunes sobre las convocatorias de SUPERIMPACT360: quiénes pueden postular, cómo se evalúan las propuestas y cuáles son los plazos.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Preguntas frecuentes",
    description:
      "Respuestas a las consultas más comunes sobre las convocatorias para emprendedores y empresas en Bolivia.",
    url: "/faq",
  },
};

export default async function FaqPage() {
  const faqs = await getFaqPublico();

  // agrupar por categoria manteniendo el orden definido
  const grupos = CATEGORIAS.map((cat) => ({
    ...cat,
    items: faqs.filter((f) => f.categoria === cat.slug),
  })).filter((g) => g.items.length > 0);

  const hayPreguntas = grupos.length > 0;

  return (
    <>
      {/* hero */}
      <section className="bg-primary-800 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl leading-[1.3] tracking-wide text-white uppercase sm:text-4xl">
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
          {!hayPreguntas ? (
            <div className="flex flex-col items-center py-16 text-center">
              <CircleHelp className="size-12 text-secondary-300" />
              <h2 className="mt-4 text-lg font-semibold text-secondary-900">
                Aún no hay preguntas frecuentes
              </h2>
              <p className="mt-2 text-sm text-secondary-500">
                Pronto publicaremos las respuestas a las consultas más comunes.
              </p>
            </div>
          ) : (
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

      {/* banner de contacto */}
      <ContactBanner />
    </>
  );
}
