import { Injectable, Inject } from '@nestjs/common';
import { eq, asc } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import { documentoConcurso } from '@superstars/db';

@Injectable()
export class DocumentoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findById(id: number) {
    const rows = await this.db
      .select()
      .from(documentoConcurso)
      .where(eq(documentoConcurso.id, id));
    return rows[0] ?? null;
  }

  async findAllByConcursoId(concursoId: number) {
    return this.db
      .select()
      .from(documentoConcurso)
      .where(eq(documentoConcurso.concursoId, concursoId))
      .orderBy(asc(documentoConcurso.orden), asc(documentoConcurso.createdAt));
  }

  async create(data: {
    concursoId: number;
    nombre: string;
    storageKey: string;
    nombreOriginal: string;
    mimeType: string;
    tamanoBytes: number;
    orden: number;
  }) {
    const [created] = await this.db
      .insert(documentoConcurso)
      .values(data)
      .returning();
    return created;
  }

  async update(id: number, data: Partial<{ nombre: string; orden: number }>) {
    const [updated] = await this.db
      .update(documentoConcurso)
      .set(data)
      .where(eq(documentoConcurso.id, id))
      .returning();
    return updated ?? null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(documentoConcurso)
      .where(eq(documentoConcurso.id, id))
      .returning({ id: documentoConcurso.id });
    return result.length > 0;
  }
}
