import Image from "next/image";

// Logos oficiales de las organizaciones aliadas (PNG sin fondo, version blanca
// para fondo navy). Orden pedido por el cliente: Fundes, Ayuda en Accion,
// MariaMarina, Oxfam.
const SPONSORS = [
  {
    name: "FUNDES Bolivia",
    src: "/images/sponsors/fundes-blanco.png",
    width: 500,
    height: 96,
  },
  {
    name: "Ayuda en Acción",
    src: "/images/sponsors/ayuda-blanco.png",
    width: 500,
    height: 156,
  },
  {
    name: "MaríaMarina Foundation",
    src: "/images/sponsors/mariamarina-blanco.png",
    width: 500,
    height: 106,
  },
  {
    name: "OXFAM",
    src: "/images/sponsors/oxfam.png",
    width: 500,
    height: 194,
  },
] as const;

type SponsorsStripProps = {
  // "landing" = banda independiente con padding amplio
  // "footer" = banda integrada en footer con padding menor
  variant?: "landing" | "footer";
  className?: string;
};

// Banda de organizaciones aliadas sobre navy oficial. Los logos son PNG sin
// fondo (version blanca), asi que ya no hay que casar el color con ningun JPEG.
export function SponsorsStrip({ variant = "landing", className = "" }: SponsorsStripProps) {
  const paddingY = variant === "landing" ? "py-12 sm:py-14" : "py-8";
  const labelColor = variant === "landing" ? "text-primary-200" : "text-primary-300";

  return (
    <section className={`bg-primary-700 ${paddingY} ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className={`mb-6 text-center text-xs font-semibold tracking-[0.2em] uppercase ${labelColor}`}>
          En alianza con
        </p>
        {/* cada logo se limita por caja (alto Y ancho) con object-contain: asi los
            wordmarks anchos (FUNDES) no dominan sobre los que llevan icono (OXFAM)
            y el conjunto queda en armonia */}
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-7 sm:gap-x-14">
          {SPONSORS.map((sponsor) => (
            <div
              key={sponsor.name}
              className="flex h-11 w-[150px] items-center justify-center sm:h-12 sm:w-[170px]"
            >
              <Image
                src={sponsor.src}
                alt={sponsor.name}
                width={sponsor.width}
                height={sponsor.height}
                className="max-h-full w-auto max-w-full object-contain"
                priority={variant === "landing"}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
