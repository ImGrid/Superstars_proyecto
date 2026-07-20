"use client";

import {
  useState,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
  type CSSProperties,
} from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconoBeneficio } from "./iconos-beneficios";
import { IconoCalendario } from "./icono-calendario";
import { cn } from "@/lib/utils";

// duracion de cada slide en ms (el cliente pidio 12s: el cambio era muy rapido para leer)
const SLIDE_DURATION = 12000;

// suscripcion a prefers-reduced-motion via useSyncExternalStore
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(reducedMotionQuery);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(reducedMotionQuery).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

// recolorea un PNG de linea (vienen en naranja) al color de fondo del span via
// mask CSS: asi los iconos del banner del cliente quedan en amarillo de la marca
function maskStyle(url: string): CSSProperties {
  return {
    maskImage: `url(${url})`,
    WebkitMaskImage: `url(${url})`,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskPosition: "center",
    maskSize: "contain",
    WebkitMaskSize: "contain",
  };
}

interface Slide {
  image: string;
  alt: string;
  // anclaje vertical de la foto en escritorio (Tailwind). Por defecto object-right
  // (centro vertical). El slide 0 sube el anclaje para no cortar la cara.
  objectPosition?: string;
  // intensidades del overlay degradado: izquierda, medio, derecha
  overlay: [number, number, number];
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  // fila de beneficios (solo el slide 1 la tiene)
  benefits?: { tipo: string; label: ReactNode }[];
  // tarjeta de fechas clave (solo el slide 2 la tiene)
  dateCard?: { titulo: string; label: string; fecha: string };
  // tarjeta de impacto del ganador (solo el slide de casos de exito la tiene).
  // Replica fiel del banner del cliente: logo + badge + descripcion + impactos
  impactCard?: {
    logo: string;
    logoAlt: string;
    badge: string;
    description: string;
    impactIcon: string;
    impactLabel: string;
    items: { icon: string; num: string; label: string }[];
  };
  // llamada a la accion propia de cada slide
  cta: { label: string; href: string };
}

