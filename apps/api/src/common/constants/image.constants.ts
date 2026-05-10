// Configuracion compartida para uploads de imagenes (publicacion, historia-exito, convocatoria).
// Mantener centralizado evita drift entre modulos cuando cambian limites o tipos permitidos.

export const IMAGE_CONFIG: {
  maxSizeBytes: number;
  allowedMimeTypes: readonly string[];
  mimeMap: Record<string, string>;
} = {
  // Tamano maximo: 5 MB
  maxSizeBytes: 5 * 1024 * 1024,
  // Tipos MIME aceptados (formatos web modernos)
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  // Mapeo de extension a tipo MIME para servir la imagen con el header correcto
  mimeMap: {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  },
};

// Headers HTTP para servir imagenes publicas con cache de 24 horas
export const IMAGE_PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=86400',
  'Cross-Origin-Resource-Policy': 'cross-origin',
} as const;

// Mensajes de error en espanol (para mostrar al usuario final)
export const IMAGE_ERROR_MESSAGES = {
  invalidMime: 'El tipo de imagen no es válido. Solo se permiten archivos JPEG, PNG o WebP.',
  exceedsMaxSize: `La imagen no puede superar los ${IMAGE_CONFIG.maxSizeBytes / (1024 * 1024)} MB.`,
  fileMissing: 'No se recibió ninguna imagen.',
} as const;

// Helper: resuelve el tipo MIME desde una extension de archivo (.jpg, .png, etc.)
// Retorna application/octet-stream si la extension no esta mapeada.
export function resolveMimeFromExt(ext: string): string {
  return IMAGE_CONFIG.mimeMap[ext.toLowerCase()] ?? 'application/octet-stream';
}
