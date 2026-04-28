// Bloque Auth: usuario, sesion_refresh_token, verificacion_pendiente
import { pgTable, pgEnum, unique, integer, text, boolean, timestamp, foreignKey, index, check } from "drizzle-orm/pg-core"
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
	familyId: text("family_id").notNull(),
	revocadoEn: timestamp("revocado_en", { withTimezone: true, mode: 'string' }),
	replacedBy: integer("replaced_by"),
}, (table) => [
	unique("uq_sesion_token_hash").on(table.tokenHash),
	index("idx_sesion_usuario_id").using("btree", table.usuarioId.asc().nullsLast().op("int4_ops")),
	index("idx_sesion_family_id").using("btree", table.familyId),
	foreignKey({
			columns: [table.usuarioId],
			foreignColumns: [usuario.id],
			name: "fk_sesion_usuario"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.replacedBy],
			foreignColumns: [table.id],
			name: "fk_sesion_replaced_by"
		}).onDelete("set null"),
]);

export const resetPasswordPendiente = pgTable("reset_password_pendiente", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "reset_password_pendiente_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	usuarioId: integer("usuario_id").notNull(),
	codigoHash: text("codigo_hash").notNull(),
	intentos: integer().default(0).notNull(),
	reenviosSolicitados: integer("reenvios_solicitados").default(0).notNull(),
	expiraEn: timestamp("expira_en", { withTimezone: true, mode: 'string' }).notNull(),
	ultimoEnvioAt: timestamp("ultimo_envio_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("uq_reset_pwd_usuario").on(table.usuarioId),
	index("idx_reset_pwd_expira_en").using("btree", table.expiraEn.asc().nullsLast()),
	check("chk_reset_pwd_intentos", sql`intentos >= 0`),
	check("chk_reset_pwd_reenvios", sql`reenvios_solicitados >= 0`),
	check("chk_reset_pwd_expira", sql`expira_en > created_at`),
	foreignKey({
			columns: [table.usuarioId],
			foreignColumns: [usuario.id],
			name: "fk_reset_pwd_usuario"
		}).onDelete("cascade"),
]);

export const verificacionPendiente = pgTable("verificacion_pendiente", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "verificacion_pendiente_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	email: text().notNull(),
	nombre: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	codigoHash: text("codigo_hash").notNull(),
	intentos: integer().default(0).notNull(),
	reenviosSolicitados: integer("reenvios_solicitados").default(0).notNull(),
	expiraEn: timestamp("expira_en", { withTimezone: true, mode: 'string' }).notNull(),
	ultimoEnvioAt: timestamp("ultimo_envio_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("uq_verif_pendiente_email").on(table.email),
	index("idx_verificacion_pendiente_expira_en").using("btree", table.expiraEn.asc().nullsLast()),
	check("chk_verif_pendiente_intentos", sql`intentos >= 0`),
	check("chk_verif_pendiente_reenvios", sql`reenvios_solicitados >= 0`),
	check("chk_verif_pendiente_expira", sql`expira_en > created_at`),
	check("chk_verif_pendiente_email_nonempty", sql`length(email) > 0`),
]);
