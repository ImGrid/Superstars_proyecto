// Bloque Notificaciones: notificacion_email
import { pgTable, pgEnum, integer, text, boolean, timestamp, foreignKey, check, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { usuario } from "./auth"
import { convocatoria } from "./convocatoria"
import { postulacion } from "./empresa"

export const tipoNotificacion = pgEnum("tipo_notificacion", ['observacion_propuesta', 'rechazo_propuesta', 'asignacion_evaluador', 'devolucion_calificacion', 'propuesta_calificada', 'propuesta_ganadora', 'propuesta_no_seleccionada', 'general'])

export const notificacionEmail = pgTable("notificacion_email", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "notificacion_email_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	destinatarioId: integer("destinatario_id").notNull(),
	remitenteId: integer("remitente_id"),
	convocatoriaId: integer("convocatoria_id"),
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
			columns: [table.convocatoriaId],
			foreignColumns: [convocatoria.id],
			name: "fk_notificacion_convocatoria"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.postulacionId],
			foreignColumns: [postulacion.id],
			name: "fk_notificacion_postulacion"
		}).onDelete("set null"),
	check("chk_notificacion_intentos", sql`intentos >= 0`),
]);
