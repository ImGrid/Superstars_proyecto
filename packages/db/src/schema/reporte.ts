// Bloque Reporte: descarga_reporte (auditoria de descargas de reportes)
import { pgTable, integer, text, timestamp, jsonb, foreignKey, check, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { usuario } from "./auth"

// Filtros aplicados a la descarga, tal como llegaron en la consulta. Se guardan
// para poder responder "que contenia ese archivo", no solo "se descargo algo".
export type FiltrosReporte = Record<string, unknown>;

export const descargaReporte = pgTable("descarga_reporte", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "descarga_reporte_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	// nullable a proposito: borrar el usuario no borra su rastro
	usuarioId: integer("usuario_id"),
	// foto del correo al momento de la descarga, sobrevive al borrado del usuario
	usuarioEmail: text("usuario_email").notNull(),
	// identificador del reporte. Sin CHECK de lista cerrada en la BD: el catalogo
	// crece y la lista valida vive en el esquema Zod de packages/shared
	tipo: text().notNull(),
	formato: text().notNull(),
	filtros: jsonb().$type<FiltrosReporte>().default({}).notNull(),
	// cuantas filas salieron del sistema, para dimensionar una eventual fuga
	filasExportadas: integer("filas_exportadas").notNull(),
	ip: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_descarga_reporte_usuario").using("btree", table.usuarioId.asc().nullsLast().op("int4_ops")),
	index("idx_descarga_reporte_tipo").using("btree", table.tipo.asc().nullsLast()),
	index("idx_descarga_reporte_created").using("btree", table.createdAt.desc().nullsLast()),
	foreignKey({
			columns: [table.usuarioId],
			foreignColumns: [usuario.id],
			name: "fk_descarga_reporte_usuario"
		}).onDelete("set null"),
	check("chk_descarga_reporte_formato", sql`formato in ('excel','pdf')`),
	check("chk_descarga_reporte_tipo_nonempty", sql`length(tipo) > 0`),
	check("chk_descarga_reporte_email_nonempty", sql`length(usuario_email) > 0`),
	check("chk_descarga_reporte_filas_no_negativas", sql`filas_exportadas >= 0`),
]);
