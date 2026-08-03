import Image from "next/image";

// Logos oficiales de las organizaciones aliadas, version blanca ("positivo")
// para fondo navy. Los PNG estan recortados a su caja de tinta, asi que el
// ancho en pantalla es el ancho real del logo.
//
// El tamano NO se normaliza por alto: se replica el lockup del ejemplo que
// mando el cliente (material/Logos-Organizaciones/ejemplo-logos.png), medido
// tambien en banner-concurso.png. Ahi los cuatro van al mismo factor de escala
// sobre su archivo original, salvo MariaMarina que va ~11% mas grande.
// El resultado, tomando FUNDES como unidad, son estos anchos relativos.
// Por eso OXFAM se ve mas alto: su lockup lleva el icono circular.
const SPONSORS = [
  {
    name: "FUNDES Bolivia",
    src: "/images/sponsors/fundes-blanco.png",
    width: 600,
    height: 116,
    factor: 1.0,
  },
  {
    name: "Ayuda en Acción",
    src: "/images/sponsors/ayuda-blanco.png",
    width: 600,
    height: 157,
    factor: 1.038,
  },
  {
    name: "MaríaMarina Foundation",
    src: "/images/sponsors/mariamarina-blanco.png",
    width: 600,
    height: 128,
    factor: 1.24,
  },
  {
    name: "OXFAM",
    src: "/images/sponsors/oxfam-blanco.png",
    width: 600,
    height: 226,
    factor: 1.119,
  },
] as const;

type SponsorsStripProps = {
  // "landing" = banda independiente con padding amplio
  // "footer" = banda integrada en footer con padding menor
  variant?: "landing" | "footer";
  className?: string;
};

// Banda de organizaciones aliadas sobre navy oficial.
export function SponsorsStrip({ variant = "landing", className = "" }: SponsorsStripProps) {
  const paddingY = variant === "landing" ? "py-12 sm:py-14" : "py-8";
  const labelColor = variant === "landing" ? "text-primary-200" : "text-primary-300";
  // en el footer la banda usa el mismo navy del footer para no cortar el bloque;
  // solo una linea sutil la separa del eslogan
  const fondo =
    variant === "landing"
      ? "bg-primary-700"
      : "bg-primary-800 border-t border-primary-700/50";

  return (
    <section className={`${fondo} ${paddingY} ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className={`mb-6 text-center text-xs font-semibold tracking-[0.2em] uppercase ${labelColor}`}>
          En alianza con
        </p>
        {/* --logo = ancho de FUNDES, la unidad del lockup. Los demas anchos y la
            separacion (0.4 de esa unidad) se calculan a partir de ella, asi que
            la tira entera escala en bloque y conserva las proporciones */}
        <div
          className="flex flex-wrap items-center justify-center gap-y-8 [--logo:112px] gap-x-[calc(var(--logo)*0.4)] sm:[--logo:145px] lg:[--logo:170px]"
        >
          {SPONSORS.map((sponsor) => (
            <Image
              key={sponsor.name}
              src={sponsor.src}
              alt={sponsor.name}
              width={sponsor.width}
              height={sponsor.height}
              style={{ width: `calc(var(--logo) * ${sponsor.factor})` }}
              className="h-auto max-w-full"
              priority={variant === "landing"}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
