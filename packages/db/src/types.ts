import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
	usuario, sesionRefreshToken, verificacionPendiente, resetPasswordPendiente,
	concurso, responsableConcurso, documentoConcurso, formularioDinamico,
	empresa, postulacion, archivoPostulacion,
	rubrica, criterio, subCriterio, nivelEvaluacion,
	evaluadorConcurso, asignacionEvaluador, calificacion, calificacionDetalle,
	notificacionEmail,
	preguntaFrecuente,
} from "./schema";

// Tipos Select (lectura)
export type Usuario = InferSelectModel<typeof usuario>;
export type SesionRefreshToken = InferSelectModel<typeof sesionRefreshToken>;
export type VerificacionPendiente = InferSelectModel<typeof verificacionPendiente>;
export type ResetPasswordPendiente = InferSelectModel<typeof resetPasswordPendiente>;
export type Concurso = InferSelectModel<typeof concurso>;
export type ResponsableConcurso = InferSelectModel<typeof responsableConcurso>;
export type DocumentoConcurso = InferSelectModel<typeof documentoConcurso>;
export type FormularioDinamico = InferSelectModel<typeof formularioDinamico>;
export type Empresa = InferSelectModel<typeof empresa>;
export type Postulacion = InferSelectModel<typeof postulacion>;
export type ArchivoPostulacion = InferSelectModel<typeof archivoPostulacion>;
export type Rubrica = InferSelectModel<typeof rubrica>;
export type Criterio = InferSelectModel<typeof criterio>;
export type SubCriterio = InferSelectModel<typeof subCriterio>;
export type NivelEvaluacion = InferSelectModel<typeof nivelEvaluacion>;
export type EvaluadorConcurso = InferSelectModel<typeof evaluadorConcurso>;
export type AsignacionEvaluador = InferSelectModel<typeof asignacionEvaluador>;
export type Calificacion = InferSelectModel<typeof calificacion>;
export type CalificacionDetalle = InferSelectModel<typeof calificacionDetalle>;
export type NotificacionEmail = InferSelectModel<typeof notificacionEmail>;
export type PreguntaFrecuente = InferSelectModel<typeof preguntaFrecuente>;

// Tipos Insert (escritura)
export type NewUsuario = InferInsertModel<typeof usuario>;
export type NewSesionRefreshToken = InferInsertModel<typeof sesionRefreshToken>;
export type NewVerificacionPendiente = InferInsertModel<typeof verificacionPendiente>;
export type NewResetPasswordPendiente = InferInsertModel<typeof resetPasswordPendiente>;
export type NewConcurso = InferInsertModel<typeof concurso>;
export type NewResponsableConcurso = InferInsertModel<typeof responsableConcurso>;
export type NewDocumentoConcurso = InferInsertModel<typeof documentoConcurso>;
export type NewFormularioDinamico = InferInsertModel<typeof formularioDinamico>;
export type NewEmpresa = InferInsertModel<typeof empresa>;
export type NewPostulacion = InferInsertModel<typeof postulacion>;
export type NewArchivoPostulacion = InferInsertModel<typeof archivoPostulacion>;
export type NewRubrica = InferInsertModel<typeof rubrica>;
export type NewCriterio = InferInsertModel<typeof criterio>;
export type NewSubCriterio = InferInsertModel<typeof subCriterio>;
export type NewNivelEvaluacion = InferInsertModel<typeof nivelEvaluacion>;
export type NewEvaluadorConcurso = InferInsertModel<typeof evaluadorConcurso>;
export type NewAsignacionEvaluador = InferInsertModel<typeof asignacionEvaluador>;
export type NewCalificacion = InferInsertModel<typeof calificacion>;
export type NewCalificacionDetalle = InferInsertModel<typeof calificacionDetalle>;
export type NewNotificacionEmail = InferInsertModel<typeof notificacionEmail>;
export type NewPreguntaFrecuente = InferInsertModel<typeof preguntaFrecuente>;
