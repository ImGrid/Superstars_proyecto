import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import { formularioDinamico } from '@superstars/db';

// Tipo que espera Drizzle para el JSONB schema_definition
type SchemaDefinitionJsonb = { secciones: Array<Record<string, unknown>> };

@Injectable()
export class FormularioRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findByConcursoId(concursoId: number) {
    const rows = await this.db
      .select()
      .from(formularioDinamico)
      .where(eq(formularioDinamico.concursoId, concursoId));
    return rows[0] ?? null;
  }

  async create(data: {
    concursoId: number;
    nombre: string;
    descripcion?: string;
    schemaDefinition: SchemaDefinitionJsonb;
  }) {
    const [created] = await this.db
      .insert(formularioDinamico)
      .values(data)
      .returning();
    return created;
  }

  async update(
    concursoId: number,
    data: Partial<{ nombre: string; descripcion: string; schemaDefinition: SchemaDefinitionJsonb }>,
    expectedVersion: number,
  ) {
    // Optimistic locking: solo actualiza si la version coincide
    const [updated] = await this.db
      .update(formularioDinamico)
      .set({ ...data, version: sql`version + 1` } as any)
      .where(and(
        eq(formularioDinamico.concursoId, concursoId),
        eq(formularioDinamico.version, expectedVersion),
      ))
      .returning();
    return updated ?? null;
  }

  async delete(concursoId: number): Promise<boolean> {
    const result = await this.db
      .delete(formularioDinamico)
      .where(eq(formularioDinamico.concursoId, concursoId))
      .returning({ id: formularioDinamico.id });
    return result.length > 0;
  }
}
