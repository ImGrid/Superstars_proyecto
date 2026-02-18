import { pgTable, unique, integer, text, boolean, timestamp, foreignKey, check, date, numeric, index, bigint, jsonb, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const estadoCalificacion = pgEnum("estado_calificacion", ['en_progreso', 'completado', 'aprobado', 'devuelto'])
export const estadoConcurso = pgEnum("estado_concurso", ['borrador', 'publicado', 'cerrado', 'en_evaluacion', 'finalizado'])
export const estadoPostulacion = pgEnum("estado_postulacion", ['borrador', 'enviado', 'observado', 'rechazado', 'en_evaluacion', 'calificado', 'ganador', 'no_seleccionado'])
export const nivelEnum = pgEnum("nivel_enum", ['basico', 'intermedio', 'avanzado'])
export const rolUsuario = pgEnum("rol_usuario", ['administrador', 'responsable_concurso', 'proponente', 'evaluador'])
export const tipoCriterio = pgEnum("tipo_criterio", ['economico', 'tecnico', 'medioambiental', 'social', 'financiero'])
export const tipoNotificacion = pgEnum("tipo_notificacion", ['observacion_propuesta', 'rechazo_propuesta', 'asignacion_evaluador', 'devolucion_calificacion', 'propuesta_calificada', 'propuesta_ganadora', 'propuesta_no_seleccionada', 'general'])


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

export const concurso = pgTable("concurso", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "concurso_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	nombre: text().notNull(),
	descripcion: text(),
	bases: text(),
	fechaInicioPostulacion: date("fecha_inicio_postulacion").notNull(),
	fechaCierrePostulacion: date("fecha_cierre_postulacion").notNull(),
	fechaAnuncioGanadores: date("fecha_anuncio_ganadores"),
	montoPremio: numeric("monto_premio", { precision: 12, scale:  2 }).notNull(),
	numeroGanadores: integer("numero_ganadores").default(3).notNull(),
	topNSistema: integer("top_n_sistema").default(5).notNull(),
	departamentos: text().array().notNull(),
	estado: estadoConcurso().default('borrador').notNull(),
	fechaPublicacionResultados: timestamp("fecha_publicacion_resultados", { withTimezone: true, mode: 'string' }),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [usuario.id],
			name: "fk_concurso_created_by"
		}).onDelete("restrict"),
	check("chk_concurso_fechas", sql`fecha_cierre_postulacion >= fecha_inicio_postulacion`),
	check("chk_concurso_monto", sql`monto_premio > (0)::numeric`),
	check("chk_concurso_ganadores", sql`numero_ganadores > 0`),
	check("chk_concurso_top_n", sql`top_n_sistema > 0`),
]);

export const responsableConcurso = pgTable("responsable_concurso", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "responsable_concurso_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	concursoId: integer("concurso_id").notNull(),
	usuarioId: integer("usuario_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_responsable_concurso_id").using("btree", table.concursoId.asc().nullsLast().op("int4_ops")),
	index("idx_responsable_usuario_id").using("btree", table.usuarioId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.concursoId],
			foreignColumns: [concurso.id],
			name: "fk_responsable_concurso"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.usuarioId],
			foreignColumns: [usuario.id],
			name: "fk_responsable_usuario"
		}).onDelete("restrict"),
	unique("uq_responsable_concurso_usuario").on(table.concursoId, table.usuarioId),
]);

export const documentoConcurso = pgTable("documento_concurso", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "documento_concurso_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	concursoId: integer("concurso_id").notNull(),
	nombre: text().notNull(),
	storageKey: text("storage_key").notNull(),
	nombreOriginal: text("nombre_original").notNull(),
	mimeType: text("mime_type").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	tamanoBytes: bigint("tamano_bytes", { mode: "number" }).notNull(),
	orden: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_documento_concurso_id").using("btree", table.concursoId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.concursoId],
			foreignColumns: [concurso.id],
			name: "fk_documento_concurso"
		}).onDelete("cascade"),
	check("chk_documento_tamano", sql`tamano_bytes > 0`),
]);

export const formularioDinamico = pgTable("formulario_dinamico", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "formulario_dinamico_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	concursoId: integer("concurso_id").notNull(),
	nombre: text().notNull(),
	descripcion: text(),
	schemaDefinition: jsonb("schema_definition").notNull(),
	version: integer().default(1).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_formulario_schema_gin").using("gin", table.schemaDefinition.asc().nullsLast().op("jsonb_path_ops")),
	foreignKey({
			columns: [table.concursoId],
			foreignColumns: [concurso.id],
			name: "fk_formulario_concurso"
		}).onDelete("cascade"),
	unique("uq_formulario_concurso").on(table.concursoId),
	check("chk_formulario_version", sql`version >= 1`),
]);

export const postulacion = pgTable("postulacion", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "postulacion_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	concursoId: integer("concurso_id").notNull(),
	empresaId: integer("empresa_id").notNull(),
	estado: estadoPostulacion().default('borrador').notNull(),
	responseData: jsonb("response_data").default({}).notNull(),
	schemaVersion: integer("schema_version").default(1).notNull(),
	porcentajeCompletado: numeric("porcentaje_completado", { precision: 5, scale:  2 }).default('0').notNull(),
	fechaEnvio: timestamp("fecha_envio", { withTimezone: true, mode: 'string' }),
	observacion: text(),
	puntajeFinal: numeric("puntaje_final", { precision: 6, scale:  2 }),
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
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
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

export const rubrica = pgTable("rubrica", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "rubrica_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	concursoId: integer("concurso_id").notNull(),
	nombre: text().notNull(),
	descripcion: text(),
	puntajeTotal: numeric("puntaje_total", { precision: 6, scale:  2 }).default('100').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.concursoId],
			foreignColumns: [concurso.id],
			name: "fk_rubrica_concurso"
		}).onDelete("cascade"),
	unique("uq_rubrica_concurso").on(table.concursoId),
	check("chk_rubrica_puntaje", sql`puntaje_total > (0)::numeric`),
]);