const slides: Slide[] = [
  {
    image: "/images/banner-agricultura.webp",
    alt: "Productora boliviana sonriendo junto a sacos de papa recien cosechada en el campo",
    // la cara queda en la parte alta de la foto: subimos el anclaje para no
    // cortarla. Movil centrado; desktop pegado arriba a la derecha.
    objectPosition: "object-center md:object-[100%_1%]",
    overlay: [0.92, 0.72, 0.45],
    eyebrow: "Beneficios del programa",
    title: (
      <>
        Impulsamos tu empresa en{" "}
        <span className="text-amarillo-400">cada etapa</span> de crecimiento
      </>
    ),
    subtitle:
      "SUPERIMPACT360 te brinda financiamiento, conocimiento y acompañamiento para que tu emprendimiento crezca y genere un triple impacto en Bolivia.",
    benefits: [
      {
        tipo: "bs",
        label: (
          <>
            Hasta{" "}
            <span className="font-semibold text-amarillo-300">Bs 50.000</span>{" "}
            de capital semilla
          </>
        ),
      },
      { tipo: "asistencia", label: "Asistencia técnica especializada" },
      { tipo: "mentoria", label: "Mentorías" },
      { tipo: "capacitacion", label: "Capacitación" },
      {
        tipo: "crecimiento",
        label: "Acompañamiento para fortalecer el negocio",
      },
    ],
    cta: { label: "Postularme ahora", href: "/auth/registro" },
  },
  {
    // la foto original tiene a la protagonista a la izquierda, justo donde va el
    // texto. Se guarda espejada para que quede a la derecha, como las otras dos
    image: "/images/banner-laboratorio.webp",
    alt: "Quimica boliviana sonriendo en el laboratorio de su empresa, rodeada de equipos de destilacion",
    // su cara esta arriba a la derecha: en movil subimos el anclaje para no
    // cortarla; en desktop object-right ya la muestra bien.
    objectPosition: "object-[58%_5%] md:object-right",
    overlay: [0.92, 0.7, 0.4],
    eyebrow: "Convocatoria abierta",
    title: (
      <>
        5.ª edición SuperStar.
        <br />
        <span className="text-amarillo-400">Convocatoria abierta.</span>
      </>
    ),
    subtitle:
      "Impulsa tu emprendimiento, genera impacto y sé parte del cambio en Bolivia.",
    dateCard: {
      titulo: "Fechas clave",
      label: "Cierre de postulaciones:",
      fecha: "31 de agosto de 2026",
    },
    cta: { label: "Postular ahora", href: "/auth/registro" },
  },
  {
    image: "/images/banner-energia.webp",
    alt: "Pareja aymara sosteniendo paneles solares y un equipo de energia limpia frente a su casa",
    overlay: [0.94, 0.76, 0.5],
    eyebrow: "Casos de éxito",
    title: (
      <>
        Historias que inspiran,{" "}
        <span className="text-amarillo-400">impactos</span> que transforman
      </>
    ),
    // sin subtitulo: la descripcion completa vive en la tarjeta de impacto
    subtitle: "",
    impactCard: {
      logo: "/images/impacto/logo-apicola-tocana.png",
      logoAlt: "Logo de Apícola Tocaña, empresa ganadora 2025",
      badge: "Ganador 2025",
      description:
        "Apícola Tocaña fortalece la apicultura sostenible en los Yungas mediante el mejoramiento genético de abejas y la capacitación de productores, incrementando la productividad y promoviendo un desarrollo apícola más resiliente.",
      impactIcon: "/images/impacto/icono-abeja-panal.png",
      impactLabel: "Impacto generado:",
      items: [
        {
          icon: "/images/impacto/icono-apicultor.png",
          num: "20",
          label: "apicultores beneficiados",
        },
        {
          icon: "/images/impacto/icono-reina.png",
          num: "40",
          label: "reinas genéticamente mejoradas producidas",
        },
        {
          icon: "/images/impacto/icono-nucleo.png",
          num: "30",
          label: "núcleos de fecundación implementados",
        },
      ],
    },
    cta: { label: "Resultados e impactos", href: "/resultados" },
  },
];

// contenido de texto de un slide (badge + titulo + subtitulo). Se usa en las
// capas absolutas del crossfade y tambien en un "sizer" invisible que le da al
// contenedor la altura del slide actual, para que el texto no se solape con los
// beneficios o la tarjeta de fechas en pantallas angostas.
function CopyContenido({ slide }: { slide: Slide }) {
  return (
    <>
      <Badge className="mb-6 border-amarillo-500/30 bg-amarillo-500/10 px-3 py-1 text-sm text-amarillo-200">
        {slide.eyebrow}
      </Badge>
      <h1 className="font-display font-bold text-4xl leading-[1.1] tracking-tight text-balance text-white sm:text-5xl">
        {slide.title}
      </h1>
      {/* algunos slides omiten el subtitulo (ej. el de casos de exito, cuya
          descripcion vive completa en la tarjeta de impacto) */}
      {slide.subtitle && (
        <p className="mt-4 text-lg leading-relaxed text-primary-200 sm:text-xl">
          {slide.subtitle}
        </p>
      )}
    </>
  );
}

