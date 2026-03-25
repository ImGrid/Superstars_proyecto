import { relations } from "drizzle-orm/relations";
import { usuario, sesionRefreshToken } from "./schema/auth";
import { concurso, responsableConcurso, documentoConcurso, formularioDinamico } from "./schema/concurso";
import { empresa, postulacion, archivoPostulacion } from "./schema/empresa";
import { rubrica, criterio, subCriterio, nivelEvaluacion } from "./schema/rubrica";
import { evaluadorConcurso, asignacionEvaluador, calificacion, calificacionDetalle } from "./schema/calificacion";
import { notificacionEmail } from "./schema/notificacion";

export const empresaRelations = relations(empresa, ({one, many}) => ({
	usuario: one(usuario, {
		fields: [empresa.usuarioId],
		references: [usuario.id]
	}),
	postulacions: many(postulacion),
}));

export const usuarioRelations = relations(usuario, ({many}) => ({
	empresas: many(empresa),
	concursos: many(concurso),
	responsableConcursos: many(responsableConcurso),
	evaluadorConcursos_evaluadorId: many(evaluadorConcurso, {
		relationName: "evaluadorConcurso_evaluadorId_usuario_id"
	}),
	evaluadorConcursos_asignadoPor: many(evaluadorConcurso, {
		relationName: "evaluadorConcurso_asignadoPor_usuario_id"
	}),
	asignacionEvaluadors_evaluadorId: many(asignacionEvaluador, {
		relationName: "asignacionEvaluador_evaluadorId_usuario_id"
	}),
	asignacionEvaluadors_asignadoPor: many(asignacionEvaluador, {
		relationName: "asignacionEvaluador_asignadoPor_usuario_id"
	}),
	calificacions: many(calificacion),
	notificacionEmails_destinatarioId: many(notificacionEmail, {
		relationName: "notificacionEmail_destinatarioId_usuario_id"
	}),
	notificacionEmails_remitenteId: many(notificacionEmail, {
		relationName: "notificacionEmail_remitenteId_usuario_id"
	}),
	sesionRefreshTokens: many(sesionRefreshToken),
}));

export const concursoRelations = relations(concurso, ({one, many}) => ({
	usuario: one(usuario, {
		fields: [concurso.createdBy],
		references: [usuario.id]
	}),
	responsableConcursos: many(responsableConcurso),
	evaluadorConcursos: many(evaluadorConcurso),
	documentoConcursos: many(documentoConcurso),
	formularioDinamicos: many(formularioDinamico),
	postulacions: many(postulacion),
	rubricas: many(rubrica),
	notificacionEmails: many(notificacionEmail),
}));

export const responsableConcursoRelations = relations(responsableConcurso, ({one}) => ({
	concurso: one(concurso, {
		fields: [responsableConcurso.concursoId],
		references: [concurso.id]
	}),
	usuario: one(usuario, {
		fields: [responsableConcurso.usuarioId],
		references: [usuario.id]
	}),
}));

export const evaluadorConcursoRelations = relations(evaluadorConcurso, ({one}) => ({
	concurso: one(concurso, {
		fields: [evaluadorConcurso.concursoId],
		references: [concurso.id]
	}),
	usuario_evaluadorId: one(usuario, {
		fields: [evaluadorConcurso.evaluadorId],
		references: [usuario.id],
		relationName: "evaluadorConcurso_evaluadorId_usuario_id"
	}),
	usuario_asignadoPor: one(usuario, {
		fields: [evaluadorConcurso.asignadoPor],
		references: [usuario.id],
		relationName: "evaluadorConcurso_asignadoPor_usuario_id"
	}),
}));

export const documentoConcursoRelations = relations(documentoConcurso, ({one}) => ({
	concurso: one(concurso, {
		fields: [documentoConcurso.concursoId],
		references: [concurso.id]
	}),
}));

export const formularioDinamicoRelations = relations(formularioDinamico, ({one}) => ({
	concurso: one(concurso, {
		fields: [formularioDinamico.concursoId],
		references: [concurso.id]
	}),
}));