export const criterio = pgTable("criterio", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "criterio_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	rubricaId: integer("rubrica_id").notNull(),
	tipo: tipoCriterio().notNull(),
	nombre: text().notNull(),
	descripcion: text(),
	pesoPorcentaje: numeric("peso_porcentaje", { precision: 5, scale:  2 }).notNull(),
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
	pesoPorcentaje: numeric("peso_porcentaje", { precision: 5, scale:  2 }).notNull(),
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
	puntajeMin: numeric("puntaje_min", { precision: 5, scale:  2 }).notNull(),
	puntajeMax: numeric("puntaje_max", { precision: 5, scale:  2 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.subCriterioId],
			foreignColumns: [subCriterio.id],
			name: "fk_nivel_sub_criterio"
		}).onDelete("cascade"),
	unique("uq_nivel_sub_criterio_nivel").on(table.subCriterioId, table.nivel),
	check("chk_nivel_rango", sql`(puntaje_max >= puntaje_min) AND (puntaje_min >= (0)::numeric)`),
]);

export const asignacionEvaluador = pgTable("asignacion_evaluador", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "asignacion_evaluador_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	postulacionId: integer("postulacion_id").notNull(),
	evaluadorId: integer("evaluador_id").notNull(),
	asignadoPor: integer("asignado_por").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_asignacion_evaluador_id").using("btree", table.evaluadorId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.postulacionId],
			foreignColumns: [postulacion.id],
			name: "fk_asignacion_postulacion"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.evaluadorId],
			foreignColumns: [usuario.id],
			name: "fk_asignacion_evaluador"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.asignadoPor],
			foreignColumns: [usuario.id],
			name: "fk_asignacion_asignado_por"
		}).onDelete("restrict"),
	unique("uq_asignacion_postulacion_evaluador").on(table.postulacionId, table.evaluadorId),
]);

export const calificacion = pgTable("calificacion", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "calificacion_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	postulacionId: integer("postulacion_id").notNull(),
	evaluadorId: integer("evaluador_id").notNull(),
	puntajeTotal: numeric("puntaje_total", { precision: 6, scale:  2 }),
	estado: estadoCalificacion().default('en_progreso').notNull(),
	comentarioGeneral: text("comentario_general"),
	comentarioResponsable: text("comentario_responsable"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_calificacion_evaluador_id").using("btree", table.evaluadorId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.postulacionId],
			foreignColumns: [postulacion.id],
			name: "fk_calificacion_postulacion"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.evaluadorId],
			foreignColumns: [usuario.id],
			name: "fk_calificacion_evaluador"
		}).onDelete("restrict"),
	unique("uq_calificacion_postulacion_evaluador").on(table.postulacionId, table.evaluadorId),
	check("chk_calificacion_puntaje", sql`(puntaje_total IS NULL) OR (puntaje_total >= (0)::numeric)`),
]);

export const calificacionDetalle = pgTable("calificacion_detalle", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "calificacion_detalle_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	calificacionId: integer("calificacion_id").notNull(),
	subCriterioId: integer("sub_criterio_id").notNull(),
	puntaje: numeric({ precision: 5, scale:  2 }).notNull(),
	justificacion: text(),
}, (table) => [
	foreignKey({
			columns: [table.calificacionId],
			foreignColumns: [calificacion.id],
			name: "fk_detalle_calificacion"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.subCriterioId],
			foreignColumns: [subCriterio.id],
			name: "fk_detalle_sub_criterio"
		}).onDelete("restrict"),
	unique("uq_detalle_calificacion_sub_criterio").on(table.calificacionId, table.subCriterioId),
	check("chk_detalle_puntaje", sql`puntaje >= (0)::numeric`),
]);

export const notificacionEmail = pgTable("notificacion_email", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "notificacion_email_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	destinatarioId: integer("destinatario_id").notNull(),
	remitenteId: integer("remitente_id"),
	concursoId: integer("concurso_id"),
	postulacionId: integer("postulacion_id"),
	tipo: tipoNotificacion().notNull(),
	asunto: text().notNull(),
	contenido: text().notNull(),
	enviado: boolean().default(false).notNull(),
	fechaEnvio: timestamp("fecha_envio", { withTimezone: true, mode: 'string' }),
	errorEnvio: text("error_envio"),
	intentos: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_notificacion_destinatario_id").using("btree", table.destinatarioId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.destinatarioId],
			foreignColumns: [usuario.id],
			name: "fk_notificacion_destinatario"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.remitenteId],
			foreignColumns: [usuario.id],
			name: "fk_notificacion_remitente"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.concursoId],
			foreignColumns: [concurso.id],
			name: "fk_notificacion_concurso"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.postulacionId],
			foreignColumns: [postulacion.id],
			name: "fk_notificacion_postulacion"
		}).onDelete("set null"),
	check("chk_notificacion_intentos", sql`intentos >= 0`),
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
