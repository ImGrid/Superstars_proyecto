import Image from "next/image";

// Logos oficiales de las organizaciones patrocinadoras
const SPONSORS = [
  {
    name: "OXFAM",
    src: "/images/sponsors/logo-oxfam.png",
    width: 900,
    height: 320,
  },
  {
    name: "FUNDES Bolivia",
    src: "/images/sponsors/fundes_bolivia.jpeg",
    width: 1022,
    height: 404,
  },
  {
    name: "Maria Marina Foundation",
    src: "/images/sponsors/MariaMarina-logo.png",
    width: 1920,
    height: 470,
  },
] as const;

type SponsorsStripProps = {
  // "landing" = banda independiente con padding amplio
  // "footer" = banda integrada en footer con padding menor
  variant?: "landing" | "footer";
  className?: string;
};

// Banda de sponsors con fondo navy exacto al del logo FUNDES (#0C2140)
// para que el JPEG de FUNDES se funda sin costura con el fondo
export function SponsorsStrip({ variant = "landing", className = "" }: SponsorsStripProps) {
  const paddingY = variant === "landing" ? "py-12 sm:py-14" : "py-8";
  const labelColor = variant === "landing" ? "text-primary-200" : "text-primary-300";

  return (
    <section className={`bg-fundes ${paddingY} ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className={`mb-6 text-center text-xs font-semibold tracking-[0.2em] uppercase ${labelColor}`}>
          Con el apoyo de
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 sm:gap-x-16">
          {SPONSORS.map((sponsor) => (
            <div
              key={sponsor.name}
              className="relative flex h-14 items-center sm:h-16"
            >
              <Image
                src={sponsor.src}
                alt={sponsor.name}
                width={sponsor.width}
                height={sponsor.height}
                className="h-full w-auto object-contain"
                priority={variant === "landing"}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
