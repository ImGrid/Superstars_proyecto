// Bloque Observador: acceso_observador (auditoria de lectura del rol observador)
import { pgTable, integer, text, timestamp, foreignKey, check, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { usuario } from "./auth"

export const accesoObservador = pgTable("acceso_observador", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "acceso_observador_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	// nullable a proposito: borrar el usuario no borra su rastro
	usuarioId: integer("usuario_id"),
	// foto del email al momento del acceso, sobrevive al borrado del usuario
	usuarioEmail: text("usuario_email").notNull(),
	accion: text().notNull(),
	recurso: text().notNull(),
	recursoId: integer("recurso_id").notNull(),
	convocatoriaId: integer("convocatoria_id"),
	ip: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_acceso_observador_usuario").using("btree", table.usuarioId.asc().nullsLast().op("int4_ops")),
	index("idx_acceso_observador_recurso").using("btree", table.recurso.asc().nullsLast(), table.recursoId.asc().nullsLast()),
	index("idx_acceso_observador_created").using("btree", table.createdAt.desc().nullsLast()),
	foreignKey({
			columns: [table.usuarioId],
			foreignColumns: [usuario.id],
			name: "fk_acceso_observador_usuario"
		}).onDelete("set null"),
	check("chk_acceso_observador_accion", sql`accion in ('ver','descargar')`),
	check("chk_acceso_observador_recurso", sql`recurso in ('postulacion','documento')`),
	check("chk_acceso_observador_email_nonempty", sql`length(usuario_email) > 0`),
]);
