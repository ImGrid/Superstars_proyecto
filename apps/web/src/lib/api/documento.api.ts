import { apiClient } from "./client";
import type { UpdateDocumentoDto, DocumentoResponse } from "@superstars/shared";

// Documentos por categoria (ruta anidada). El `proposito` (informativo/plantilla/jurado)
// define la audiencia; el backend filtra el acceso segun rol.
const base = (convocatoriaId: number, categoriaId: number) =>
  `/convocatorias/${convocatoriaId}/categorias/${categoriaId}/documentos`;

// Subir documento (multipart/form-data)
export function uploadDocumento(
  convocatoriaId: number,
  categoriaId: number,
  file: File,
  nombre: string,
  orden?: number,
  proposito?: string,
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("nombre", nombre);
  if (orden !== undefined) {
    formData.append("orden", String(orden));
  }
  if (proposito !== undefined) {
    formData.append("proposito", proposito);
  }

  return apiClient
    .post<DocumentoResponse>(base(convocatoriaId, categoriaId), formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
}

// Listar documentos de la categoria (el backend filtra por audiencia segun rol)
export function listDocumentos(convocatoriaId: number, categoriaId: number) {
  return apiClient
    .get<DocumentoResponse[]>(base(convocatoriaId, categoriaId))
    .then((r) => r.data);
}

// Descargar documento (retorna blob)
export function downloadDocumento(
  convocatoriaId: number,
  categoriaId: number,
  documentoId: number,
) {
  return apiClient
    .get(`${base(convocatoriaId, categoriaId)}/${documentoId}/download`, {
      responseType: "blob",
    })
    .then((r) => r.data as Blob);
}

// Actualizar metadatos del documento
export function updateDocumento(
  convocatoriaId: number,
  categoriaId: number,
  documentoId: number,
  dto: UpdateDocumentoDto,
) {
  return apiClient
    .put<DocumentoResponse>(
      `${base(convocatoriaId, categoriaId)}/${documentoId}`,
      dto,
    )
    .then((r) => r.data);
}

// Eliminar documento
export function deleteDocumento(
  convocatoriaId: number,
  categoriaId: number,
  documentoId: number,
) {
  return apiClient.delete(
    `${base(convocatoriaId, categoriaId)}/${documentoId}`,
  );
}
