// Interfaz abstracta de almacenamiento de archivos
// MVP: LocalStorageService. Futuro: S3StorageService
export interface StorageService {
  upload(key: string, buffer: Buffer): Promise<void>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
