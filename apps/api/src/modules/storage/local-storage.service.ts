import { Injectable } from '@nestjs/common';
import { mkdir, writeFile, readFile, unlink, rename, copyFile, stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { join, dirname } from 'path';
import type { StorageService } from './storage.interface';

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly basePath = join(process.cwd(), 'uploads');

  async upload(key: string, buffer: Buffer): Promise<void> {
    const filePath = join(this.basePath, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
  }

  // Mueve el archivo que multer dejo en la carpeta temporal. Con rename no se
  // copia nada, sin importar si pesa 100 MB. Si el temporal quedara en otro
  // disco (EXDEV), se cae a copiar y borrar.
  async uploadFromPath(key: string, sourcePath: string): Promise<void> {
    const filePath = join(this.basePath, key);
    await mkdir(dirname(filePath), { recursive: true });
    try {
      await rename(sourcePath, filePath);
    } catch (err: any) {
      if (err?.code !== 'EXDEV') throw err;
      await copyFile(sourcePath, filePath);
      await unlink(sourcePath);
    }
  }

  async download(key: string): Promise<Buffer> {
    const filePath = join(this.basePath, key);
    return readFile(filePath);
  }

  async stat(key: string): Promise<{ size: number }> {
    const filePath = join(this.basePath, key);
    const info = await stat(filePath);
    return { size: info.size };
  }

  // El rango es inclusivo en HTTP y createReadStream tambien lo trata asi
  abrirFlujo(
    key: string,
    rango?: { inicio: number; fin: number },
  ): NodeJS.ReadableStream {
    const filePath = join(this.basePath, key);
    return rango
      ? createReadStream(filePath, { start: rango.inicio, end: rango.fin })
      : createReadStream(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.basePath, key);
    try {
      await unlink(filePath);
    } catch (err: any) {
      // Ignorar si el archivo ya no existe
      if (err.code !== 'ENOENT') throw err;
    }
  }
}
