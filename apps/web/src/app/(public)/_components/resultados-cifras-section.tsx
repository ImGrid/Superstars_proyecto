"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { IconoMujer } from "./icono-mujer";
import { IconoClipboard } from "./icono-clipboard";

// cifras oficiales del programa (resultados 2025). Estaticas: se actualizan aqui
// cada anio. Colores mapeados a la paleta oficial (sin naranja/rojo de la imagen):
// el dinero/premio va en amarillo con icono navy, el resto icono blanco.
const CIFRAS: {
  icon: string;
  value: number;
  pre?: string;
  suf?: string;
  label: string;
  circle: string;
  icono: string;
  num: string;
}[] = [
  {
    icon: "custom:clipboard",
    value: 92,
    label: "postulaciones efectivas",
    circle: "bg-success-600",
    icono: "text-white",
    num: "text-success-600",
  },
  {
    icon: "custom:mujer",
    value: 53,
    suf: "%",
    label: "participación femenina",
    circle: "bg-purple-600",
    icono: "text-white",
    num: "text-purple-600",
  },
  {
    icon: "heroicons:user-group-solid",
    value: 22,
    label: "semifinalistas",
    circle: "bg-info-600",
    icono: "text-white",
    num: "text-info-600",
  },
  {
    icon: "fa6-solid:hand-holding-dollar",
    value: 255000,
    pre: "Bs. ",
    label: "en capital semilla",
    circle: "bg-amarillo-600",
    icono: "text-primary-600",
    num: "text-amarillo-800",
  },
  {
    icon: "solar:cup-first-bold",
    value: 6,
    label: "empresas ganadoras",
    circle: "bg-primary-600",
    icono: "text-white",
    num: "text-primary-600",
  },
  {
    icon: "ph:graduation-cap",
    value: 14000,
    suf: "+",
    label: "estudiantes sensibilizados y valorizados",
    circle: "bg-success-600",
    icono: "text-white",
    num: "text-success-600",
  },
  {
    icon: "material-symbols:recycling",
    value: 60,
    suf: "+",
    label: "toneladas de residuos recuperados y valorizados",
    circle: "bg-info-600",
    icono: "text-white",
    num: "text-info-600",
  },
  {
    icon: "heroicons:user-group-solid",
    value: 350,
    suf: "+",
    label: "personas capacitadas en economía circular",
    circle: "bg-purple-600",
    icono: "text-white",
    num: "text-purple-600",
  },
];

// formatea 255000 -> "255.000" (separador de miles boliviano)
function miles(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// numero que cuenta desde 0 hasta su valor cuando la seccion entra en pantalla.
// Renderiza el valor final en el servidor (para SEO y sin JS); al montar en el
// navegador arranca en 0 y sube al ser visible.
function Contador({
  value,
  pre = "",
  suf = "",
  animar,
}: {
  value: number;
  pre?: string;
  suf?: string;
  animar: boolean;
}) {
  const texto = (n: number) => pre + miles(n) + suf;
  const [valor, setValor] = useState(texto(value));
  const yaAnimo = useRef(false);

  // al montar en el navegador, si se permite animacion, arranca en 0
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setValor(texto(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!animar || yaAnimo.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    yaAnimo.current = true;

    const dur = 1600;
    let start: number | null = null;
    let raf = 0;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      setValor(texto(value * ease(p)));
      if (p < 1) raf = requestAnimationFrame(step);
      else setValor(texto(value));
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animar, value, pre, suf]);

  return <span>{valor}</span>;
}

export function ResultadosCifrasSection() {
  const ref = useRef<HTMLElement>(null);
  const [enVista, setEnVista] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setEnVista(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* encabezado con lineas a los lados, como la imagen del cliente */}
        <div className="mx-auto mb-14 flex max-w-3xl items-center gap-4 sm:gap-6">
          <span className="h-0.5 flex-1 rounded bg-secondary-200" />
          <h2 className="font-display text-2xl leading-tight tracking-wide whitespace-nowrap text-primary-600 uppercase sm:text-3xl">
            Resultados e impactos 2025
          </h2>
          <span className="h-0.5 flex-1 rounded bg-secondary-200" />
        </div>

        {/* 8 indicadores en UNA fila en escritorio (como la imagen); 2 columnas en
            pantallas chicas. Divisor vertical entre tarjetas, oculto en la primera
            de cada fila */}
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-12 lg:[grid-template-columns:repeat(8,minmax(0,1fr))] lg:gap-y-0">
          {CIFRAS.map((c, i) => (
            <div
              key={i}
              className="relative flex flex-col items-center px-2 text-center before:absolute before:inset-y-1.5 before:left-0 before:block before:w-px before:bg-secondary-200 [&:nth-child(2n+1)]:before:hidden lg:[&:nth-child(1n)]:before:block lg:[&:nth-child(8n+1)]:before:hidden"
            >
              <div
                className={`mb-4 flex size-16 items-center justify-center rounded-full shadow-md sm:size-20 lg:size-16 ${c.circle}`}
              >
                {c.icon === "custom:mujer" ? (
                  // un pelin mas grande: el trazado tiene algo de aire interno
                  <IconoMujer className={`size-9 sm:size-11 lg:size-9 ${c.icono}`} />
                ) : c.icon === "custom:clipboard" ? (
                  <IconoClipboard className={`size-8 sm:size-10 lg:size-8 ${c.icono}`} />
                ) : (
                  <Icon icon={c.icon} className={`size-8 sm:size-10 lg:size-8 ${c.icono}`} />
                )}
              </div>
              <span
                className={`font-display text-2xl leading-none font-bold tracking-tight whitespace-nowrap tabular-nums sm:text-4xl lg:text-lg xl:text-xl 2xl:text-2xl ${c.num}`}
              >
                <Contador value={c.value} pre={c.pre} suf={c.suf} animar={enVista} />
              </span>
              <span className="mt-2.5 max-w-[16ch] text-xs leading-snug text-secondary-600 sm:text-sm">
                {c.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
