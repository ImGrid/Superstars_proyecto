import { Injectable, Inject } from '@nestjs/common';
import { eq, and, asc, desc, count, isNull, inArray, sql, getTableColumns } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import {
  categoriaConvocatoria,
  evaluadorCategoria,
  asignacionEvaluador,
  calificacion,
  postulacion,
  empresa,
  convocatoria,
  usuario,
} from '@superstars/db';

@Injectable()
export class CategoriaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // --- Categoria ---

  // obtiene una categoria por id (null si no existe)
  async getById(categoriaId: number) {
    const rows = await this.db
      .select()
      .from(categoriaConvocatoria)
      .where(eq(categoriaConvocatoria.id, categoriaId));
    return rows[0] ?? null;
  }

  // lista las categorias de una convocatoria, ordenadas por orden
  async findByConvocatoriaId(convocatoriaId: number) {
    return this.db
      .select()
      .from(categoriaConvocatoria)
      .where(eq(categoriaConvocatoria.convocatoriaId, convocatoriaId))
      .orderBy(asc(categoriaConvocatoria.orden));
  }

  // como findByConvocatoriaId pero agrega conteos de configuracion y actividad
  // por categoria: formulario, criterios de la rubrica, evaluadores del pool y
  // postulaciones. Solo para admin/responsable (el proponente usa la version sin
  // conteos, para no exponer volumen de jurado ni postulaciones).
  // Nota: la correlacion con la tabla externa se escribe como literal calificado
  // (categoria_convocatoria.id), no como ${categoriaConvocatoria.id}, porque en
  // posicion SELECT Drizzle la renderiza sin calificar y da "column ambiguous".
  async findByConvocatoriaIdConResumen(convocatoriaId: number) {
    return this.db
      .select({
        ...getTableColumns(categoriaConvocatoria),
        numFormularios: sql<number>`(select count(*)::int from formulario_dinamico fd where fd.categoria_id = categoria_convocatoria.id)`,
        numCriterios: sql<number>`(select count(*)::int from criterio cr join rubrica ru on ru.id = cr.rubrica_id where ru.categoria_id = categoria_convocatoria.id)`,
        numEvaluadores: sql<number>`(select count(*)::int from evaluador_categoria ec where ec.categoria_id = categoria_convocatoria.id)`,
        numPostulaciones: sql<number>`(select count(*)::int from postulacion po where po.categoria_id = categoria_convocatoria.id)`,
      })
      .from(categoriaConvocatoria)
      .where(eq(categoriaConvocatoria.convocatoriaId, convocatoriaId))
      .orderBy(asc(categoriaConvocatoria.orden));
  }

  async create(data: {
    convocatoriaId: number;
    nombre: string;
    descripcion?: string | null;
    bases?: string | null;
    monto: string;
    numeroGanadores?: number;
    topNSistema?: number;
    orden?: number;
  }) {
    const [created] = await this.db
      .insert(categoriaConvocatoria)
      .values(data)
      .returning();
    return created;
  }

  async update(id: number, data: Partial<{
    nombre: string;
    descripcion: string | null;
    bases: string | null;
    monto: string;
    numeroGanadores: number;
    topNSistema: number;
    orden: number;
  }>) {
    const [updated] = await this.db
      .update(categoriaConvocatoria)
      .set(data)
      .where(eq(categoriaConvocatoria.id, id))
      .returning();
    return updated ?? null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(categoriaConvocatoria)
      .where(eq(categoriaConvocatoria.id, id))
      .returning({ id: categoriaConvocatoria.id });
    return result.length > 0;
  }

  // estado de la convocatoria padre (para la guardia de "solo editable en borrador")
  async getConvocatoriaEstado(convocatoriaId: number): Promise<string | null> {
    const rows = await this.db
      .select({ estado: convocatoria.estado })
      .from(convocatoria)
      .where(eq(convocatoria.id, convocatoriaId))
      .limit(1);
    return rows[0]?.estado ?? null;
  }

  // --- Resolucion (seleccion de ganadores por categoria) ---

  // marca la categoria como resuelta (ganadores seleccionados) con timestamp
  async marcarResuelta(categoriaId: number) {
    await this.db
      .update(categoriaConvocatoria)
      .set({ fechaSeleccionGanadores: new Date().toISOString() })
      .where(eq(categoriaConvocatoria.id, categoriaId));
  }

  // cuenta las categorias de la convocatoria que aun NO tienen ganadores seleccionados
  async countCategoriasNoResueltas(convocatoriaId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(categoriaConvocatoria)
      .where(and(
        eq(categoriaConvocatoria.convocatoriaId, convocatoriaId),
        isNull(categoriaConvocatoria.fechaSeleccionGanadores),
      ));
    return Number(result.count);
  }

  // --- Pool de evaluadores (nivel 1) ---

  // verifica si un evaluador esta en el pool de una categoria
  // ¿el proponente ya tiene una postulacion en esta convocatoria? Permite
  // dejarlo consultar sus categorias aunque la convocatoria no sea visible.
  async tienePostulacionDeUsuario(convocatoriaId: number, usuarioId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: postulacion.id })
      .from(postulacion)
      .innerJoin(empresa, eq(empresa.id, postulacion.empresaId))
      .where(and(
        eq(postulacion.convocatoriaId, convocatoriaId),
        eq(empresa.usuarioId, usuarioId),
      ))
      .limit(1);
    return rows.length > 0;
  }

  async isEvaluadorDeCategoria(categoriaId: number, evaluadorId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: evaluadorCategoria.id })
      .from(evaluadorCategoria)
      .where(and(
        eq(evaluadorCategoria.categoriaId, categoriaId),
        eq(evaluadorCategoria.evaluadorId, evaluadorId),
      ))
      .limit(1);
    return rows.length > 0;
  }

  async findEvaluadores(categoriaId: number) {
    return this.db
      .select({
        id: evaluadorCategoria.id,
        evaluadorId: evaluadorCategoria.evaluadorId,
        email: usuario.email,
        nombre: usuario.nombre,
        createdAt: evaluadorCategoria.createdAt,
      })
      .from(evaluadorCategoria)
      .innerJoin(usuario, eq(evaluadorCategoria.evaluadorId, usuario.id))
      .where(eq(evaluadorCategoria.categoriaId, categoriaId))
      .orderBy(desc(evaluadorCategoria.createdAt));
  }

  async addEvaluador(categoriaId: number, evaluadorId: number, asignadoPor: number) {
    const [created] = await this.db
      .insert(evaluadorCategoria)
      .values({ categoriaId, evaluadorId, asignadoPor })
      .returning();
    return created;
  }

  // Quita al evaluador del pool (nivel 1) y, en la misma transaccion:
  //  1. le retira las postulaciones de esta categoria que tuviera asignadas
  //  2. elimina las calificaciones que hubiera cargado (el detalle cae en cascada)
  //  3. recalcula el puntaje de las propuestas afectadas sin su nota
  // El paso 1 es el que revoca el acceso: las dos tablas no tienen relacion en
  // la base, asi que sin este borrado el evaluador conservaba acceso de lectura
  // y calificacion sobre las propuestas ya asignadas aunque saliera del jurado.
  // El paso 3 es imprescindible: puntaje_final es un promedio ya calculado, y
  // sin recalcularlo quedaria apoyado en una nota que ya no existe.
  async removeEvaluador(categoriaId: number, evaluadorId: number) {
    return this.db.transaction(async (tx) => {
      // postulaciones de la categoria: acotan el alcance de todo lo que sigue
      const postulacionesCategoria = await tx
        .select({ id: postulacion.id })
        .from(postulacion)
        .where(eq(postulacion.categoriaId, categoriaId));
      const idsCategoria = postulacionesCategoria.map(p => p.id);

      let asignacionesEliminadas = 0;
      let calificacionesEliminadas = 0;
      let puntajesRecalculados = 0;

      if (idsCategoria.length > 0) {
        const asignacionesBorradas = await tx
          .delete(asignacionEvaluador)
          .where(and(
            eq(asignacionEvaluador.evaluadorId, evaluadorId),
            inArray(asignacionEvaluador.postulacionId, idsCategoria),
          ))
          .returning({ id: asignacionEvaluador.id });
        asignacionesEliminadas = asignacionesBorradas.length;

        const calificacionesBorradas = await tx
          .delete(calificacion)
          .where(and(
            eq(calificacion.evaluadorId, evaluadorId),
            inArray(calificacion.postulacionId, idsCategoria),
          ))
          .returning({ postulacionId: calificacion.postulacionId });
        calificacionesEliminadas = calificacionesBorradas.length;

        // solo se recalculan las propuestas que perdieron una nota Y que ya
        // tenian puntaje calculado. Si todavia no tenian (siguen en evaluacion),
        // no se les inventa uno parcial: su nota se define al cerrar la evaluacion.
        const idsAfectadas = [...new Set(calificacionesBorradas.map(c => c.postulacionId))];
        if (idsAfectadas.length > 0) {
          // la correlacion va como literal (postulacion.id), no interpolada:
          // en posicion SELECT Drizzle la renderiza sin calificar y da ambiguedad.
          // Si no queda ninguna nota aprobada, avg() da NULL y el puntaje se vacia.
          const recalculadas = await tx.execute(sql`
            UPDATE postulacion
            SET puntaje_final = (
              SELECT round(avg(c.puntaje_total), 2)
              FROM calificacion c
              WHERE c.postulacion_id = postulacion.id AND c.estado = 'aprobado'
            )
            WHERE id IN (${sql.join(idsAfectadas.map(id => sql`${id}`), sql`, `)})
              AND puntaje_final IS NOT NULL
            RETURNING id
          `);
          puntajesRecalculados = recalculadas.rows.length;
        }
      }

      const removed = await tx
        .delete(evaluadorCategoria)
        .where(and(
          eq(evaluadorCategoria.categoriaId, categoriaId),
          eq(evaluadorCategoria.evaluadorId, evaluadorId),
        ))
        .returning({ id: evaluadorCategoria.id });

      return {
        removed: removed.length > 0,
        asignacionesEliminadas,
        calificacionesEliminadas,
        puntajesRecalculados,
      };
    });
  }
}
