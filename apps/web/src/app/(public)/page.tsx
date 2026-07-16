import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConvocatoriasActivasSection } from "./_components/convocatorias-activas-section";
import { HeroCarousel } from "./_components/hero-carousel";
import { HistoriasExitoSection } from "./_components/historias-exito-section";
import { ResultadosCifrasSection } from "./_components/resultados-cifras-section";
import { PasosProgramaSection } from "./_components/pasos-programa-section";
import { PostulateSection } from "./_components/postulate-section";
import { DocumentosSection } from "./_components/documentos-section";
import { EsloganStrip } from "@/components/public/eslogan-strip";
import { SectionDivider } from "@/components/public/section-divider";
import { ContactBanner } from "@/components/public/contact-banner";

export default function HomePage() {
  return (
    <>
      {/* ===== HERO CARRUSEL ===== */}
      <HeroCarousel />

      {/* ===== FRANJA DEL ESLOGAN (los patrocinadores siguen en el footer) ===== */}
      <EsloganStrip />

      {/* ===== NOSOTROS ===== */}
      <section id="nosotros" className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* banner SUPERSTAR 2026 */}
            <div className="relative aspect-[3/2] overflow-hidden rounded-2xl">
              <Image
                src="/images/img5.png"
                alt="Empresas SUPERSTAR - Buscando impacto sostenible en Bolivia"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain"
              />
            </div>

            {/* texto */}
            <div>
              <p className="text-sm font-semibold tracking-wider text-purple-600 uppercase">
                Sobre nosotros
              </p>
              <h2 className="mt-2 font-display text-3xl leading-[1.3] tracking-wide text-primary-600 uppercase sm:text-4xl">
                ¿Qué es el programa SuperStar?
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-secondary-600">
                Buscamos emprendimientos y empresas innovadoras que integren
                equidad de género y acción climática como parte de su modelo de
                negocio, impulsando una economía más sostenible, inclusiva y
                competitiva.
              </p>
              <Button
                asChild
                variant="link"
                className="mt-4 px-0 text-azul-600 hover:text-azul-700"
              >
                <Link href="/#como-funciona">
                  Conoce cómo funciona
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ===== POSTULATE AHORA (tarjetas de categoria del material) ===== */}
      <PostulateSection />

      <SectionDivider />

      {/* ===== COMO FUNCIONA (4 pasos del programa) ===== */}
      <PasosProgramaSection />

      <SectionDivider />

      {/* ===== DOCUMENTOS DEL CONCURSO (tarjetas del material) ===== */}
      <DocumentosSection />

      <SectionDivider />

      {/* ===== CONVOCATORIAS ACTIVAS (datos reales del API) ===== */}
      <ConvocatoriasActivasSection />

      <SectionDivider />

      {/* ===== RESULTADOS E IMPACTOS 2025 (impacto del programa) ===== */}
      <ResultadosCifrasSection />

      {/* ===== HISTORIAS DE EXITO (datos reales del API) ===== */}
      {/* fondo blanco + salto de seccion como el resto; el cohete va dentro del
          componente para no quedar huerfano si no hay historias activas */}
      <HistoriasExitoSection />

      <SectionDivider />

      {/* ===== BANNER DE CONTACTO (reemplaza al antiguo CTA) ===== */}
      <ContactBanner />
    </>
  );
}
