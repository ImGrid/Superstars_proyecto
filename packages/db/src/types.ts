import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
	usuario, sesionRefreshToken, verificacionPendiente, resetPasswordPendiente,
	convocatoria, categoriaConvocatoria, responsableConvocatoria, documentoCategoria, formularioDinamico,
	empresa, postulacion, archivoPostulacion,
	rubrica, criterio, subCriterio, nivelEvaluacion,
	evaluadorCategoria, asignacionEvaluador, calificacion, calificacionDetalle,
	notificacionEmail,
	preguntaFrecuente,
	historiaExito,
} from "./schema";

// Tipos Select (lectura)
export type Usuario = InferSelectModel<typeof usuario>;
export type SesionRefreshToken = InferSelectModel<typeof sesionRefreshToken>;
export type VerificacionPendiente = InferSelectModel<typeof verificacionPendiente>;
export type ResetPasswordPendiente = InferSelectModel<typeof resetPasswordPendiente>;
export type Convocatoria = InferSelectModel<typeof convocatoria>;
export type CategoriaConvocatoria = InferSelectModel<typeof categoriaConvocatoria>;
export type ResponsableConvocatoria = InferSelectModel<typeof responsableConvocatoria>;
export type DocumentoCategoria = InferSelectModel<typeof documentoCategoria>;
export type FormularioDinamico = InferSelectModel<typeof formularioDinamico>;
export type Empresa = InferSelectModel<typeof empresa>;
export type Postulacion = InferSelectModel<typeof postulacion>;
export type ArchivoPostulacion = InferSelectModel<typeof archivoPostulacion>;
export type Rubrica = InferSelectModel<typeof rubrica>;
export type Criterio = InferSelectModel<typeof criterio>;
export type SubCriterio = InferSelectModel<typeof subCriterio>;
export type NivelEvaluacion = InferSelectModel<typeof nivelEvaluacion>;
export type EvaluadorCategoria = InferSelectModel<typeof evaluadorCategoria>;
export type AsignacionEvaluador = InferSelectModel<typeof asignacionEvaluador>;
export type Calificacion = InferSelectModel<typeof calificacion>;
export type CalificacionDetalle = InferSelectModel<typeof calificacionDetalle>;
export type NotificacionEmail = InferSelectModel<typeof notificacionEmail>;
export type PreguntaFrecuente = InferSelectModel<typeof preguntaFrecuente>;
export type HistoriaExito = InferSelectModel<typeof historiaExito>;

// Tipos Insert (escritura)
export type NewUsuario = InferInsertModel<typeof usuario>;
export type NewSesionRefreshToken = InferInsertModel<typeof sesionRefreshToken>;
export type NewVerificacionPendiente = InferInsertModel<typeof verificacionPendiente>;
export type NewResetPasswordPendiente = InferInsertModel<typeof resetPasswordPendiente>;
export type NewConvocatoria = InferInsertModel<typeof convocatoria>;
export type NewCategoriaConvocatoria = InferInsertModel<typeof categoriaConvocatoria>;
export type NewResponsableConvocatoria = InferInsertModel<typeof responsableConvocatoria>;
export type NewDocumentoCategoria = InferInsertModel<typeof documentoCategoria>;
export type NewFormularioDinamico = InferInsertModel<typeof formularioDinamico>;
export type NewEmpresa = InferInsertModel<typeof empresa>;
export type NewPostulacion = InferInsertModel<typeof postulacion>;
export type NewArchivoPostulacion = InferInsertModel<typeof archivoPostulacion>;
export type NewRubrica = InferInsertModel<typeof rubrica>;
export type NewCriterio = InferInsertModel<typeof criterio>;
export type NewSubCriterio = InferInsertModel<typeof subCriterio>;
export type NewNivelEvaluacion = InferInsertModel<typeof nivelEvaluacion>;
export type NewEvaluadorCategoria = InferInsertModel<typeof evaluadorCategoria>;
export type NewAsignacionEvaluador = InferInsertModel<typeof asignacionEvaluador>;
export type NewCalificacion = InferInsertModel<typeof calificacion>;
export type NewCalificacionDetalle = InferInsertModel<typeof calificacionDetalle>;
export type NewNotificacionEmail = InferInsertModel<typeof notificacionEmail>;
export type NewPreguntaFrecuente = InferInsertModel<typeof preguntaFrecuente>;
export type NewHistoriaExito = InferInsertModel<typeof historiaExito>;
