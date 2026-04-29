// Bloque Calificacion: evaluador_convocatoria, asignacion_evaluador, calificacion, calificacion_detalle
import { pgTable, pgEnum, unique, integer, text, timestamp, foreignKey, check, numeric, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { usuario } from "./auth"
import { convocatoria } from "./convocatoria"
import { postulacion } from "./empresa"
import { subCriterio } from "./rubrica"

export const estadoCalificacion = pgEnum("estado_calificacion", ['en_progreso', 'completado', 'aprobado', 'devuelto'])

// evaluadores asignados a una convocatoria (no a postulaciones individuales)
export const evaluadorConvocatoria = pgTable("evaluador_convocatoria", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "evaluador_convocatoria_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	convocatoriaId: integer("convocatoria_id").notNull(),
	evaluadorId: integer("evaluador_id").notNull(),
	asignadoPor: integer("asignado_por").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_evaluador_convocatoria_convocatoria_id").using("btree", table.convocatoriaId.asc().nullsLast().op("int4_ops")),
	index("idx_evaluador_convocatoria_evaluador_id").using("btree", table.evaluadorId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.convocatoriaId],
			foreignColumns: [convocatoria.id],
			name: "fk_evaluador_convocatoria_convocatoria"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.evaluadorId],
			foreignColumns: [usuario.id],
			name: "fk_evaluador_convocatoria_evaluador"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.asignadoPor],
			foreignColumns: [usuario.id],
			name: "fk_evaluador_convocatoria_asignado_por"
		}).onDelete("restrict"),
	unique("uq_evaluador_convocatoria").on(table.convocatoriaId, table.evaluadorId),
]);

// asignacion de evaluadores a postulaciones individuales (nivel 2)
export const asignacionEvaluador = pgTable("asignacion_evaluador", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "asignacion_evaluador_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	postulacionId: integer("postulacion_id").notNull(),
	evaluadorId: integer("evaluador_id").notNull(),
	asignadoPor: integer("asignado_por").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_asignacion_postulacion_id").using("btree", table.postulacionId.asc().nullsLast().op("int4_ops")),
	index("idx_asignacion_evaluador_id").using("btree", table.evaluadorId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.postulacionId],
			foreignColumns: [postulacion.id],
			name: "fk_asignacion_postulacion"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.evaluadorId],
			foreignColumns: [usuario.id],
			name: "fk_asignacion_evaluador"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.asignadoPor],
			foreignColumns: [usuario.id],
			name: "fk_asignacion_asignado_por"
		}).onDelete("restrict"),
	unique("uq_asignacion_postulacion_evaluador").on(table.postulacionId, table.evaluadorId),
]);

export const calificacion = pgTable("calificacion", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "calificacion_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	postulacionId: integer("postulacion_id").notNull(),
	evaluadorId: integer("evaluador_id").notNull(),
	puntajeTotal: numeric("puntaje_total", { precision: 6, scale: 2 }),
	estado: estadoCalificacion().default('en_progreso').notNull(),
	comentarioGeneral: text("comentario_general"),
	comentarioResponsable: text("comentario_responsable"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_calificacion_evaluador_id").using("btree", table.evaluadorId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.postulacionId],
			foreignColumns: [postulacion.id],
			name: "fk_calificacion_postulacion"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.evaluadorId],
			foreignColumns: [usuario.id],
			name: "fk_calificacion_evaluador"
		}).onDelete("restrict"),
	unique("uq_calificacion_postulacion_evaluador").on(table.postulacionId, table.evaluadorId),
	check("chk_calificacion_puntaje", sql`(puntaje_total IS NULL) OR (puntaje_total >= (0)::numeric)`),
]);

export const calificacionDetalle = pgTable("calificacion_detalle", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "calificacion_detalle_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	calificacionId: integer("calificacion_id").notNull(),
	subCriterioId: integer("sub_criterio_id").notNull(),
	puntaje: numeric({ precision: 5, scale: 2 }).notNull(),
	justificacion: text(),
}, (table) => [
	foreignKey({
			columns: [table.calificacionId],
			foreignColumns: [calificacion.id],
			name: "fk_detalle_calificacion"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.subCriterioId],
			foreignColumns: [subCriterio.id],
			name: "fk_detalle_sub_criterio"
		}).onDelete("restrict"),
	unique("uq_detalle_calificacion_sub_criterio").on(table.calificacionId, table.subCriterioId),
	check("chk_detalle_puntaje", sql`puntaje >= (0)::numeric`),
]);
