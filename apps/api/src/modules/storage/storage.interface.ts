// Interfaz abstracta de almacenamiento de archivos
// MVP: LocalStorageService. Futuro: S3StorageService
export interface StorageService {
  upload(key: string, buffer: Buffer): Promise<void>;
  // Mueve a su sitio un archivo que ya esta en disco (lo deja multer al subir).
  // Se usa para los archivos grandes: evita cargar el contenido en memoria.
  uploadFromPath(key: string, sourcePath: string): Promise<void>;
  download(key: string): Promise<Buffer>;
  // Tamano real en disco. Hace falta para responder a peticiones por rango
  // (el navegador pide trozos para poder adelantar el video).
  stat(key: string): Promise<{ size: number }>;
  // Abre el archivo, o un trozo, para enviarlo sin cargarlo entero en memoria.
  // `fin` es inclusivo, igual que en la cabecera Range de HTTP.
  abrirFlujo(
    key: string,
    rango?: { inicio: number; fin: number },
  ): NodeJS.ReadableStream;
  delete(key: string): Promise<void>;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
