import { apiClient } from "./client";
import type { ArchivoResponse } from "@superstars/shared";

// Subir archivo de postulacion (multipart/form-data)
export function uploadArchivo(
  convocatoriaId: number,
  postulacionId: number,
  fieldId: string,
  file: File,
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fieldId", fieldId);

  return apiClient
    .post<ArchivoResponse>(
      `/convocatorias/${convocatoriaId}/postulaciones/${postulacionId}/archivos`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    )
    .then((r) => r.data);
}

// Listar archivos de una postulacion
export function listArchivos(convocatoriaId: number, postulacionId: number) {
  return apiClient
    .get<ArchivoResponse[]>(
      `/convocatorias/${convocatoriaId}/postulaciones/${postulacionId}/archivos`,
    )
    .then((r) => r.data);
}

// Descargar archivo (retorna blob)
export function downloadArchivo(
  convocatoriaId: number,
  postulacionId: number,
  archivoId: number,
) {
  return apiClient
    .get(
      `/convocatorias/${convocatoriaId}/postulaciones/${postulacionId}/archivos/${archivoId}/download`,
      { responseType: "blob" },
    )
    .then((r) => r.data as Blob);
}

// Eliminar archivo
export function deleteArchivo(
  convocatoriaId: number,
  postulacionId: number,
  archivoId: number,
) {
  return apiClient.delete(
    `/convocatorias/${convocatoriaId}/postulaciones/${postulacionId}/archivos/${archivoId}`,
  );
}