export function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  // pausa explicita por click en el boton pause/play
  const [isPaused, setIsPaused] = useState(false);
  // el usuario tomo control con flechas / dots / swipe — auto-play se detiene definitivamente
  const [userInteracted, setUserInteracted] = useState(false);
  // pausa temporal cuando el mouse o el foco estan sobre las zonas interactivas
  // (CTAs o controles). NO se pausa al hover sobre toda el area del hero porque
  // el hero ocupa min-h-screen y el cursor cae naturalmente encima al cargar
  const [pauseZoneActive, setPauseZoneActive] = useState(false);
  // respeto a prefers-reduced-motion (WCAG)
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef(0);

  // programar el avance al siguiente slide
  useEffect(() => {
    if (reducedMotion || isPaused || userInteracted || pauseZoneActive) return;
    timerRef.current = setTimeout(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, SLIDE_DURATION);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, isPaused, userInteracted, pauseZoneActive, reducedMotion]);

  // ir a un slide especifico (fromUser detiene el auto-play definitivo)
  const goTo = (index: number, fromUser = false) => {
    if (fromUser) setUserInteracted(true);
    const total = slides.length;
    setCurrent(((index % total) + total) % total);
  };

  // toggle del boton pause/play (tambien sirve para reanudar tras interaccion manual)
  const handlePauseClick = () => {
    if (userInteracted) {
      setUserInteracted(false);
      setIsPaused(false);
      return;
    }
    setIsPaused((p) => !p);
  };

  // hover/focus sobre zonas con elementos clickables (CTAs o controles)
  const handleZoneMouseEnter = () => {
    if (window.matchMedia("(hover: hover)").matches && !userInteracted) {
      setPauseZoneActive(true);
    }
  };

  const handleZoneMouseLeave = () => {
    setPauseZoneActive(false);
  };

  const handleZoneFocus = () => {
    if (!userInteracted) setPauseZoneActive(true);
  };

  // al hacer tab entre botones del mismo contenedor, no cuenta como salir
  const handleZoneBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setPauseZoneActive(false);
  };

  // navegacion por teclado cuando el hero tiene foco
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(current - 1, true);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(current + 1, true);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  // swipe horizontal en mobile
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) goTo(current + 1, true);
      else goTo(current - 1, true);
    }
  };

  const isAnimating =
    !reducedMotion && !isPaused && !userInteracted && !pauseZoneActive;
  const showPlayIcon = isPaused || userInteracted;

  return (
    <section
      className="relative flex min-h-screen items-start overflow-hidden bg-primary-800"
      aria-roledescription="carrusel"
      aria-label="Presentación de SUPERIMPACT360"
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={-1}
      style={
        { "--hero-slide-duration": `${SLIDE_DURATION}ms` } as CSSProperties
      }
    >
      {/* capa de imagenes con crossfade */}
      <div className="absolute inset-0" aria-hidden="true">
        {slides.map((slide, i) => (
          <div
            key={slide.image}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-in-out",
              i === current ? "opacity-100" : "opacity-0",
            )}
          >
            <Image
              src={slide.image}
              alt={slide.alt}
              fill
              sizes="100vw"
              // anclaje del recorte por slide. Por defecto: centro en movil y
              // object-right en desktop (Z-pattern: texto izquierda + sujeto
              // derecha). Cada slide lo ajusta para no cortar la cara segun donde
              // este en su foto (movil y desktop pueden diferir).
              className={cn(
                "object-cover",
                slide.objectPosition ?? "object-center md:object-right",
              )}
              priority={i === 0}
            />
            {/* overlay degradado direccional, intensidad variable por slide */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to right, rgba(5, 20, 48, ${slide.overlay[0]}) 0%, rgba(8, 28, 62, ${slide.overlay[1]}) 50%, rgba(8, 28, 62, ${slide.overlay[2]}) 100%)`,
              }}
            />
          </div>
        ))}
      </div>

      {/* contenido: los 3 slides van apilados en la MISMA celda de un grid
          (col-start-1 row-start-1). Asi el contenedor toma la altura del slide
          mas alto y NO cambia de tamano al pasar de slide (evita el salto
          vertical en responsive). Cada slide fluye normal dentro de su capa, por
          lo que el texto nunca se solapa con los beneficios ni la tarjeta.
          Anclado arriba (items-start del section). */}
      <div
        className="relative z-10 mx-auto grid w-full max-w-7xl px-4 pt-24 pb-24 sm:px-6 lg:px-8"
        aria-live="polite"
      >
        {slides.map((slide, i) => (
          <div
            key={slide.eyebrow}
            className={cn(
              "col-start-1 row-start-1 transition-all duration-500 ease-out",
              i === current
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-2 opacity-0",
            )}
            // inert saca de foco/lectura las capas ocultas (no se puede tabular a
            // un boton invisible de otro slide)
            inert={i !== current}
          >
            {/* texto: badge + titulo + subtitulo */}
            <div className="max-w-2xl">
              <CopyContenido slide={slide} />
            </div>

            {/* fila de beneficios del programa (solo el slide que la tenga) */}
            {slide.benefits && (
              <ul className="mt-5 flex max-w-3xl flex-wrap gap-x-6 gap-y-4">
                {slide.benefits.map((b) => (
                  <li
                    key={b.tipo}
                    className="flex w-[116px] flex-col items-center gap-2 text-center"
                  >
                    <span className="flex size-16 shrink-0 items-center justify-center rounded-full border border-amarillo-400/70 text-amarillo-400">
                      <IconoBeneficio tipo={b.tipo} className="size-8" />
                    </span>
                    <span className="text-[12.5px] leading-tight text-white/90">
                      {b.label}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* tarjeta de fechas clave (solo el slide que la tenga) */}
            {slide.dateCard && (
              <div className="mt-6 flex w-fit max-w-xl items-center gap-5 rounded-2xl border border-white/15 bg-white/[0.05] px-7 py-6 pr-10">
                <span className="flex size-[68px] shrink-0 items-center justify-center rounded-full border border-amarillo-400/70 text-amarillo-400">
                  <IconoCalendario className="size-9" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-xl font-bold text-amarillo-300">
                    {slide.dateCard.titulo}
                  </p>
                  <p className="text-base text-primary-100">
                    {slide.dateCard.label}
                  </p>
                  <p className="text-lg font-bold text-amarillo-300">
                    {slide.dateCard.fecha}
                  </p>
                </div>
              </div>
            )}

            {/* tarjeta de impacto del ganador (solo el slide que la tenga).
                Replica fiel del banner del cliente: logo | badge + descripcion +
                impactos. Los iconos vienen en naranja: mask CSS los pone amarillos */}
            {slide.impactCard && (
              <div className="mt-6 flex w-full max-w-4xl flex-col gap-5 rounded-2xl border border-white/15 bg-white/[0.05] p-5 sm:flex-row sm:items-stretch sm:gap-6 sm:p-6">
                {/* logo del ganador en su tarjeta blanca. En escritorio llena la
                    altura de la tarjeta (casi de lado a lado), como en el banner */}
                <div className="flex shrink-0 items-center justify-center">
                  <Image
                    src={slide.impactCard.logo}
                    alt={slide.impactCard.logoAlt}
                    width={480}
                    height={518}
                    className="w-28 object-contain sm:h-full sm:max-h-64 sm:w-auto"
                  />
                </div>

                {/* columna derecha: badge + descripcion + impacto generado */}
                <div className="min-w-0 flex-1">
                  <Badge className="border-amarillo-500/30 bg-amarillo-500/10 px-3 py-1 text-sm text-amarillo-200">
                    {slide.impactCard.badge}
                  </Badge>
                  <p className="mt-3 max-w-[32rem] text-sm leading-relaxed text-primary-100 sm:text-[15px]">
                    {slide.impactCard.description}
                  </p>

                  <div className="mt-4 flex items-center gap-4">
                    {/* icono grande de abeja + panal (decorativo). Casi tan alto
                        como el bloque de impacto, como en el banner del cliente */}
                    <span
                      aria-hidden="true"
                      className="hidden size-28 shrink-0 bg-amarillo-400 sm:block"
                      style={maskStyle(slide.impactCard.impactIcon)}
                    />
                    <div className="min-w-0">
                      <p className="mb-2 font-display text-base font-bold text-amarillo-300">
                        {slide.impactCard.impactLabel}
                      </p>
                      <ul className="space-y-1.5">
                        {slide.impactCard.items.map((it) => (
                          <li key={it.label} className="flex items-start gap-3">
                            <span
                              aria-hidden="true"
                              className="mt-0.5 block size-5 shrink-0 bg-amarillo-400"
                              style={maskStyle(it.icon)}
                            />
                            <p className="text-sm leading-snug text-primary-100">
                              <span className="font-bold text-amarillo-300">
                                {it.num}
                              </span>{" "}
                              {it.label}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CTA principal del slide + secundario fijo. Pause-on-hover/focus
                aqui. w-fit para que la zona de hover solo abarque los botones */}
            <div
              className="relative mt-6 flex w-fit flex-wrap gap-4"
              onMouseEnter={handleZoneMouseEnter}
              onMouseLeave={handleZoneMouseLeave}
              onFocus={handleZoneFocus}
              onBlur={handleZoneBlur}
            >
              <Button asChild size="lg" variant="cta">
                <Link href={slide.cta.href}>
                  {slide.cta.label}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/convocatorias">Ver convocatorias</Link>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* controles del carrusel. El contenedor exterior NO tiene handler porque
          con justify-between abarca todo el ancho (incluyendo el espacio vacio
          del medio). Los 2 sub-grupos si tienen handler */}
      <div className="pointer-events-none absolute right-0 bottom-8 left-0 z-20 mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* izquierda: pause/play + indicador de progreso */}
        <div
          className="pointer-events-auto flex items-center gap-4"
          onMouseEnter={handleZoneMouseEnter}
          onMouseLeave={handleZoneMouseLeave}
          onFocus={handleZoneFocus}
          onBlur={handleZoneBlur}
        >
          <button
            type="button"
            onClick={handlePauseClick}
            className="inline-flex size-11 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-amarillo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-800 focus-visible:outline-none"
            aria-label={showPlayIcon ? "Reanudar carrusel" : "Pausar carrusel"}
          >
            {showPlayIcon ? (
              <Play className="size-4 fill-current" />
            ) : (
              <Pause className="size-4 fill-current" />
            )}
          </button>

          <div
            className="flex gap-2"
            role="tablist"
            aria-label="Slides del carrusel"
          >
            {slides.map((slide, i) => (
              <button
                key={slide.eyebrow}
                type="button"
                role="tab"
                aria-selected={i === current}
                aria-label={`Ir al slide ${i + 1}: ${slide.eyebrow}`}
                onClick={() => goTo(i, true)}
                className={cn(
                  "relative h-1 cursor-pointer overflow-hidden rounded-full bg-white/25 transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amarillo-400",
                  i === current ? "w-16" : "w-8",
                )}
              >
                {i === current && (
                  <span
                    // key fuerza el remount al cambiar de slide para que la animacion reinicie
                    key={`fill-${current}`}
                    className="absolute inset-y-0 left-0 bg-amarillo-500"
                    style={{
                      animationName: isAnimating ? "hero-fill-bar" : "none",
                      animationDuration: "var(--hero-slide-duration)",
                      animationTimingFunction: "linear",
                      animationFillMode: "forwards",
                      animationPlayState:
                        pauseZoneActive || isPaused || userInteracted
                          ? "paused"
                          : "running",
                      width: showPlayIcon && !isAnimating ? "100%" : undefined,
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* derecha: prev/next */}
        <div
          className="pointer-events-auto flex gap-2"
          onMouseEnter={handleZoneMouseEnter}
          onMouseLeave={handleZoneMouseLeave}
          onFocus={handleZoneFocus}
          onBlur={handleZoneBlur}
        >
          <button
            type="button"
            onClick={() => goTo(current - 1, true)}
            className="inline-flex size-11 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-amarillo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-800 focus-visible:outline-none"
            aria-label="Slide anterior"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(current + 1, true)}
            className="inline-flex size-11 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-amarillo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-800 focus-visible:outline-none"
            aria-label="Slide siguiente"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
