import Image from "next/image";
import { cn } from "@/lib/utils";
import { EstrellaSuperStar } from "./estrella-superstar";

// Color dorado de las cruces del separador original (SaltoSeccionSuperStar.png).
const DORADO = "#FEC62B";

// Salto de seccion de la marca. Reconstruye el PNG del disenador (1080x86, que
// venia con fondo blanco opaco y ancho fijo) con dos lineas, dos cruces y el
// cohete: se adapta a cualquier ancho y funciona sobre cualquier fondo.
// La linea usa el mismo navy del original (#0C2140 = --color-fundes).
export function SectionDivider({
  variant = "oscuro",
  className,
}: {
  // "claro" para fondos oscuros (el CTA navy)
  variant?: "oscuro" | "claro";
  className?: string;
}) {
  const claro = variant === "claro";

  return (
    <div className={cn("px-4 py-2 sm:px-6 lg:px-8", className)}>
      <div
        role="separator"
        aria-hidden="true"
        className={cn(
          "mx-auto flex max-w-3xl items-center gap-3 sm:gap-4",
          claro ? "text-white" : "text-fundes",
        )}
      >
        <span
          className={cn(
            "h-0 flex-1 border-t-2 border-current",
            claro ? "opacity-50" : "opacity-90",
          )}
        />
        <EstrellaSuperStar tam={12} className="shrink-0" style={{ color: DORADO }} />
        <Image
          src="/images/cohete-hd.png"
          alt=""
          width={900}
          height={913}
          className="h-auto w-10 shrink-0 sm:w-11"
        />
        <EstrellaSuperStar tam={12} className="shrink-0" style={{ color: DORADO }} />
        <span
          className={cn(
            "h-0 flex-1 border-t-2 border-current",
            claro ? "opacity-50" : "opacity-90",
          )}
        />
      </div>
    </div>
  );
}
