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
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// duracion de cada slide en ms (NN/G recomienda 5-7s para headlines cortos)
const SLIDE_DURATION = 7000;

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

interface Slide {
  image: string;
  alt: string;
  // intensidades del overlay degradado: izquierda, medio, derecha
  overlay: [number, number, number];
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
}

const slides: Slide[] = [
  {
    image: "/images/hero-vendedora.webp",
    alt: "Mujer mayor andina vendiendo flores tejidas a crochet en una plaza de Bolivia",
    overlay: [0.92, 0.72, 0.5],
    eyebrow: "Convocatoria 2026 abierta",
    title: (
      <>
        Impulsa tu empresa al{" "}
        <span className="text-orange-400">siguiente nivel</span>
      </>
    ),
    subtitle:
      "Participa en SUPERIMPACT360 y accede a financiamiento, mentoría y visibilidad para tu emprendimiento con impacto en Bolivia.",
  },
  {
    image: "/images/hero-telar.webp",
    alt: "Manos tejiendo en telar tradicional con textiles andinos coloridos",
    overlay: [0.94, 0.78, 0.55],
    eyebrow: "Triple impacto",
    title: (
      <>
        Negocios que <span className="text-orange-400">transforman</span> Bolivia
      </>
    ),
    subtitle:
      "Apoyamos empresas con propuestas innovadoras que generan valor económico, social y ambiental al mismo tiempo.",
  },
  {
    image: "/images/hero-asamblea.webp",
    alt: "Mujer indígena con sombrero rosa y trenza, de espaldas, en una reunión comunitaria",
    overlay: [0.88, 0.62, 0.4],
    eyebrow: "Equidad e inclusión",
    title: (
      <>
        Crecimiento con <span className="text-orange-400">propósito</span>
      </>
    ),
    subtitle:
      "Apoyamos modelos de negocio que incluyen a mujeres, jóvenes y comunidades en toda su cadena de valor.",
  },
];

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

  const isAnimating = !reducedMotion && !isPaused && !userInteracted && !pauseZoneActive;
  const showPlayIcon = isPaused || userInteracted;

  return (
    <section
      className="relative flex min-h-screen items-center overflow-hidden bg-primary-800"
      aria-roledescription="carrusel"
      aria-label="Presentación de SUPERIMPACT360"
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={-1}
      style={{ "--hero-slide-duration": `${SLIDE_DURATION}ms` } as CSSProperties}
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
              // mobile: sujeto al centro de la foto (los 3 frames tienen el sujeto
              // hacia el centro/izquierda). Desktop: object-right para Z-pattern
              // (texto izquierda + sujeto derecha)
              className="object-cover object-center md:object-right"
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

      {/* contenido */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-32 sm:px-6 lg:px-8">
        {/* copy con crossfade y desplazamiento sutil */}
        <div
          className="relative max-w-2xl min-h-[280px] sm:min-h-[300px]"
          aria-live="polite"
          aria-atomic="true"
        >
          {slides.map((slide, i) => (
            <div
              key={slide.eyebrow}
              className={cn(
                "absolute inset-0 transition-all duration-500 ease-out",
                i === current
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-2 opacity-0",
              )}
              aria-hidden={i !== current}
            >
              <Badge className="mb-6 border-orange-500/30 bg-orange-500/10 px-3 py-1 text-sm text-orange-300">
                {slide.eyebrow}
              </Badge>
              <h1 className="font-heading text-4xl leading-tight font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                {slide.title}
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-primary-200 sm:text-xl">
                {slide.subtitle}
              </p>
            </div>
          ))}
        </div>

        {/* CTAs fijos — los mismos en los 3 slides. Pause-on-hover/focus aqui.
            w-fit para que la zona de hover solo abarque los botones reales y no
            todo el ancho del padre (que sino dispara pausa "a la misma altura") */}
        <div
          className="relative mt-8 flex w-fit flex-wrap gap-4"
          onMouseEnter={handleZoneMouseEnter}
          onMouseLeave={handleZoneMouseLeave}
          onFocus={handleZoneFocus}
          onBlur={handleZoneBlur}
        >
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
            <Link href="/convocatorias">Ver convocatorias</Link>
          </Button>
        </div>
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
            className="inline-flex size-11 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-800 focus-visible:outline-none"
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
                  "relative h-1 cursor-pointer overflow-hidden rounded-full bg-white/25 transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400",
                  i === current ? "w-16" : "w-8",
                )}
              >
                {i === current && (
                  <span
                    // key fuerza el remount al cambiar de slide para que la animacion reinicie
                    key={`fill-${current}`}
                    className="absolute inset-y-0 left-0 bg-orange-500"
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
            className="inline-flex size-11 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-800 focus-visible:outline-none"
            aria-label="Slide anterior"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(current + 1, true)}
            className="inline-flex size-11 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-800 focus-visible:outline-none"
            aria-label="Slide siguiente"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
