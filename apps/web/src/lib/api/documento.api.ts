import { apiClient } from "./client";
import type { UpdateDocumentoDto, DocumentoResponse } from "@superstars/shared";

// Subir documento (multipart/form-data)
export function uploadDocumento(
  convocatoriaId: number,
  file: File,
  nombre: string,
  orden?: number,
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("nombre", nombre);
  if (orden !== undefined) {
    formData.append("orden", String(orden));
  }

  return apiClient
    .post<DocumentoResponse>(
      `/convocatorias/${convocatoriaId}/documentos`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    )
    .then((r) => r.data);
}

// Listar documentos de la convocatoria
export function listDocumentos(convocatoriaId: number) {
  return apiClient
    .get<DocumentoResponse[]>(`/convocatorias/${convocatoriaId}/documentos`)
    .then((r) => r.data);
}

// Descargar documento (retorna blob)
export function downloadDocumento(convocatoriaId: number, documentoId: number) {
  return apiClient
    .get(`/convocatorias/${convocatoriaId}/documentos/${documentoId}/download`, {
      responseType: "blob",
    })
    .then((r) => r.data as Blob);
}

// Actualizar metadatos del documento
export function updateDocumento(
  convocatoriaId: number,
  documentoId: number,
  dto: UpdateDocumentoDto,
) {
  return apiClient
    .put<DocumentoResponse>(
      `/convocatorias/${convocatoriaId}/documentos/${documentoId}`,
      dto,
    )
    .then((r) => r.data);
}

// Eliminar documento
export function deleteDocumento(convocatoriaId: number, documentoId: number) {
  return apiClient.delete(
    `/convocatorias/${convocatoriaId}/documentos/${documentoId}`,
  );
}
