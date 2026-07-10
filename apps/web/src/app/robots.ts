import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // el portal necesita sesion y el API no es contenido para buscadores
        disallow: ["/dashboard/", "/api/"],
      },
    ],
    // /auth NO se bloquea aqui a proposito: se marca con noindex en su layout.
    // Una URL bloqueada por robots.txt nunca llega a leer la etiqueta noindex.
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
