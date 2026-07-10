// URL canonica del sitio, sin barra final
// se usa en metadataBase, robots.ts y sitemap.ts
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

// construye una URL absoluta a partir de una ruta interna
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
