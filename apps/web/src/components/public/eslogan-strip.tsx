import Image from "next/image";
import { EstrellaSuperStar } from "./estrella-superstar";

// Color exacto de la estrella del material del disenador (EstrellaSinFondo.png).
// Es una cruz de puntas redondeadas, no una estrella de puntas.
const COLOR_ESTRELLA = "#FEB907";

// Campo estelar en 3 capas: las pequenas y tenues quedan al fondo, las grandes
// al frente. Posiciones FIJAS (nada de Math.random: el servidor y el navegador
// pintarian estrellas distintas y React fallaria al hidratar).
// Ninguna cae sobre el eslogan: el corredor central (x 32-68%, y 30-70%) queda
// libre para que el texto nunca compita con una estrella.
// [x%, y%, tamano en px, opacidad]
const ESTRELLAS: [number, number, number, number][] = [
  [4, 18, 9, 0.55],
  [9, 68, 7, 0.4],
  [14, 30, 12, 0.9],
  [17, 82, 8, 0.5],
  [21, 12, 6, 0.35],
  [24, 55, 10, 0.7],
  [29, 25, 7, 0.45],
  [30, 90, 9, 0.6],
  [38, 15, 6, 0.3],
  [43, 90, 8, 0.5],
  [46, 9, 7, 0.4],
  [52, 80, 6, 0.3],
  [57, 20, 10, 0.65],
  [59, 91, 7, 0.45],
  [66, 38, 9, 0.55],
  [70, 12, 6, 0.3],
  [74, 72, 11, 0.8],
  [78, 28, 7, 0.4],
  [82, 58, 8, 0.5],
  [86, 16, 9, 0.6],
  [89, 78, 6, 0.35],
  [92, 42, 10, 0.7],
  [95, 24, 7, 0.45],
  [97, 64, 8, 0.5],
  // capa de fondo: muy pequenas, en los bordes del corredor
  [12, 48, 5, 0.3],
  [31, 10, 5, 0.28],
  [64, 6, 5, 0.28],
  [84, 44, 5, 0.3],
];

// Franja bajo el hero: el cohete de la marca sobre un campo de estrellas, con
// el eslogan del programa. Sustituye a la tira de patrocinadores en la landing
// (los patrocinadores siguen en el footer).
export function EsloganStrip() {
  return (
    <section
      className="relative flex min-h-[168px] flex-col items-center gap-4 overflow-hidden px-6 py-8 text-center sm:px-10 md:flex-row md:gap-8 md:text-left"
      style={{
        // navy oficial plano (Pantone 282 C, primary-600) pedido por el cliente
        background: "#041f6b",
      }}
    >
      {/* campo de estrellas, decorativo */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{ color: COLOR_ESTRELLA }}
        aria-hidden="true"
      >
        {ESTRELLAS.map(([x, y, tam, opacidad], i) => (
          <span
            key={`${x}-${y}`}
            className={
              // en movil el eslogan se apila bajo el cohete y ocupa casi todo el
              // ancho: alli solo dejamos la franja superior y los bordes laterales
              y <= 18 || x <= 8 || x >= 93
                ? "estrella-titila absolute block"
                : "estrella-titila absolute hidden md:block"
            }
            style={
              {
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
                opacity: opacidad,
                "--o": opacidad,
                "--d": `${2.6 + (i % 5) * 0.55}s`,
                "--delay": `${(i % 7) * 0.38}s`,
              } as React.CSSProperties
            }
          >
            <EstrellaSuperStar tam={tam} />
          </span>
        ))}
      </div>

      {/* cohete de la marca */}
      <div className="cohete-flota relative z-10 w-[88px] shrink-0 drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)] md:w-[118px]">
        <Image
          src="/images/cohete-superstar.webp"
          alt=""
          width={360}
          height={357}
          className="h-auto w-full"
        />
      </div>

      {/* eslogan del programa */}
      <p className="relative z-10 flex-1 text-center font-display text-xl leading-[1.45] font-bold tracking-[0.015em] text-white [text-shadow:0_2px_14px_rgba(5,20,48,0.85)] sm:text-2xl md:text-[26px]">
        <span className="block">Aceleramos empresas que crean valor</span>
        <span className="block">
          para las personas, la comunidad y el medio ambiente.
        </span>
      </p>

      {/* contrapeso del cohete para que el eslogan quede optimamente centrado */}
      <div className="hidden w-[118px] shrink-0 md:block" aria-hidden="true" />
    </section>
  );
}
