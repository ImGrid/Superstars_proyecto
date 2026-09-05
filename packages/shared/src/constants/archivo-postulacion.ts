// Configuracion de los archivos que sube el postulante.
// Vive aqui, y no suelto en cada plantilla, porque el campo de video de las dos
// categorias quedo distinto entre si (una lo tenia y la otra no) y el limite de
// tamano del formulario prometia mas de lo que el servidor aceptaba.

// Techo global de una subida de postulacion, en MB. Es el limite duro que
// aplican el servidor y nginx; un campo del formulario puede pedir menos que
// esto, nunca mas.
export const ARCHIVO_POSTULACION_MAX_MB = 100;

export const ARCHIVO_POSTULACION_MAX_BYTES =
  ARCHIVO_POSTULACION_MAX_MB * 1024 * 1024;

// Formatos del campo "video o presentacion" de la empresa, compartidos por las
// dos categorias. Los de video se pueden ver dentro del sistema; el pdf y el
// pptx solo se descargan.
export const VIDEO_PRESENTACION_FORMATOS = [
  '.mp4',
  '.webm',
  '.mov',
  '.pdf',
  '.pptx',
];

// Extensiones que el navegador puede reproducir en pantalla. El resto de
// formatos permitidos se ofrecen solo para descargar.
export const VIDEO_FORMATOS_REPRODUCIBLES = ['.mp4', '.webm', '.mov'];

// Tamano maximo del campo de video o presentacion, en MB.
export const VIDEO_PRESENTACION_MAX_MB = ARCHIVO_POSTULACION_MAX_MB;
