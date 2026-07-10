import type { MetadataRoute } from "next";
import {
  getTodasLasConvocatoriasPublicas,
  getTodasLasPublicacionesPublicadas,
} from "@/lib/api/public.server";
import { absoluteUrl } from "@/lib/site";

// se regenera cada hora
export const revalidate = 3600;

// paginas fijas del sitio publico
const RUTAS_ESTATICAS = [
  "/",
  "/convocatorias",
  "/noticias",
  "/resultados",
  "/faq",
  "/contacto",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ahora = new Date();

  const estaticas: MetadataRoute.Sitemap = RUTAS_ESTATICAS.map((ruta) => ({
    url: absoluteUrl(ruta),
    lastModified: ahora,
  }));

  // si el API no responde durante el build, el sitemap sale solo con las rutas
  // fijas en vez de romper la compilacion
  try {
    const [convocatorias, publicaciones] = await Promise.all([
      getTodasLasConvocatoriasPublicas(),
      getTodasLasPublicacionesPublicadas(),
    ]);

    const dinamicas: MetadataRoute.Sitemap = [
      ...convocatorias.map((c) => ({
        url: absoluteUrl(`/convocatorias/${c.id}`),
        lastModified: new Date(c.updatedAt),
      })),
      // el listado de publicaciones no expone updatedAt, solo fechaPublicacion
      ...publicaciones.map((p) => ({
        url: absoluteUrl(`/noticias/${p.slug}`),
        lastModified: new Date(p.fechaPublicacion),
      })),
    ];

    return [...estaticas, ...dinamicas];
  } catch (error) {
    console.error("[sitemap] no se pudo leer el API:", error);
    return estaticas;
  }
}
