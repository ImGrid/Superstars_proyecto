import { apiClient } from "./client";
import type { ArchivoResponse } from "@superstars/shared";

// Subir archivo de postulacion (multipart/form-data)
export function uploadArchivo(
  concursoId: number,
  postulacionId: number,
  fieldId: string,
  file: File,
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fieldId", fieldId);

  return apiClient
    .post<ArchivoResponse>(
      `/concursos/${concursoId}/postulaciones/${postulacionId}/archivos`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    )
    .then((r) => r.data);
}

// Listar archivos de una postulacion
export function listArchivos(concursoId: number, postulacionId: number) {
  return apiClient
    .get<ArchivoResponse[]>(
      `/concursos/${concursoId}/postulaciones/${postulacionId}/archivos`,
    )
    .then((r) => r.data);
}

// Descargar archivo (retorna blob)
export function downloadArchivo(
  concursoId: number,
  postulacionId: number,
  archivoId: number,
) {
  return apiClient
    .get(
      `/concursos/${concursoId}/postulaciones/${postulacionId}/archivos/${archivoId}/download`,
      { responseType: "blob" },
    )
    .then((r) => r.data as Blob);
}

// Eliminar archivo
export function deleteArchivo(
  concursoId: number,
  postulacionId: number,
  archivoId: number,
) {
  return apiClient.delete(
    `/concursos/${concursoId}/postulaciones/${postulacionId}/archivos/${archivoId}`,
  );
}
