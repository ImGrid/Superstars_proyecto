// Bloque Rubrica: rubrica, criterio, sub_criterio, nivel_evaluacion
import { pgTable, pgEnum, unique, integer, text, timestamp, foreignKey, check, numeric, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { convocatoria } from "./convocatoria"

export const tipoCriterio = pgEnum("tipo_criterio", ['economico', 'tecnico', 'medioambiental', 'social', 'financiero'])
export const nivelEnum = pgEnum("nivel_enum", ['basico', 'intermedio', 'avanzado'])

export const rubrica = pgTable("rubrica", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "rubrica_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	convocatoriaId: integer("convocatoria_id").notNull(),
	nombre: text().notNull(),
	descripcion: text(),
	puntajeTotal: numeric("puntaje_total", { precision: 6, scale: 2 }).default('100').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.convocatoriaId],
			foreignColumns: [convocatoria.id],
			name: "fk_rubrica_convocatoria"
		}).onDelete("cascade"),
	unique("uq_rubrica_convocatoria").on(table.convocatoriaId),
	check("chk_rubrica_puntaje", sql`puntaje_total > (0)::numeric`),
]);

export const criterio = pgTable("criterio", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "criterio_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	rubricaId: integer("rubrica_id").notNull(),
	tipo: tipoCriterio().notNull(),
	nombre: text().notNull(),
	descripcion: text(),
	pesoPorcentaje: numeric("peso_porcentaje", { precision: 5, scale: 2 }).notNull(),
	orden: integer().notNull(),
}, (table) => [
	index("idx_criterio_rubrica_id").using("btree", table.rubricaId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.rubricaId],
			foreignColumns: [rubrica.id],
			name: "fk_criterio_rubrica"
		}).onDelete("cascade"),
	check("chk_criterio_peso", sql`(peso_porcentaje > (0)::numeric) AND (peso_porcentaje <= (100)::numeric)`),
	check("chk_criterio_orden", sql`orden > 0`),
]);

export const subCriterio = pgTable("sub_criterio", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "sub_criterio_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	criterioId: integer("criterio_id").notNull(),
	nombre: text().notNull(),
	descripcion: text(),
	pesoPorcentaje: numeric("peso_porcentaje", { precision: 5, scale: 2 }).notNull(),
	orden: integer().notNull(),
}, (table) => [
	index("idx_sub_criterio_criterio_id").using("btree", table.criterioId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.criterioId],
			foreignColumns: [criterio.id],
			name: "fk_sub_criterio_criterio"
		}).onDelete("cascade"),
	check("chk_sub_criterio_peso", sql`(peso_porcentaje > (0)::numeric) AND (peso_porcentaje <= (100)::numeric)`),
	check("chk_sub_criterio_orden", sql`orden > 0`),
]);

export const nivelEvaluacion = pgTable("nivel_evaluacion", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "nivel_evaluacion_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	subCriterioId: integer("sub_criterio_id").notNull(),
	nivel: nivelEnum().notNull(),
	descripcion: text().notNull(),
	puntajeMin: numeric("puntaje_min", { precision: 5, scale: 2 }).notNull(),
	puntajeMax: numeric("puntaje_max", { precision: 5, scale: 2 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.subCriterioId],
			foreignColumns: [subCriterio.id],
			name: "fk_nivel_sub_criterio"
		}).onDelete("cascade"),
	unique("uq_nivel_sub_criterio_nivel").on(table.subCriterioId, table.nivel),
	check("chk_nivel_rango", sql`(puntaje_max >= puntaje_min) AND (puntaje_min >= (0)::numeric)`),
]);
