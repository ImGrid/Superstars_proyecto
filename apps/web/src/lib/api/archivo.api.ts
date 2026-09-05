import { apiClient, apiFileClient, porcentajeSubida } from "./client";
import type { ArchivoResponse } from "@superstars/shared";

// Subir archivo de postulacion (multipart/form-data)
// onProgress recibe el porcentaje ya enviado, para poder mostrar una barra
export function uploadArchivo(
  convocatoriaId: number,
  postulacionId: number,
  fieldId: string,
  file: File,
  onProgress?: (porcentaje: number) => void,
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fieldId", fieldId);

  return apiFileClient
    .post<ArchivoResponse>(
      `/convocatorias/${convocatoriaId}/postulaciones/${postulacionId}/archivos`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: onProgress
          ? (e) => onProgress(porcentajeSubida(e))
          : undefined,
      },
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

// URL para ver el archivo dentro del sistema (el reproductor de video la usa
// como origen). No pasa por axios: la pide el propio elemento <video>, que
// necesita ir por partes para poder adelantar. La sesion viaja en la cookie.
export function verArchivoUrl(
  convocatoriaId: number,
  postulacionId: number,
  archivoId: number,
) {
  return `${process.env.NEXT_PUBLIC_API_URL}/convocatorias/${convocatoriaId}/postulaciones/${postulacionId}/archivos/${archivoId}/ver`;
}

// Descargar archivo (retorna blob)
export function downloadArchivo(
  convocatoriaId: number,
  postulacionId: number,
  archivoId: number,
) {
  return apiFileClient
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
