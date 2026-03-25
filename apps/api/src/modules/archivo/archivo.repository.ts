import { Injectable, Inject } from '@nestjs/common';
import { eq, and, count } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import { archivoPostulacion } from '@superstars/db';

@Injectable()
export class ArchivoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findById(id: number) {
    const rows = await this.db
      .select()
      .from(archivoPostulacion)
      .where(eq(archivoPostulacion.id, id));
    return rows[0] ?? null;
  }

  async findAllByPostulacionId(postulacionId: number) {
    return this.db
      .select()
      .from(archivoPostulacion)
      .where(eq(archivoPostulacion.postulacionId, postulacionId));
  }

  async findAllByPostulacionAndField(postulacionId: number, fieldId: string) {
    return this.db
      .select()
      .from(archivoPostulacion)
      .where(and(
        eq(archivoPostulacion.postulacionId, postulacionId),
        eq(archivoPostulacion.fieldId, fieldId),
      ));
  }

  async countByPostulacionAndField(postulacionId: number, fieldId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(archivoPostulacion)
      .where(and(
        eq(archivoPostulacion.postulacionId, postulacionId),
        eq(archivoPostulacion.fieldId, fieldId),
      ));
    return Number(result.count);
  }

  async create(data: {
    postulacionId: number;
    fieldId: string;
    nombreOriginal: string;
    storageKey: string;
    mimeType: string;
    tamanoBytes: number;
  }) {
    const [created] = await this.db
      .insert(archivoPostulacion)
      .values(data)
      .returning();
    return created;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(archivoPostulacion)
      .where(eq(archivoPostulacion.id, id))
      .returning({ id: archivoPostulacion.id });
    return result.length > 0;
  }
}
