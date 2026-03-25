import { Injectable, Inject } from '@nestjs/common';
import { eq, and, or, ilike, count, desc } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import { usuario } from '@superstars/db';
import type { RolUsuario } from '@superstars/shared';

// Columnas que se retornan (EXCLUYE passwordHash)
const safeColumns = {
  id: usuario.id,
  email: usuario.email,
  rol: usuario.rol,
  nombre: usuario.nombre,
  activo: usuario.activo,
  createdAt: usuario.createdAt,
  updatedAt: usuario.updatedAt,
};

export interface FindAllParams {
  page: number;
  limit: number;
  rol?: RolUsuario;
  activo?: boolean;
  search?: string;
}

@Injectable()
export class UsuarioRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findById(id: number) {
    const rows = await this.db
      .select(safeColumns)
      .from(usuario)
      .where(eq(usuario.id, id));
    return rows[0] ?? null;
  }

  async findAll(params: FindAllParams) {
    const { page, limit, rol, activo, search } = params;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (rol) conditions.push(eq(usuario.rol, rol));
    if (activo !== undefined) conditions.push(eq(usuario.activo, activo));
    if (search) {
      conditions.push(
        or(
          ilike(usuario.nombre, `%${search}%`),
          ilike(usuario.email, `%${search}%`),
        )!,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      this.db
        .select(safeColumns)
        .from(usuario)
        .where(where)
        .orderBy(desc(usuario.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(usuario)
        .where(where),
    ]);

    return { data, total: Number(totalResult[0].count) };
  }

  async create(data: {
    email: string;
    passwordHash: string;
    nombre: string;
    rol: RolUsuario;
  }) {
    const [created] = await this.db
      .insert(usuario)
      .values(data)
      .returning(safeColumns);
    return created;
  }

  async update(id: number, data: Partial<{ nombre: string; rol: RolUsuario; activo: boolean }>) {
    const [updated] = await this.db
      .update(usuario)
      .set(data)
      .where(eq(usuario.id, id))
      .returning(safeColumns);
    return updated ?? null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(usuario)
      .where(eq(usuario.id, id))
      .returning({ id: usuario.id });
    return result.length > 0;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: usuario.id })
      .from(usuario)
      .where(eq(usuario.email, email))
      .limit(1);
    return rows.length > 0;
  }
}
