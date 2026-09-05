// Tipos de contenido para los archivos que sube el postulante.
//
// El tipo que multer deja en `file.mimetype` lo declara el navegador de quien
// sube, no se comprueba contra el contenido. Mientras todo se servia como
// descarga forzada daba igual, pero al mostrar el video dentro de la pagina un
// archivo HTML disfrazado de .mp4 y declarado como text/html se ejecutaria en
// el dominio del sistema. Por eso el tipo se decide aqui, a partir de la
// extension ya validada contra los tiposPermitidos del campo, y nunca a partir
// de lo que dijo el cliente.
//
// Cubre las extensiones que aceptan los formularios: video/presentacion del
// campo de la empresa y los documentos de respaldo.
export const ARCHIVO_MIME_MAP: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.pdf': 'application/pdf',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xlsx':
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
};

// Extensiones que el navegador puede reproducir dentro de la pagina.
// El resto solo se ofrecen para descargar.
export const EXTENSIONES_REPRODUCIBLES = ['.mp4', '.webm', '.mov'];

// Tipo de contenido seguro para una extension. Si no la conocemos devolvemos
// un tipo generico: el navegador la descarga en vez de intentar interpretarla.
export function mimeSeguroDesdeExtension(ext: string): string {
  return ARCHIVO_MIME_MAP[ext.toLowerCase()] ?? 'application/octet-stream';
}

// Si el archivo se puede ver dentro del sistema o solo descargar
export function esReproducible(ext: string): boolean {
  return EXTENSIONES_REPRODUCIBLES.includes(ext.toLowerCase());
}
