// Bloque Empresas: empresa, postulacion, archivo_postulacion
import { pgTable, pgEnum, unique, integer, text, timestamp, foreignKey, check, numeric, index, bigint, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { usuario } from "./auth"
import { concurso } from "./concurso"

export const estadoPostulacion = pgEnum("estado_postulacion", ['borrador', 'enviado', 'observado', 'rechazado', 'en_evaluacion', 'calificado', 'ganador', 'no_seleccionado'])

export const empresa = pgTable("empresa", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "empresa_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	usuarioId: integer("usuario_id").notNull(),
	razonSocial: text("razon_social").notNull(),
	nit: text().notNull(),
	registroSeprec: text("registro_seprec"),
	tipoEmpresa: text("tipo_empresa"),
	departamento: text(),
	anioFundacion: integer("anio_fundacion"),
	rubro: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.usuarioId],
			foreignColumns: [usuario.id],
			name: "fk_empresa_usuario"
		}).onDelete("restrict"),
	unique("uq_empresa_usuario").on(table.usuarioId),
	unique("uq_empresa_nit").on(table.nit),
]);

export const postulacion = pgTable("postulacion", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "postulacion_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	concursoId: integer("concurso_id").notNull(),
	empresaId: integer("empresa_id").notNull(),
	estado: estadoPostulacion().default('borrador').notNull(),
	responseData: jsonb("response_data").default({}).notNull(),
	schemaVersion: integer("schema_version").default(1).notNull(),
	porcentajeCompletado: numeric("porcentaje_completado", { precision: 5, scale: 2 }).default('0').notNull(),
	fechaEnvio: timestamp("fecha_envio", { withTimezone: true, mode: 'string' }),
	observacion: text(),
	puntajeFinal: numeric("puntaje_final", { precision: 6, scale: 2 }),
	posicionFinal: integer("posicion_final"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_postulacion_concurso_estado").using("btree", table.concursoId.asc().nullsLast().op("enum_ops"), table.estado.asc().nullsLast().op("enum_ops")),
	index("idx_postulacion_empresa_id").using("btree", table.empresaId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.concursoId],
			foreignColumns: [concurso.id],
			name: "fk_postulacion_concurso"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.empresaId],
			foreignColumns: [empresa.id],
			name: "fk_postulacion_empresa"
		}).onDelete("restrict"),
	unique("uq_postulacion_concurso_empresa").on(table.concursoId, table.empresaId),
	check("chk_postulacion_porcentaje", sql`(porcentaje_completado >= (0)::numeric) AND (porcentaje_completado <= (100)::numeric)`),
	check("chk_postulacion_puntaje", sql`(puntaje_final IS NULL) OR (puntaje_final >= (0)::numeric)`),
	check("chk_postulacion_posicion", sql`(posicion_final IS NULL) OR (posicion_final > 0)`),
]);

export const archivoPostulacion = pgTable("archivo_postulacion", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "archivo_postulacion_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	postulacionId: integer("postulacion_id").notNull(),
	fieldId: text("field_id").notNull(),
	nombreOriginal: text("nombre_original").notNull(),
	storageKey: text("storage_key").notNull(),
	mimeType: text("mime_type").notNull(),
	tamanoBytes: bigint("tamano_bytes", { mode: "number" }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_archivo_postulacion_id").using("btree", table.postulacionId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.postulacionId],
			foreignColumns: [postulacion.id],
			name: "fk_archivo_postulacion"
		}).onDelete("cascade"),
	check("chk_archivo_tamano", sql`tamano_bytes > 0`),
]);
