import { Icon } from "@iconify/react";
import { IconoCohete } from "./icono-cohete";
import { IconoLupa } from "./icono-lupa";
import { IconoPizarra } from "./icono-pizarra";
import { IconoLista } from "./icono-lista";

// Los 4 pasos del programa, replicando la infografia del cliente pero con la
// paleta oficial (degradado verde -> teal -> azul -> morado, sin magenta).
// c = color del paso, t = tinte claro de la burbuja.
const PASOS = [
  {
    titulo: "Postulación",
    icon: "custom:lista",
    c: "#61A535",
    t: "#F2F8EF",
  },
  {
    titulo: "Pitch ante el jurado",
    icon: "custom:pizarra",
    c: "#259999",
    t: "#EEF7F7",
  },
  {
    titulo: "Evaluación y selección",
    icon: "custom:lupa",
    c: "#1E73D6",
    t: "#EDF4FC",
  },
  {
    titulo: "Implementación",
    icon: "custom:cohete",
    c: "#5A1092",
    t: "#F2ECF6",
  },
];

const GRADIENTE = "linear-gradient(to right, #61A535, #259999, #1E73D6, #5A1092)";

// arco que abraza la burbuja: es casi concentrico (radio 54 vs burbuja 48), con
// los extremos bajando a la mitad-baja de los lados, como la imagen del cliente
function Arco({ color }: { color: string }) {
  return (
    <svg
      className="pointer-events-none absolute top-1/2 left-1/2 size-40 -translate-x-1/2 -translate-y-1/2"
      viewBox="0 0 160 160"
      fill="none"
      aria-hidden="true"
      style={{ color }}
    >
      <path
        d="M18 102.6 A66 66 0 1 1 142 102.6"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="18" cy="102.6" r="6" fill="currentColor" />
      <circle cx="142" cy="102.6" r="6" fill="currentColor" />
    </svg>
  );
}

export function PasosProgramaSection() {
  return (
    <section id="como-funciona" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center font-display text-3xl leading-[1.3] tracking-wide text-primary-800 uppercase sm:text-4xl">
          Cómo funciona
        </h2>

        {/* ESCRITORIO: linea de tiempo horizontal */}
        <div className="mx-auto mt-20 hidden max-w-6xl lg:block">
          {/* fila 1: arco + burbuja + conector punteado */}
          <div className="grid grid-cols-4">
            {PASOS.map((p) => (
              <div key={p.titulo} className="flex flex-col items-center">
                <div className="relative flex justify-center">
                  <Arco color={p.c} />
                  <div
                    className="relative flex size-24 items-center justify-center rounded-full"
                    style={{ backgroundColor: p.t, color: p.c }}
                  >
                    {p.icon === "custom:lista" ? (
                      <IconoLista className="size-12" />
                    ) : p.icon === "custom:cohete" ? (
                      <IconoCohete className="size-12" />
                    ) : p.icon === "custom:lupa" ? (
                      <IconoLupa className="size-16" />
                    ) : p.icon === "custom:pizarra" ? (
                      <IconoPizarra className="size-14" />
                    ) : (
                      <Icon icon={p.icon} className="size-11" />
                    )}
                  </div>
                </div>
                {/* conector: 4 puntos grandes y espaciados (como la imagen) */}
                <div className="mt-3 mb-2 flex flex-col items-center gap-[7px]">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: p.c }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* fila 2: nodos sobre la linea con degradado */}
          <div className="relative grid grid-cols-4">
            <div
              className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full"
              style={{ background: GRADIENTE }}
            />
            {PASOS.map((p) => (
              <div key={p.titulo} className="flex justify-center">
                {/* nodo: anillo delgado + centro grande (como la imagen) */}
                <div
                  className="relative z-10 flex size-8 items-center justify-center rounded-full border-[3px] bg-white"
                  style={{ borderColor: p.c }}
                >
                  <span
                    className="size-[18px] rounded-full"
                    style={{ backgroundColor: p.c }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* fila 3: PASO N + subtitulo */}
          <div className="mt-5 grid grid-cols-4">
            {PASOS.map((p, i) => (
              <div key={p.titulo} className="px-3 text-center">
                <p
                  className="font-display text-xl font-bold tracking-wide"
                  style={{ color: p.c }}
                >
                  PASO {i + 1}
                </p>
                <p className="mt-1 text-base font-medium text-primary-800">
                  {p.titulo}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* MÓVIL/TABLET: linea de tiempo vertical */}
        <div className="relative mx-auto mt-12 max-w-xs lg:hidden">
          <div
            className="absolute top-4 bottom-4 left-8 w-1.5 -translate-x-1/2 rounded-full"
            style={{ background: "linear-gradient(to bottom, #61A535, #259999, #1E73D6, #5A1092)" }}
          />
          <ol className="relative space-y-8">
            {PASOS.map((p, i) => (
              <li key={p.titulo} className="flex items-center gap-5">
                <div
                  className="relative z-10 flex size-16 shrink-0 items-center justify-center rounded-full ring-4 ring-white"
                  style={{ backgroundColor: p.t, color: p.c }}
                >
                  {p.icon === "custom:lista" ? (
                    <IconoLista className="size-9" />
                  ) : p.icon === "custom:cohete" ? (
                    <IconoCohete className="size-9" />
                  ) : p.icon === "custom:lupa" ? (
                    <IconoLupa className="size-12" />
                  ) : p.icon === "custom:pizarra" ? (
                    <IconoPizarra className="size-11" />
                  ) : (
                    <Icon icon={p.icon} className="size-8" />
                  )}
                </div>
                <div>
                  <p
                    className="font-display text-lg font-bold tracking-wide"
                    style={{ color: p.c }}
                  >
                    PASO {i + 1}
                  </p>
                  <p className="text-base font-medium text-primary-800">
                    {p.titulo}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
