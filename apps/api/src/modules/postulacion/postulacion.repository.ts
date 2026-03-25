import { Injectable, Inject } from '@nestjs/common';
import { eq, and, count, desc, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import { postulacion, empresa, concurso, responsableConcurso, calificacion } from '@superstars/db';
import type { EstadoPostulacion } from '@superstars/shared';

@Injectable()
export class PostulacionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // --- Queries ---

  async findById(id: number) {
    const rows = await this.db
      .select({
        id: postulacion.id,
        concursoId: postulacion.concursoId,
        empresaId: postulacion.empresaId,
        estado: postulacion.estado,
        responseData: postulacion.responseData,
        schemaVersion: postulacion.schemaVersion,
        porcentajeCompletado: postulacion.porcentajeCompletado,
        fechaEnvio: postulacion.fechaEnvio,
        observacion: postulacion.observacion,
        puntajeFinal: postulacion.puntajeFinal,
        posicionFinal: postulacion.posicionFinal,
        createdAt: postulacion.createdAt,
        updatedAt: postulacion.updatedAt,
        empresaRazonSocial: empresa.razonSocial,
      })
      .from(postulacion)
      .innerJoin(empresa, eq(postulacion.empresaId, empresa.id))
      .where(eq(postulacion.id, id));
    return rows[0] ?? null;
  }

  // Listado sin responseData (evita cargar JSONB grandes)
  async findAllByConcurso(concursoId: number, estado?: string) {
    const conditions = [eq(postulacion.concursoId, concursoId)];
    if (estado) {
      conditions.push(eq(postulacion.estado, estado as EstadoPostulacion));
    }

    // subquery: contar calificaciones en estado 'completado' por postulacion
    const califPendientes = sql<number>`(
      SELECT count(*)::int FROM ${calificacion}
      WHERE ${calificacion.postulacionId} = ${postulacion.id}
        AND ${calificacion.estado} = 'completado'
    )`.as('calificaciones_pendientes');

    return this.db
      .select({
        id: postulacion.id,
        concursoId: postulacion.concursoId,
        empresaId: postulacion.empresaId,
        estado: postulacion.estado,
        porcentajeCompletado: postulacion.porcentajeCompletado,
        fechaEnvio: postulacion.fechaEnvio,
        observacion: postulacion.observacion,
        puntajeFinal: postulacion.puntajeFinal,
        posicionFinal: postulacion.posicionFinal,
        createdAt: postulacion.createdAt,
        updatedAt: postulacion.updatedAt,
        empresaRazonSocial: empresa.razonSocial,
        calificacionesPendientes: califPendientes,
      })
      .from(postulacion)
      .innerJoin(empresa, eq(postulacion.empresaId, empresa.id))
      .where(and(...conditions))
      .orderBy(desc(postulacion.createdAt));
  }

  async findByEmpresaAndConcurso(empresaId: number, concursoId: number) {
    const rows = await this.db
      .select()
      .from(postulacion)
      .where(and(
        eq(postulacion.empresaId, empresaId),
        eq(postulacion.concursoId, concursoId),
      ));
    return rows[0] ?? null;
  }

  // --- Mutations ---

  async create(data: {
    concursoId: number;
    empresaId: number;
    responseData: Record<string, unknown>;
    porcentajeCompletado: string;
    schemaVersion: number;
  }) {
    const [created] = await this.db
      .insert(postulacion)
      .values(data)
      .returning();
    return created;
  }

  async updateDraft(id: number, data: {
    responseData: Record<string, unknown>;
    porcentajeCompletado: string;
    schemaVersion: number;
  }) {
    const [updated] = await this.db
      .update(postulacion)
      .set(data)
      .where(eq(postulacion.id, id))
      .returning();
    return updated ?? null;
  }

  // UPDATE atomico con WHERE estado = currentEstado
  async updateEstado(id: number, currentEstado: string, newEstado: string) {
    const result = await this.db
      .update(postulacion)
      .set({ estado: newEstado as EstadoPostulacion })
      .where(and(
        eq(postulacion.id, id),
        eq(postulacion.estado, currentEstado as EstadoPostulacion),
      ))
      .returning();
    return result[0] ?? null;
  }

  // Enviar: cambia estado + guarda fecha de envio + limpia observacion
  async submitPostulacion(id: number, currentEstado: string) {
    const result = await this.db
      .update(postulacion)
      .set({
        estado: 'enviado' as EstadoPostulacion,
        fechaEnvio: new Date().toISOString(),
        porcentajeCompletado: '100.00',
        observacion: null,
      })
      .where(and(
        eq(postulacion.id, id),
        eq(postulacion.estado, currentEstado as EstadoPostulacion),
      ))
      .returning();
    return result[0] ?? null;
  }

  // Observar: cambia estado + guarda observacion
  async observarPostulacion(id: number, observacion: string) {
    const result = await this.db
      .update(postulacion)
      .set({
        estado: 'observado' as EstadoPostulacion,
        observacion,
      })
      .where(and(
        eq(postulacion.id, id),
        eq(postulacion.estado, 'enviado' as EstadoPostulacion),
      ))
      .returning();
    return result[0] ?? null;
  }

  // Todas las postulaciones de una empresa (sin responseData) + datos del concurso
  async findAllByEmpresa(empresaId: number) {
    return this.db
      .select({
        id: postulacion.id,
        concursoId: postulacion.concursoId,
        empresaId: postulacion.empresaId,
        estado: postulacion.estado,
        porcentajeCompletado: postulacion.porcentajeCompletado,
        fechaEnvio: postulacion.fechaEnvio,
        observacion: postulacion.observacion,
        puntajeFinal: postulacion.puntajeFinal,
        posicionFinal: postulacion.posicionFinal,
        createdAt: postulacion.createdAt,
        updatedAt: postulacion.updatedAt,
        concursoNombre: concurso.nombre,
        concursoEstado: concurso.estado,
      })
      .from(postulacion)
      .innerJoin(concurso, eq(postulacion.concursoId, concurso.id))
      .where(eq(postulacion.empresaId, empresaId))
      .orderBy(desc(postulacion.updatedAt));
  }

  // listado cross-concurso para admin/responsable (con nombre empresa y concurso)
  async findAllAdmin(params: {
    page: number;
    limit: number;
    concursoId?: number;
    estado?: string;
    responsableUsuarioId?: number;
  }) {
    const { page, limit, concursoId, estado, responsableUsuarioId } = params;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (concursoId) {
      conditions.push(eq(postulacion.concursoId, concursoId));
    }
    if (estado) {
      conditions.push(eq(postulacion.estado, estado as EstadoPostulacion));
    }
    if (responsableUsuarioId) {
      conditions.push(
        sql`${postulacion.concursoId} IN (
          SELECT ${responsableConcurso.concursoId}
          FROM ${responsableConcurso}
          WHERE ${responsableConcurso.usuarioId} = ${responsableUsuarioId}
        )`,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // subquery: contar calificaciones en estado 'completado' por postulacion
    const califPendientes = sql<number>`(
      SELECT count(*)::int FROM ${calificacion}
      WHERE ${calificacion.postulacionId} = ${postulacion.id}
        AND ${calificacion.estado} = 'completado'
    )`.as('calificaciones_pendientes');

    const [data, totalResult] = await Promise.all([
      this.db
        .select({
          id: postulacion.id,
          concursoId: postulacion.concursoId,
          empresaId: postulacion.empresaId,
          estado: postulacion.estado,
          porcentajeCompletado: postulacion.porcentajeCompletado,
          fechaEnvio: postulacion.fechaEnvio,
          observacion: postulacion.observacion,
          puntajeFinal: postulacion.puntajeFinal,
          posicionFinal: postulacion.posicionFinal,
          createdAt: postulacion.createdAt,
          updatedAt: postulacion.updatedAt,
          empresaRazonSocial: empresa.razonSocial,
          concursoNombre: concurso.nombre,
          calificacionesPendientes: califPendientes,
        })
        .from(postulacion)
        .innerJoin(empresa, eq(postulacion.empresaId, empresa.id))
        .innerJoin(concurso, eq(postulacion.concursoId, concurso.id))
        .where(where)
        .orderBy(desc(postulacion.updatedAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(postulacion)
        .innerJoin(empresa, eq(postulacion.empresaId, empresa.id))
        .innerJoin(concurso, eq(postulacion.concursoId, concurso.id))
        .where(where),
    ]);

    return { data, total: Number(totalResult[0].count) };
  }

  // --- Helpers ---

  // Resolver empresa del proponente por usuario_id
  async getEmpresaIdByUsuarioId(usuarioId: number): Promise<number | null> {
    const rows = await this.db
      .select({ id: empresa.id })
      .from(empresa)
      .where(eq(empresa.usuarioId, usuarioId))
      .limit(1);
    return rows[0]?.id ?? null;
  }
}
