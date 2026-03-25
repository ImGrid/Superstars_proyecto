// Bloque FAQ: pregunta_frecuente
import { pgTable, integer, text, timestamp, check } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const preguntaFrecuente = pgTable("pregunta_frecuente", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "pregunta_frecuente_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	pregunta: text().notNull(),
	respuesta: text().notNull(),
	orden: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	check("chk_faq_orden", sql`orden >= 0`),
]);
