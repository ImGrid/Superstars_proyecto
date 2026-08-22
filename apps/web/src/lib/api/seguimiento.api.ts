import { apiClient, apiFileClient } from "./client";
import type {
  SeguimientoResumen,
  SeguimientoConvocatoriaListItem,
  SeguimientoConvocatoriaDetalle,
  SeguimientoCategoria,
  SeguimientoFormulario,
  SeguimientoRubrica,
  SeguimientoDocumento,
  SeguimientoPostulacionListItem,
  SeguimientoPostulacionDetalle,
  SeguimientoRankingItem,
} from "@superstars/shared";

// Capa de datos del portal de seguimiento (rol observador / financiador).
//
// Todas las funciones pegan a /seguimiento/... y NADA mas. NO se reusan las
// funciones de convocatoria.api / categoria.api / etc: esas apuntan a los
// endpoints de admin, que al observador le responden 403. Este es el unico
// camino que el backend le abre.
//
// El listado de convocatorias devuelve un array plano (no paginado): el
// programa maneja una convocatoria por año, no hace falta paginar.

const base = "/seguimiento";
const conv = (convocatoriaId: number) => `${base}/convocatorias/${convocatoriaId}`;
const cat = (convocatoriaId: number, categoriaId: number) =>
  `${conv(convocatoriaId)}/categorias/${categoriaId}`;

// --- Resumen general ---

export function getSeguimientoResumen() {
  return apiClient
    .get<SeguimientoResumen>(`${base}/resumen`)
    .then((r) => r.data);
}

// --- Convocatorias ---

export function listSeguimientoConvocatorias() {
  return apiClient
    .get<SeguimientoConvocatoriaListItem[]>(`${base}/convocatorias`)
    .then((r) => r.data);
}

export function getSeguimientoConvocatoria(convocatoriaId: number) {
  return apiClient
    .get<SeguimientoConvocatoriaDetalle>(conv(convocatoriaId))
    .then((r) => r.data);
}

// --- Categorias ---

export function listSeguimientoCategorias(convocatoriaId: number) {
  return apiClient
    .get<SeguimientoCategoria[]>(`${conv(convocatoriaId)}/categorias`)
    .then((r) => r.data);
}

// --- Formulario y rubrica de una categoria ---

export function getSeguimientoFormulario(convocatoriaId: number, categoriaId: number) {
  return apiClient
    .get<SeguimientoFormulario>(`${cat(convocatoriaId, categoriaId)}/formulario`)
    .then((r) => r.data);
}

export function getSeguimientoRubrica(convocatoriaId: number, categoriaId: number) {
  return apiClient
    .get<SeguimientoRubrica>(`${cat(convocatoriaId, categoriaId)}/rubrica`)
    .then((r) => r.data);
}

// --- Documentos de la convocatoria ---

export function listSeguimientoDocumentos(convocatoriaId: number, categoriaId: number) {
  return apiClient
    .get<SeguimientoDocumento[]>(`${cat(convocatoriaId, categoriaId)}/documentos`)
    .then((r) => r.data);
}

// Descarga (retorna blob). La UI lo convierte en archivo con un enlace temporal.
export function downloadSeguimientoDocumento(
  convocatoriaId: number,
  categoriaId: number,
  documentoId: number,
) {
  return apiFileClient
    .get(`${cat(convocatoriaId, categoriaId)}/documentos/${documentoId}/descargar`, {
      responseType: "blob",
    })
    .then((r) => r.data as Blob);
}

// --- Postulaciones ---

// categoriaId opcional: si se pasa, filtra el listado por categoria.
export function listSeguimientoPostulaciones(convocatoriaId: number, categoriaId?: number) {
  return apiClient
    .get<SeguimientoPostulacionListItem[]>(`${conv(convocatoriaId)}/postulaciones`, {
      params: categoriaId ? { categoriaId } : undefined,
    })
    .then((r) => r.data);
}

export function getSeguimientoPostulacion(convocatoriaId: number, postulacionId: number) {
  return apiClient
    .get<SeguimientoPostulacionDetalle>(`${conv(convocatoriaId)}/postulaciones/${postulacionId}`)
    .then((r) => r.data);
}

// --- Ranking de una categoria ---

export function getSeguimientoRanking(convocatoriaId: number, categoriaId: number) {
  return apiClient
    .get<SeguimientoRankingItem[]>(`${cat(convocatoriaId, categoriaId)}/ranking`)
    .then((r) => r.data);
}
