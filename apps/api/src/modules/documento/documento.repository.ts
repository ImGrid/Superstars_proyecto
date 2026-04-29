import { Injectable, Inject } from '@nestjs/common';
import { eq, asc } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import { documentoConvocatoria } from '@superstars/db';

@Injectable()
export class DocumentoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findById(id: number) {
    const rows = await this.db
      .select()
      .from(documentoConvocatoria)
      .where(eq(documentoConvocatoria.id, id));
    return rows[0] ?? null;
  }

  async findAllByConvocatoriaId(convocatoriaId: number) {
    return this.db
      .select()
      .from(documentoConvocatoria)
      .where(eq(documentoConvocatoria.convocatoriaId, convocatoriaId))
      .orderBy(asc(documentoConvocatoria.orden), asc(documentoConvocatoria.createdAt));
  }

  async create(data: {
    convocatoriaId: number;
    nombre: string;
    storageKey: string;
    nombreOriginal: string;
    mimeType: string;
    tamanoBytes: number;
    orden: number;
  }) {
    const [created] = await this.db
      .insert(documentoConvocatoria)
      .values(data)
      .returning();
    return created;
  }

  async update(id: number, data: Partial<{ nombre: string; orden: number }>) {
    const [updated] = await this.db
      .update(documentoConvocatoria)
      .set(data)
      .where(eq(documentoConvocatoria.id, id))
      .returning();
    return updated ?? null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(documentoConvocatoria)
      .where(eq(documentoConvocatoria.id, id))
      .returning({ id: documentoConvocatoria.id });
    return result.length > 0;
  }
}
