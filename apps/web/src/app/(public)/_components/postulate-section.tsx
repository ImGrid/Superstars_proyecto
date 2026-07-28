import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Tarjetas de categoria del material del cliente (Categoria1.png / Categoria2.png).
// Los colores estan hardcodeados a proposito: el naranja NO es de la marca oficial
// (el cliente lo pidio solo para esta seccion) y el verde del material es mas
// oscuro que el verde oficial. No usar estos hex en ningun otro lugar.
const CATEGORIAS = [
  {
    numero: 1,
    icono: "/images/categoria-1-icono.png",
    titulo: "Empresas de Triple Impacto",
    subtitulo: "Impacto económico, social y ambiental.",
    monto: "50.000 Bs",
    badge: "#077514",
    boton: "#026B11",
    acento: "#026C12",
    borde: "#BBD9BE",
  },
  {
    numero: 2,
    icono: "/images/categoria-2-icono.png",
    titulo: "Agricultura Sostenible",
    subtitulo: "Producción sostenible y resiliente al cambio climático.",
    monto: "35.000 Bs",
    badge: "#FE6B02",
    boton: "#FE4C01",
    acento: "#FE4C01",
    borde: "#FDC09F",
  },
];

type Categoria = (typeof CATEGORIAS)[number];

function CategoriaCard({ cat }: { cat: Categoria }) {
  return (
    <div
      className="relative flex flex-col items-center rounded-3xl border-2 bg-white px-6 pt-10 pb-6 text-center shadow-sm"
      style={{ borderColor: cat.borde }}
    >
      {/* badge que se apoya sobre el borde superior */}
      <span
        className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-xl px-6 py-2 font-display text-base font-bold tracking-wide whitespace-nowrap text-white uppercase"
        style={{ backgroundColor: cat.badge }}
      >
        Categoría {cat.numero}
      </span>

      {/* icono (el circulo tintado viene incluido en el PNG) */}
      <Image
        src={cat.icono}
        alt=""
        width={150}
        height={150}
        className="mt-4 mb-2 size-28"
      />

      {/* titulo */}
      <h3 className="font-display text-2xl leading-tight font-bold text-[#081B37] sm:text-3xl">
        {cat.titulo}
      </h3>

      {/* subtitulo: min-height reserva 2 lineas para que las filas de ambas
          tarjetas (divisor, subvencion, monto) queden alineadas */}
      <p className="mt-3 min-h-[3.25rem] text-base leading-relaxed text-secondary-600">
        {cat.subtitulo}
      </p>

      {/* linea divisoria */}
      <span className="my-6 h-px w-full max-w-[220px] bg-secondary-200" />

      {/* subvencion */}
      <p className="text-sm font-semibold tracking-widest text-secondary-500 uppercase">
        Subvención
      </p>
      <p
        className="mt-1 font-display text-4xl font-bold tracking-tight"
        style={{ color: cat.acento }}
      >
        {cat.monto}
      </p>

      {/* boton postularme: mt-auto lo fija al fondo para que los 2 botones queden
          alineados aunque el texto de una tarjeta ocupe mas lineas */}
      <Link
        href="/auth/registro"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-display text-lg font-bold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: cat.boton }}
      >
        Postularme ahora
        <ArrowRight className="size-5" />
      </Link>
    </div>
  );
}

// Seccion "¡Postulate ahora!" con las dos tarjetas de categoria, replica del
// material del cliente. Va debajo de "Sobre nosotros".
export function PostulateSection() {
  return (
    <section id="postulate" className="py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* etiqueta de la edicion vigente, pedida por el cliente. Sin uppercase
            para respetar la caja de "SuperStar" */}
        <p className="text-center text-sm font-semibold tracking-wider text-purple-600">
          Convocatoria SuperStar 2026
        </p>
        <h2 className="mt-2 text-center font-display text-3xl leading-[1.3] tracking-wide text-primary-600 uppercase sm:text-4xl">
          ¡Postúlate ahora!
        </h2>
        <div className="mx-auto mt-14 grid max-w-2xl gap-8 sm:grid-cols-2">
          {CATEGORIAS.map((cat) => (
            <CategoriaCard key={cat.numero} cat={cat} />
          ))}
        </div>
      </div>
    </section>
  );
}
