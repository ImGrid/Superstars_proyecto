import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { ConvocatoriasActivasSection } from "./_components/convocatorias-activas-section";
import { HeroCarousel } from "./_components/hero-carousel";
import { HistoriasExitoSection } from "./_components/historias-exito-section";
import { EsloganStrip } from "@/components/public/eslogan-strip";
import { SectionDivider } from "@/components/public/section-divider";

// pasos de "como funciona" - iconos de Phosphor duotone via Iconify
const steps = [
  {
    icon: "ph:building-office-duotone",
    title: "Registra tu empresa",
    description:
      "Crea tu perfil empresarial con los datos de tu empresa y documentación requerida.",
  },
  {
    icon: "ph:note-pencil-duotone",
    title: "Completa el formulario",
    description:
      "Llena el formulario dinámico de la convocatoria con tu propuesta de impacto.",
  },
  {
    icon: "ph:trophy-duotone",
    title: "Compite y gana",
    description:
      "Un jurado independiente evalúa las propuestas y selecciona a los ganadores.",
  },
];


export default function HomePage() {
  return (
    <>
      {/* ===== HERO CARRUSEL ===== */}
      <HeroCarousel />

      {/* ===== FRANJA DEL ESLOGAN (los patrocinadores siguen en el footer) ===== */}
      <EsloganStrip />

      {/* ===== NOSOTROS ===== */}
      <section id="nosotros" className="py-20 lg:py-28">
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
              <h2 className="mt-2 font-display text-3xl leading-[1.3] tracking-wide text-primary-800 uppercase sm:text-4xl">
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

      {/* ===== COMO FUNCIONA ===== */}
      {/* fondo claro continuo: el salto de seccion es ahora el unico separador */}
      <section id="como-funciona" className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-wider text-purple-600 uppercase">
              Proceso sencillo
            </p>
            <h2 className="mt-2 font-display text-3xl leading-[1.3] tracking-wide text-primary-800 uppercase sm:text-4xl">
              Cómo funciona
            </h2>
            <p className="mt-4 text-lg text-secondary-600">
              Participar es simple. Tres pasos para llevar tu empresa al
              siguiente nivel.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="relative text-center">
                {/* número de paso */}
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-lg shadow-purple-600/25">
                  <Icon icon={step.icon} className="size-7" />
                </div>
                <span className="mb-2 block text-sm font-bold text-purple-600">
                  Paso {index + 1}
                </span>
                <h3 className="font-display text-xl leading-snug tracking-wide text-primary-800 uppercase">
                  {step.title}
                </h3>
                <p className="mt-2 text-secondary-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ===== CONVOCATORIAS ACTIVAS (datos reales del API) ===== */}
      <ConvocatoriasActivasSection />

      {/* ===== HISTORIAS DE EXITO (datos reales del API) ===== */}
      {/* mantiene fondo gris: es la unica seccion que se destaca por color */}
      <HistoriasExitoSection />

      {/* ===== CTA FINAL ===== */}
      <section className="bg-primary-700 py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Icon icon="ph:trophy-duotone" className="mx-auto mb-6 size-12 text-amarillo-400" />
          <h2 className="font-display text-3xl leading-[1.3] tracking-wide text-white uppercase sm:text-4xl">
            ¿Listo para llevar tu empresa al siguiente nivel?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-200">
            Registra tu empresa, completa tu propuesta y compite por un monto de
            hasta Bs 58.000. El siguiente caso de éxito puedes ser tú.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" variant="cta">
              <Link href="/auth/registro">
                Iniciar postulación
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/faq">Preguntas frecuentes</Link>
            </Button>
          </div>
          <div className="mt-6 flex justify-center gap-6 text-sm text-primary-300">
            <Link
              href="/convocatorias"
              className="transition-colors hover:text-amarillo-400"
            >
              Ver bases de la convocatoria
            </Link>
            <Link
              href="/contacto"
              className="transition-colors hover:text-amarillo-400"
            >
              Contáctanos
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
