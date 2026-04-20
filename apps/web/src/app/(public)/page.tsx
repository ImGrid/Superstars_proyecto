import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConcursosActivosSection } from "./_components/concursos-activos-section";

// pasos de "como funciona" - iconos de Phosphor duotone via Iconify
const steps = [
  {
    icon: "ph:building-office-duotone",
    title: "Registra tu empresa",
    description:
      "Crea tu perfil empresarial con los datos de tu empresa y documentacion requerida.",
  },
  {
    icon: "ph:note-pencil-duotone",
    title: "Completa el formulario",
    description:
      "Llena el formulario dinamico del concurso con tu propuesta de impacto.",
  },
  {
    icon: "ph:trophy-duotone",
    title: "Compite y gana",
    description:
      "Un jurado independiente evalua las propuestas y selecciona a los ganadores.",
  },
];


// historias de exito placeholder
const stories = [
  {
    image: "/images/img1.jpg",
    category: "Manufactura",
    title: "Taller Textil Innovador",
    description:
      "Dos emprendedoras transformaron su taller de costura en una empresa de moda sostenible con impacto comunitario.",
  },
  {
    image: "/images/img3.jpg",
    category: "Tecnologia",
    title: "Emprendedora Digital",
    description:
      "Desde su hogar, esta emprendedora construyo una plataforma digital que conecta productores locales con mercados internacionales.",
  },
  {
    image: "/images/img4.jpg",
    category: "Medio Ambiente",
    title: "Reciclaje Inteligente",
    description:
      "Un proyecto de economia circular que convierte residuos plasticos en materiales de construccion accesibles.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative flex min-h-[90vh] items-center overflow-hidden bg-primary-800">
        {/* imagen de fondo */}
        <Image
          src="/images/img5.jpg"
          alt="Presentacion de proyecto en espacio de coworking"
          fill
          sizes="100vw"
          className="object-cover opacity-30"
          priority
        />
        {/* overlay degradado */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-900/90 via-primary-800/70 to-primary-800/50" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-32 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Badge className="mb-6 border-orange-500/30 bg-orange-500/10 px-3 py-1 text-sm text-orange-300">
              Convocatoria 2026 Abierta
            </Badge>
            <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Impulsa tu empresa al{" "}
              <span className="text-orange-400">siguiente nivel</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-primary-200 sm:text-xl">
              Participa en nuestros concursos empresariales y accede a
              financiamiento, mentoria y visibilidad para tu emprendimiento con
              impacto social y ambiental en Bolivia.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button
                asChild
                size="lg"
                className="bg-orange-600 text-white hover:bg-orange-700"
              >
                <Link href="/auth/registro">
                  Participar ahora
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/concursos">Ver concursos</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SPONSORS ===== */}
      <section className="border-b bg-secondary-50 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-4 text-center text-xs font-medium tracking-wider text-secondary-500 uppercase">
            Con el apoyo de
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {["OXFAM", "Ayuda en Accion", "FUNDES Bolivia"].map((name) => (
              <div
                key={name}
                className="text-sm font-semibold tracking-wide text-secondary-400"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== NOSOTROS ===== */}
      <section id="nosotros" className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* imagen */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src="/images/img2.jpg"
                alt="Joven sosteniendo una planta - crecimiento y sostenibilidad"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/5" />
            </div>

            {/* texto */}
            <div>
              <p className="text-sm font-semibold tracking-wider text-orange-600 uppercase">
                Sobre nosotros
              </p>
              <h2 className="mt-2 font-heading text-3xl font-bold text-primary-800 sm:text-4xl">
                Transformando ideas en realidades sostenibles
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-secondary-600">
                SUPERIMPACT360 es una plataforma de competencias empresariales que
                busca identificar, visibilizar y apoyar a empresas bolivianas
                con modelos de negocio innovadores y de alto impacto social y
                ambiental.
              </p>
              <p className="mt-4 leading-relaxed text-secondary-600">
                Trabajamos junto a organizaciones internacionales como OXFAM,
                Ayuda en Accion y FUNDES Bolivia para ofrecer a los
                emprendedores financiamiento, acompanamiento tecnico y
                oportunidades de crecimiento.
              </p>
              <Button
                asChild
                variant="link"
                className="mt-4 px-0 text-orange-600 hover:text-orange-700"
              >
                <Link href="/#como-funciona">
                  Conoce como funciona
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== COMO FUNCIONA ===== */}
      <section id="como-funciona" className="bg-secondary-50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-wider text-orange-600 uppercase">
              Proceso sencillo
            </p>
            <h2 className="mt-2 font-heading text-3xl font-bold text-primary-800 sm:text-4xl">
              Como funciona
            </h2>
            <p className="mt-4 text-lg text-secondary-600">
              Participar es simple. Tres pasos para llevar tu empresa al
              siguiente nivel.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="relative text-center">
                {/* numero de paso */}
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-600/25">
                  <Icon icon={step.icon} className="size-7" />
                </div>
                <span className="mb-2 block text-sm font-bold text-orange-600">
                  Paso {index + 1}
                </span>
                <h3 className="font-heading text-xl font-bold text-primary-800">
                  {step.title}
                </h3>
                <p className="mt-2 text-secondary-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CONCURSOS ACTIVOS (datos reales del API) ===== */}
      <ConcursosActivosSection />

      {/* ===== HISTORIAS DE EXITO ===== */}
      <section className="bg-secondary-50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-wider text-orange-600 uppercase">
              Casos de exito
            </p>
            <h2 className="mt-2 font-heading text-3xl font-bold text-primary-800 sm:text-4xl">
              Historias que inspiran
            </h2>
            <p className="mt-4 text-lg text-secondary-600">
              Conoce las empresas que transformaron sus ideas en negocios
              sostenibles y exitosos.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <Card key={story.title} className="overflow-hidden transition-shadow hover:shadow-md">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={story.image}
                    alt={story.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <CardContent className="p-6">
                  <Badge className="mb-2 bg-primary-50 text-primary-700">
                    {story.category}
                  </Badge>
                  <h3 className="font-heading text-lg font-bold text-primary-800">
                    {story.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-secondary-600">
                    {story.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="bg-primary-700 py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Icon icon="ph:trophy-duotone" className="mx-auto mb-6 size-12 text-orange-400" />
          <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">
            Listo para llevar tu empresa al siguiente nivel?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-200">
            Registra tu empresa, completa tu propuesta y compite por premios de
            hasta Bs 58.000. El siguiente caso de exito puedes ser tu.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              <Link href="/auth/registro">
                Iniciar postulacion
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
              href="/concursos"
              className="transition-colors hover:text-orange-400"
            >
              Ver bases del concurso
            </Link>
            <Link
              href="/contacto"
              className="transition-colors hover:text-orange-400"
            >
              Contactanos
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
