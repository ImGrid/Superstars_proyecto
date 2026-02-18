// Bloque Auth: usuario, sesion_refresh_token
import { pgTable, pgEnum, unique, integer, text, boolean, timestamp, foreignKey, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const rolUsuario = pgEnum("rol_usuario", ['administrador', 'responsable_concurso', 'proponente', 'evaluador'])

export const usuario = pgTable("usuario", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "usuario_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	email: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	rol: rolUsuario().notNull(),
	nombre: text().notNull(),
	activo: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("uq_usuario_email").on(table.email),
]);

export const sesionRefreshToken = pgTable("sesion_refresh_token", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "sesion_refresh_token_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	usuarioId: integer("usuario_id").notNull(),
	tokenHash: text("token_hash").notNull(),
	expiraEn: timestamp("expira_en", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_sesion_usuario_id").using("btree", table.usuarioId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.usuarioId],
			foreignColumns: [usuario.id],
			name: "fk_sesion_usuario"
		}).onDelete("cascade"),
]);
