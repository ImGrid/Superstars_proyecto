// Bloque Historia de Exito: historia_exito
// Lista plana de historias mostradas en la seccion "Historias que inspiran" de la landing
// Cap de 6 activas se enforce en backend (HistoriaExitoService), no en BD
import { pgTable, integer, text, timestamp, boolean, foreignKey, check, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { empresa } from "./empresa"

export const historiaExito = pgTable("historia_exito", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "historia_exito_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	titulo: text().notNull(),
	badge: text(),
	descripcion: text().notNull(),
	imagenKey: text("imagen_key").notNull(),
	empresaId: integer("empresa_id"),
	empresaNombre: text("empresa_nombre"),
	orden: integer().default(0).notNull(),
	activa: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.empresaId],
		foreignColumns: [empresa.id],
		name: "fk_historia_exito_empresa"
	}).onDelete("set null"),
	check("chk_historia_exito_titulo_len", sql`length(titulo) BETWEEN 1 AND 200`),
	check("chk_historia_exito_badge_len", sql`badge IS NULL OR length(badge) BETWEEN 1 AND 50`),
	check("chk_historia_exito_descripcion_len", sql`length(descripcion) BETWEEN 1 AND 400`),
	check("chk_historia_exito_imagen_key_nonempty", sql`length(imagen_key) > 0`),
	check("chk_historia_exito_empresa_nombre_len", sql`empresa_nombre IS NULL OR length(empresa_nombre) BETWEEN 1 AND 200`),
	check("chk_historia_exito_orden", sql`orden >= 0`),
	index("idx_historia_exito_activa_orden").using("btree", table.orden.asc().nullsLast()).where(sql`activa = true`),
]);
