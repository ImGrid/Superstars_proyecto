"use client";

import { usePathname } from "next/navigation";
import { SponsorsStrip } from "@/components/public/sponsors-strip";

// La franja de aliados se repite al pie en todas las paginas publicas.
// En la portada no se muestra aqui porque ya aparece arriba, debajo del hero.
export function SponsorsStripFooter() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  return <SponsorsStrip variant="footer" />;
}
