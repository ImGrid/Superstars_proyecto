// Bloque Convocatorias: convocatoria, responsable_convocatoria, documento_convocatoria, formulario_dinamico
import { pgTable, pgEnum, unique, integer, text, timestamp, foreignKey, check, date, numeric, index, bigint, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { usuario } from "./auth"

export const estadoConvocatoria = pgEnum("estado_convocatoria", ['borrador', 'publicado', 'cerrado', 'en_evaluacion', 'resultados_listos', 'finalizado'])

export const convocatoria = pgTable("convocatoria", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "convocatoria_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	nombre: text().notNull(),
	descripcion: text(),
	bases: text(),
	fechaInicioPostulacion: date("fecha_inicio_postulacion").notNull(),
	fechaCierrePostulacion: date("fecha_cierre_postulacion").notNull(),
	fechaAnuncioGanadores: date("fecha_anuncio_ganadores"),
	fechaCierreEfectiva: date("fecha_cierre_efectiva"),
	monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),
	numeroGanadores: integer("numero_ganadores").default(3).notNull(),
	topNSistema: integer("top_n_sistema").default(5).notNull(),
	departamentos: text().array().notNull(),
	estado: estadoConvocatoria().default('borrador').notNull(),
	fechaPublicacionResultados: timestamp("fecha_publicacion_resultados", { withTimezone: true, mode: 'string' }),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [usuario.id],
			name: "fk_convocatoria_created_by"
		}).onDelete("restrict"),
	check("chk_convocatoria_fechas", sql`fecha_cierre_postulacion >= fecha_inicio_postulacion`),
	check("chk_convocatoria_monto", sql`monto > (0)::numeric`),
	check("chk_convocatoria_ganadores", sql`numero_ganadores > 0`),
	check("chk_convocatoria_top_n", sql`top_n_sistema > 0`),
	check("chk_convocatoria_cierre_efectiva", sql`fecha_cierre_efectiva IS NULL OR fecha_cierre_efectiva >= fecha_cierre_postulacion`),
]);

export const responsableConvocatoria = pgTable("responsable_convocatoria", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "responsable_convocatoria_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	convocatoriaId: integer("convocatoria_id").notNull(),
	usuarioId: integer("usuario_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_responsable_convocatoria_id").using("btree", table.convocatoriaId.asc().nullsLast().op("int4_ops")),
	index("idx_responsable_usuario_id").using("btree", table.usuarioId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.convocatoriaId],
			foreignColumns: [convocatoria.id],
			name: "fk_responsable_convocatoria"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.usuarioId],
			foreignColumns: [usuario.id],
			name: "fk_responsable_usuario"
		}).onDelete("restrict"),
	unique("uq_responsable_convocatoria_usuario").on(table.convocatoriaId, table.usuarioId),
]);

export const documentoConvocatoria = pgTable("documento_convocatoria", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "documento_convocatoria_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	convocatoriaId: integer("convocatoria_id").notNull(),
	nombre: text().notNull(),
	storageKey: text("storage_key").notNull(),
	nombreOriginal: text("nombre_original").notNull(),
	mimeType: text("mime_type").notNull(),
	tamanoBytes: bigint("tamano_bytes", { mode: "number" }).notNull(),
	orden: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_documento_convocatoria_id").using("btree", table.convocatoriaId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.convocatoriaId],
			foreignColumns: [convocatoria.id],
			name: "fk_documento_convocatoria"
		}).onDelete("cascade"),
	check("chk_documento_tamano", sql`tamano_bytes > 0`),
]);

export const formularioDinamico = pgTable("formulario_dinamico", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "formulario_dinamico_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	convocatoriaId: integer("convocatoria_id").notNull(),
	nombre: text().notNull(),
	descripcion: text(),
	schemaDefinition: jsonb("schema_definition").$type<{ secciones: Array<Record<string, unknown>> }>().notNull(),
	version: integer().default(1).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_formulario_schema_gin").using("gin", table.schemaDefinition.asc().nullsLast().op("jsonb_path_ops")),
	foreignKey({
			columns: [table.convocatoriaId],
			foreignColumns: [convocatoria.id],
			name: "fk_formulario_convocatoria"
		}).onDelete("cascade"),
	unique("uq_formulario_convocatoria").on(table.convocatoriaId),
	check("chk_formulario_version", sql`version >= 1`),
]);
