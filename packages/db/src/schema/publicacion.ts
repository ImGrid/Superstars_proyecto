// Bloque Publicaciones: categoria_publicacion, publicacion
import { pgTable, pgEnum, integer, text, timestamp, boolean, foreignKey, check, unique, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const estadoPublicacion = pgEnum("estado_publicacion", ['borrador', 'programado', 'publicado', 'expirado', 'archivado'])

export const categoriaPublicacion = pgTable("categoria_publicacion", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "categoria_publicacion_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	nombre: text().notNull(),
	slug: text().notNull(),
	descripcion: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("uq_categoria_publicacion_slug").on(table.slug),
	unique("uq_categoria_publicacion_nombre").on(table.nombre),
]);

export const publicacion = pgTable("publicacion", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "publicacion_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	titulo: text().notNull(),
	slug: text().notNull(),
	extracto: text(),
	contenido: text().notNull(),
	categoriaId: integer("categoria_id"),
	imagenDestacadaKey: text("imagen_destacada_key"),
	estado: estadoPublicacion().default('borrador').notNull(),
	fechaPublicacion: timestamp("fecha_publicacion", { withTimezone: true, mode: 'string' }),
	fechaExpiracion: timestamp("fecha_expiracion", { withTimezone: true, mode: 'string' }),
	destacado: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("uq_publicacion_slug").on(table.slug),
	index("idx_publicacion_estado_fecha").using("btree", table.estado.asc().nullsLast(), table.fechaPublicacion.desc().nullsLast()).where(sql`estado = 'publicado'`),
	index("idx_publicacion_categoria_id").using("btree", table.categoriaId.asc().nullsLast()),
	index("idx_publicacion_programadas").using("btree", table.fechaPublicacion.asc().nullsLast()).where(sql`estado = 'programado'`),
	index("idx_publicacion_expiracion").using("btree", table.fechaExpiracion.asc().nullsLast()).where(sql`estado = 'publicado' AND fecha_expiracion IS NOT NULL`),
	foreignKey({
		columns: [table.categoriaId],
		foreignColumns: [categoriaPublicacion.id],
		name: "fk_publicacion_categoria"
	}).onDelete("set null"),
	check("chk_publicacion_fechas", sql`fecha_expiracion IS NULL OR fecha_publicacion IS NULL OR fecha_expiracion > fecha_publicacion`),
]);
