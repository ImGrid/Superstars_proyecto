// Helpers compartidos de validacion de imagenes en el frontend.
// Mantienen los mismos limites que el backend (apps/api/src/common/constants/image.constants.ts).
// El backend valida nuevamente al recibir el archivo.

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_SIZE_MB = MAX_IMAGE_SIZE_BYTES / (1024 * 1024);

// Atributo accept para inputs file. Se reutiliza en todos los uploaders.
export const IMAGE_INPUT_ACCEPT = "image/jpeg,image/png,image/webp";

// Valida tipo MIME y tamano. Retorna mensaje de error en espanol o null si pasa.
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return "Solo se permiten imágenes JPEG, PNG o WebP.";
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `La imagen no debe superar los ${MAX_IMAGE_SIZE_MB} MB.`;
  }
  return null;
}

// Aviso visual cuando la proporcion de la imagen no es la ideal para banners horizontales.
// Solo informa al usuario, no impide subir.
export interface ImageDimensionWarning {
  level: "warning" | "danger";
  message: string;
}

export function getImageDimensionWarning(
  width: number,
  height: number,
): ImageDimensionWarning | null {
  if (height === 0) return null;
  const ratio = width / height;
  // Vertical: en un banner horizontal solo se ve la franja central
  if (ratio < 1.0) {
    return {
      level: "danger",
      message:
        "Tu imagen es vertical. En el listado público solo se mostrará la parte central y los lados quedarán recortados. Te recomendamos elegir una imagen más horizontal.",
    };
  }
  // Cuadrada o algo apaisada: se recortan los bordes superior e inferior
  if (ratio < 1.5) {
    return {
      level: "warning",
      message:
        "Tu imagen es bastante cuadrada. Pueden recortarse los bordes superior e inferior al mostrarse en el listado público.",
    };
  }
  return null;
}
