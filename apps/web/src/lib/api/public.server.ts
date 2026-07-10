import "server-only";
import type {
  FaqResponse,
  PaginatedResponse,
  ListPublicConvocatoriasQueryDto,
  ListPublicPublicacionesQueryDto,
  PublicConvocatoriaResponse,
  PublicConvocatoriaDetailResponse,
  PublicPublicacionListItem,
  PublicPublicacionResponse,
  PublicResultadosResponse,
  CategoriaPublicacionResponse,
  PublicHistoriaExitoItem,
} from "@superstars/shared";

// Cliente HTTP para las paginas publicas, pensado para Server Components.
//
// Por que no reusar public.api.ts: usa el axios del navegador (withCredentials,
// interceptor de refresh que redirige con window). No existe window en el servidor.
//
// Por que no reusar server-client.ts: hace await cookies(), lo que fuerza a Next a
// renderizar la pagina de forma dinamica en cada request. Las paginas publicas no
// tienen usuario, asi que aqui NO se envian cookies y la respuesta se puede cachear.

const API_URL = process.env.API_URL;

// tiempos de revalidacion en segundos
export const REVALIDATE = {
  // listados y detalles: cambian poco
  convocatorias: 3600,
  publicaciones: 3600,
  resultados: 3600,
  faq: 3600,
  // landing: queremos verla fresca mas seguido
  landing: 300,
} as const;

// el backend rechaza limit > 50 (validacion Zod) — verificado en runtime
const MAX_LIMIT = 50;

class PublicApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PublicApiError";
  }
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function publicFetch<T>(
  path: string,
  revalidate: number,
  params?: Record<string, unknown>,
): Promise<T> {
  if (!API_URL) {
    throw new PublicApiError("Falta la variable de entorno API_URL", 500);
  }

  const response = await fetch(buildUrl(path, params), {
    headers: { Accept: "application/json" },
    // sin esto Next 16 no cachea nada y golpea el backend en cada visita
    next: { revalidate },
  });

  if (!response.ok) {
    throw new PublicApiError(
      `El API respondio ${response.status} en ${path}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

// variante para paginas de detalle: devuelve null si el recurso no existe,
// para que la pagina pueda llamar a notFound() y responder un 404 real
async function publicFetchOrNull<T>(
  path: string,
  revalidate: number,
): Promise<T | null> {
  try {
    return await publicFetch<T>(path, revalidate);
  } catch (error) {
    if (error instanceof PublicApiError && error.status === 404) return null;
    throw error;
  }
}

// --- Convocatorias ---

export function getConvocatorias(
  params?: Partial<ListPublicConvocatoriasQueryDto>,
) {
  return publicFetch<PaginatedResponse<PublicConvocatoriaResponse>>(
    "/public/convocatorias",
    REVALIDATE.convocatorias,
    params,
  );
}

export function getConvocatoria(id: number) {
  return publicFetchOrNull<PublicConvocatoriaDetailResponse>(
    `/public/convocatorias/${id}`,
    REVALIDATE.convocatorias,
  );
}

export function getResultados(convocatoriaId: number) {
  return publicFetchOrNull<PublicResultadosResponse>(
    `/public/convocatorias/${convocatoriaId}/resultados`,
    REVALIDATE.resultados,
  );
}

// --- Publicaciones ---

export function getPublicaciones(
  params?: Partial<ListPublicPublicacionesQueryDto>,
) {
  return publicFetch<PaginatedResponse<PublicPublicacionListItem>>(
    "/public/publicaciones",
    REVALIDATE.publicaciones,
    params,
  );
}

export function getPublicacion(slug: string) {
  return publicFetchOrNull<PublicPublicacionResponse>(
    `/public/publicaciones/${slug}`,
    REVALIDATE.publicaciones,
  );
}

export function getCategoriasPublicacion() {
  return publicFetch<CategoriaPublicacionResponse[]>(
    "/public/publicaciones/categorias",
    REVALIDATE.publicaciones,
  );
}

// --- FAQ ---

export function getFaqPublico() {
  return publicFetch<FaqResponse[]>("/public/faq", REVALIDATE.faq);
}

export function getFaqPorConvocatoria(convocatoriaId: number) {
  return publicFetch<FaqResponse[]>(
    `/public/faq/convocatoria/${convocatoriaId}`,
    REVALIDATE.faq,
  );
}

// --- Historias de exito ---

export function getHistoriasExito() {
  return publicFetch<PublicHistoriaExitoItem[]>(
    "/public/historias-exito",
    REVALIDATE.landing,
  );
}

// --- Helpers para el sitemap ---

// recorre todas las paginas de un listado paginado
async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<PaginatedResponse<T>>,
): Promise<T[]> {
  const first = await fetchPage(1);
  const items = [...first.data];

  for (let page = 2; page <= first.totalPages; page++) {
    const next = await fetchPage(page);
    items.push(...next.data);
  }

  return items;
}

// OJO: /public/convocatorias sin filtro devuelve SOLO las activas.
// Para el sitemap hacen falta tambien las anteriores (cerradas y finalizadas).
export async function getTodasLasConvocatoriasPublicas(): Promise<
  PublicConvocatoriaResponse[]
> {
  const [activas, anteriores] = await Promise.all([
    fetchAllPages((page) =>
      getConvocatorias({ page, limit: MAX_LIMIT, tipo: "activas" }),
    ),
    fetchAllPages((page) =>
      getConvocatorias({ page, limit: MAX_LIMIT, tipo: "anteriores" }),
    ),
  ]);

  return [...activas, ...anteriores];
}

export function getTodasLasPublicacionesPublicadas(): Promise<
  PublicPublicacionListItem[]
> {
  return fetchAllPages((page) => getPublicaciones({ page, limit: MAX_LIMIT }));
}
