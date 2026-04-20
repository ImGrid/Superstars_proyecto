// Bloque FAQ: pregunta_frecuente
import { pgTable, integer, text, timestamp, check, foreignKey, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { concurso } from "./concurso"

export const preguntaFrecuente = pgTable("pregunta_frecuente", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "pregunta_frecuente_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	pregunta: text().notNull(),
	respuesta: text().notNull(),
	orden: integer().default(0).notNull(),
	// categoria agrupa preguntas generales; concursoId indica que es especifica de un concurso
	categoria: text().notNull().default('general'),
	concursoId: integer("concurso_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	check("chk_faq_orden", sql`orden >= 0`),
	check("chk_faq_categoria", sql`categoria IN ('general', 'participacion', 'proceso')`),
	foreignKey({
		columns: [table.concursoId],
		foreignColumns: [concurso.id],
		name: "fk_faq_concurso"
	}).onDelete("set null"),
	index("idx_faq_concurso_id").using("btree", table.concursoId.asc().nullsLast().op("int4_ops")),
]);
