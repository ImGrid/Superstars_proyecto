import { Injectable } from '@nestjs/common';
import { mkdir, writeFile, readFile, unlink } from 'fs/promises';
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

  async download(key: string): Promise<Buffer> {
    const filePath = join(this.basePath, key);
    return readFile(filePath);
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
