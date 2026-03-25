import { apiClient } from "./client";
import type { UpdateDocumentoDto, DocumentoResponse } from "@superstars/shared";

// Subir documento (multipart/form-data)
export function uploadDocumento(
  concursoId: number,
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
      `/concursos/${concursoId}/documentos`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    )
    .then((r) => r.data);
}

// Listar documentos del concurso
export function listDocumentos(concursoId: number) {
  return apiClient
    .get<DocumentoResponse[]>(`/concursos/${concursoId}/documentos`)
    .then((r) => r.data);
}

// Descargar documento (retorna blob)
export function downloadDocumento(concursoId: number, documentoId: number) {
  return apiClient
    .get(`/concursos/${concursoId}/documentos/${documentoId}/download`, {
      responseType: "blob",
    })
    .then((r) => r.data as Blob);
}

// Actualizar metadatos del documento
export function updateDocumento(
  concursoId: number,
  documentoId: number,
  dto: UpdateDocumentoDto,
) {
  return apiClient
    .put<DocumentoResponse>(
      `/concursos/${concursoId}/documentos/${documentoId}`,
      dto,
    )
    .then((r) => r.data);
}

// Eliminar documento
export function deleteDocumento(concursoId: number, documentoId: number) {
  return apiClient.delete(
    `/concursos/${concursoId}/documentos/${documentoId}`,
  );
}
