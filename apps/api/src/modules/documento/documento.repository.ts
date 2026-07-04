import { Injectable, Inject } from '@nestjs/common';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import { documentoCategoria } from '@superstars/db';
import type { PropositoDocumento } from '@superstars/shared';

@Injectable()
export class DocumentoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findById(id: number) {
    const rows = await this.db
      .select()
      .from(documentoCategoria)
      .where(eq(documentoCategoria.id, id));
    return rows[0] ?? null;
  }

  // lista los documentos de una categoria; si se pasan propositos, filtra por audiencia
  async findAllByCategoriaId(categoriaId: number, propositos?: PropositoDocumento[]) {
    const conds = [eq(documentoCategoria.categoriaId, categoriaId)];
    if (propositos && propositos.length > 0) {
      conds.push(inArray(documentoCategoria.proposito, propositos));
    }
    return this.db
      .select()
      .from(documentoCategoria)
      .where(and(...conds))
      .orderBy(asc(documentoCategoria.orden), asc(documentoCategoria.createdAt));
  }

  async create(data: {
    categoriaId: number;
    nombre: string;
    storageKey: string;
    nombreOriginal: string;
    mimeType: string;
    tamanoBytes: number;
    orden: number;
    proposito: PropositoDocumento;
  }) {
    const [created] = await this.db
      .insert(documentoCategoria)
      .values(data)
      .returning();
    return created;
  }

  async update(id: number, data: Partial<{ nombre: string; orden: number; proposito: PropositoDocumento }>) {
    const [updated] = await this.db
      .update(documentoCategoria)
      .set(data)
      .where(eq(documentoCategoria.id, id))
      .returning();
    return updated ?? null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(documentoCategoria)
      .where(eq(documentoCategoria.id, id))
      .returning({ id: documentoCategoria.id });
    return result.length > 0;
  }
}