export const postulacionRelations = relations(postulacion, ({one, many}) => ({
	concurso: one(concurso, {
		fields: [postulacion.concursoId],
		references: [concurso.id]
	}),
	empresa: one(empresa, {
		fields: [postulacion.empresaId],
		references: [empresa.id]
	}),
	archivoPostulacions: many(archivoPostulacion),
	asignacionEvaluadors: many(asignacionEvaluador),
	calificacions: many(calificacion),
	notificacionEmails: many(notificacionEmail),
}));

export const archivoPostulacionRelations = relations(archivoPostulacion, ({one}) => ({
	postulacion: one(postulacion, {
		fields: [archivoPostulacion.postulacionId],
		references: [postulacion.id]
	}),
}));

export const rubricaRelations = relations(rubrica, ({one, many}) => ({
	concurso: one(concurso, {
		fields: [rubrica.concursoId],
		references: [concurso.id]
	}),
	criterios: many(criterio),
}));

export const criterioRelations = relations(criterio, ({one, many}) => ({
	rubrica: one(rubrica, {
		fields: [criterio.rubricaId],
		references: [rubrica.id]
	}),
	subCriterios: many(subCriterio),
}));

export const subCriterioRelations = relations(subCriterio, ({one, many}) => ({
	criterio: one(criterio, {
		fields: [subCriterio.criterioId],
		references: [criterio.id]
	}),
	nivelEvaluacions: many(nivelEvaluacion),
	calificacionDetalles: many(calificacionDetalle),
}));

export const nivelEvaluacionRelations = relations(nivelEvaluacion, ({one}) => ({
	subCriterio: one(subCriterio, {
		fields: [nivelEvaluacion.subCriterioId],
		references: [subCriterio.id]
	}),
}));

export const asignacionEvaluadorRelations = relations(asignacionEvaluador, ({one}) => ({
	postulacion: one(postulacion, {
		fields: [asignacionEvaluador.postulacionId],
		references: [postulacion.id]
	}),
	usuario_evaluadorId: one(usuario, {
		fields: [asignacionEvaluador.evaluadorId],
		references: [usuario.id],
		relationName: "asignacionEvaluador_evaluadorId_usuario_id"
	}),
	usuario_asignadoPor: one(usuario, {
		fields: [asignacionEvaluador.asignadoPor],
		references: [usuario.id],
		relationName: "asignacionEvaluador_asignadoPor_usuario_id"
	}),
}));

export const calificacionRelations = relations(calificacion, ({one, many}) => ({
	postulacion: one(postulacion, {
		fields: [calificacion.postulacionId],
		references: [postulacion.id]
	}),
	usuario: one(usuario, {
		fields: [calificacion.evaluadorId],
		references: [usuario.id]
	}),
	calificacionDetalles: many(calificacionDetalle),
}));

export const calificacionDetalleRelations = relations(calificacionDetalle, ({one}) => ({
	calificacion: one(calificacion, {
		fields: [calificacionDetalle.calificacionId],
		references: [calificacion.id]
	}),
	subCriterio: one(subCriterio, {
		fields: [calificacionDetalle.subCriterioId],
		references: [subCriterio.id]
	}),
}));

export const notificacionEmailRelations = relations(notificacionEmail, ({one}) => ({
	usuario_destinatarioId: one(usuario, {
		fields: [notificacionEmail.destinatarioId],
		references: [usuario.id],
		relationName: "notificacionEmail_destinatarioId_usuario_id"
	}),
	usuario_remitenteId: one(usuario, {
		fields: [notificacionEmail.remitenteId],
		references: [usuario.id],
		relationName: "notificacionEmail_remitenteId_usuario_id"
	}),
	concurso: one(concurso, {
		fields: [notificacionEmail.concursoId],
		references: [concurso.id]
	}),
	postulacion: one(postulacion, {
		fields: [notificacionEmail.postulacionId],
		references: [postulacion.id]
	}),
}));

export const sesionRefreshTokenRelations = relations(sesionRefreshToken, ({one}) => ({
	usuario: one(usuario, {
		fields: [sesionRefreshToken.usuarioId],
		references: [usuario.id]
	}),
}));
